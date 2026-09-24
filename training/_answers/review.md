# Model review: GitJira `main` @ 0c1a640 (sealed)

The ranking is by production severity for the stated goal: paying teams next month on the Fly setup in `fly.toml` (2 API machines). **[AI]** marks a typical old-AI-generated smell: a doc or comment claiming behavior the code doesn't have, dead code presented as a feature, a harness that can't see the risk it claims to cover, or fabricated evidence.

Authorization and idempotency are strong here: `authorize()` choke point, the attachment IDOR fixed, `dedupeKey`, the atomic `issueCounter`, the partial unique index. The review doesn't re-litigate them. The weak spots are everything that only shows up with **two machines, a deploy, a reconnect, Redis down, or more than 50 issues.**

## Critical

**R1. Production deploys only the API. The worker and the web app have no deploy path, and nothing gates on CI.** [AI]
Evidence: `.github/workflows/deploy.yml` runs `flyctl deploy --app gitjira-api --config fly.toml` for staging and prod, and `fly.toml` builds `apps/api/Dockerfile` only. `apps/worker/Dockerfile` and `apps/web/Dockerfile` exist but no workflow or Fly app references them. `deploy.yml` has no `needs:` or `workflow_run` dependency on `ci.yml`, so a red `main` still deploys staging, and a tag deploys prod whatever CI says.
Scenario: in production nobody drains the `notifications` queue. Every job sits in Redis forever, and the bell stays empty. The SPA isn't served by anything the pipeline deploys. The README "Deploy" section and RUNBOOK describe a pipeline that ships "the system."
Why it matters: the whole async half of the product is not deployed. The failure is silent: the API returns 200, and jobs pile up in Redis until it runs out of memory.

**R2. Attachments live on the machine's local disk, and a missing file crashes the API process.**
Evidence: `attachment.service.js:7` sets `STORAGE_DIR = path.join(process.cwd(), 'uploads')` inside the container. `fly.toml` runs `min_machines_running = 2` with `auto_stop_machines = true`, and there's no volume. `attachment.controller.js:18` does `fs.createReadStream(filePath).pipe(res)` with **no `'error'` listener**.
Scenario: upload lands on machine A. Download routes to machine B (no stickiness), so `ENOENT` is emitted on a stream with no listener. That's an uncaught exception, so **machine B exits**, dropping every in-flight request and every WebSocket on it. After any deploy or auto-stop, _all_ attachments are gone, and every download attempt crashes a machine. An attacker who can guess one attachment id can crash-loop the API.
Why it matters: data loss, plus a remotely triggerable crash.

## High

**R3. Socket.IO runs on 2 machines with no adapter and no sticky sessions.**
Evidence: `socket-server.js:15` creates `new Server(httpServer, …)` with no adapter. `fly.toml` has `min_machines_running = 2`. The client uses default transports (`socket.js:12`), which start with HTTP long-polling and upgrade later.
Scenario: `emitToProject` (`emit.js:11`) reaches only sockets on the emitting machine, so a viewer on the other machine misses the change. Presence (`presenceFor`, `socket-server.js:70`) shows only local sockets. Long-polling requests that land on the other machine fail with "Session ID unknown" (HTTP 400) and reconnect loops follow. The e2e realtime test runs against one process.

**R4. Most mutations never reach other viewers. Only create and comment are broadcast.** [AI]
Evidence: `recordActivity` emits only `if (projectId)` (`activity.service.js:25-27`). Only `createIssue` (`issue.service.js:74-80`) and `addComment` (`comment.service.js:40-45`) pass `projectId`. `updateIssue` (`:216-229`) and `moveIssue` (`:296-301`) don't. Delete, sprint start/complete and assign-to-sprint record no activity at all. `e2e/journeys/04-realtime.spec.js` only tests creation.
Scenario: Ben drags GJ-12 to Done, and Ana's "live" board keeps showing it in To Do until something _else_ is created or commented. This is presented as a live Kanban board (ADR 0016, sprint 08).

**R5. The socket hint is emitted inside the transaction, before commit.**
Evidence: `recordActivity` is called with `tx` from inside `$transaction` (`issue.service.js:74`, `comment.service.js:40`) and emits immediately (`activity.service.js:25-27`). The comment argues about rollback but not about ordering.
Scenario: the client gets `activity`, invalidates and refetches. The GET can run **before the writer commits**, read the old state, and cache it. No second event comes, so the viewer stays stale. On rollback, clients refetch for nothing. The fix is to emit after commit (or from the outbox). See `apprenticeship/curriculum/01-transactional-outbox.md` (the emit is a second side effect with the same failure windows).

