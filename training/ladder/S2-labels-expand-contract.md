# S2: Normalizing labels on a 2M-row table without downtime

**Context.** Labels today are `Issue.labels String[] @default([])` (`schema.prisma`, `Issue`). They're written through `createIssueSchema`/`updateIssueSchema` (`packages/shared/src/issue-schemas.js`, `labels: z.array(...).max(20)`) and queried by JQL as `label = x`, which compiles to `labels: { has: value }` (`packages/shared/src/jql/compiler.js:24`, `:80-81`). There's no index on `labels`. The largest tenant has 2.1M issues. Peak write rate is about 400 issue writes/s across all tenants. Migrations run through `release_command` (`fly.toml`) against the live database, before new code rolls out, while old code keeps serving (ADR 0031).

**The product ask.** "Per-project label management: rename a label everywhere (`fe` → `frontend`), give labels a color, and show 'issues per label'. Renaming must be instant for users, even on the 2.1M-issue project."

**Scenario.** Plan the change from `String[]` to `Label(id, projectId, name, color)` + `IssueLabel(issueId, labelId)` as a sequence of releases, each deployable and rollback-safe on its own. You write the plan and the migration SQL. An implementer (or agent) writes the code.

**Operating constraints.**

- No write lock on `Issue` longer than about 1 s. Use `lock_timeout` and retry, not hope.
- API contract: clients keep sending and receiving `labels: string[]` for at least one client-cache lifetime. Cached SPA bundles exist (INC-003).
- JQL `label = x` must keep returning identical results during every phase. Prove it with a dual-read comparison.
- Prisma's migration runner: know how it executes a multi-statement file, and what that means for `CREATE INDEX CONCURRENTLY`. **Verify on a scratch DB. Don't assume.**
- The generated `searchVector` column is `Unsupported("tsvector")` and hand-migrated (`migrations/20260709210254_add_fulltext_search`). Your migrations must not fight it (see the comment in `migrations/20260709230000_notifications/migration.sql`).

**Deliverables (in `training/ladder/notes/S2-labels.md`).**

1. The release table: for each release, the DDL, what the code writes, what it reads, what JQL compiles to, the rollback action, and the exit criteria.
2. The backfill design: batching key, batch size, throttling on replica lag or lock waits, idempotency (a rerun is safe), progress and resumability, and what happens to labels written _during_ the backfill.
3. The migration SQL for the expand step, including indexes, done right for a hot table.
4. The rename semantics after the switch (one `UPDATE Label`), versus before it (why a rename during dual-write is dangerous).
5. The contract step: the preconditions checklist (metrics or queries that prove nothing reads `Issue.labels`), and what happens to a stale client sending `labels` after it's gone.
6. The test plan: an N−1 compatibility test, a JQL parity test, and a backfill rerun test.

**Explain before touching.**

1. Which statements take which locks: `CREATE TABLE`, `ADD COLUMN` (nullable, no default), `CREATE INDEX`, `CREATE INDEX CONCURRENTLY`, `ADD CONSTRAINT … FOREIGN KEY`, and the same with `NOT VALID`, `VALIDATE CONSTRAINT`, `DROP COLUMN`?
2. Why must the release that _writes_ the new tables ship before the release that _reads_ them? What breaks if you merge them?
3. Dual-write inside one Prisma `$transaction`: what's the cost per issue write, and what's the failure behavior if the `IssueLabel` insert fails?
4. How does ADR 0031's worked example (position type change) compare with what migration `20260709194359` actually did?
5. When would you **not** do this migration at all? (GIN index on the array plus a rename job that rewrites arrays in batches.)

Answer: `training/_answers/ladder-S2.md`
