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

| Package           | Layer        | Statement floor | Why this number                                                       |
| ----------------- | ------------ | --------------- | --------------------------------------------------------------------- |
| `packages/shared` | domain logic | **90%**         | pure functions, a missed branch is a real bug; cheap to cover fully   |
| `apps/api`        | integration  | **75%**         | most branches covered by HTTP tests; some error-plumbing is low-value |
| `apps/web`        | UI           | **44%**         | much of the UI is DOM plumbing better covered by E2E than unit tests  |

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
