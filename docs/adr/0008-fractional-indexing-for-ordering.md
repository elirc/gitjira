# 0008 — Fractional indexing for card ordering

**Status:** accepted · **Sprint:** 04

## Context

The board must support hand-ranking cards within a column and moving them between
columns, and it must feel instant. The question is how to store "position".

## Decision

Store `position` as a base-62 string; a move computes a key strictly _between_ its new
neighbors via `keyBetween(a, b)`. Rows sort by string comparison.

## Consequences

- ✅ A move writes exactly ONE row — no renumbering, ever. This is what keeps drag instant.
- ✅ Concurrent moves of _different_ cards don't contend (they touch different rows).
- ✅ The utility is pure and property-tested — the correctness lives in one small module.
- ❌ Keys grow slowly under adversarial repeated same-gap insertion (we measured max
  length 5 at 5000 random ops; pathological sequences grow longer). The production
  answer is periodic rebalancing; out of scope at our scale, noted for later.
- ❌ Two users dropping onto the _same_ gap can produce equal-ish keys and a visual tie
  until refresh. Real-time conflict handling is sprint 08; single-dragger is fine now.
