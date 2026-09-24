# INC-002 answer: the job id identifies an entity, not an event

## Root cause

PR #157 sets `jobId = kind|issueId|actorId`. That string names a **(kind, issue, actor) triple**, not **one occurrence of an event**. Every later event with the same triple collides with it:

1. **Queue level.** BullMQ's add script checks whether the job key already exists. If it does, it emits `duplicated` and returns the existing id without creating a job (`node_modules/bullmq/dist/cjs/commands/includes/handleDuplicatedJob.lua`, which XADDs `"event" "duplicated"`). That's the Redis sample. "Already exists" lasts as long as the job hash is kept. `queue.js:24-26` keeps the last **1000 completed** jobs (`removeOnComplete: 1000`) and **every failed job forever** (`removeOnFail: false`). At about 2.4k jobs/day, a completed id blocks reuse for about 10 hours. A failed one blocks it permanently.
2. **Database level, even after eviction.** The handler derives `eventId = data.eventId ?? job.id` (`notification-handler.js:35`), and `dedupeKey = ${eventId}:${userId}` (`:42`). Once the old job is evicted, the new add succeeds and the job runs. But the dedupeKey is identical to Monday's row, so `Notification.dedupeKey @unique` raises P2002, which the handler deliberately treats as "already delivered" (`:58`). The result is `notified: 0`, with no error.

So a repeat event for the same issue by the same actor is dropped at the queue while the old job is retained, and dropped by the unique index after that. **The loss is permanent and silent.** It hits:

- re-assignments of an issue by the same person (Ana → Ben twice);
- **every comment after the first** by the same author on an issue. `comment.mention` jobs also fan out to watchers (`resolveRecipients` adds watchers for every kind, `:20-21`), so watchers lose later comment notifications as well as mentions;
- not new issues, because a new `issueId` means a new triple. That matches "new issues seem fine."

The PR's diagnosis was right: two enqueues of one event got two job ids, so the dedupe keyed on `job.id` failed. The concept it confused is **event identity versus entity identity**. An idempotency key must be unique per _intended effect_. See `apprenticeship/curriculum/02-idempotency.md` ("same request → same key; different request → different key").

## Diagnostic path

1. The drop tracks request volume only for _repeat_ actions, and there are no failures. That's silent dedupe, not an outage.
2. The missing `processing notification job` line means the job was never created. Check `queue.add`'s result: it returns the existing job, and Redis shows `duplicated`.
3. Read the jobId template and ask what two different events would produce. They'd produce the same string, and that's the bug.

## Fix

Give every event a real identity that already exists in the data: the **`ActivityEvent.id`** written in the same transaction as the change (`activity.service.js:14-16` returns the event), or `comment.id` for mentions. Thread it through:

```js
// issue.service.js updateIssue: capture the event created in the tx
const { updated, assignEvent } = await prisma.$transaction(async (tx) => { ...
  const assignEvent = await recordActivity(tx, { kind: 'assignee.changed', ... });
  return { updated: result, assignEvent }; });
await enqueueNotification({ eventId: assignEvent.id, kind: 'issue.assigned', ... });

// queue.js
await getNotificationsQueue().add('fan-out', job, { jobId: `evt-${job.eventId}` });
```

A retried enqueue of the _same_ event now dedupes at the queue (same `ActivityEvent.id`), and a _new_ event gets a new id. The handler's dedupeKey already prefers `data.eventId`. Even better: enqueue from an outbox keyed by the activity event, which also closes the "commit succeeded, enqueue failed" gap. See `apprenticeship/curriculum/01-transactional-outbox.md` and ladder S3.

## Regression tests

- Unit: two _different_ events on the same issue by the same actor must produce different job ids. With the PR's signature this test can't even be written without an event id, which is the design smell.
- Integration (API + real Postgres, handler called directly as `test/notification.test.js` does): run the handler for assignment #1, un-assign, run for assignment #2, and `expect(await prisma.notification.count({ where: { userId: ben.id } })).toBe(2)`. This fails on the branch.
- Queue-level (needs Redis, nightly): add two events and assert `getJobCounts().completed` increases by 2.

The PR's own test (`notification-job-id.test.js`) only proves stability. It never asks for _distinctness_ across events. A dedupe test needs both halves: same event gives the same key, and different events give different keys.

## Recovery

Events from Tue 11:00 to the fix deploy are recoverable from `ActivityEvent` (kind `assignee.changed` and `comment.added`, where `createdAt` is in the window). Recompute recipients with the same rules and insert with `dedupeKey = ${activityEvent.id}:${userId}` (new-style keys don't collide with the old ones). Decide with product whether to deliver them as unread or as read. A burst of 3-day-old "assigned to you" alerts is noise. Mentions need the comment body re-parsed (`extractMentions`).

## Why review missed it

The PR had a correct bug report, a plausible mechanism, a real BullMQ feature, and green tests. The reviewer checked "does this stop duplicates?" but not "what else now looks like a duplicate?" Nothing in CI exercises the queue: `test/setup.js` sets `DISABLE_QUEUE=1` (review R24).

## Detection

Alert on `notifications_created_total / activity_events_notifiable_total` dropping below a baseline, and export a counter for BullMQ `duplicated` events (J3). A dedupe mechanism that fires more than about 1 % of the time is a bug, not protection.

## Postmortem (short)

Impact: about 1,800 notifications/day silently not delivered for 2.5 days. Root cause: the idempotency key was scoped to an entity instead of an event. Action items: event ids from `ActivityEvent`, a duplicated-events metric and alert, a distinctness test, the backfill script, and a note in `docs/concepts/idempotency.md`.
