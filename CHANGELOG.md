# Changelog

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
