# GitJira architecture, rebuilt from the code

Base: committed `main` @ `0c1a640`. Read files with `git show HEAD:<path>`. The working tree has uncommitted work in `sprint.service.js`, `issue.service.js`, `BacklogPage.jsx`, `hooks.js` and a few tests, so it doesn't match what's below.
Every claim has a path and line. If you find a claim that the code contradicts, fix it here. That counts as part of the exercise.

`docs/ARCHITECTURE.md` exists too. It's accurate at the level of the diagram, but it says nothing about the gaps listed under "Surprises" below.

## 1. System context

| Actor / system                                         | Talks to                                                                                           | Evidence                                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Browser (React SPA)                                    | `/api/*` over HTTP with a Bearer access token, and `/socket.io` with the token in `handshake.auth` | `apps/web/src/lib/api.js:21-31`, `apps/web/src/lib/socket.js:10-17`                                  |
| nginx (prod web image)                                 | Serves `dist/`, proxies `/api/` and `/socket.io/` to `api:3000`                                    | `apps/web/nginx.conf`, `apps/web/Dockerfile:19-21`                                                   |
| Vite dev server                                        | Proxies the same two paths in dev (`ws: true` for sockets)                                         | `apps/web/vite.config.js:11-16`                                                                      |
| API process (Express + Socket.IO on one `http.Server`) | Postgres (Prisma), Redis (BullMQ queue plus the optional member-map cache)                         | `apps/api/src/server.js:16-17`, `apps/api/src/lib/cache.js:14-27`, `apps/api/src/jobs/queue.js:7-31` |
| Worker process (BullMQ)                                | Redis (consumes `notifications`), Postgres (writes `Notification` rows)                            | `apps/worker/src/index.js:10-17`, `apps/api/src/jobs/notification-handler.js:44-53`                  |
| Prometheus (assumed)                                   | Scrapes `GET /metrics`, which is unauthenticated and outside `/api`                                | `apps/api/src/app.js:33-36`                                                                          |
| Fly.io                                                 | Runs the API image with `release_command` migrations, 2+ machines                                  | `fly.toml:6,25,34-35`                                                                                |

## 2. Components

| Workspace                 | Role                                                                                            | Evidence                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `apps/api`                | Express app factory, routes → controllers → services, Prisma, Socket.IO server, the job handler | `apps/api/src/app.js:10-46`, `apps/api/src/routes/index.js:13-38`                                                 |
| `apps/worker`             | A thin BullMQ `Worker` that imports the handler from the API package                            | `apps/worker/src/index.js:1-17`, `apps/worker/package.json` (`"@gitjira/api": "*"`)                               |
| `apps/web`                | React 18, TanStack Query, dnd-kit board, route-level `React.lazy`                               | `apps/web/src/App.jsx:20-28`, `apps/web/src/lib/queryClient.js:8-16`                                              |
| `packages/shared`         | Zod schemas, the RBAC `POLICY`, the JQL tokenizer/parser/compiler, fractional index, query keys | `packages/shared/package.json` `exports`, `packages/shared/src/policy.js`, `packages/shared/src/jql/index.js:2-4` |
| `packages/ui`             | Design tokens plus `Button` and `Modal` (with axe tests)                                        | `packages/ui/src/index.js`, `packages/ui/test/a11y.test.jsx`                                                      |
| `packages/test-factories` | Builders used by the API tests                                                                  | `packages/test-factories/src/index.js`                                                                            |

Layering inside the API: a route wires `validate(schema)` and `asyncHandler(controller)` (`routes/issue.routes.js:23-35`). The controller parses params only (`controllers/issue.controller.js`). The service owns authorization, transactions and side effects (`services/issue.service.js`). Errors are `ApiError` with a code→status map, rendered once by `middleware/error-handler.js:9-30`.

## 3. Flow 1: drag a card to another column

1. **Drop.** `Board.handleDragEnd` finds the destination column and index, then computes a fractional key with `positionForDrop` (`apps/web/src/components/board/Board.jsx:41-53`, `apps/web/src/lib/board.js:23-28` → `keyBetween` in `packages/shared/src/fractional-index.js`).
2. **Optimistic cache write.** `useMoveIssue` does these in order: `cancelQueries`, snapshot, immutable `setQueryData`, roll back `onError`, and `invalidateQueries` `onSettled` (`apps/web/src/lib/hooks.js:76-120`). The query key includes the `filters` object (`packages/shared/src/query-keys.js`, `issues(projectKey, filters)`).
3. **HTTP.** `PATCH /api/projects/:key/issues/:number/move` goes `app.js:38` → `routes/index.js:17` → `project.routes.js:12` (`requireAuth` for every project route) → `project.routes.js:26` (mounts `issueRoutes`, `mergeParams`) → `issue.routes.js:29`.
4. **Validation.** `validate(moveIssueSchema)` replaces `req.body` with the parsed value (`middleware/validate.js:5-25`, `packages/shared/src/issue-schemas.js` `moveIssueSchema`).
5. **Authorization.** `moveIssue` → `loadIssueForActor(..., 'issue:move')` (`services/issue.service.js:149-164, 262-263`) → `authorize` = `requireMembership` + `can(role, action)` (`services/project.service.js:65-85`). `requireMembership` reads the member map through `cached()`. That's Redis when `REDIS_HOST` is set, otherwise an in-memory Map with per-process single-flight (`lib/cache.js:14-15, 80-99`). A non-member gets 404, not 403 (`project.service.js:80`).
6. **Cross-project guard.** The target `columnId` must belong to this project (`issue.service.js:269-273`).
7. **Write.** A `$transaction` updates `columnId` and `position`. If the column changed, it also records `status.changed` via `recordActivity(tx, ...)` (`issue.service.js:275-304`).
8. **Realtime.** `recordActivity` emits only when the caller passes `projectId` (`services/activity.service.js:25-27`). The move call doesn't pass it (`issue.service.js:296-301`). Check this against your expectation of a "live board".

