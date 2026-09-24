# J3 reference: queue metrics

## Who can measure what

- **Queue depth by state:** any process with a Redis connection. `queue.getJobCounts('waiting','active','delayed','failed','completed')` uses cheap Redis commands (LLEN or ZCARD), O(1)-ish per state.
- **Lag and duration:** only the **worker** sees `job.processedOn` and `finishedOn` as they happen. Measuring them from the API would mean reading job hashes, which is expensive and delayed.
- **Consumption is happening:** only the worker. A gauge exported by the API can't tell a dead worker from an idle one, except indirectly (waiting > 0 and not decreasing).

So choose (a): the worker exposes its own `/metrics` on an internal port (a tiny `http.createServer` with the prom-client registry). The API may also export depth. The alert source of truth for consumption is the worker.

## Implementation notes

- A depth gauge with `collect()`: it keeps a cached last value, refreshed at most every 5 s via single-flight, with a 500 ms timeout around `getJobCounts`. If Redis is down, it reports the last value plus `bullmq_up 0`, and `/metrics` stays fast. A `collect` that awaits a hanging Redis stalls the whole scrape (INC-004 shows why scrape latency matters).
- Worker:
  - `notification_job_lag_seconds.observe((job.processedOn - job.timestamp)/1000)` at the start;
  - a duration timer around `handleNotificationJob`;
  - `failed` handler: `final = job.attemptsMade >= job.opts.attempts`.
- Labels are `queue` and `state` only.

## Key answers

- **Lag vs depth:** 5,000 waiting jobs can be fine (a bulk import, draining at 2k/s), and 10 waiting jobs can be terrible (a dead worker, each waiting 20 minutes). Users feel lag. Alert on `histogram_quantile(0.99, rate(notification_job_lag_seconds_bucket[5m])) > 10`, **and** on `waiting > 0 and rate(completed) == 0 for 5m` (a stalled consumer).
- **`removeOnFail: false`:** the failed count only grows. An alert on `failed > 0` fires forever after the first poison job. Alert on the _rate_ of final failures, and add a retention policy (for example, keep 7 days or 10k), since Redis memory is finite.
- **Testing a hanging Redis:** inject the queue into the collector. A fake whose `getJobCounts` returns `new Promise(() => {})`, with fake timers, gives a scrape that returns within the timeout with `bullmq_up 0`.

## RUNBOOK fix

Replace "check the queue-depth gauge" with the real series names, and add "if `bullmq_up == 0`, see M3" and "if lag p99 > 10 s but depth is small, check the worker is deployed and running (R1)."
