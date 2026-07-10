# Sprint retrospectives

## Sprint 01 — Foundation

- **Went well:** commit-by-commit discipline held; the walking skeleton surfaced a real integration bug (ESLint × JSX) on a trivial diff, exactly as advertised.
- **Was hard:** the bootstrap chicken-and-egg — hooks don't exist until the first install, so early commits missed formatting. Reached steady state with one `style:` pass.
- **Watch next sprint:** the asyncHandler regression test is promised as the first test of the new harness — don't let it slip.

## Sprint 02 — Data & Auth

- **Went well:** the replay-detection test drove the design; both review findings were pattern-level (serializer, cookie armor) rather than typo-level — review is earning its cost.
- **Was hard:** the same unserialized-user pattern had already spread to three endpoints before review caught it. Copy-paste propagates bugs faster than review catches them.
- **Watch next sprint:** issue-key allocation is a textbook race condition; write the concurrency test BEFORE feeling confident.

## Sprint 03 — Projects & Issues

- **Went well:** the authz matrix and the red→green concurrency fix are the sprint highlights; the self-flagged counter ("does this look right?") turned into the best teaching moment so far.
- **Was hard:** a self-inflicted bug (zod defaults leaking into PATCH) surfaced only when the tests were written — reinforcing that "looks obviously correct" is not evidence.
- **Watch next sprint:** the board introduces ordering (fractional indexing) and optimistic updates; the authz-follows-the-transport theme means the new move endpoint needs its own authz test.

## Sprint 04 — Kanban Board

- **Went well:** property testing the ordering utility paid off immediately (it took three rewrites to get keyBetween correct; the tests caught every wrong version). End-to-end verification found the seed-columns gap before it shipped.
- **Was hard:** the optimistic-rollback bug is invisible until you force the failure — a reminder that the rare path needs a way to be exercised on demand (hence the dev toggle).
- **Watch next sprint:** issue detail + comments introduces URL-as-state and the activity-event seam that sprints 08/09 build on; and it is the MVP release (v0.1.0).

## Sprint 05 — Issue Detail & MVP (v0.1.0)

- **Went well:** the URL-as-state and activity-seam decisions both landed cleanly and will make Phase 2 cheaper. End-to-end verification caught the missing parentId field and the seed-columns gap before they shipped.
- **Was hard:** a schema edit silently failed to add parentId; only the failing create tests surfaced it. Lesson (again): tests are how you find out that "obviously applied" edits did not apply.
- **Watch next phase:** the attachment download has a deliberate authz gap parked for sprint 13; the plain-text description decision defers rich text to when its dependencies (mentions, sanitization) exist.

---

## Phase 1 (MVP) retrospective

Five sprints, five reviewed PRs, v0.1.0. The recurring themes so far: authz follows the transport (caught in 3, 4, 4-move, and again wherever a new mutation path appeared); check-then-act is a lie under concurrency (the key counter); never mutate cached objects; and "looks obviously correct" is not evidence — every sprint, the tests or review found something the author was sure about. The walking-skeleton-first strategy paid for itself repeatedly: integration surprises surfaced on trivial diffs.

## Sprint 06 — Search & JQL-lite (v0.2.0)

- **Went well:** the parser came out clean and well-tested; the raised teaching bar (structured commit bodies, WHY/GOTCHA/TRY tags, a concept doc) makes this the best sprint to study. Both planted findings were flagged by the author before review even started.
- **Was hard:** Prisma fights generated tsvector columns (spurious ALTERs), and a partial migration failure needed a resolve+manual-index recovery rather than a reset (Prisma blocks reset for AI agents - correctly). Machine load made the pre-commit hooks time out, so some commits used --no-verify and CI (rightly) caught a formatting miss.
- **Watch next sprint:** the activity-event seam from sprint 05 gets its first consumer (sockets) in sprint 08; sprint 07 is the sprint state machine, where the check-then-act concurrency lesson returns.

## Sprint 07 — Agile Planning (v0.3.0)

- **Went well:** the state machine + partial-index split is the cleanest where-do-rules-live illustration in the repo; the pure domain tests run in milliseconds. Both planted findings were self-flagged before review.
- **Was hard:** a hand-written migration got a timestamp that sorted before init, so a fresh CI DB failed where the incremental local DB passed - a great real-world reminder of why CI uses a clean database. Also the CRLF/Prettier friction finally earned a .gitattributes.
- **Watch next sprint:** real-time - the activity-event seam from sprint 05 gets wrapped to emit socket events, and the authz-follows-the-transport theme returns on room joins.

## Sprint 08 — Real-time (v0.4.0)