## 4. Flow 2: create an issue that's already assigned to someone

1. `POST /api/projects/:key/issues` → `validate(createIssueSchema)` → `issues.create` (`routes/issue.routes.js:25`).
2. `createIssue` runs `authorize(..., 'issue:create')` (`issue.service.js:20`) and the sub-task depth check (`:27-34`). It reads the last position in the column **outside** the transaction (`:38-43`).
3. The transaction runs an atomic `issueCounter: { increment: 1 }` (compiles to `UPDATE ... RETURNING`), then `issue.create`, then `recordActivity` **with** `projectId`. The emit therefore fires inside the transaction, before commit (`issue.service.js:51-82`, `activity.service.js:18-27`).
4. After commit: `autoWatch` upsert, then `await enqueueNotification(...)` (`issue.service.js:85-93`). The enqueue is `Queue.add('fan-out', job)` with 5 attempts, exponential backoff, and `removeOnFail: false` (`jobs/queue.js:16-28, 37-40`). Tests skip it (`DISABLE_QUEUE`).
5. The worker (`apps/worker/src/index.js:10-17`, concurrency 5) calls `handleNotificationJob`. It resolves the assignee, mentions and watchers, and removes the actor (`jobs/notification-handler.js:11-26`). It inserts one row per recipient with `dedupeKey = eventId:userId` and treats P2002 as already delivered (`:35-60`). `eventId` falls back to `job.id` (`:35`). For why this matters, see `apprenticeship/curriculum/02-idempotency.md`.
6. The browser learns about it by **polling**: `useNotifications` refetches every 30 s (`apps/web/src/lib/hooks.js:236-244`). No server code emits a notification socket event. Grep for `emit(` in `apps/api/src` and `apps/worker/src`.

## 5. Flow 3: a JQL search

1. `ProjectBoardPage` debounces input by 250 ms and switches the data source when a query is present (`apps/web/src/pages/ProjectBoardPage.jsx`). `useSearch` forwards the `AbortSignal` and keeps previous results visible (`hooks.js:162-174`).
2. `GET /api/projects/:key/issues/search` → `searchCtl.search` clamps `limit` to 1..100 (`routes/issue.routes.js:24`, `controllers/search.controller.js`).
3. `searchIssues` checks membership, then runs `parseJql` → `compileJql` from `@gitjira/shared/jql` (`services/search.service.js:11-39`). The compiler maps an **allowlist** of fields to Prisma `where` fragments (`packages/shared/src/jql/compiler.js:14-26`). Free text comes back as a `__text__` sentinel (`search.service.js:25-28`). A syntax error becomes `VALIDATION_FAILED` with a `position` (`:30-35`).
4. The text term hits Postgres through a parameterized `$queryRaw`: `websearch_to_tsquery` against the generated `searchVector`, ranked, `LIMIT 200` (`search.service.js:75-91`). The ids feed `where.id IN (...)` and a cursor-paginated `findMany` ordered by `createdAt desc` (`:44-64`).

## 6. Data model

- `apps/api/prisma/schema.prisma`: 11 models. The core is `Project` → `WorkflowColumn` / `Issue` / `Sprint` / `ProjectMember`.
- `Issue.number` is unique per project (`@@unique([projectId, number])`) and allocated from `Project.issueCounter`.
- `position` is a `String` fractional key.
- `searchVector` is `Unsupported("tsvector")` (`schema.prisma:130-177`).
- `Notification.dedupeKey` is `@unique` (`:276-296`).
- `ActivityEvent.payload` is JSON, so a new event kind doesn't need a migration (`:198-213`).

Migrations (10, `apps/api/prisma/migrations/`):

