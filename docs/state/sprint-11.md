# State of GitJira — after Sprint 11 (v0.7.0)

**Tag:** `v0.7.0` / `sprint-11` · **PR:** #100 · **Version:** 0.7.0

## What the system can do

No user-facing change from v0.6.0 — this sprint hardened the _test suite_, the
thing that lets every future change ship with confidence. The product behaves
exactly as before; what changed is that green is now believable: fast enough
nobody skips it, deterministic enough that red always means broken.

## The change

```
   STRATEGY (docs/TESTING.md)  ── decides where every test goes ──┐
                                                                  ▼
  unit ──────────── some integration ──────────── few E2E (nightly)
  factories         transaction-rollback           Playwright + storageState
  (no fixtures)     isolation (196s→32s)            ADR 0024: not per-PR
                    contract tests (schema == wire)
  MSW (mock the network, not your code)
                                                                  │
   ENFORCEMENT: parallel CI matrix + unequal coverage gates ◀─────┘
   (domain 90 / api 75 gated · web reported)
```

## Metrics

| Metric             | Value                                     | Prev |
| ------------------ | ----------------------------------------- | ---- |
| Apps               | 3 (web, api, worker)                      | 3    |
| Packages           | 3 (shared, test-factories, —)             | 1    |
| Tests              | ~90 (73 api + 13 web + 29 shared) + 6 E2E | 105  |
| API test execution | **32s** (was 196s)                        | 196s |
| CI shape           | 4 parallel jobs (was 1 serial)            | 1    |
| Coverage gates     | shared 90 / api 75 (web reported)         | none |
| Migrations         | 10 (no schema change)                     | 10   |

## Tech-debt register (delta)

| Debt                                     | Why                                                               | Due       |
| ---------------------------------------- | ----------------------------------------------------------------- | --------- |
| Web coverage not gated                   | Component runner jitters; won't gate a flaky signal               | follow-up |
| E2E runs nightly, not per-PR             | Cost/flake budget (ADR 0024); journey regressions caught next day | accepted  |
| E2E covers ~5 journeys, not 10           | Board-dnd/JQL/sprint covered at lower layers instead              | ongoing   |
| `no-explicit-any` guard still open (#90) | From sprint 10; pairs with the ratchet                            | #90       |

## Known limitations

E2E is a small set of the highest-value journeys, run nightly. Web unit coverage
is low by design (UI is E2E territory) and reported rather than gated. Three API
suites keep TRUNCATE isolation because they test the transaction mechanism itself
(ADR 0022) — an honest boundary, not a gap.

## For the junior: what to study here

1. **Strategy before tooling** — `docs/TESTING.md`, and why it landed first.
2. **Transaction-rollback isolation** — the Proxy seam, the `$transaction`
   flattening gotcha, and the opt-out boundary. ADR 0022.
3. **Contract tests** — how they caught `/auth/me` returning the wrong shape.
4. **The flake taxonomy** — the two real flakes fixed, and the review thread that
   turned three `waitForTimeout` sleeps into locator-based waits.
5. **Unequal coverage gates, and not gating a flaky signal** — ADR 0023.
