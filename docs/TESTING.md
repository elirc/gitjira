# Testing strategy

> Strategy before tooling — or the tooling becomes the strategy by accident.

This document is the answer to one question: **"I wrote some code. Where does the test go?"**
If two engineers would answer that differently, the suite drifts into duplication and gaps.
So we decide here, once.

## The core belief

**A test you don't trust is worse than no test.** A flaky test costs time twice — once when
it fails spuriously, and again every time after, because it teaches the team to shrug at red.
Everything below optimizes for _believable green_: fast enough that nobody skips it,
deterministic enough that red always means broken.

## The pyramid (and why it's a pyramid, not a cupcake)

```
        ╱╲        E2E — a real browser, the whole stack. Few. Slow. High confidence.
       ╱  ╲       ~10 journeys. "Can a person actually do the thing?"
      ╱────╲
     ╱      ╲     Integration — real DB, real HTTP, mocked externals. Some.
    ╱        ╲    "Does this endpoint + query + validation work together?"
   ╱──────────╲
  ╱            ╲  Unit — pure functions, no I/O. Many. Milliseconds.
 ╱______________╲ "Is this logic correct in isolation?"
```

Cost and speed are the whole reason for the shape:

| Layer       | Speed     | Confidence per test | Cost to write & keep | So we write… |
| ----------- | --------- | ------------------- | -------------------- | ------------ |
| Unit        | ~1ms      | narrow              | cheap                | **many**     |
| Integration | ~10–100ms | medium              | moderate             | **some**     |
| E2E         | ~1–10s    | wide                | expensive + flaky    | **few**      |

Push each test to the **lowest layer that can still catch the bug.** A bug in the
fractional-index math is a unit test, not an E2E drag-and-drop. Reserve E2E for what only E2E
can prove: the pieces are wired together and a human can complete the journey.

The failure mode is the "cupcake" (or "ice-cream cone"): lots of slow E2E, few units. It
happens when people don't trust the lower layers, so they re-prove everything at the top. It's
slow, flaky, and it tells you _that_ something broke without telling you _where_.

## What each layer MUST NOT do

This half of the table is the one people skip, and it's the important half.

- **Unit tests must not touch the database, the network, the clock, or the filesystem.** If
  your "unit" test needs Postgres, it's an integration test wearing a disguise — move it or
  mock the boundary. A unit test that hits I/O is slow and flaky for reasons that have nothing
  to do with the logic it claims to test.
- **Integration tests must not assert on internal implementation.** Assert on the response and
  the persisted state, not on which private function got called. Otherwise every refactor
  breaks tests that didn't need to break — the tests test the code's _shape_, not its
  _behavior_.
- **E2E tests must not reach into the database or internal state to set up or assert.** They
  drive the app the way a user does — through the UI and public API — and check what a user
  would see. The moment an E2E test reads a DB row, it stops proving the journey works. (Seed
  data _through the API_, not by inserting rows behind the app's back.)
- **No layer may depend on wall-clock time or test execution order.** Both are the two most
  common flake sources. Freeze the clock; make every test build its own world.

## Where does _this_ test go? (decision tree)

```
Is it pure logic with no I/O? ───────────────► UNIT   (packages/*/test, colocated *.test.js)
        │ no
Does it need the DB or a real HTTP round-trip,
but not a browser? ──────────────────────────► INTEGRATION (apps/api/test)
        │ no
Does it render a component and exercise its
states (loading/error/empty)? ───────────────► COMPONENT (apps/web/test, + MSW at the network edge)
        │ no
Does it prove a whole user journey through
the real UI + stack? ────────────────────────► E2E   (e2e/*.spec.js, Playwright)
```

## Isolation: every test builds its own world

No test may depend on data another test left behind. Two mechanisms:

- **API/integration:** each test runs inside a database **transaction that is rolled back**
  when the test ends (see ADR 0022). Same isolation as truncating the whole DB, a fraction of
  the cost — nothing is ever actually committed.
- **Everything else:** **factories** (`packages/test-factories`) build fresh data per test,
  with overrides that state _what matters to this test_ and defaults for everything else.

## Factories over fixtures

A shared fixture file (`const testUser = {...}`) is a magnet for drift: tests come to depend on
incidental fields, and changing the fixture breaks tests that don't care. A **factory** —
`buildUser({ role: 'admin' })` — returns a fresh, valid object where the override says exactly
what this test needs and the defaults are irrelevant-but-valid. The test reads as intent.

## Contract tests: the response can't lie

We validate input with Zod schemas on the way _in_. Contract tests parse every integration
response with the _same_ schema on the way _out_. If the API and the shared schema drift, the
test fails loudly — the schema is the contract, and both sides are held to it.

## Flakes: never "just re-run it"

A flaky test is a **bug** — in the test, or in the code. Re-running until green is deleting the
smoke alarm because it keeps going off. The taxonomy (memorize it; you'll meet all four):

1. **Await hygiene** — an unawaited promise; the assertion runs before the effect lands.
2. **Clock dependence** — asserting on `Date.now()` / relative timestamps. Freeze the clock.
3. **Network / timing** — waiting a fixed number of seconds instead of waiting for _state_.
   `waitForTimeout(2000)` is a time bomb: too short and it fails, too long and it wastes seconds.
4. **Order / shared state** — a test that only passes after another test ran. Isolation kills it.

The fix is always the same shape: **wait for a condition, not a duration; depend on nothing
outside the test.**

## Coverage gates (unequal on purpose)

Thresholds differ by layer because the _honest_ target differs (ADR 0023): domain logic 90%,
API 80%, web 65%. A uniform 80% would either strangle the UI (where the last 20% is low-value
DOM plumbing) or under-test the domain (where a missed branch is a real bug). Equal numbers
would be _theatre_; unequal numbers are honesty.

Coverage measures what code _ran_ during tests — not whether the assertions were meaningful.
It's a floor that catches whole-file gaps, not a certificate of quality. Don't chase the number.

## Running the suite

```bash
npm test                       # everything (unit + integration + component)
npm test -w @gitjira/api       # one package
npm run test:e2e               # Playwright journeys (boots the stack)
npm run test:e2e -- --repeat-each=20   # prove a test is flake-free
```
