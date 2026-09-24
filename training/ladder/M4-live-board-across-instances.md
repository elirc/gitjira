# M4: A live board across two machines

**Context.** `fly.toml` runs `min_machines_running = 2`. Socket.IO (`apps/api/src/realtime/socket-server.js`) has no adapter, so `io.to(room).emit` reaches only sockets connected to the same machine, and `fetchSockets()` for presence sees only local sockets. The client (`apps/web/src/lib/socket.js`) uses default transports, so the handshake starts as HTTP long-polling, which requires every poll to hit the same machine. On top of that:

- Only `issue.created` and `comment.added` are ever emitted, because `recordActivity` emits only when a caller passes `projectId` (`activity.service.js:25-27`, `issue.service.js:74-80`). Moves and edits never reach other viewers.
- The emit fires **inside** the transaction, before commit (`activity.service.js:18-27`).
- The client joins a room once, on mount (`useLiveProject.js:24`), and the handshake token is captured once (`socket.js:12-14`).

**Ticket (lead).** "Two teammates on different machines must see each other's moves within about 1 s, presence must be right, and the board must survive an API deploy without a reload."

**Constraints.**

- There's no managed pub/sub besides the Redis you already run. The same Redis carries BullMQ, which needs `maxmemory-policy noeviction`.
- Fly's proxy doesn't do cookie stickiness by default. Pick one: websocket-only transport, or stickiness. Accept the consequence (corporate proxies that block WebSockets).
- Emits must happen **after** commit, for every board-affecting mutation: create, update, move, delete, and sprint assign/start/complete.
- The payload stays a hint (ids plus kind). The client refetches (ADR 0016), but only the affected keys (see M1).

**Definition of done.**

- `@socket.io/redis-adapter` (or the sharded or streams adapter; justify the choice) wired with separate pub/sub connections, and a readiness check aware of it (J1).
- Every mutation emits after commit, through one helper, and a test asserts the emit happens only after the transaction resolves.
- Client: joins on every `connect` (not just on mount), passes `auth` as a function so reconnects use the current token, and refetches once after a reconnect.
- A two-server test: two `http.Server` + `Server` instances on one Redis, a client on each, and an emit on A reaching the client on B. Mark it as needing Redis, and run it nightly if CI lacks Redis.

**Explain before touching.**

1. Trace one move from Ben (machine A) to Ana (machine B) today, and list every place it dies. Then trace it after your change.
2. Why does long-polling need stickiness but a pure WebSocket doesn't? What does `transports: ['websocket']` cost you?
3. Where exactly is "after commit" in Prisma's interactive transactions? How do you emit after commit without scattering `emit` calls in every service? (Look at what `recordActivity` returns.)
4. On reconnect, which server-side state is lost (rooms, `socket.data`), and who restores it? What about events emitted while the client was disconnected?
5. Presence is computed on join and leave only. What happens on `disconnect`, and across machines with the adapter?

<details><summary>Hints</summary>

- `socket.on('connect', () => socket.emit('join-project', …))` covers the first connect and every reconnect.
- Collect events in the transaction's return value and emit them once `$transaction` resolves. That's a tiny in-process outbox, and it is still lossy on crash (see `curriculum/01` for when that's acceptable).

</details>

Answer: `training/_answers/ladder-M4.md`
