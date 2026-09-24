# J1 reference: readiness vs liveness

## Placement

- `apps/api/src/services/health.service.js`: add `checkReadiness({ checks, timeoutMs })`. It's pure orchestration: it runs the named checks in parallel, each wrapped in a timeout, and returns `{ ready, checks }`. That makes it unit-testable with fake checks.
- `apps/api/src/lib/`: the dependency probes live next to what they probe. `prisma.js` gets a `pingDb()` that runs `SELECT 1` through `prisma.$queryRaw`. For Redis, use a dedicated tiny client (`lazyConnect`, `enableOfflineQueue: false`, `connectTimeout` and `commandTimeout` about 500 ms) and send `PING`. Don't reuse the BullMQ connection: its offline queue would make the probe _wait_, not fail.
- `controllers/health.controller.js` + `routes/health.routes.js`: `GET /ready` → 200 or 503. Set `Cache-Control: no-store`.
- `fly.toml`: point `[[http_service.checks]]` at `/api/health/ready`. Keep the Dockerfile `HEALTHCHECK` on `/api/health`. The container runtime's health check is a _restart_ signal (liveness). Restarting a healthy process because Postgres is failing over makes things worse.

## Key answers

- **Cheapest DB probe:** `SELECT 1` through the pool. When the pool is exhausted, the probe waits for `pool_timeout` (Prisma default 10 s), so the 800 ms race returns "timeout" while the query stays queued. That's acceptable: the probe reports correctly, and the queued query dies at `pool_timeout`. To keep probes from piling up, cache the last result for about 1 s (single-flight, like `cache.js`) so 15 s checks plus scrapers can't stack.
- **Restart on readiness is the classic outage amplifier.** During a 2-minute RDS or Postgres failover, both machines fail readiness. If that triggered restarts, both would restart, re-run boot and env validation, and come back into the same failover, with added reconnect load and cold caches. Readiness should _remove from rotation_. Liveness should only detect a wedged process (the event loop stuck, not a dependency down). On Fly, `http_service.checks` gates routing. Know which signal your platform uses for which action.
- **503 vs 500:** 503 means "temporarily unable, try another instance or later," which load balancers understand. 500 means "a bug handling this request."
- **Redis: hard or soft?** Today it's hard, because every authorized request reads the member map from Redis (R6). So the honest answer at HEAD is "Redis is a hard readiness dependency." After M3 (fallback to the DB), it becomes soft: report it as `degraded` with 200. Writing this down is the point of the constraint.
- **Exposure:** unauthenticated, no body details beyond `ok`/`fail`/`timeout` per dependency. Exclude it from the SLI metrics (M2) and from request logs, as `request-logger.js:14` already does for `/api/health`.
- **Testing the bound:** inject checks. A fake check that never resolves, plus `vi.useFakeTimers()` and `advanceTimersByTimeAsync(800)`, makes the timeout test instant. The integration test for 503 sets `REDIS_HOST=127.0.0.1` and `REDIS_PORT=1` (refused immediately) and checks the status.

## Common misses

- Reusing the app's Redis or BullMQ client, so the probe hangs in the offline queue.
- Putting DB checks in liveness, so every DB blip becomes a restart storm.
- Leaving `/api/health` in the SLI denominator. The health traffic makes the SLO look better than users experience it.