**R6. Redis is a hard dependency on the request path, contrary to the runbook and the postmortem.** [AI]
Evidence: when `REDIS_HOST` is set (it is, in prod), `cache.js:15` uses Redis for the member map, which `requireMembership` reads on **every** authorized request (`project.service.js:78`). With `maxRetriesPerRequest: 1` (`cache.js:23`), a down Redis makes `storeGet` throw, which gives a 500 on every project-scoped route. `enqueueNotification` is `await`ed after commit (`issue.service.js:87`, `comment.service.js:55`) on a BullMQ connection with default ioredis options (offline queue enabled), so with Redis down those requests **hang** and then fail **after the write committed**.
Scenario: a Redis blip gives a full outage of the board. The user sees an error for a comment that was saved, retries, and posts a duplicate comment. RUNBOOK "Queue backlog" step 1 says "the api degrades gracefully (enqueue fails are logged, requests still succeed)". Neither half is true, and the 2026-07-10 postmortem describing that "graceful degradation" was narrated, not run (`docs/process/AUDIT-2026-07.md` item 4). This is ladder M3.

**R7. The board and the backlog silently show only the newest 50 issues.** [AI]
Evidence: `useIssues` sends no `limit` (`hooks.js:25-34`). `listIssues` defaults to 50 (`issue.controller.js:28-40`, `issue.service.js:98`). `Board` and `BacklogPage` never read `nextCursor` (`ProjectBoardPage.jsx`, `BacklogPage.jsx:18`).
Scenario: a project with 400 issues (the scale seed has 20k issues across 50 projects) shows 50 cards. Backlog sprint totals and "Start sprint" enablement are computed on a truncated list, so issue 51+ can't be planned from the UI. `docs/performance.md` measured "GET issue list (50)" and called the board fast. It never checked that the board showed the project. This is ladder J2/M1.

**R8. `POST /api/issues/:issueId/watch` has no authorization.**
Evidence: `routes/index.js:28` → `notification.controller.js:17-21` → `watchIssue(issueId, userId)`, with no membership check. `resolveRecipients` then includes watchers (`notification-handler.js:20-21`), and notifications carry `payload.key` and `title` (`issue.service.js:91`).
Scenario: any registered user who learns an issue id can subscribe to a private project's assignment and comment notifications. That leaks keys and titles. (Authz is well covered elsewhere in the archive. Fix it, but don't build a lesson on it.)

## Medium

**R9. The API has no graceful shutdown.**
Evidence: `server.js` registers no signal handlers, and there's no `httpServer.close`, `io.close` or `prisma.$disconnect`. Fly sends SIGINT by default with a 5 s kill timeout, and Node's default SIGINT behavior is to exit at once. `auto_stop_machines = true` stops idle machines. The worker does handle signals (`apps/worker/src/index.js:33-40`).
Scenario: every deploy, scale-down and auto-stop cuts in-flight requests (a PATCH may commit, then the client sees a reset and retries) and drops every socket at once, which causes a reconnect storm. Combined with the missing rejoin, boards go stale after each deploy.

**R10. Metrics can't tell endpoints apart. The runbook's queue metrics don't exist.** [AI]
Evidence: `metrics.js:41` labels by `req.route?.path`, which is router-relative. So `GET /api/projects`, `/api/projects/:key/issues`, `/api/projects/:key/sprints` and `/api/health` are all `route="/"`. There are no BullMQ, socket or worker metrics. `grep -r queue_ apps` finds nothing, yet RUNBOOK step 2 ("the queue-depth gauge") and the postmortem's `queue_consumed_total` refer to them. `/metrics` is served on the public Fly ingress (`app.js:33`, `fly.toml [http_service]`).
Why it matters: you can't build an SLO on a blended series, and you can't alert on a backlog you don't measure. This is ladder M2/J3.

**R11. The health check is liveness only, yet it's used as the readiness gate.**
Evidence: `health.service.js` returns `ok` without touching Postgres or Redis. `fly.toml` `[[http_service.checks]] path = "/api/health"` and the Dockerfile HEALTHCHECK use it. The worker HEALTHCHECK only pings Redis.
Scenario: a machine whose Prisma pool is wedged, or whose DB credentials were rotated, stays in rotation and serves 500s, while an instance that is merely slow at boot gets traffic before it can serve it. This is ladder J1.

