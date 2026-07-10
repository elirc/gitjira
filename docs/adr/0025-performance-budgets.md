# 0025 — Performance budgets in CI

**Status:** accepted · **Sprint:** 12

## Context

Performance rots one innocent import at a time. Nobody means to double the
bundle or reintroduce a slow query — it accumulates over months of PRs, each
individually reasonable. By the time someone notices, the regression is spread
across a hundred commits and nobody owns it. A budget makes the regression fail
loudly, in the PR that caused it, while it's still one line to fix.

## Decision

Gate the **initial JS chunk** (what every visitor downloads before the app is
interactive) at a gzip budget in CI: **85 kB**. Current after code splitting is
~70 kB, so the budget leaves headroom for normal growth but fails the build if a
heavy dependency lands in the initial load. Route chunks are excluded — they load
on demand and don't count against first paint.

`scripts/bundle-budget.mjs` runs after the build in the `build` CI job.

## Consequences

- ✅ A heavy dependency in the initial load fails the PR that adds it, with a
  message pointing at the fix (lazy-load it, or justify a new budget here).
- ✅ The budget is a ceiling with headroom, not a hair-trigger — it won't flake
  on a 2 kB change, only on a real regression.
- ❌ Raising the budget requires editing this ADR, on purpose: the friction is
  the feature. A budget you can bump without discussion isn't a budget.
- ❌ It gates bundle SIZE, a proxy for load time — not the real user metric.
  Web-Vitals (LCP/INP/CLS) reporting is the complement; a full Lighthouse-CI gate
  is deferred (needs a browser in CI; the E2E workflow is the natural home).

## Why size, not Lighthouse, for the blocking gate

Lighthouse needs a headless browser and is noisier run-to-run — the same
believable-green concern as E2E (ADR 0024). Bundle size is deterministic and
cheap: same input, same number, every time. So the BLOCKING gate is size; the
richer, noisier metrics are reported, not gated. Gate the stable signal.
