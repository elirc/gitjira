# INC-001 answer: a render → join → presence → render feedback loop

## Root cause

`options = {}` in the hook signature, together with an inline object literal at the call site, gives `useLiveProject` a **new `options` object on every render**. That object is in the effect's dependency list (`useLiveProject.js`, `}, [projectId, qc, options]);`), so **every render tears down and re-runs the effect**. The effect has side effects on the server:

1. Cleanup runs `socket.emit('leave-project', { projectId })` (`useLiveProject.js`, cleanup block).
2. The server's `leave-project` handler broadcasts `presence` to the whole room (`apps/api/src/realtime/socket-server.js:56-59`, `io.to(room).emit('presence', await presenceFor(projectId))`).
3. The re-run does `socket.emit('join-project')`. The server runs a **direct `prisma.projectMember.findUnique`**, not the cached member map (`socket-server.js:44-47`). This is the `ProjectMember` statement at 1.9 M calls/h. It then broadcasts `presence` to the room again (`socket-server.js:53`).
4. Every client in the room receives both `presence` events. `onPresence` calls `setViewers(users)` with a **new array** (`useLiveProject.js`, `onPresence`), so each client re-renders.
5. Each re-render creates a new `options` object, so the effect re-runs and we're back at step 1, on every client.

One client alone loops at roughly one iteration per round trip, since each iteration waits for the server's presence reply. With N viewers, each iteration emits 2 presence broadcasts to N clients, and each of those clients starts its own iteration. The message rate grows about N² per round trip and is bounded only by server and DB throughput. That's why the team board with 28 people melts while quiet projects look fine. Each loop also invalidates nothing by itself, but the extra renders and the `['projects']` invalidations on real activity pile HTTP refetches on top (R15).

**"Cards only show after refresh":** between `leave-project` and the next `join-project`, the socket isn't in the room. An `activity` emitted in that window (`emit.js:11`) never reaches this client. With the loop running, the socket is out of the room a large fraction of the time.

**Verified:** a scratch vitest (not committed) mounted the PR's hook and HEAD's hook against a fake socket that echoes `presence` after 1 ms. In 300 ms, **HEAD emitted `join-project` once (2 renders) and the PR emitted it 25 times (25 renders)**, with a single client. The test is reproduced below.

## Diagnostic path a senior would take

1. The web release was the only change and it's static, so the server load must be _driven by clients_. Look at what clients send, not at server code.
2. The top statement is `ProjectMember` by `(projectId, userId)`. Grep for uncached membership lookups: `authorize` goes through the cache, so the uncached one is the socket `join-project` handler. That points at join frequency.
3. Open the board, then DevTools → Network → WS → Messages. You'll see a continuous `join-project` / `leave-project` / `presence` stream. React DevTools Profiler shows `ProjectBoardPage` committing on every `presence`.
4. Read the PR's dependency array, and ask of each dep: "is this referentially stable across renders?"

## Mitigation at 10:10

Roll the web bundle back to `v1.1.1`. It's a static asset, so this is safe and instant (`deploy.yml` doesn't deploy web at all; see review R1). Users on the bad bundle keep looping until they reload, so post a banner or force a reload by bumping the asset version. Scaling Postgres doesn't fix a loop.

## Fix

Minimal client fix: keep the callback in a ref and depend only on stable values.

```js
export function useLiveProject(projectId, { onActivity } = {}) {
  const qc = useQueryClient();
  const [viewers, setViewers] = useState([]);
  const onActivityRef = useRef(onActivity);
  useEffect(() => { onActivityRef.current = onActivity; });   // latest callback, no re-subscribe

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    const handleActivity = (event) => {
      qc.invalidateQueries({ queryKey: ['projects', /* narrow this, R15 */] });
      onActivityRef.current?.(event);
    };
    ...
  }, [projectId, qc]);
```

Also make `onPresence` skip `setViewers` when the ids didn't change, so presence can't cause renders on its own.

Server guard (defense in depth, so no client can hammer Postgres like this again):

- In `join-project`, use the cached `requireMembership` (`project.service.js:73`) instead of a raw `findUnique`. If the socket is already in the room (`socket.rooms.has(room)`), make the join a no-op.
- Debounce presence broadcasts per room (for example, at most one every 500 ms), and send presence only when membership of the room actually changed.
- Rate-limit socket events per connection, and disconnect abusive sockets.

## Regression tests

1. Web (vitest + RTL). Mock `../src/lib/socket.js` with a fake socket that echoes `presence` on join/leave. Mount a probe using the hook with an inline options object, set `IS_REACT_ACT_ENVIRONMENT = false`, wait 300 ms, and `expect(joinCount).toBe(1)`. This fails on the branch (25) and passes with the fix. Gotcha: inside an async `act()`, React 18 queues the state updates until `act` exits, which hides the loop. That's why the scratch test turns act mode off.
2. API (socket test in `apps/api/test/socket.test.js` style): emit `join-project` 5 times from one socket, and assert that the membership lookups are ≤ 1 and presence broadcasts are ≤ 1.

```jsx
// scratch repro used to verify (fake socket, 1 ms "RTT")
const fakeSocket = {
  emit: (ev) => {
    emits.push(ev);
    if (ev.endsWith('-project'))
      setTimeout(() => handlers.presence?.forEach((h) => h([{ id: 'u1', name: 'Ana' }])), 1);
  },
  on: (ev, h) => (handlers[ev] ??= new Set()).add(h),
  off: (ev, h) => handlers[ev]?.delete(h),
};
vi.mock('../src/lib/socket.js', () => ({ getSocket: () => fakeSocket }));
```

## Why review missed it

The PR's argument ("list every value the effect reads") is the exhaustive-deps rule applied mechanically. The rule is right. The fix it implies is to **make the value stable** (ref, `useCallback`, or primitive deps), not to add an unstable object. Nobody asked "what does this effect do when it re-runs?" Here it has network side effects on a shared room. Locally, one developer with one tab, on localhost with a 1 ms RTT, sees nothing: the avatars don't visibly change. Nobody opened a second tab or the WS frames panel. Also, `eslint.config.js` doesn't include `eslint-plugin-react-hooks` at all, so the reviewer's "the rule would have flagged it" was a belief, not a check.

## Model postmortem (short)

- **Impact:** 10:00–10:35 Tue. GJ board degraded for about 28 users, Postgres saturated, some requests timed out on pool acquisition across all tenants, and some live updates were missed.
- **Root cause:** an unstable effect dependency re-ran a network-side-effecting effect on every render. Server presence broadcasts turned that into an N² cross-client loop.
- **Detection:** Postgres CPU and event-loop lag alerts, about 40 min after the first large standup. We had no alert on socket message rate.
- **Action items:** (1) add a stable-callback hook and a lint rule (`react-hooks/exhaustive-deps` actually installed); (2) make server join idempotent and cached, debounce presence; (3) add a per-connection socket event rate metric and alert (links M2/J3); (4) add the fake-socket render-count test to CI.
