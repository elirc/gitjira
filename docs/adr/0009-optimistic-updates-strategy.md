# 0009 — Optimistic updates with snapshot rollback

**Status:** accepted · **Sprint:** 04

## Context

The stakeholder's hard requirement: the card moves the instant you drop it. Waiting for a
server round-trip before moving the card fails that bar.

## Decision

TanStack Query optimistic updates: `onMutate` snapshots the cache and applies the move;
`onError` restores the snapshot; `onSettled` invalidates to reconcile with the server.

## Consequences

- ✅ Instant UI; the network happens behind the move.
- ✅ Failures are recoverable and visible (the card snaps back, and we announce it).
- ❌ The snapshot must be an immutable copy — sharing object references between the
  snapshot and the optimistic write silently breaks rollback (this was a review finding
  on PR #NN; the fix and the lesson are in that thread).
- ❌ Optimistic UI hides latency but not conflicts: two users moving the same card is a
  last-write-wins race until sprint 08 adds real-time + preconditions.
