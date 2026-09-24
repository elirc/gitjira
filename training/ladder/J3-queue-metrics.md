# J3: Queue metrics that actually exist

**Context.** `docs/RUNBOOK.md` ("Queue backlog", step 2) tells on-call to "check the queue-depth gauge." `docs/postmortems/2026-07-10-redis-outage.md` names `queue_consumed_total` and `worker_redis_connected`. `grep -rn "queue_" apps/` finds nothing. `/metrics` (`apps/api/src/lib/metrics.js`) has only HTTP RED metrics plus Node defaults. The worker (`apps/worker/src/index.js`) has no metrics endpoint at all.

**Ticket (lead).** "Make the runbook true. Expose queue depth by state and job latency so we can alert on 'notifications are backing up' and 'the worker isn't consuming'."

**Constraints.**

- The API process must not call Redis on every scrape if Redis is down. A dead Redis must not make `/metrics` hang, since that blinds you exactly when you need it (see M3).
- Use prom-client's collect callback for gauges (`new Gauge({ collect() { … } })`), with a cached value and a short timeout.
- The worker runs with no HTTP server. Choose: (a) the worker exposes its own `/metrics` on an internal port, or (b) the API reports queue state it reads from Redis. Defend the choice for _consumption_ metrics.
- Labels must stay bounded: `state` (waiting, active, delayed, failed, completed) and `queue`. No job ids, no issue ids.

**Definition of done.**

- `bullmq_jobs{queue="notifications",state="waiting"}` (and the other states) visible on `/metrics`.
- `notification_job_duration_seconds` histogram, measured in the worker around `handleNotificationJob`.
- `notification_job_lag_seconds` histogram: the time from enqueue (`job.timestamp`) to processing start.
- `notification_jobs_failed_total` counter, labelled by `final` (true/false) so retries and dead-letters can be told apart.
- A unit test for the collector with a fake queue (`getJobCounts` resolves, rejects, or hangs), and a RUNBOOK diff pointing at the real metric names.

**Explain before touching.**

1. Which process can observe which fact? Map each metric to the process that can measure it honestly.
2. What does `getJobCounts()` cost in Redis at 1M waiting jobs? Is it O(1)?
3. Why is _lag_ a better alert signal than _depth_ for "users are waiting for notifications"? Give a case where depth is high and nothing is wrong.
4. `removeOnFail: false` (`queue.js:26`): what does `failed` count look like after 6 months, and how should the alert be written so it doesn't fire forever?
5. How will you test the "Redis hangs" path without Redis?

<details><summary>Hints</summary>

- BullMQ counts are `ZCARD`/`LLEN`-style, so they're cheap. The risk is connection behavior, not complexity.
- `job.processedOn - job.timestamp` is the lag, and `job.finishedOn - job.processedOn` is the duration.
- Alert on `rate(notification_jobs_failed_total{final="true"}[15m]) > 0`, not on the failed-set size.

</details>

Answer: `training/_answers/ladder-J3.md`