**R12. The login rate limiter is per process and grows without bound.**
Evidence: `rate-limit.js:13` keeps a module-level `Map`. Keys are never deleted, only overwritten (`:36`). `keyByIpAndAccount` includes the attacker-controlled email.
Scenario: with 2 machines, the effective limit is 20/min, and it resets on every deploy. A credential-stuffing run with random emails adds one Map entry per attempt, forever, so memory grows until OOM.

**R13. BullMQ failure handling is "keep failures forever and log".**
Evidence: `queue.js:24-26` sets `removeOnFail: false` and `attempts: 5`. The worker only logs `failed` (`worker/src/index.js:22-29`). There's no replay tooling, no alert and no metric. Jobs carry no schema version. `concurrency: 5`, with no limiter. There's no `stalled` handling, and no graceful drain beyond `worker.close()`.
Scenario: a poison payload fails 5 times and sits in Redis forever with nobody told. After a Redis restart without persistence, pending jobs are simply gone. With Redis at `maxmemory-policy allkeys-lru` (a common managed default), BullMQ keys can be evicted. BullMQ requires `noeviction`, and nothing documents that.

**R14. Full-text search silently caps at 200 results and discards the ranking.**
Evidence: `search.service.js:82-89` selects `LIMIT 200` ids ordered by `ts_rank`, then `findMany({ where: { id: { in: ids } }, orderBy: createdAt desc })` (`:49-53`).
Scenario: "login" in a big project returns at most 200 issues, sorted by date, not relevance. Cursor pagination "works" but stops at 200. The UI shows no sign of truncation.

**R15. One socket event refetches every project query in the cache.**
Evidence: `useLiveProject.js:20` calls `invalidateQueries({ queryKey: ['projects'] })`, which is the root prefix for the project list, every project, all issue lists, searches, sprints and open issue details (`packages/shared/src/query-keys.js`). `IssueCard` isn't memoized, and `onSelectIssue` is a new closure on every render of `ProjectBoardPage`.
Scenario: with N viewers, one create triggers N × (active queries) refetches, and a full re-render of every card on each. This is harmless at 20 cards and a CPU and API storm at 2,000 cards with 30 viewers. This is ladder M1.

**R16. The socket keeps its first access token forever. `reconnectSocket` is dead code.** [AI]
Evidence: `socket.js:12-14` captures `getAccessToken()` once. `reconnectSocket` (`:20-25`) has no callers (grep). The access TTL is 15 min (`token.service.js:6`).
Scenario: any reconnect more than 15 min after load fails the handshake. The middleware rejection isn't auto-retried, so realtime is dead until a reload. After logout and login as another user in the same tab, the socket keeps the first user's identity.

**R17. `BacklogPage` defines a component inside render.**
Evidence: `BacklogPage.jsx:33` has `const SprintSection = ({ sprint }) => …` inside the page component.
Scenario: every render creates a new component type, so React unmounts and remounts every sprint section (the select loses focus and DOM state, and cost is O(sections × issues)). Note: the owner's uncommitted work touches this file, so coordinate before refactoring.

**R18. Migration history contradicts ADR 0031. Two migrations are outage-shaped at scale.**
Evidence: `20260709194359_issue_position_fractional/migration.sql` does `ALTER COLUMN "position" SET DATA TYPE TEXT` (from `DOUBLE PRECISION`). That's a full table rewrite under an ACCESS EXCLUSIVE lock. `20260710000000_perf_indexes/migration.sql` uses `CREATE INDEX` without `CONCURRENTLY`, which blocks writes to `Issue` for the whole build. There's no `lock_timeout` anywhere, and the migrations run via `release_command` against the live DB.
Why it matters: fine at 20k rows. At 2M rows, both are multi-minute write outages that the release phase can't protect against. ADR 0031's expand/contract is described but no migration in the history uses it. This is ladder S2.

**R19. Completing a sprint trusts a client-supplied destination sprint.**
Evidence: `sprint.service.js:77`: `destination = moveUnfinishedTo`, with no check that it's a PLANNED sprint of **this** project. `unfinishedCount` is computed outside the transaction (`:73`), so the returned `movedCount` can be wrong.
Scenario: issues move into another project's sprint, or into a completed sprint. (The owner's uncommitted `astraupskill/` work is on exactly this. Compare with it after the review.)

