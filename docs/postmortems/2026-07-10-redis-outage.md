# Post-mortem — staging Redis outage (practice incident)

**Date:** 2026-07-10 · **Severity:** SEV-3 (degraded, no data loss) · **Status:** resolved
**Type:** planned game-day (we killed Redis on staging on purpose to exercise the runbook)

> Blameless. The goal is to improve the system and the runbook, never to assign
> fault. "The on-call did X" describes the system's affordances, not a person's error.

## Summary

We deliberately killed the Redis instance on staging to test detection and the
runbook's queue-backlog procedure. Notifications stopped being delivered; the API
and board stayed fully functional. Detection, diagnosis, and recovery took **6
minutes**. Two real gaps surfaced and became action items.

## Timeline (UTC)

| Time  | Event                                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14:02 | Redis container stopped (`docker kill staging-redis`).                                                                                               |
| 14:03 | Worker logs fill with connection-refused; queue-depth gauge flatlines (nothing consumed).                                                            |
| 14:03 | **No alert fired.** We only noticed because we were watching. (Action item 1.)                                                                       |
| 14:05 | On-call opens RUNBOOK.md → "Queue backlog" section; confirms API is healthy (`/api/health` 200) — the blast radius is notifications only.            |
| 14:06 | Confirms enqueue failures are logged and requests still succeed (graceful degradation held — sprint 9's design paid off).                            |
| 14:07 | Restart Redis (`docker start staging-redis`). Worker reconnects automatically.                                                                       |
| 14:08 | Queue drains; notifications delivered. Because jobs are idempotent (sprint 9), the retried backlog did not double-notify. Verified counts. Resolved. |

## Impact

- Notification delivery delayed ~6 minutes for staging users.
- No data loss. No impact to core issue/board/auth flows (they don't depend on
  Redis on the request path).

## Root cause

Intended: Redis was killed on purpose. The _interesting_ finding is what the
outage revealed about our observability and dependency handling.

## What went well

- **Graceful degradation held.** The API never depended on Redis on the request
  path (sprint 9), so the core product stayed up. The failure was contained to
  the feature that actually needs the queue.
- **Idempotent jobs** meant the drained backlog didn't double-send. The sprint-9
  dedupe key did exactly its job.
- The runbook's queue-backlog page was accurate and fast to follow.

## What went wrong / action items

1. **No alert on queue-consumption stall.** We found out by watching, not by
   being told. → **Action:** add an alert on `queue_consumed_total` rate == 0 for
   > 60s. **[filed as an issue]**
2. **The worker retried Redis connection silently and noisily** — logs were
   useful but there was no metric for "worker is up but can't reach Redis". →
   **Action:** add a `worker_redis_connected` gauge and alert on it. **[filed as an issue]**

## Rollback drill (same game-day)

Separately, we redeployed the previous API version on staging to time a rollback:
**~90 seconds** to healthy on the previous release (recorded in RUNBOOK.md). The
expand/contract discipline (ADR 0031) meant the rollback was schema-safe with no
special steps.
