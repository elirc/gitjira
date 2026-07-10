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

## Sprint 03

- **Cursor pagination** — "give me the page after this row"; stable and fast at any depth. Opposite of offset pagination.
- **Offset pagination** — `LIMIT/OFFSET`; simple but slows down and can skip/duplicate rows under insertion.
- **N+1 query** — fetching a list, then one query per row for related data; the classic ORM performance trap.
- **Transaction** — a group of DB writes that all succeed or all roll back; the tool for "never half-done".
- **Race condition** — a bug that only appears when operations interleave in time (e.g. two creates reading the same counter).
- **PATCH semantics** — partial update; an omitted field means "leave alone", not "clear".
- **IDOR** — Insecure Direct Object Reference: reaching another user's data by guessing an id, when the server forgot to check ownership.
- **Authorization** — "may this authenticated user do this?"; distinct from authentication ("who are they?").

## Sprint 04

- **Fractional indexing** — storing order as keys that always have room for a new key between any two; a move writes one row.
- **LexoRank** — Jira's real fractional-ranking scheme; ours is a small cousin.
- **Optimistic update** — apply a change to the UI immediately, before the server confirms; roll back if it rejects.
- **Snapshot / rollback** — capture cache state before an optimistic change so you can restore it on failure.
- **Property-based testing** — assert invariants over generated inputs; the tool shrinks failures to a minimal reproducer.
- **Live region** — an ARIA element screen readers announce when its content changes.
- **DnD sensor** — dnd-kit's input adapter (pointer, keyboard); the keyboard sensor is what makes drag accessible.

## Sprint 05

- **URL as state** — encoding UI state (which issue is open) in the URL so links, refresh, and the back button work.
- **Event sourcing (lite)** — appending immutable records of what happened, not just the current state.
- **Service-layer hook** — capturing domain events where the business logic runs, so they carry intent.
- **Error boundary** — a React class component that catches render errors in its subtree and shows a fallback.
- **Skeleton loader** — a shaped placeholder shown while data loads; calmer than a spinner.
- **Optimistic concurrency** — (foreshadow) detecting conflicting edits via a version/timestamp rather than locking.

## Sprint 06

- **Tokenizer / lexer** — turns a string into a list of typed tokens; step 1 of parsing.
- **Recursive-descent parser** — one function per grammar rule; builds an AST. Step 2.
- **AST (Abstract Syntax Tree)** — a tree that captures the structure of parsed input.
- **Precedence** — which operator binds tighter (AND over OR); encoded by which parse rule calls which.
- **Compiler / evaluator** — walks the AST to produce output (here, a Prisma where). Step 3.
- **tsvector / tsquery** — Postgres's searchable text form and query form for full-text search.
- **GIN index** — inverted index mapping words → rows; makes full-text search fast.
- **Debounce** — wait until input stops for N ms, then act once (vs throttle: at most once per N ms).
- **AbortSignal** — cancels an in-flight fetch so a stale response can't overwrite fresh data.
- **Fuzz testing** — throwing random inputs at code to assert it fails gracefully, never crashes.

## Sprint 07

- **State machine** — an object is in one of a fixed set of states; only certain transitions are legal.
- **Transition guard** — a precondition that must hold for a transition (e.g. "sprint must have issues to start").
- **Partial unique index** — a uniqueness constraint that applies only to rows matching a condition (`WHERE state = 'ACTIVE'`).
- **Backlog** — issues not assigned to any sprint; modeled as the absence of a sprintId, not a status.
- **Velocity** — completed story points per sprint; the raw material for estimation.
- **Check-then-act** — reading state then acting on it; unsafe under concurrency (the DB constraint is the fix).
