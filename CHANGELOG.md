# Changelog

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
