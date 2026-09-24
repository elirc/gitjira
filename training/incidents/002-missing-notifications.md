# INC-002: Some notifications never arrive

**Severity:** SEV-3 (silent partial loss of a feature, no errors)
**Branch:** `training/incidents/002-missing-notifications`
**Trigger:** there was no alert. A customer escalation came in Thursday, and API release `v1.2.0` (containing PR #157) had shipped Tuesday 11:00.

## The escalation

> "Our triage rotation is broken. On Monday I assigned GJ-412 to Ben and he got the bell notification. On Wednesday I took it back, then assigned it to Ben again. Nothing. Same with mentions: my first @ben on an issue notifies him, but later mentions on that issue don't. New issues seem fine."
> — Ana (project admin, GJ)

## Metrics

| Metric (daily)                                           | Mon (before) | Wed (after)   |
| -------------------------------------------------------- | ------------ | ------------- |
| `Notification` rows inserted                             | 4,812        | 2,977 (−38 %) |
| API `POST /issues/:n/comments` + `PATCH /issues/:n`, 2xx | 9,640        | 9,710         |
| BullMQ `notifications` jobs completed                    | 3,905        | 2,410         |
| BullMQ `notifications` jobs failed                       | 3            | 0             |
| Worker errors in logs                                    | 3            | 0             |
| Duplicate-notification complaints (the reason for #157)  | 2            | 0             |

Request volume is flat. Jobs completed dropped by about the same ratio as notifications. Nothing failed.

## Logs

API, one of Ana's reassignments (pino, trimmed):

```
Wed 09:14:02.118 INFO request completed  PATCH /api/projects/GJ/issues/412 200 38ms
```

Worker, the same minute: **no** `processing notification job` line for GJ-412. For Monday's first assignment:

```
Mon 16:40:55.310 INFO processing notification job  jobId=issue.assigned|ckz8q1…|u_ana  name=fan-out
Mon 16:40:55.341 INFO notification job done        jobId=issue.assigned|ckz8q1…|u_ana  result={"notified":1}
```

Redis, `MONITOR` sampled for 30 s during a reassignment (trimmed):

```
"EVALSHA" "…addStandardJob…" … "bull:notifications:issue.assigned|ckz8q1…|u_ana" …
"XADD" "bull:notifications:events" "MAXLEN" "~" "10000" "*" "event" "duplicated" "jobId" "issue.assigned|ckz8q1…|u_ana"
```

## The suspect PR (#157, merged Tue 10:20, CI green)

> **fix(jobs): stop duplicate notification jobs on retried enqueues.** Two users got the same "assigned to you" notification twice. The API retried `queue.add` after a Redis timeout and each add got a fresh job id, so the handler's dedupeKey (derived from `job.id`) differed and the unique constraint never fired. Give each fan-out a deterministic BullMQ jobId.

```diff
--- a/apps/api/src/jobs/queue.js
+++ b/apps/api/src/jobs/queue.js
+export const notificationJobId = (job) => `${job.kind}|${job.issueId}|${job.actorId}`;
+
 export async function enqueueNotification(job) {
   if (process.env.DISABLE_QUEUE === '1') return; // tests can opt out
-  await getNotificationsQueue().add('fan-out', job);
+  await getNotificationsQueue().add('fan-out', job, { jobId: notificationJobId(job) });
 }
```

It also adds `apps/api/test/notification-job-id.test.js` (3 passing tests).

## Your tasks

1. Explain the `duplicated` event in the Redis sample. What does BullMQ do with an `add` whose `jobId` already exists, and how long does "already exists" last in this queue's configuration (`queue.js:18-27`)?
2. Suppose the old job has been removed from Redis. Would Ben get the Wednesday notification then? Follow `job.id` into `apps/api/src/jobs/notification-handler.js:35-48` and the `Notification.dedupeKey` constraint.
3. The PR's diagnosis of the duplicate was correct. Name the concept it confused, then design the right identity for "this event": which value, from where, and whether it's stable across an API retry.
4. Write a test that would have failed on this PR. The existing tests check that the id is stable, and that's exactly the problem.
5. Which notifications from Tue 11:00 onward are lost for good, and can you backfill them? (Hint: `ActivityEvent`.)
6. What alert would have caught this on Tuesday instead of Thursday?
