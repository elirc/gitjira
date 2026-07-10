# 0023 — Coverage gates, unequal on purpose

**Status:** accepted · **Sprint:** 11

## Context

We want coverage to catch whole-file gaps (a service with no tests at all) without
turning into a number nobody believes. The naive move is one global threshold —
"80% everywhere." That number is dishonest in both directions at once.

## Decision

Set per-package thresholds that reflect the _honest_ target for that layer, and
set each one as a **floor at or just below current coverage** — a ratchet against
regression, not an aspiration that fails the build today.

| Package           | Layer        | Statement floor     | Why this number                                                                              |
| ----------------- | ------------ | ------------------- | -------------------------------------------------------------------------------------------- |
| `packages/shared` | domain logic | **90%** (gated)     | pure functions, a missed branch is a real bug; cheap to cover fully                          |
| `apps/api`        | integration  | **75%** (gated)     | most branches covered by HTTP tests; some error-plumbing is low-value                        |
| `apps/web`        | UI           | reported, not gated | much of the UI is DOM plumbing better covered by E2E; and the number is unstable — see below |

## Why web is reported but NOT gated

We started to gate web at ~44%, then didn't — on purpose, and it's the most
important lesson in this ADR. The web coverage number is dominated by _which_
component tests ran, and the jsdom component runner can drop a file under load.
That makes the number jitter run-to-run. **Gating on a signal you can't trust is
exactly what this sprint says not to do** — a flaky gate teaches the team to
ignore red, which is worse than no gate. So web coverage is printed in CI (watch
the trend), and the _enforced_ floors live where the number is stable: the domain
and the API. Stabilizing the web runner enough to gate it is a filed follow-up.

## Consequences

- ✅ Each gate is believable: it passes today and only moves up. A dropped file
  fails the build in the right package.
- ✅ The domain gate is strict where strictness pays (logic); the UI gate is
  lenient where unit coverage is low-value (rendering plumbing we cover via E2E
  instead — TESTING.md's "push tests to the lowest USEFUL layer").
- ❌ Different numbers per package is more to explain than one global number.
  That's the point of this ADR — the numbers encode a judgment, and the judgment
  is the lesson.

## The thing to internalize

Coverage measures what code _ran_ during tests, not whether the assertions were
meaningful. 100% coverage with weak assertions is worse than 70% with sharp ones,
because it _looks_ safe. Treat the gate as a floor that catches gross gaps — never
as a certificate of quality, and never a number to chase. Equal gates are theatre;
unequal gates are honesty.
