# Sealed: architecture self-check answers

Compare these with your written answers. Each answer includes the evidence you should have found.

1. **Authz served from something other than Postgres.**
   - `requireMembership` reads the member map through `cached()` (`services/project.service.js:14-22, 78`, `lib/cache.js:80-99`).
   - The store is Redis when `REDIS_HOST` is set and `CACHE_BACKEND` isn't `memory` (`lib/cache.js:15`). Otherwise it's a per-process Map. Either way the TTL is 60 s (`project.service.js:9`).
   - Invalidation is explicit: `addMember` and `removeMember` call `invalidate` (`:116, :129`). Any new membership write path that forgets to invalidate grants stale access for up to 60 s.
   - The in-flight single-flight Map (`cache.js:74`) is per process.
   - Socket room membership is a second cache. A socket that joined a room keeps receiving that project's events after the user is removed from the project, until it leaves or disconnects. Nothing re-checks (`realtime/socket-server.js:44-54`).
2. **Flow 2 side effects, in order.**
   - Before the transaction: read the last position (`issue.service.js:38-43`).
   - Inside the transaction: counter increment, issue insert, activity insert, **socket emit**. The emit is outside Postgres and happens before commit (`activity.service.js:25-27`).
   - Commit.
   - After commit: `autoWatch` upsert in its own statement, then `Queue.add` to Redis, which is outside Postgres (`issue.service.js:85-93`).
   - In the worker, later: one `Notification` insert per recipient.
   - For the failure windows between commit and enqueue, see `apprenticeship/curriculum/01-transactional-outbox.md`.
3. **Which mutations emit.** Only calls that pass `projectId` to `recordActivity`: `createIssue` (`issue.service.js:74-80`) and `addComment` (`comment.service.js:40-45`). Updates, moves, deletes, sprint operations and member changes don't. Proof: `git grep -n "recordActivity" HEAD -- apps/api/src`, then read each call's arguments.
4. **Worker imports without HTTP.** `apps/api/package.json` `exports` exposes `./jobs/queue`, `./jobs/notification-handler` and `./logger`, and `apps/worker/package.json` depends on `@gitjira/api`. The cost: the worker image copies all of `apps/api` plus its generated Prisma client (`apps/worker/Dockerfile`). The API and worker must also ship together, because the handler and the queue options are one codebase.
5. **What `/api/health` proves.** It proves the process is up and the event loop answers. It returns `status/version/uptime` without a DB or Redis call (`services/health.service.js:10-16`). Three systems rely on it:
   - the Fly http check (`fly.toml` `[[http_service.checks]]`)
   - the Docker `HEALTHCHECK` (`apps/api/Dockerfile:58`)
   - the web footer ("live health check", README)
6. **900 matching issues.** At most 200 (`search.service.js:88` `LIMIT 200`). The final query orders by `createdAt desc, id desc` (`:53`), so the `ts_rank` ordering is thrown away. You get the 200 best-ranked ids, re-sorted by date.
7. **Why tests can't catch commit-ordering bugs.** Every query in a test joins one transaction that is always rolled back (`test/tx.js`, `test/setup.js:53`). Nothing ever commits, so "after commit" never happens. A second client or another process can't see the data. `DISABLE_QUEUE=1` means no enqueue runs at all.
8. **Tagging `v1.2.0`.** `deploy.yml` job `production` waits for approval, then `flyctl deploy --app gitjira-api`. Fly builds `apps/api/Dockerfile` and runs `release_command` (`prisma migrate deploy`) on a throwaway machine. If that succeeds, it replaces the API machines. CI isn't a prerequisite (no `needs:`). Of the three runtime processes, only the **API** is updated. Nothing deploys the worker or web.
9. **Locks on `Issue`.**
   - `issue_position_fractional` changes the type from DOUBLE PRECISION to TEXT. That's a full table rewrite under `ACCESS EXCLUSIVE`. At 2M rows it blocks reads and writes for seconds to minutes, depending on disk.
   - `add_fulltext_search` adds a STORED generated column. That also rewrites the table under `ACCESS EXCLUSIVE`, and the GIN build adds more time.
   - `perf_indexes` runs `CREATE INDEX` without `CONCURRENTLY`. That's a `SHARE` lock, which blocks writes for the length of the build.
   - None of these migrations sets `lock_timeout`.
10. **Card order.** The client decides it: `positionForDrop` → `keyBetween` compares with JavaScript `<` (`fractional-index.js`, `apps/web/src/lib/board.js:14`). The server sorts in SQL: `createIssue` uses `orderBy: { position: 'desc' }` to find the last card (`issue.service.js:38-42`), and the detail panel orders `children` by `position asc` (`:339-341`). Postgres compares `TEXT` using the database collation. Under a linguistic collation such as `en_US.UTF-8`, `'a' < 'B'`. In JavaScript's code-unit order, `'B' < 'a'`. The base-62 alphabet mixes cases (`DIGITS`, `fractional-index.js`), so the two orders can disagree unless the column uses `COLLATE "C"`. See also TRADEOFFS drill 2.
