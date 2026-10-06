# Verifying AI output in GitJira

Use this on any agent-written change here, including your own. Tick each box or write why it doesn't apply. Background: [curriculum 05](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/05-verify-before-trust.md).

## 1. Run it, and check what "it" was

- [ ] `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run ts:ratchet` all pass (same as the `static` job in `.github/workflows/ci.yml`).
- [ ] `npm test -w @gitjira/shared`, `-w @gitjira/ui`, `-w @gitjira/web` pass (no DB needed).
- [ ] `npm test -w @gitjira/api` ran **against a real Postgres** (it needs `DATABASE_URL`, see `apps/api/test/setup.js`). If the agent says it passed, ask for the output. No Postgres, no claim.
- [ ] If the change touches Redis, BullMQ or the cache: the tests exercised Redis. `apps/api/test/setup.js` forces `CACHE_BACKEND=memory` and `DISABLE_QUEUE=1`, so by default **they don't**.
- [ ] If the change is about commit ordering (emit, enqueue, notify after a write): the test opted out of the rollback harness (`globalThis.__NO_ROLLBACK__ = true`). Inside `apps/api/test/tx.js` nothing ever commits.
- [ ] Web changes: `npm run build` then `npm run perf:budget` (`scripts/bundle-budget.mjs`, 85 kB gzip initial chunk).

## 2. Read the diff, not the summary

- [ ] Every file in `git diff --stat main...` is one you expected. Unexpected files (lockfile, `fly.toml`, `.github/workflows/*`, `schema.prisma`) get a reason or get reverted.
- [ ] No new `process.env.X` read without adding `X` to `apps/api/src/lib/env.js` (the schema is meant to be the full inventory).
- [ ] No new Redis/queue call on the request path without a timeout and a failure branch.
- [ ] Anything with `useEffect`: for each dependency, can it change between renders, and what does the effect do (network, subscriptions) each time it re-runs?

## 3. Claims against code

- [ ] Every comment that says "this is broadcast", "the socket makes it instant", "graceful", "idempotent", "cached" is traced to the code that does it. Known false claims already in the repo: `apps/web/src/lib/hooks.js:240-242` (no server code emits a notification socket event); `docs/RUNBOOK.md:46` (Redis-down is not graceful); `docs/RUNBOOK.md:47` and `docs/postmortems/2026-07-10-redis-outage.md` (the queue-depth gauge and `queue_consumed_total` don't exist; `grep -rn queue_ apps` finds nothing).
- [ ] Any metric name in a doc, alert or dashboard exists in `apps/api/src/lib/metrics.js` or `collectDefaultMetrics`.
- [ ] Any "N queries" or "X ms" number came from `npm run perf:measure -w @gitjira/api` against `npm run db:seed:scale`, not from reasoning.

## 4. Fake or placeholder behaviour

- [ ] No handler that returns success without doing the work (for example a health check that never touches its dependency, like `apps/api/src/services/health.service.js`).
- [ ] No dead helper presented as a fix. `reconnectSocket` in `apps/web/src/lib/socket.js` has zero callers on `main`; "added a helper" is not "fixed it".
- [ ] No test without a meaningful assertion, or one that asserts only the happy path of the thing that was supposed to fail.
- [ ] Dev-only switches (`apps/web/src/lib/devFlags.js`) aren't reachable in production builds by accident.

## 5. Migrations (anything under `apps/api/prisma/`)

- [ ] Read the generated `migration.sql`, not just `schema.prisma`. For every touched column, write one sentence on what happens to the rows that already exist. Prisma prints data-loss warnings in the terminal only, never in the committed file.
- [ ] Old code must run against the new schema: `fly.toml` runs `release_command` (the migration) **before** the new instances replace the old ones. Is every step compatible with the previous release? (ADR 0031, expand/contract.)
- [ ] Locks: `ALTER COLUMN ... TYPE`, `CREATE INDEX` without `CONCURRENTLY`, and `ADD CONSTRAINT` without `NOT VALID` all hold heavy locks on `Issue`. Is there a `lock_timeout`?
- [ ] There is a written rollback: which release can we go back to, and does it still work against this schema?
- [ ] Hand-written SQL that Prisma can't express (the `searchVector` generated column, `Unsupported("tsvector")`) is preserved. `prisma migrate dev` has fought it before (see the header of `migrations/20260709230000_notifications/migration.sql`).

## 6. Process

- [ ] Commits pass the hooks: `.husky/pre-commit` (lint-staged: eslint --fix + prettier) and `.husky/commit-msg` (commitlint, Conventional Commits). No `--no-verify`.
- [ ] The agent's report lists commands with real output, and says what it could not verify.
