# INC-005 answer: room membership is per connection, and nobody rejoins

## HEAD's latent bug (the PR's report is true)

`getSocket()` captures `auth: { token: getAccessToken() }` once (`apps/web/src/lib/socket.js:12-14`). Access tokens live for 15 min (`token.service.js:6`). If the connection drops after that, the client reconnects with the stale token, and the server's `io.use` middleware rejects it with `Invalid token` (`socket-server.js:23-33`). When a _middleware_ rejects the handshake, the Socket.IO client emits `connect_error` and does **not** retry automatically (only transport-level failures are retried). `reconnectSocket()` existed but had no callers. So at HEAD, any disconnect after 15 min kills realtime until the page reloads.

## What the PR broke

`reconnectSocket()` does `socket.disconnect().connect()` (`socket.js:20-25`). That produces a **brand-new server-side socket** (`sid Zt8…`) with a fresh auth token, which is good. But Socket.IO **rooms belong to the server-side socket**. `socket.join('project:…')` (`socket-server.js:52`) applied to `Qm3…`, and `Zt8…` is in no rooms. The only place that sends `join-project` is `useLiveProject`'s effect (`useLiveProject.js:24`), which runs on mount or on a `projectId` change, **not on reconnect**. The client keeps its `activity` listeners (they're registered on the long-lived client `Socket` object), so everything looks wired, but the server never routes project events to this connection.

Why exactly 15 min: the first REST call after the access token expires gets a 401. `api()` calls `refreshSession()` (`api.js:57-60`), and the PR now forces a reconnect inside it. The bell's 30 s polling (`hooks.js:242`) guarantees a REST call within 30 s of expiry, so it's "15 min after page load, give or take 30 s", exactly as the user said.

## The same bug at HEAD without a refresh

Every **API deploy or restart** disconnects every socket. The API also has no graceful shutdown (R9), and `auto_stop_machines = true` in `fly.toml` stops idle machines. Socket.IO then auto-reconnects (a transport-level failure, so it does retry). With a still-valid token, the reconnect **succeeds without rejoining rooms**, so every open board goes stale after every deploy. The PR didn't create the missing rejoin. It made it happen every 15 min.

## Presence symptoms

- **Ana shown after she left:** the server's `disconnect` handler only logs (`socket-server.js:61-63`). It never re-broadcasts presence, so other clients keep the last list they got, which still includes her.
- **Carl missing from Ana's avatars:** presence is computed from the sockets in the room (`presenceFor`, `socket-server.js:70-76`). Carl's new socket isn't in the room. (With two API machines and no adapter, `fetchSockets()` also sees only the local machine; review R3.)

## Fix

**Client (required):** join on every connect, not only on mount.

```js
useEffect(() => {
  if (!projectId) return;
  const socket = getSocket();
  const join = () => socket.emit('join-project', { projectId });
  if (socket.connected) join();
  socket.on('connect', join); // fires on first connect AND every reconnect
  socket.on('activity', onActivity);
  socket.on('presence', onPresence);
  return () => {
    socket.off('connect', join);
    socket.off('activity', onActivity);
    socket.off('presence', onPresence);
    socket.emit('leave-project', { projectId });
  };
}, [projectId, qc]);
```

After a reconnect, also **invalidate the board queries once**. Events emitted while disconnected are gone (Socket.IO v4.6+ "connection state recovery" can replay them if enabled, but it doesn't survive a server restart without an adapter that supports it). Refetching is the correct catch-up.

**Token handling:** keep the PR's intent, but don't force a disconnect. Use `socket.auth = (cb) => cb({ token: getAccessToken() })`, which the client calls on **every** (re)connection attempt, so reconnects always use the current token and nothing needs to tear down a healthy connection. Handle `connect_error` with an auth message by refreshing, then calling `socket.connect()`.

**Server (hardening):** broadcast presence on `disconnect` (for rooms the socket was in; use `disconnecting`, where `socket.rooms` is still populated), and track membership per user rather than per socket if presence must be accurate across machines.

## Regression test (API level)

In `apps/api/test/socket.test.js` style:

1. Connect with `transports: ['websocket']` and `join-project`, then assert an `emitToProject` arrives.
2. Call `sock.disconnect(); sock.connect();` and wait for `connect`.
3. Call `emitToProject` again. On HEAD and the branch, the second event **never arrives** (timeout means the bug is reproduced). With a client that rejoins on `connect`, it arrives. The server test exercises the protocol truth that rooms don't survive reconnects. A web test with a fake socket that fires `connect` twice asserts `join-project` is emitted twice.

## Why review missed it

The reviewer checked the stated problem (stale token on reconnect), and the fix does solve that. The question nobody asked: "what server-side state is attached to the old connection, and who restores it?" At HEAD the same gap was already there on every deploy. The team never noticed because nobody watched a board across a deploy, and the e2e realtime journey (`e2e/journeys/04-realtime.spec.js`) runs for seconds, never for 15 minutes, and never across a reconnect.

## Postmortem (short)

Impact: every open board silently went stale 15 min after load (and after every API deploy, which predates the PR). Action items: rejoin on `connect` plus a catch-up refetch; a function-valued `auth`; presence on disconnect; a reconnect test in the socket suite; a client metric `realtime_reconnects_total` and an event-lag SLI (ladder M4 and S3).
