# 0022 — Transaction-rollback test isolation

**Status:** accepted · **Sprint:** 11

## Context

Integration tests share one database. Isolation was TRUNCATE-between-tests:
correct, but it writes to every table on every test, and the cost grows with the
suite. On this machine the API suite spent ~196s in tests, and the auth suite
intermittently timed out. We want the same clean-slate guarantee for a fraction
of the cost.

## Options

1. **TRUNCATE per test** (status quo) — simple, correct, O(tables) writes/test.
2. **Database-per-worker** — parallelism, but provisioning + migrating N
   databases is real complexity, and our suite is already serial by design.
3. **Transaction rollback per test** — run each test in a transaction that is
   rolled back afterward. Nothing commits, so there's nothing to clean up.

## Decision

Option 3. `prisma` is a Proxy over a swappable client; `test/setup.js` installs a
transaction-bound client per test and rolls it back in `afterEach`. Because
supertest runs the Express app in-process, the swap is visible all the way down —
HTTP integration tests get rollback isolation too.

**Result:** API test execution 196s → 32s (~6×); the timeout flake disappeared.

## The two gotchas (and how they're handled)

- **Nested transactions.** Services open their own `prisma.$transaction(...)`.
  Postgres can't nest interactive transactions, so the test wrapper FLATTENS an
  inner `$transaction(fn)` to run `fn` on the outer tx. The service's
  all-or-nothing still holds within the test's transaction.
- **You can't test the mechanism you depend on.** A test that needs real commits
  or observes a real constraint/rollback under concurrency can't share one
  transaction. Those opt out to TRUNCATE via `globalThis.__NO_ROLLBACK__`:
  issue-concurrency (races real connections), stale-write (optimistic
  concurrency), notification idempotency (a caught unique-constraint violation
  aborts a shared Postgres transaction and poisons the rest of the test).

## Consequences

- ✅ Dramatically faster, same isolation, no per-test truncation.
- ✅ Factories that take a client argument work unchanged against the test tx.
- ❌ A small, documented seam in production code (the Proxy) that exists for
  tests. Prefixed `__` and inert in production (always the singleton).
- ❌ Three suites keep TRUNCATE — an honest boundary, not a wart.
