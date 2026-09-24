# M3 reference: Redis as a soft dependency

## Where Redis is touched on the request path (HEAD)

1. **Read, every authorized request:** `requireMembership` → `getMemberMap` → `cached()` → `storeGet` → `redis.get` (`project.service.js:78`, `cache.js:32-45`). The client is created lazily with `lazyConnect: true` and `maxRetriesPerRequest: 1`.
2. **Write, invalidation:** `addMember` and `removeMember` → `invalidate` → `redis.del` (`project.service.js:116`, `:129`). If Redis is down, it throws **after** the membership row changed. For removals, that's a security-relevant stale cache when Redis comes back (the TTL of 60 s bounds it).
3. **After-commit enqueue:** `createIssue` (`issue.service.js:87`), `updateIssue` (`:241`), `addComment` (`comment.service.js:55`) → `Queue.add` on a connection with default ioredis options.
4. **Import time:** none. Both clients are lazy, which is why the API _boots_ fine with Redis down and then fails per request.

## ioredis behavior

- `enableOfflineQueue: true` (the default): commands issued while disconnected are **queued** until reconnect. Combined with the default retry strategy, a request can wait many seconds.
- `maxRetriesPerRequest: 1` (cache client): after one reconnect attempt the queued command is rejected with `MaxRetriesPerRequestError`, so the cache **throws** and the request 500s.
- BullMQ `Queue`: this repo passes plain `{host, port}`. BullMQ sets `maxRetriesPerRequest: null` for Workers. For Queues, the ioredis default offline queue applies, so `add` waits for the connection. BullMQ's own docs recommend `enableOfflineQueue: false` for Queue instances used on the request path, so that `add` fails fast.

## Reference design

- **Cache:** wrap every store call. `try { await withTimeout(r.get(key), 100) } catch { cacheErrors.inc(); return undefined }`, which is a miss, so the loader hits the DB. Set `commandTimeout: 100` and `enableOfflineQueue: false` on the cache client, so no command waits for a reconnect. Log a warning at most once every 30 s. **Authorization stays DB-backed on a miss**, so it's never weakened. Invalidation failure: log it, and let the 60 s TTL bound staleness. For `removeMember`, consider **writing a tombstone** or retrying the delete. Or simply don't cache negative-impact decisions longer than a few seconds.
- **DB cost of fallback:** each board load makes about 2–3 authorized API calls (project, issues, and sprints on the backlog), and each calls `requireMembership` once. Single-flight (`cache.js:86-97`) still collapses concurrent loads **per process**, because the in-flight map is local, and a failed store is just a slow path. At 118 req/s, that's under 120 small PK lookups/s, which is trivial for Postgres.
- **Notifications:** move the intent into the transaction. Insert a `NotificationOutbox(id, eventId, payload, createdAt, sentAt null)` row inside the same `$transaction` as the change (`curriculum/01`). After commit, _try_ to enqueue with a 200 ms bound. On success, mark it sent, or let the relay do it. A relay (worker-side poller every 1–2 s with `FOR UPDATE SKIP LOCKED`) enqueues anything unsent, with `jobId = evt-<eventId>` (INC-002: an event id, not an entity id). The request never throws after commit.
- **Smaller honest step** (if you can't ship an outbox this sprint): catch and log enqueue errors after commit, plus a periodic sweeper that rebuilds missed notifications from `ActivityEvent` rows since the last watermark. It's cheaper, but it's lossy on the mention list, which isn't in `ActivityEvent.payload`.

## Crash matrix (after the design)

| Crash point                        | State                             | Outcome                                                             |
| ---------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| Before commit                      | nothing                           | the client retries, no dup                                          |
| After commit, before enqueue       | outbox row unsent                 | the relay sends it within 2 s                                       |
| After enqueue, before marking sent | the job exists, the row is unsent | the relay re-adds it, same jobId, dedupe (or `dedupeKey` in the DB) |
| Worker dies mid-fan-out            | some rows inserted                | the retry hits P2002 for those and inserts the rest                 |

## Proof

The existing harness can't show any of this (`test/setup.js` forces memory and no queue, and `test/tx.js` hides commits). Add:

1. a unit test of the cache wrapper with a fake store that throws or hangs, asserting a DB fallback within the timeout;
2. an integration suite, `redis-down.test.js`, that sets `CACHE_BACKEND=redis`, `REDIS_PORT=1` and `DISABLE_QUEUE=0`, and asserts 2xx under 300 ms for list, move and comment, plus an outbox row;
3. a manual or nightly run against real Redis: `docker stop` Redis mid-load (autocannon), and check the error rate and outbox drain after the restart.

## Also correct the docs

RUNBOOK step 1 and the postmortem's "graceful degradation held." Say what now happens, and mark the old postmortem as a narrated drill (AUDIT item 4).
