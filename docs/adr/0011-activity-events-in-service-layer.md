# 0011 — Record activity events in the service layer, not DB triggers

**Status:** accepted · **Sprint:** 05

## Context

We need an immutable history of what happened to an issue (status/assignee/priority changes,
comments). Two places to capture it: database triggers, or the application service layer.

## Decision

A `recordActivity()` service, called from other services inside the same transaction as the
change. No triggers.

## Consequences

- ✅ Events carry _intent_ the database can't see: "moved from To Do to In Progress" needs
  column names and the actor's identity, which live in the app, not the row diff.
- ✅ One seam. Sprints 08 (emit to sockets) and 09 (enqueue notifications) wrap this single
  function instead of hunting every mutation site.
- ✅ In-transaction: if the change rolls back, its history entry rolls back too — the trail
  never lies.
- ❌ A write that bypasses the service (a raw SQL fix, a future admin tool) won't be recorded.
  Accepted: all writes go through services by convention, and that convention is the point.
- ❌ Slightly more app code than a trigger. Worth it for the intent and the seam.
