# 0031 — Expand/contract migrations (zero-downtime schema change)

**Status:** accepted · **Sprint:** 15

## Context

During a rolling deploy, OLD and NEW code run at the same time against ONE
database. A migration that the old code can't tolerate (drop a column it still
reads, rename one) breaks the old instances mid-deploy. And a code rollback
doesn't roll back the schema.

## Decision

Change schema in the **expand/contract** pattern, across (at least) two releases:

1. **Expand** — add the new shape ALONGSIDE the old (new column/table), and have
   the new code DUAL-WRITE (write both, read old). Old code is unaffected.
2. **Migrate** — backfill existing rows; switch reads to the new shape.
3. **Contract** — once no running code touches the old shape, a LATER release
   drops it.

Worked example (renaming `Issue.position`'s type): release 1 adds
`position_v2` + dual-writes; a job backfills; release 2 reads `position_v2`;
release 3 drops `position`.

## Consequences

- ✅ Every intermediate state is compatible with BOTH the old and new code, so a
  rolling deploy never breaks and a rollback is always safe.
- ✅ The naive `ALTER TABLE ... RENAME` (which locks the table and breaks old
  instances instantly) is never needed.
- ❌ Three releases instead of one; more bookkeeping. That's the cost of
  zero-downtime — and it's cheaper than an outage.

## Ties to the deploy pipeline

Migrations run in the **release phase** (ADR-adjacent, runbook), ONCE before
instances swap — never per-instance (which would race). Expand/contract is what
makes "run the migration, then roll code forward OR back" always safe.
