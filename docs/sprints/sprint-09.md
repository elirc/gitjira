# Sprint 09 — Notifications & Background Jobs · Learning brief

**Levels:** L2, L3, L4 · **PR:** #82 · **Release:** v0.5.0

## What this sprint teaches
1. **Job queues** — moving work off the request path; a separate worker process. → `apps/worker`, ADR 0018, `docs/concepts/idempotency.md`
2. **At-least-once ⇒ idempotent handlers** — the dedupe-key discipline; the planted random-key bug.
3. **The activity seam, third consumer** — sprints 05→08→09 all hang off recordActivity/events.
4. **Fan-out on write** — recipients computed once, in the background. → ADR 0019
5. **Job reliability** — retries, backoff, dead-letter queue; a mark-all-read race (planted).

## Read the PR in this order
`jobs/queue.js` (the enqueue side + retry policy) → `apps/worker/src/index.js` (the process) →
`jobs/notification-handler.js` (the fan-out — spot the dedupeKey GOTCHA) → the enqueue wiring
in issue/comment services → **the review threads** (idempotency red→green, mark-all-read race).

## Exercises
1. Add a "sprint ending tomorrow" scheduled (cron) job.
2. Make the handler non-idempotent on purpose (already is!) — write the test that catches double-delivery, then fix it.
3. Add per-type notification preferences (mute assignment or mention).

<details><summary>Hints</summary>

1. BullMQ supports repeatable jobs; the worker gets a new job type.
2. This is literally the review flow — run the same job twice, assert one row.
3. A NotificationPref table + a check in the fan-out.
</details>
