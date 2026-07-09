# 0003 — Conventional Commits, merge commits, no squash

**Status:** accepted · **Sprint:** 01

## Context

Sprint PRs here are large (600–1500 lines) and deliberately built as a sequence of
self-contained commits. GitHub offers squash, rebase, or merge-commit strategies.

## Decision

Conventional Commits enforced by commitlint; PRs merge with a merge commit; squash is
disabled. Pushed history is never rewritten.

## Consequences

- ✅ The commit sequence survives — reading a PR commit-by-commit is the intended
  study path, and the fix-after-review commits are the most instructive part.
- ✅ Machine-readable history: changelogs generate from commit types.
- ❌ Noisier `git log` on main than squash would give. `git log --first-parent` shows
  the PR-level view when that is what you want.
- ❌ Every commit must be green on its own — that discipline costs authoring effort.
