# 0001 — Monorepo with npm workspaces

**Status:** accepted · **Sprint:** 01

## Context
Web app, API, and (soon) shared validation schemas need to evolve together. Options:
separate repos, a monorepo with plain npm workspaces, or a monorepo with build
orchestration (Turborepo/Nx).

## Decision
One repository, npm workspaces, no orchestrator.

## Consequences
- ✅ Cross-cutting changes (API contract + client) are one atomic, reviewable PR.
- ✅ One `npm install`, local packages linked by name — no publishing dance.
- ✅ Nothing to learn beyond npm itself.
- ❌ No task caching: CI rebuilds everything every run. Acceptable at this size;
  the trigger to revisit is CI exceeding ~10 minutes (see sprint 11's budget).
- ❌ Workspaces hoist dependencies to the root `node_modules`, which can mask a missing
  dependency declaration until production. CI building from a clean install is the guard.
