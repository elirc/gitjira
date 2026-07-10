# 0024 — E2E runs nightly + on-demand, not on every PR

**Status:** accepted · **Sprint:** 11

## Context

Playwright E2E boots the whole stack and drives a real browser: high confidence,
but slow (~1–2 min to install browsers + boot + run) and inherently more
flake-prone than unit/integration (real timing, real network, real rendering).
The question isn't _whether_ to have E2E — it's _when to run it_.

## Decision

Run E2E in a dedicated workflow (`.github/workflows/e2e.yml`) triggered by a
nightly schedule and `workflow_dispatch`, **not** on every pull request. The
per-PR pipeline (`ci.yml`) runs the fast, deterministic layers — lint,
typecheck, unit, integration, coverage — and those are the gates.

## Consequences

- ✅ A one-line docs PR isn't held hostage to a 2-minute browser suite.
- ✅ Browser flake can't block unrelated work; a nightly red is investigated as
  its own signal, not as noise on someone else's PR.
- ✅ The fast layers still catch the vast majority of regressions per-PR, because
  we pushed tests _down_ the pyramid (TESTING.md) — E2E only covers what nothing
  below it can.
- ❌ A journey-level regression can merge and only be caught that night. Accepted:
  the blast radius is one day, and the lower layers cover the logic underneath.
- ❌ Someone must actually watch the nightly. A red E2E with nobody looking is
  worse than no E2E — so the workflow uploads traces/video on failure to make
  triage fast, and a green-nightly expectation is part of the on-call rhythm.

## Alternatives considered

- **E2E on every PR (blocking).** Rejected: cost + flake tax on every change,
  including changes E2E can't be affected by. The classic way teams learn to
  hate their E2E suite and start skipping it.
- **E2E on every PR (non-blocking / continue-on-error).** Rejected: a check
  that's allowed to fail is a check nobody reads. Believable-green means every
  gate is load-bearing; an ignorable one erodes that.
