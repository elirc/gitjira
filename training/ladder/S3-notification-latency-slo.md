# S3: "Assigned → bell within 10 s, p99"

**Context.** Here's the notification path end to end today:

1. `updateIssue` commits (`issue.service.js:208-233`).
2. `autoWatch` and `enqueueNotification` run after the commit, awaited on the request (`:239-247`).
3. BullMQ stores the job in Redis (`jobs/queue.js`, 5 attempts, exponential backoff from 1 s).
4. The worker (`apps/worker/src/index.js`, `concurrency: 5`) runs `handleNotificationJob`, which resolves recipients and inserts one row per recipient, deduped by `dedupeKey`.
5. The bell polls `/api/me/notifications` every **30 s** (`hooks.js:236-244`).

Nothing pushes. The comment claiming a socket makes it instant is untrue (R25). The worker isn't even deployed (R1).

**The ask.** An enterprise contract clause: "Assignment and mention notifications are visible to the recipient within 10 s at p99, measured monthly." Sales has already agreed to it.

**Scenario.** Design the pipeline and the measurement that let you sign this honestly, or tell sales what you can sign instead.

**Operating constraints.**

- Peak is 3k notification-producing events/min, and a bulk reassign can produce 2,000 events in 1 s.
- There are 2+ API instances and N workers. Redis can fail over (about 30 s).
- There's no duplicate bell entries (the existing `dedupeKey` guarantee) and no lost notifications for committed changes.
- Measurement must be end to end (commit → visible to the user), not just "job processed."

**Deliverables (in `training/ladder/notes/S3-notify.md`).**

1. The pipeline:
   - capture (outbox in the same transaction; link `apprenticeship/curriculum/01-transactional-outbox.md`, don't re-derive it);
   - relay (poller versus LISTEN/NOTIFY versus CDC);
   - queue (BullMQ settings, job ids from event ids; INC-002 is the cautionary tale);
   - fan-out (worker concurrency, batch insert);
   - push (worker → Redis emitter → API user rooms → client, and a fallback poll interval).
2. The latency budget table: each hop's p99 target, adding up to under 10 s, with the reasoning.
3. The SLI definition: which timestamps (`ActivityEvent.createdAt`, `Notification.createdAt`, a client "rendered" beacon?), where it's computed, and what happens to the SLI when the user is offline.
4. Scaling: autoscale workers on **lag**, not CPU (J3). Bulk-reassign backpressure. Priority lanes, so a bulk import can't starve mentions.
5. The failure modes and the promise you can actually make: Redis failover, a worker deploy, a poison job, a Postgres failover. Which of them breach 10 s, and how is that counted against the budget?
6. The staged rollout plan, and the "tell sales" paragraph.

**Explain before touching.**

1. Where is time spent today, hop by hop, in the best and worst case? The 30 s poll dominates, but what's second?
2. Why is "enqueue after commit, awaited on the request" both a latency risk and a correctness risk? Which one does the outbox fix, and which one does it make worse?
3. How does a pushed notification reach a user whose socket is connected to a different API instance than the one the worker talks to?
4. Exactly-once is impossible end to end. So which part is at-least-once, where is the dedupe, and what does the user see on a duplicate push?

Answer: `training/_answers/ladder-S3.md`
