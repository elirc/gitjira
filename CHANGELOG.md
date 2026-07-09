# Changelog

## 0.0.1 — Sprint 01 (PR #8)

### Added

- npm-workspaces monorepo: `apps/web`, `apps/api`, `packages/shared`
- Express API skeleton: layered structure, `GET /api/health`, pino logging, centralized error handler with async routing
- React app shell: top nav, sidebar, router (`/`, `/projects`, `/login`), footer health check
- Tooling: ESLint flat config + Prettier + EditorConfig, husky + lint-staged, commitlint
- CI: lint / format / test / build on every PR (`npm ci` + caching)
- Docs: README quickstart, CONTRIBUTING, ADRs 0001–0003, glossary, sprint-01 brief
