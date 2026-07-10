# Changelog

## 0.10.0 — Sprint 14 (PR #131)

### Added

- Design tokens (packages/ui/src/tokens.css) + @gitjira/ui: accessible Button and Modal (role=dialog, focus trap, Escape)
- Dark mode (light/dark/system, persisted) via token flip — no component changes
- WCAG 2.1 AA pass: visible focus, reduced-motion, sr-only labels; contrast audit (both themes); ADR 0028/0029

### Fixed

- **A11y:** modal now returns focus to the trigger on close (WCAG 2.4.3)
- **A11y:** dark-theme muted text meets AA contrast (was 3.9:1 on the surface)

## 0.9.0 — Sprint 13 (PR #119)

### Added

- Permission matrix (docs/SECURITY.md) + central can(role, action) policy module with a doc/code drift-guard test
- All endpoint authz routed through authorize() (object-level + action-level); helmet security headers; sliding-window login rate limiting (dual-key)
- gitleaks secret scanning + dependabot; OWASP self-audit; STRIDE threat model; ADRs 0026-0027

### Fixed

- **Security (IDOR):** attachment download now enforces object-level authz (was: any authenticated user could download any project’s attachments)
- Closed the VIEWER-can-edit gap the permission matrix surfaced
- Login rate limiting keyed on IP AND account (was: IP only)

## 0.8.0 — Sprint 12 (PR #110)

### Added

- Deterministic scale seed (50 projects / 20k issues / 100k events) + measurement harness
- Composite indexes (board list, activity feed); Redis read-through cache (single-flight) for the member map
- Route-level code splitting (initial bundle 137kB→72kB gzip); CI bundle-size budget (ADR 0025)
- docs/performance.md (before/after brief); ADR 0025

### Fixed

- Issue detail loaded the issue twice + fetched the whole activity history (12q/74ms → 9q/55ms)
- Board list top-N heapsort → index scan (8.7ms → 1.9ms)
- Stale-authz: removing a member now invalidates the authz cache (was: removed user kept access for the TTL)

## 0.7.0 — Sprint 11 (PR #100)

### Added

- `docs/TESTING.md` — the layered test strategy (where each test goes, and what each layer must NOT do)
- `@gitjira/test-factories` — intent-revealing factories for every model
- Transaction-rollback test isolation (`apps/api/test/tx.js`) — API test execution 196s → 32s
- Contract tests: `packages/shared/src/response-schemas.js` parsed against real API responses
- MSW at the network boundary for web component tests (`apps/web/test/msw`)
- Playwright E2E harness + journeys (`e2e/`), run nightly via `.github/workflows/e2e.yml`
- Per-package coverage gates (domain 90 / api 75 / web 44) and a parallel CI matrix
- ADRs 0022 (rollback isolation), 0023 (unequal coverage gates), 0024 (E2E nightly); sprint-11 brief + glossary

### Fixed

- Two real API-shape drifts caught by contract tests: `/auth/me` now returns the full public user (was: JWT claims only); project schema documents embedded `columns`
- Two flakes: the auth suite's timeout-under-load (bcrypt cost now test-configurable) and the untested clock-dependent `timeAgo` (fake timers)

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
