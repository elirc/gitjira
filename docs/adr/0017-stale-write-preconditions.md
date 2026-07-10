# 0017 — Optimistic concurrency for concurrent edits

**Status:** accepted · **Sprint:** 08

## Context
Two people edit the same issue at once. We must not silently overwrite one with the other.
Options: pessimistic locking (lock the row while editing — bad UX, deadlock risk),
operational transform / CRDT (Google-Docs merging — a huge project), or optimistic
concurrency (version check).

## Decision
Optimistic concurrency: an update may include `expectedUpdatedAt` (the version it started
from). If the stored `updatedAt` is newer, reject with 409 "this changed, reload."

## Consequences
- ✅ No locks, no merging engine — a timestamp comparison.
- ✅ No silent lost updates; the user is told and reloads.
- ❌ The losing editor re-does their change. Acceptable for issue edits; unacceptable for a
  doc editor (which is why those use CRDTs).
- ❌ The check is opt-in (updates without `expectedUpdatedAt` skip it). Fine — the board's
  own moves don't conflict this way; it's the human-edited fields that need it.
