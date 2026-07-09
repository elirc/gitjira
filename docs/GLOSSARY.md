# Glossary

Terms in the order the codebase introduces them.

## Sprint 01

- **Monorepo** — one repository holding multiple packages that ship together.
- **Workspace (npm)** — a package npm links locally so others import it by name.
- **Walking skeleton** — the thinnest end-to-end slice that proves the architecture.
- **Flat config (ESLint)** — the modern single-file lint config; what you see is the policy.
- **Conventional Commits** — `type(scope): subject` commit format machines can parse.
- **CI (continuous integration)** — automation that verifies every change; its job is to keep `main` releasable.
- **Middleware** — a function every request passes through (logging, errors, later auth).
- **Structured logging** — logs as JSON fields you can query, not prose you grep.

## Sprint 02

- **Migration** — a versioned, reviewed SQL change to the database schema; the schema file is the source of truth.
- **bcrypt / cost factor** — deliberately slow password hashing; slowness is the security feature.
- **JWT (JSON Web Token)** — a signed, stateless claims object; verifiable without a database, therefore not revocable.
- **Refresh rotation** — each refresh token is single-use; using one issues its successor.
- **Replay detection** — presenting an already-spent refresh token proves theft; the whole family is revoked.
- **Token family** — all refresh tokens descended from one login.
- **httpOnly cookie** — a cookie JavaScript cannot read; XSS-proof transport for the refresh token.
- **Account enumeration** — an endpoint whose errors reveal whether an email exists; login must answer identically either way.
- **Integration test** — drives the real stack (HTTP → service → real Postgres); green means it works, not that mocks agree.
- **Idempotent** — safe to run twice; seeds and (sprint 09) job handlers must be.
