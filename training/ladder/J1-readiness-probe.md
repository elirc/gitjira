# J1: Readiness vs liveness

**Context.** `GET /api/health` (`health.routes.js:7` → `health.controller.js` → `health.service.js`) returns `{ status: 'ok', version, uptimeSeconds }` without touching any dependency. The same URL is Fly's HTTP check (`fly.toml [[http_service.checks]]`, 15 s interval, 2 s timeout) and the Docker `HEALTHCHECK` in `apps/api/Dockerfile`. On Tuesday a DB credential rotation left one machine with a dead Prisma pool. It served 500s for 40 minutes while its health check stayed green.

**Ticket (lead).** "Split health into two contracts. `/api/health` stays as it is: 'the process is alive, don't restart me'. Add `/api/health/ready`: 'send me traffic'. It checks Postgres and Redis with tight timeouts and answers 503 with details when a hard dependency is down. Point the platform's traffic check at ready."

**Constraints.**

- Ready must answer within **1 s**, even when Postgres hangs (not just refuses). Never let the probe itself pile up connections.
- Don't leak internals publicly: the response names the failing dependency, never a connection string or stack trace.
- `/api/health` output must not change. The footer (`apps/web/src/components/Footer.jsx`) and uptime monitors parse it.
- Decide explicitly whether Redis is a hard or a soft dependency for readiness. After M3 the answer changes, so write down which one you chose and why.

**Definition of done.**

- `GET /api/health/ready` returns 200 `{ status: 'ready', checks: { db: 'ok', redis: 'ok' } }` or 503 `{ status: 'not_ready', checks: { db: 'timeout', … } }`.
- A unit test for the check aggregator, with fake checks for ok, fail and hang past the timeout.
- An integration test (supertest, real Postgres, like `test/contract.test.js`) for the 200 path, and a 503 path that points Redis at a closed port.
- `fly.toml` check updated. Explain in the PR why the Docker `HEALTHCHECK` stays on liveness.

**Explain before touching.**

1. Which files change? Where does a "check" that needs Prisma belong: service, controller, or lib?
2. What's the cheapest correct DB probe through Prisma? What does it cost when the pool is exhausted, and how do you bound it?
3. Liveness vs readiness: what goes wrong if the platform **restarts** machines based on a readiness failure during a 2-minute Postgres failover? Walk through it with 2 machines.
4. What status code, and why 503 and not 500? Should the ready response be cacheable?
5. Should `/api/health/ready` be rate-limited or authenticated? Who calls it?
6. How will you prove the 1 s bound in a test without sleeping 30 s?

<details><summary>Hints</summary>

- `Promise.race([check(), timeout(800)])`, but a timed-out Prisma query keeps holding its connection. Ask whether `SELECT 1` can hang when the pool is exhausted, and what `connect_timeout` or `pool_timeout` in `DATABASE_URL` does.
- Keep the route out of `requireAuth`. Consider serving it on the internal network only.
- `metricsMiddleware` will record every probe. Does that pollute your SLO? (See M2.)

</details>

Answer: `training/_answers/ladder-J1.md`
