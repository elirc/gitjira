# Sprint 11 — Testing Depth & E2E · Learning brief

**Levels:** L3, L4, L5 · **PR:** #100 · **Release:** v0.7.0

## What this sprint teaches

The stakeholder ask (#92) was blunt: the suite is slow and not fully trusted.
This sprint makes green **believable** — fast enough nobody skips it,
deterministic enough that red always means broken.

1. **A written strategy first** — where each test goes, and what each layer must
   NOT do. → `docs/TESTING.md`
2. **Factories over fixtures** — intent-revealing test data that doesn't drift. →
   `packages/test-factories`
3. **Transaction-rollback isolation** — 6× faster tests, same clean slate; and
   the honest boundary where it can't apply. → ADR 0022, `apps/api/test/tx.js`
4. **Contract tests** — the API response can't silently drift from the schema. →
   `packages/shared/src/response-schemas.js`
5. **MSW** — mock the network, not your own code, so real paths run. →
   `apps/web/test/msw`
6. **Playwright E2E** — prove whole journeys; run nightly, not per-PR. → ADR 0024,
   `e2e/`
7. **The flake taxonomy** — timeout-under-load and clock-dependence, both fixed. →
   the flake-hunt commits
8. **Unequal coverage gates** — honest floors per layer, not one theatrical
   number. → ADR 0023

## Read the PR in this order

`docs/TESTING.md` (the decisions) → factories → the isolation refactor **and its
ADR 0022** (the `$transaction`-flattening gotcha + the opt-out boundary) →
contract tests (and the two real drifts they caught) → MSW → **the E2E review
thread** (the planted `waitForTimeout` → locator waits) → the coverage gates.

## The receipts

- API test execution: **196s → 32s** (transaction rollback + test-only bcrypt cost).
- The auth timeout flake: **gone**.
- Two real API-shape drifts caught by contract tests on their first run
  (`/auth/me` under-returning; project `columns`), both fixed.

## Exercises

1. Write the E2E for an uncovered journey (JQL search or sprint lifecycle) and
   prove it flake-free: `npm run test:e2e -- --repeat-each=20`.
2. Take a test that opts out of rollback isolation and explain, in one sentence,
   exactly which line would break under a shared transaction.
3. Add a contract test for `GET /projects/:key/issues` (the list response) and
   the response schema it needs. Watch it fail first, then make it pass.
4. Find one `vi.mock('../lib/...')` in the web tests that would be more honest as
   an MSW handler, and convert it.

<details><summary>Hints</summary>

1. The realtime journey shows the two-context pattern; auto-waiting assertions
   are what make `--repeat-each` pass.
2. Look for a `.catch` on a Prisma call, or a `Promise.all` of writes.
3. The list response is `{ issues: [...] , nextCursor }` — schema the envelope too.
4. A test that mocks `api.js` to return canned data is really testing the network
   boundary — MSW models that honestly.

</details>
