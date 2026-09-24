# S3 reference: notification latency SLO

## Where time goes today

- Best case (Redis up, worker running, recipient's tab polling): commit → enqueue a few ms → the worker picks up in under 100 ms → insert ms → **up to 30 s** until the next poll (`hooks.js:242`), about 15 s on average. So the p99 is about 30 s. The poll dominates.
- Second: **retries**. A failed fan-out retries at 1, 2, 4 and 8 s (`queue.js:23-24`), so one transient DB error adds 1–15 s.
- Worst: the worker isn't deployed (R1), which means infinite latency. Or Redis is down, so enqueue hangs the request (R6).

## Pipeline

1. **Capture:** an outbox row in the same transaction as the change (`curriculum/01`), keyed by `ActivityEvent.id`.
2. **Relay:** a poller in the worker every 250–500 ms, `SELECT … FOR UPDATE SKIP LOCKED LIMIT 500`, which is simple and good to about 1k events/s. LISTEN/NOTIFY cuts idle latency but is lossy without the poll behind it. CDC (Debezium) is overkill here. Enqueue with `jobId = evt-<activityEventId>` (INC-002).
3. **Queue:** BullMQ with `enableOfflineQueue: false` on producers, Redis `noeviction`, and separate queues (or priorities) for `mention`/`assigned` versus bulk events, so a 2,000-event bulk reassign can't delay a mention.
4. **Fan-out:** the worker resolves recipients, then does a single `createMany({ skipDuplicates: true })` with `dedupeKey` (one round trip instead of N inserts).
5. **Push:** the worker publishes `notification.created {userId, notificationId}` through `@socket.io/redis-emitter`. The API instances, with the Redis adapter (M4), deliver to room `user:<id>`, which each socket joins at connection (`socket-server.js` `connection` handler). The client invalidates `['me','notifications']`, and polling drops to 5 min as a safety net.

## Budget (p99, commit → visible)

| Hop                                  | p99        |
| ------------------------------------ | ---------- |
| Commit → relay picks the outbox row  | 0.5 s      |
| Relay → enqueue → worker start (lag) | 1.5 s      |
| Fan-out (resolve plus batch insert)  | 0.5 s      |
| Emit → adapter → client socket       | 0.5 s      |
| Client refetch → render              | 1.0 s      |
| Retries and bursts (headroom)        | 6 s        |
| **Total**                            | **≤ 10 s** |

## SLI

Measure `visible_at − ActivityEvent.createdAt` per notification. The server can emit `delivered_at` at push time. The client sends a beacon on render, which is optional, sampled and privacy-reviewed. **Offline recipients:** exclude them from the latency SLI and measure "delivered to the server-side inbox within 10 s" separately. Otherwise a user on vacation breaches your SLO. Write that definition into the contract.

## Scaling and backpressure

Autoscale workers on `notification_job_lag_seconds` p99 (J3), not CPU. A bulk reassign is chunked into jobs of about 100 events, in the low-priority lane. A per-project rate cap stops one tenant from starving others. Postgres connection math: workers × concurrency must fit the pool.

## Failure modes and the honest promise

| Failure                     | Effect                                                                                              | Counted?                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Redis failover (about 30 s) | outbox rows accumulate; the relay drains on recovery; some notifications arrive after about 30–40 s | yes, it burns budget. At 99 %/month you can afford a few such events |
| Worker deploy               | graceful `worker.close()` finishes the active jobs; the relay continues on the new task             | small                                                                |
| Poison job                  | 5 attempts, then dead-lettered; that one notification is lost from the SLI                          | counted as bad; an alert on the final-failure rate                   |
| Postgres failover           | capture itself fails (the write fails), so there's no notification owed                             | not counted (no committed change)                                    |

**What to sign:** "95 % of assignment and mention notifications are delivered to an online recipient within 10 s, monthly, excluding scheduled maintenance." Offer the p99 version after one quarter of measured data. **Tell sales:** today's number is about 30 s at p99 and unmeasured, and the production worker isn't deployed. Signing p99 ≤ 10 s now means signing a promise you have no instrument to verify.

## Exactly-once

The outbox, the relay and the queue are **at-least-once**. The dedupe is `Notification.dedupeKey` (a unique index), so a duplicate job becomes a no-op insert. The push can duplicate (a relay re-add, a retry), and the client's reaction is idempotent (invalidate and refetch the list), so the user sees one entry.
