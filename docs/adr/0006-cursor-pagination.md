# 0006 — Cursor pagination, not offset

**Status:** accepted · **Sprint:** 03

## Context

The stakeholder said "don't build something that falls over at a few thousand" issues.
Two pagination styles: offset (`LIMIT 50 OFFSET 500`) or cursor (`WHERE id < :cursor
LIMIT 50`).

## Decision

Cursor-based pagination on a stable sort (`createdAt desc, id desc`), returning a
`nextCursor`.

## Consequences

- ✅ Constant-time pages at any depth: the DB seeks to the cursor instead of counting and
  discarding N rows (offset N does the latter, getting slower as you scroll).
- ✅ Stable under insertion: a new issue created while you paginate can't shift rows across
  page boundaries and cause duplicates/skips (the classic offset bug).
- ❌ No random access ("jump to page 7") and no total count for free. Fine for an activity
  feed / issue list; if we ever need numbered pages, that's a different query.
- ❌ The sort must be on a unique-tiebroken key, or the cursor is ambiguous. Hence
  `id` as the tiebreaker on `createdAt`.
