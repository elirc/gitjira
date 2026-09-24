# M3: Redis is down, and the board shouldn't be

**Context.** RUNBOOK ("Queue backlog", step 1) says: "If [Redis is] down … the api degrades gracefully (enqueue fails are logged, requests still succeed)." The code disagrees:

- `requireMembership` reads the member map through `cached()` (`project.service.js:78`, `lib/cache.js`). With `REDIS_HOST` set, `storeGet` calls Redis with `maxRetriesPerRequest: 1` (`cache.js:20-25`) and throws when Redis is down, so **every authorized request fails**.
- `createIssue`, `updateIssue` and `addComment` `await enqueueNotification(...)` **after** their transaction commits (`issue.service.js:87`, `:241`, `comment.service.js:55`). The BullMQ `Queue` uses default ioredis options (`jobs/queue.js:7-10`, offline queue on), so the request **hangs**, then errors, after the write already committed.

**Ticket (lead).** "A Redis failover should cost us notifications for a few seconds, not the product. Make Redis a soft dependency on the request path, and don't silently lose the notifications that should have been sent during the outage."

**Constraints.**

- Authorization must not become weaker: no "Redis down, so skip the membership check." A cache miss must fall back to the DB, not to 'allow'.
- A request must never wait more than about 200 ms on Redis.
- No lost notifications for writes that committed during the outage. You may link the outbox pattern (`apprenticeship/curriculum/01-transactional-outbox.md`) rather than re-deriving it. Decide whether you need the full pattern here or a smaller step, and justify it.
- The test harness forces `CACHE_BACKEND=memory` and `DISABLE_QUEUE=1` (`apps/api/test/setup.js`). Your proof can't rely only on that harness.

**Definition of done.**

- The cache wrapper treats Redis errors and timeouts as a miss (DB load), logs at most once per interval, and exposes `cache_errors_total`.
- Enqueue is bounded: it fails fast (`enableOfflineQueue: false`, a command timeout) and never throws into a request that already committed. Undelivered events are recoverable (outbox row, or a retry sweep from `ActivityEvent`).
- A test, or a documented manual run, with `REDIS_HOST` pointing at a closed port. Board list, move, and comment all return 2xx, with p95 under 300 ms locally.
- The RUNBOOK and postmortem text corrected, so they describe what the code now actually does.

**Explain before touching.**

1. List every request path that touches Redis today, with file:line. Which are reads, which are after-commit writes, and which run at import time?
2. What does ioredis do with a command issued while disconnected, with the default `enableOfflineQueue: true`? With `maxRetriesPerRequest: 1`? Which applies to the cache client and which to BullMQ's client?
3. If Redis is down for 5 minutes, what's the DB cost of falling back for the member map? (Count the `requireMembership` calls per board load.) Does single-flight (`cache.js:74-99`) still help?
4. Crash matrix: the API commits a comment, then Redis is unreachable. Where does the "notify watchers" intent live? What if the process dies right there?
5. Why can't the existing integration tests catch any of this? What would you add, and where?

<details><summary>Hints</summary>

- A per-call timeout around `r.get` via `Promise.race` doesn't cancel the ioredis command. Prefer `commandTimeout` on the client.
- The smallest honest version of "don't lose it": insert a `pending_notification` row in the **same** transaction and have the worker or a sweeper enqueue it. That is the outbox (`curriculum/01`).

</details>

Answer: `training/_answers/ladder-M3.md` · This ticket is the one used in [agentic/EXERCISE.md](../agentic/EXERCISE.md).
