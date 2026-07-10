# Changelog

## 0.6.0 — Sprint 10 (PR #89)

### Added

- Incremental TypeScript: `tsconfig` (allowJs + strict, per-file `// @ts-check` opt-in), `npm run typecheck`, CI Typecheck job — no build step, code stays runnable JavaScript
- `z.infer` types exported from the shared Zod schemas so validation and static types can't drift
- `scripts/ts-ratchet.mjs`: a coverage ratchet that fails CI if the type-checked file count drops (migration progress is monotonic)
- ADR 0020 (checkJs+JSDoc over big-bang), ADR 0021 (inferred types over codegen), `docs/concepts/incremental-migration.md` (the strangler fig)

### Fixed

- `describeActivity` was typed `any` (checked nothing); replaced with a discriminated union on `kind`. The union surfaced an unnarrowed payload access (reading `.from` on variants without it, `TS2339`) — fixed by narrowing per-case, with a 7-case regression test

## 0.5.0 — Sprint 09 (PR #82)

### Added

- Background jobs: a BullMQ worker (apps/worker) fans out notifications off the request path
- Assignment + @mention notifications; auto-watch + manual watch; in-app notification bell
- Idempotent fan-out (dedupe key), retries with backoff, a dead-letter queue
- docs/concepts/idempotency.md

### Fixed

- Fan-out is idempotent (was: random key duplicated on retry); mark-all-read is time-bounded against concurrent arrivals

## 0.4.0 — Sprint 08 (PR #74)

### Added

- Real-time: Socket.IO with per-project rooms, JWT handshake auth, membership-gated joins
- Live board updates via the activity seam; presence (who is viewing)
- Optimistic concurrency: stale-write 409 with a reload prompt
- docs/concepts/websockets.md

### Fixed

- Room joins require membership (was: any authed user); useLiveProject cleans up its listeners

## 0.2.0 — Sprint 06 (PR #57)

### Added

- JQL-lite query language (type = bug AND assignee = me): hand-written tokenizer + recursive-descent parser + Prisma compiler in packages/shared
- Postgres full-text search on title+description (generated tsvector + GIN index)
- Saved filters per user; global Cmd+K command palette (jump by key or project); debounced search with request cancellation
- docs/concepts/parsing.md — how to build a small language

### Changed

- Filtering is fully server-side; the client-side type filter was removed

### Fixed

- AND now binds tighter than OR (parser precedence); full-text query parameterized (no SQL injection surface)

## 0.1.0 — MVP (Sprint 05, PR #49)

### Added

- Issue detail panel addressed by URL (?selected=GJ-42): deep-linking, back button, shareable links
- Comments (add/edit-own/delete-own); activity events recorded at the service layer (the seam for real-time + notifications)
- Sub-tasks with parent progress; attachments (upload + download)
- Production polish: skeleton loaders, empty states, route error boundary, 404 page
- docs/DEMO.md walkthrough

### Fixed

- Dirty-state guard on panel close (no more silent lost edits); zero-safe sub-task progress (no NaN%)

### Milestone

- **v0.1.0 — the MVP.** Auth → projects → board → issue detail → collaboration.

## 0.0.4 — Sprint 04 (PR #39)

### Added

- Kanban board: drag-and-drop across and within columns, board/table views
- Fractional-index ordering utility (property-tested) so a move writes one row
- PATCH /issues/:number/move; optimistic updates with snapshot rollback; dev fail-toggle
- Keyboard drag (dnd-kit sensor) + live-region announcements

### Fixed

- Move endpoint now rejects cross-project columns; optimistic rollback made immutable; seed now creates workflow columns

## 0.0.3 — Sprint 03 (PR #27)

### Added

- Projects: CRUD, membership with roles, auto-seeded workflow columns
- Issues: CRUD with per-project atomic key allocation (GJ-1), cursor pagination, type/assignee/column filters
- Standard error contract { error: { code, message, details } } with an error catalog
- Web: projects list, project view with filterable issue table, create modals, TanStack Query

### Fixed

- Issue-key race condition (atomic increment); PATCH schema no longer resets omitted fields; issue-list over-fetch (85% smaller payload)

## 0.0.2 — Sprint 02 (PR #17)

### Added

- Postgres + Prisma: User, Project, ProjectMember (roles), RefreshToken
- Auth: register/login/refresh/logout/me with rotating refresh tokens, replay containment, allowlist serialization, hardened cookies
- Shared Zod schemas validating on client and server
- Web: auth context (in-memory tokens), protected routes, silent single-flight refresh, login/register pages
- Tests: Vitest + Supertest harness with real Postgres (13 api) + Testing Library (3 web)
- Seed script with demo users/projects

## 0.0.1 — Sprint 01 (PR #8)

### Added

- npm-workspaces monorepo: `apps/web`, `apps/api`, `packages/shared`
- Express API skeleton: layered structure, `GET /api/health`, pino logging, centralized error handler with async routing
- React app shell: top nav, sidebar, router (`/`, `/projects`, `/login`), footer health check
- Tooling: ESLint flat config + Prettier + EditorConfig, husky + lint-staged, commitlint
- CI: lint / format / test / build on every PR (`npm ci` + caching)
- Docs: README quickstart, CONTRIBUTING, ADRs 0001–0003, glossary, sprint-01 brief