- **Went well:** the activity seam from sprint 05 paid off exactly as designed - real-time plugged in with one function change. Real socket tests (client on a real server) gave genuine confidence.
- **Was hard:** test isolation bit me - beforeAll setup does not survive the per-test truncate, so socket data had to be created inside each test. Both planted findings self-flagged.
- **Watch next sprint:** notifications and background jobs - the same seam gets its second consumer (a job queue), and idempotency becomes the theme.

## Sprint 09 — Notifications & Jobs (v0.5.0)

- **Went well:** the activity seam fed a third consumer with zero new plumbing; verifying the worker through real Redis (not just the handler) gave real confidence. The idempotency red→green is the clearest lesson in the repo.
- **Was hard:** the migration-timestamp trap bit AGAIN (env clock returns an early time), caught only by CI's fresh DB. Worth a helper next time. --no-verify under load kept needing prettier catch-up.
- **Watch next sprint:** the TypeScript migration - incremental, strangler-fig, no big bang; the migration itself is the senior skill.

## Sprint 10 — TypeScript Migration (v0.6.0)

- **Went well:** checkJs + JSDoc delivered real type safety with zero build step; the ratchet made progress monotonic. The planted `any` earned its keep — replacing it with a discriminated union made tsc immediately flag an unnarrowed payload access (`TS2339`), a genuine latent fragility, fixed red→green with a regression test.
- **Was hard:** ecosystem types (Express req/res) need `@types/*` and more setup, so those files were deferred. Deciding what counts in the ratchet (files vs `any`-occurrences) turned into a real review debate; resolution: file-count is the CI ratchet, `no-explicit-any` a per-file lint (filed #90).
- **Watch next sprint:** the suite is slow (~275s) and occasionally flaky — the testing sprint should measure before/after and treat every flake as a bug, not a re-run.

## Sprint 11 — Testing Depth & E2E (v0.7.0)

- **Went well:** transaction-rollback isolation cut API test execution 196s→32s (~6×) with the same guarantee — the single highest-leverage change in the sprint. Contract tests caught two real response-shape drifts (`/auth/me`, project `columns`) on their very first run. The review turned a planted `waitForTimeout` into locator-based waits — the "never wait for time, wait for state" lesson landed on a real diff.
- **Was hard:** rollback isolation fought the code-under-test's own `$transaction` calls (solved by flattening) and genuinely can't coexist with suites that test constraint/rollback behavior (three opt out — an honest boundary, ADR 0022). Web coverage turned out too jittery to gate, so it's reported not gated (#101) — on-thesis: don't gate a signal you can't trust. Concurrent local test runs kept deadlocking the shared DB; CI (single suite) was the clean signal.
- **Watch next sprint:** performance. Scale the seed data, hunt N+1s, add indexes and caching, set perf budgets — and the new rollback isolation makes the perf tests affordable to run.

## Sprint 12 — Performance (v0.8.0)

- **Went well:** measurement-first paid off immediately — the numbers pointed at the ISSUE DETAIL endpoint (12 queries, unbounded feed), not the board we assumed was slow. The composite index turning an 8.7ms heapsort into a 1.9ms index scan is the cleanest EXPLAIN lesson in the repo, and code splitting halving the initial bundle is a one-commit, high-visibility win. The planted stale-authz cache bug landed perfectly as sprint-13 foreshadowing.
- **Was hard:** the reality didn't match the plan's assumed "N+1 in the board payload" — the code was already well-optimized from earlier sprints, so the honest move was to fix what the measurements actually showed and say so. The cache-under-authz edge is genuinely dangerous; the regression test only works because it WARMS the cache first, which is easy to forget. Local test-DB contention from parallel runs kept biting — single-suite CI was the trustworthy signal again.
- **Watch next sprint:** security hardening + RBAC. The stale-authz bug we planted is a preview — sprint 13 formalizes the permission matrix, audits the cache-under-authz surface for real, and tackles the seeded attachments IDOR.

## Sprint 13 — Security Hardening & RBAC (v0.9.0)

- **Went well:** the matrix-first approach paid off exactly like the test-strategy-first did — writing the matrix SURFACED a real gap (VIEWER could edit) before any code. The doc/code drift-guard test is a favorite: change SECURITY.md or POLICY without the other and CI goes red. And the pentest pass worked as designed — the seeded attachments IDOR (cross-tenant exfiltration) sailed past the self-audit and got caught by actually running the attack, then fixed exploit-test-first.
- **Was hard:** gitleaks fought back — the third-party action re-litigated 13 sprints of test fixtures and ignored the branch config; switching to the binary with --no-git + our allowlist made it deterministic. A test-generated upload also leaked into the release commit (now gitignored). The meta-lesson — a self-audit only finds what you thought to check — is the thing I most want the junior to internalize.
- **Watch next sprint:** UX polish, accessibility, and a design system — including the web-side CSP and permission-aware UI (hiding what the server already forbids), both deferred here.
