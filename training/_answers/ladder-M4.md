# M4 reference: live board across instances

## Where a move from Ben (A) to Ana (B) dies today

1. `moveIssue` calls `recordActivity` **without `projectId`** (`issue.service.js:296-301`), so **no emit at all**. It dies here, on every machine.
2. If it were emitted: it fires inside the transaction (`activity.service.js:25`). Ana may refetch before the commit and cache the old state.
3. `io.to(room).emit` on A reaches only A's sockets (no adapter). Ana is on B, so she gets nothing.
4. If Ana's socket reconnected since load, it's in no rooms (INC-005's mechanism), and nothing arrives even on the same machine.
5. If Ana's polling transport bounced between A and B during the handshake, she gets "Session ID unknown" and a reconnect loop.

## Design

- **Adapter:** `@socket.io/redis-adapter` with `pubClient` and `subClient = pubClient.duplicate()` (plain pub/sub; the sharded adapter only matters on Redis Cluster). The streams adapter survives short Redis disconnects (it resumes from the stream), which matters because the same Redis also fails over. Either way, `fetchSockets()` for presence becomes cluster-wide (a request/response over Redis with a timeout, so it's slower). Cache presence per room, or maintain it in a Redis hash on join and leave.
- **Transport:** `transports: ['websocket']` on the client removes the stickiness requirement: one TCP connection, one machine. The cost is no fallback when a proxy blocks WebSocket, which is rare in 2026 but real in some enterprises. The alternative is stickiness at the load balancer (Fly has `fly-force-instance-id` and replay headers, but no cookie affinity by default). On ALB (S1), target-group stickiness works.
- **Emit after commit, every mutation:** services return the events their transaction recorded, and a single helper publishes them after `$transaction` resolves:

  ```js
  const { result, events } = await prisma.$transaction(async (tx) => { …; return { result, events: [ev1, ev2] }; });
  publishAfterCommit(project.id, events);   // emits 'activity' hints
  ```

  `recordActivity` stops emitting. Add activity (or at least an emit) for delete and for sprint start, complete and assign. A test mocks `emitToProject` and asserts it's called **after** the transaction promise resolved, and not at all when the transaction throws. This in-process approach loses emits if the process dies between commit and emit. That's acceptable for _hints_ (the next refetch heals it), and _not_ acceptable for notifications (S3, `curriculum/01`).

- **Client:** `socket.on('connect', join)` covers the first connect and every reconnect. `auth: (cb) => cb({ token: getAccessToken() })` means reconnects use the current token. On `connect` after the first one, invalidate the board once, because events during the gap are lost. Handle `connect_error` with an auth message by refreshing, then `socket.connect()`.
- **Server:** broadcast presence on `disconnecting` (when `socket.rooms` is still populated). Re-check membership on sensitive events, or remove sockets from rooms in `removeMember` via `io.in(room).fetchSockets()` and `socket.leave` (R20).

## Key answers

- **Why long-polling needs stickiness:** each poll is a separate HTTP request carrying the `sid`. The session state (buffered packets, handshake) lives in one process's memory. A WebSocket is one long-lived connection, pinned to one machine by nature.
- **Readiness:** the adapter's pub/sub connection failing means this instance silently stops receiving cross-instance events. Expose it in `/api/health/ready` as degraded (J1) and in a metric.
- **The two-server test:** it needs Redis. Put it behind `describe.runIf(process.env.REDIS_URL)` and run it in the nightly e2e workflow (`e2e.yml`), which can add a Redis service container.