| Migration                                | What changed                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `init`                                   | Initial schema                                                             |
| `issues_and_columns`                     | `position DOUBLE PRECISION`                                                |
| `issue_position_fractional`              | `ALTER COLUMN "position" SET DATA TYPE TEXT`                               |
| `comments_activity_attachments_subtasks` | Comments, activity, attachments, sub-tasks                                 |
| `add_subtask_parent`                     | Sub-task parent link                                                       |
| `add_fulltext_search`                    | Hand-written generated `tsvector` plus a GIN index                         |
| `saved_filters`                          | Saved filters                                                              |
| `sprints`                                | Sprints, plus the partial unique "one ACTIVE sprint" index (ADR 0015)      |
| `notifications`                          | Hand-written; it says "Prisma's diff fights the generated tsvector column" |
| `perf_indexes`                           | Two composite indexes, created without `CONCURRENTLY`                      |

## 7. Dependency boundaries

- The worker depends on the API **package**. It doesn't use HTTP. It imports `@gitjira/api/jobs/queue`, `./jobs/notification-handler` and `./logger` through `exports` (`apps/api/package.json` `exports`, `apps/worker/src/index.js:1-4`). So the worker image contains the API code and its Prisma client (`apps/worker/Dockerfile`).
- `packages/shared` is imported by both sides: Zod schemas at the API boundary and in forms, JQL on the server, query keys on the client, `can()` on the server.
- `lib/prisma.js` exports a Proxy over the "active client". Only tests swap it (`apps/api/src/lib/prisma.js:17-33`).

## 8. Test strategy

- **API integration** (Vitest plus supertest against real Postgres). Each test runs inside **one transaction that is rolled back** (`apps/api/test/tx.js`, `apps/api/test/setup.js:25, 53`). Nested `$transaction` calls are flattened onto it. Queue, cache and rate limit are switched off or swapped (`setup.js:7, 18, 22`). The consequence: no test observes a real commit, a real Redis, or two concurrent transactions. Tests that opt out use `__NO_ROLLBACK__` plus `TRUNCATE`.
- **Global setup** creates `gitjira_test` and migrates it (`apps/api/test/global-setup.js`).
- **Web**: Vitest, jsdom, Testing Library and MSW handlers (`apps/web/test/msw/`).
- **Shared**: unit tests plus Stryker mutation tests (`packages/shared/stryker.config.json`).
- **UI**: axe runs.
- **E2E**: Playwright, nightly or manual only (`.github/workflows/e2e.yml`, ADR 0024). The realtime journey covers issue **creation** only (`e2e/journeys/04-realtime.spec.js`).
- **CI** (`.github/workflows/ci.yml`): parallel jobs `static` (lint, format, tsc, TS ratchet), `unit` (with coverage gates), `integration` (Postgres service container), `build` (plus the bundle budget).

## 9. Build and deploy

- The API and worker images are multi-stage: `npm ci` → `db:generate` → `npm prune --omit=dev`. They run as the non-root user `app` (`apps/api/Dockerfile:54-61`).
- The API has a `HEALTHCHECK` on `/api/health`, which returns `ok` without touching the DB (`services/health.service.js:10-16`).
- The worker healthcheck pings Redis.
- `docker-compose.prod.yml` runs postgres, redis, api, worker and web locally.
- `fly.toml` describes **one** app, built from `apps/api/Dockerfile`, with `release_command = npm run db:deploy` (`:25`), `auto_stop_machines = true` and `min_machines_running = 2` (`:34-35`).
- `.github/workflows/deploy.yml`: pushing to `main` deploys `gitjira-api-staging` (`:22`). A `v*` tag deploys `gitjira-api` after an environment approval (`:29-33`). Neither job has `needs:` on CI. **Only the API is deployed.** No job or config deploys `apps/worker` or `apps/web`.

## 10. Surprises worth knowing before you trust the docs

- Realtime emits happen only for `issue.created` and `comment.added` (§3 step 8, §4 step 3).
- The notification bell is polling-driven. The comment at `hooks.js:240-241` says otherwise.
- `docs/postmortems/2026-07-10-redis-outage.md` and the RUNBOOK's "api degrades gracefully" line are not backed by the code. `docs/process/AUDIT-2026-07.md` item 4 admits the drill was narrated.

## Self-check (answers: `training/_answers/navigation-architecture.md`)

1. Name every place a request's authorization decision can be served from something other than Postgres, and what invalidates it.
2. In Flow 2, list the side effects in order and mark which ones happen before commit, which after, and which are outside Postgres.
3. Which mutations produce a socket `activity` event today? How did you prove it?
4. Why can the worker import the notification handler without an HTTP call, and what does that cost the worker image?
5. What exactly does `GET /api/health` prove, and which three systems rely on it?
6. A text search matches 900 issues. How many can a client page through, and in what order?
7. Why can't the API test suite catch a bug that depends on commit ordering?
8. When `v1.2.0` is tagged, what runs, in what order, and which of the three runtime processes end up updated?
9. Which migrations would take an `ACCESS EXCLUSIVE` or write-blocking lock on `Issue`, and for roughly how long at 2M rows?
10. Where does the client decide the order of cards, and which component on the server would disagree if the database's collation differed from JavaScript's string comparison?