**R20. Realtime authz is checked once, at join.**
Evidence: `socket-server.js:44-53` checks membership on `join-project` only. `removeMember` (`project.service.js:120-131`) invalidates the cache but never touches sockets.
Scenario: a removed member's open tab keeps receiving project activity events until they reload. The events are "hints" with ids only, but they still leak who does what, and when.

## Low

**R21. Refresh rotation has races.** `rotateRefreshToken` reads, then updates (`token.service.js:53-80`), so two parallel refreshes with the same cookie both mint tokens. Two _tabs_ refreshing within a moment make the second one present a revoked token, which revokes the family (`:67-70`) and logs the user out everywhere. The client dedupes only within a tab (`api.js:38-51`). See `apprenticeship/curriculum/03-concurrency-races.md`.

**R22. The issue detail loads every comment.** `getIssueDetail` includes all `comments` with no `take` (`issue.service.js:343-346`). The activity feed was bounded in sprint 12, but comments weren't.

**R23. Notifications have no pagination and a weak index for the badge.** `unreadCount` counts `(userId, readAt IS NULL)` with only `@@index([userId])` (`schema.prisma`, `Notification`), polled every 30 s per open tab (`hooks.js:242`). That's cheap now, and a hot query at 40k tabs.

**R24. The test harness can't observe the riskiest behavior.** [AI]
`test/setup.js` sets `DISABLE_QUEUE=1` and `CACHE_BACKEND=memory`, and every test runs inside one rolled-back transaction (`test/tx.js`). So emit-before-commit (R5), after-commit enqueue failure (R6), Redis failure modes and N−1 migration compatibility are structurally untestable here, while the coverage gates (`vitest.config.js`: 75/65/75/78) pass. See `apprenticeship/curriculum/05-verify-before-trust.md`.

**R25. Operational evidence is fabricated or aspirational.** [AI]
The postmortem (`docs/postmortems/2026-07-10-redis-outage.md`), the "~90s rollback drill" (RUNBOOK), `queue_consumed_total` and `worker_redis_connected` (never implemented), and the comment "the socket makes it feel instant" (`hooks.js:241`). No server code emits notification events, so the bell is 30 s polling only. The repo's own audit admits the drill was narrated.

**R26. Deploy hygiene.** `superfly/flyctl-actions/setup-flyctl@master` is an unpinned action (supply chain). Staging and prod share one `fly.toml` (`app = "gitjira-api"`, overridden with `--app`), so staging inherits prod sizing. There's no smoke test after deploy and no automatic rollback.

**R27. The command palette queries projects on the login page.** `CommandPalette` is mounted at the app root (`App.jsx:33`) and calls `useProjects()` unconditionally (`CommandPalette.jsx:17`). A logged-out visitor causes a `/projects` 401, which triggers a refresh attempt and then `authLost`, on every load. That's noise in the logs and the error rate.

**R28. Board order can disagree between the browser and Postgres.** Fractional keys are base-62 strings mixing upper and lower case (`packages/shared/src/fractional-index.js`). The browser sorts with JS code-unit comparison (`lib/board.js:14`), while `createIssue` finds "the last card" with SQL `ORDER BY position DESC` (`issue.service.js:38-42`), which uses the database collation. Under a linguistic collation (for example `en_US.UTF-8`), `'a' < 'B'`. Under `C` it's the reverse. A new issue can land in the middle of the column. The fix is `COLLATE "C"` on the column or on the ORDER BY. (Found by the navigation pass. Verify the collation of your DB with `SHOW lc_collate`.)

**R29. The web container proxies only `/api` and `/socket.io` to a hostname `api` that exists only in compose** (`apps/web/nginx.conf`). The image can't be deployed as-is to any platform where the API isn't reachable at `http://api:3000`. That's minor, but it's part of R1's "web has no production path."

## Top 3 before paying customers

1. **R1 + R2:** deploy the worker, put attachments in object storage, and add an error handler on the stream. Without this, core features are missing or crash the API.
2. **R6 + R9:** make Redis a soft dependency on the request path, and add graceful shutdown. Without this, every Redis blip and every deploy is a user-visible outage.
3. **R3 + R4 + R7:** the realtime board must actually be realtime (adapter, stickiness, emit every mutation after commit) and complete (no 50-issue cap). That's the product's core promise.
