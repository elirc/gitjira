# Sealed: CR-21 reference placement

## The key fact you had to find first

Nothing on the server emits notification events today. `git grep -n "emit(" HEAD -- apps/api/src apps/worker/src` shows only `emitToProject` (project rooms) and presence. The comment at `apps/web/src/lib/hooks.js:240-241` ("the socket makes it feel instant") is aspirational. If your placement assumed an existing event and only added a listener, that's the miss this CR is built to catch.

## 1. Cross-process delivery

The worker has no Socket.IO server, and API machines don't share rooms.

| Option | How                                                                                      | Trade-off                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | `@socket.io/redis-adapter` on the API plus `@socket.io/redis-emitter` in the worker      | Chosen. Redis is already a dependency. It also fixes project-room fan-out across machines as a side benefit. It adds Redis pub/sub on the realtime path. |
| B      | Worker publishes to a Redis channel; each API instance subscribes and calls `io.to(...)` | Same effect, more hand-written code.                                                                                                                     |
| C      | Worker calls an internal API endpoint                                                    | Couples the processes and needs a load balancer to reach **all** machines. Rejected.                                                                     |

## 2. Addressing

On `connection`, the server joins `user:<socket.data.user.id>` (`socket-server.js:35-37`). It needs no extra authorization: the identity comes from the verified handshake token, and a socket can only ever be in its own user room. Never let the client choose the user room.

## 3. Event contract

- Name: `notification.created`, payload `{ id, kind, issueId, createdAt }`.
- Treat it as a **hint**. The client calls `invalidateQueries({ queryKey: ['me', 'notifications'] })`. That matches the existing project-event philosophy (`useLiveProject.js:18-21`): the list and the unread count come from a refetch, never from the payload.
- Add `notification.read` with `{ ids | 'all', before }` for tab sync.

## 4. Timing and retries

- Emit **after** the `notification.create` insert commits. Each insert in `handleNotificationJob` is its own statement, so emit after it succeeds (`notification-handler.js:44-54`).
- On P2002 (already delivered), don't emit again. Or do, because a hint is harmless. Either is defensible; state which you chose.
- Emit through the Redis emitter to `user:<userId>`. If the emit fails, **don't fail the job**. The row exists and the poll is the fallback. Otherwise a retried job re-runs the whole fan-out.
- Link: `apprenticeship/curriculum/02-idempotency.md`.

## 5. Mark-read sync

`POST /me/notifications/read-all` and `/:id/read` (`routes/index.js:25-27`) emit `notification.read` to `user:<req.user.id>` after the `updateMany`. Other tabs invalidate `['me','notifications']`.

## 6. Files

- `apps/api/src/realtime/socket-server.js`: adapter setup, join `user:` room.
- `apps/api/src/realtime/emit.js`: add `emitToUser`.
- New `apps/api/src/realtime/emitter.js` (worker-side Redis emitter).
- `apps/api/src/jobs/notification-handler.js`: emit after insert.
- `apps/api/src/controllers/notification.controller.js` or the service: emit on read.
- `apps/web/src/lib/useNotificationStream.js` (new): subscribe to both events and invalidate. Mount it once in `TopNav` or `NotificationBell`.
- `apps/web/src/lib/hooks.js`: raise `refetchInterval` to 60-120 s but keep it as a fallback.

Don't touch the WIP files (`sprint.service.js`, `BacklogPage.jsx`, and `hooks.js` beyond the one `refetchInterval` line). Coordinate that line with the owner, since `hooks.js` has uncommitted edits.

## 7. Data

No migration is needed. Optional: `@@index([userId, readAt])` or a partial index `WHERE "readAt" IS NULL` for `unreadCount`, which today scans all of a user's rows on `@@index([userId])`.

## 8. Tests

- API socket test (`apps/api/test/socket.test.js` style): a user socket receives `notification.created` when the handler runs for them, and **doesn't** receive another user's.
- Handler unit test: emit is called once per newly inserted recipient, and a failing emitter doesn't throw.
- Controller test: `read-all` emits `notification.read`.
- Web test with a fake socket: the event invalidates `['me','notifications']`.
- **Not provable in the rollback harness:** cross-process and cross-machine delivery through Redis, and after-commit ordering. Prove it with a docker-compose prod-like run (two API containers plus a worker), or mark it UNVERIFIED (`apprenticeship/curriculum/05-verify-before-trust.md`).

## 9. Failure behavior

If Redis is down, the emitter fails, the poll still works, and the bell is at most one poll interval late. Keep the poll. Realtime is an optimization, not the source of truth.

## 10. Rollout

Old bundles ignore unknown events and keep polling, so it's backward compatible. Deploy order: the API (adapter and user rooms) first, then the worker (emitter). Today, though, only the API deploys through `deploy.yml`, so shipping the worker change needs a deploy path that doesn't exist yet. A good answer flags that as a blocker.
