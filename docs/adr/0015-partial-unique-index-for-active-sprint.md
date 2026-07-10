# 0015 — "One active sprint per project" as a partial unique index

**Status:** accepted · **Sprint:** 07

## Context

Only one sprint per project may be ACTIVE at a time. An app-side check ("is there already an
active sprint?") is not safe under concurrency — two start requests can both read "no."

## Decision

A **partial unique index**: `UNIQUE (projectId) WHERE state = 'ACTIVE'`. The database
guarantees at most one active sprint per project; the service catches the constraint
violation and translates it into a clean 409.

## Consequences

- ✅ The invariant is enforced by the only thing that can enforce it under concurrency — the
  database. Check-then-act in app code is a lie (same lesson as the sprint-03 key counter).
- ✅ PLANNED/COMPLETED sprints are unconstrained (partial index only covers ACTIVE rows).
- ❌ The service must catch the raw constraint error and map it — forgetting that yields a
  500 instead of a 409 (this is a planted review finding in the sprint's PR).
