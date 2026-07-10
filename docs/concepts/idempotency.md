# Concept: idempotency and at-least-once delivery

*A one-page primer, readable without the codebase. Behind the notification jobs in Sprint 09.*

## Why queues, and the catch
A job queue (BullMQ on Redis here) lets you move slow or failure-prone work OFF the request
path: the web request drops a job and returns instantly; a separate worker does the work
later, and can retry if it fails. Great — but retries create a subtle rule you must obey.

Almost every queue delivers **at-least-once**: a job is guaranteed to run, but might run
**more than once**. Why? The worker finishes the work, then tells the queue "done" (acks). If
it crashes *between* those two steps, the queue never heard the ack and redelivers the job.
The work already happened; now it happens again.

## The consequence: handlers must be idempotent
**Idempotent** = running it twice has the same effect as running it once. If your notification
handler creates a row every time it runs, a redelivered job creates a DUPLICATE notification.
The user gets pinged twice for one event. Multiply across a busy system and it's a mess.

## How to make an operation idempotent
Derive a **stable key** from the event's identity — NOT random, NOT the current time — and
enforce it UNIQUE in the database:

```
dedupeKey = `${eventId}:${recipientId}`   // same for every retry of the same event
```

On insert, a retried job produces the SAME key and hits the unique constraint. Catch that
specific error and treat it as success ("already delivered"), not a failure. Now the job can
run five times and the user still gets exactly one notification.

**The footgun** (and Sprint 09's planted bug): using `randomUUID()` for the dedupe key. It
looks unique-per-notification and passes a single-run test — but every retry generates a NEW
key, so it defeats the entire point. The key must come from the event, not from chance.

## Retries and the dead-letter queue
- **Exponential backoff**: retry after 1s, 2s, 4s… not instantly. Instant retries hammer a
  dependency that's probably already struggling.
- **Dead-letter queue**: after N failed attempts, stop retrying and quarantine the job in a
  "failed" set. You keep it so a human can inspect *why* it failed and replay it once fixed.

## One more race
Marking notifications read while new ones stream in: bound the "mark all read" to
notifications created at/before the click, or an arrival that lands mid-operation can be
marked read before the user ever saw it. (Also a planted bug this sprint.)

## Go deeper
- BullMQ docs — jobs, retries, and the flow of acks.
- "Exactly-once" delivery is mostly a myth end-to-end; the practical answer is
  "at-least-once delivery + idempotent handlers."
