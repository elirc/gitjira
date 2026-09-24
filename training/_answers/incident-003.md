# INC-003 answer: Prisma turned a rename into DROP + ADD, and the release phase ran it first

## Root cause (three layered failures)

1. **Prisma doesn't infer renames.** Renaming a field in `schema.prisma` without `@map` makes `prisma migrate dev` generate `DROP COLUMN "storyPoints", ADD COLUMN "estimate"`. **Verified:** `prisma migrate diff --from-schema-datamodel <HEAD schema> --to-schema-datamodel <branch schema> --script` prints exactly the SQL in the PR. (`migrate dev` also prints a data-loss warning in the terminal. The committed file doesn't carry it, so reviewers of the diff never saw it.) Every value in `storyPoints` was destroyed at 14:01:31. The application never "lost" anything. **The migration did.**
2. **The release phase runs the migration before any new code serves, while the old code still does.** `fly.toml` runs `release_command` once, then rolls machines one at a time (`min_machines_running = 2`). From 14:01:31 to 14:07, v1.2.4 machines kept running `select: { storyPoints: true }` (`issue.service.js` list, `sprint.service.js` report) against a table where that column no longer existed, which gave P2022 and a 500. The release phase is only "safe" (RUNBOOK) if every migration is **backward-compatible with the previous release**, which is what ADR 0031 requires. This one wasn't, so running it first guaranteed the error window.
3. **Old browser bundles send the old field, and Zod silently strips unknown keys.** `updateIssueSchema = z.object(issueFields).partial()` (`packages/shared/src/issue-schemas.js`) uses Zod's default `strip`. A tab loaded before the deploy sends `{ storyPoints: 5 }`, the validator removes it, `updateIssue` sees an empty patch, and the API returns **200**. That's "I set points and they didn't save." The same old tabs render `issue.storyPoints ?? '–'`, which is why the backlog shows dashes. (Separately, `deploy.yml` doesn't deploy the web app at all; review R1. So in this setup the new bundle's timing is independent of the API's.)

## Diagnostic path

The P2022 message names the column. `\d "Issue"` shows `estimate` and no `storyPoints`. The migration file shows `DROP COLUMN`. For the "didn't save" reports, reproduce with `curl -X PATCH … -d '{"storyPoints":5}'`: it returns 200 and nothing changes.

## Immediate actions (first 30 minutes)

1. **Stop the bleeding of new writes into a half-state?** New writes go to `estimate` and are correct. Don't roll back the code: v1.2.4 needs `storyPoints`, which no longer exists, so a code rollback gives a _total_ outage. RUNBOOK's "code rollback is always schema-safe" is false here.
2. **Preserve evidence.** Take a manual snapshot now, before anything else writes.
3. **Find a restore point.** You need the Postgres provider's point-in-time recovery (PITR) or the last base backup from before 14:01:31. **Do not restore over production.** Restore to a **new** instance at 14:01:00.

## Recovery

From the restored copy, export `(id, "storyPoints")` where it's not null, and load it into a scratch table in prod (`\copy` or `postgres_fdw`). Then:

```sql
UPDATE "Issue" i SET "estimate" = s."storyPoints"
FROM restored_points s
WHERE i.id = s.id AND i."estimate" IS NULL;       -- keep the 14 values written since the deploy
```

Run it in batches (for example, 10k ids per statement) to avoid one long lock on a hot table. Verify with a count per project against the restored copy, and check that sprint reports match Monday's screenshots or an export. Force-reload clients (bump the asset version) so no old tab keeps writing `storyPoints` into the void.

If there's **no PITR**, the data is gone except for sprint reports that users exported. That's what makes this SEV-2 rather than SEV-3. The action item "prove PITR works" belongs at the top.

## The zero-downtime version of PR #161

- **Is a rename worth it?** `estimate Int? @map("storyPoints")` renames the Prisma field (and therefore the API field) with **no DDL at all**. For a cosmetic rename, that's the right answer, and the CSV importer can map names in code.
- If the column really must be renamed (expand/contract, ADR 0031):
  - **Release A (expand):** `ALTER TABLE "Issue" ADD COLUMN "estimate" INTEGER;` (nullable, so metadata-only and instant). The code writes **both** columns and reads `storyPoints`. The API accepts **both** `storyPoints` and `estimate` in PATCH and returns both.
  - **Backfill:** a batched `UPDATE … SET estimate = "storyPoints" WHERE id > $last AND id <= $next AND estimate IS DISTINCT FROM "storyPoints"`, with a `lock_timeout` and progress logging, run as a job, not in `release_command`.
  - **Release B (switch reads):** read `estimate`, keep dual-writing, and verify with a `count(*) WHERE estimate IS DISTINCT FROM "storyPoints"` of 0.
  - **Release C:** stop writing `storyPoints`. Old clients still send it, so keep accepting it as an alias for one client-cache lifetime.
  - **Release D (contract):** `DROP COLUMN "storyPoints"`, only after no deployed code **or cached client** references it.
- Every step is rollback-safe because release N−1 works on the schema of release N.

## CI check that would have blocked it

Add a migration linter step, for example a script that fails on `DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN … TYPE`, `SET NOT NULL`, `RENAME`, or non-`CONCURRENTLY` `CREATE INDEX` on existing tables unless the PR carries a `migration-approved:` label and a link to the expand/contract plan (tools like squawk do this). A second check: run the **previous release's** API integration tests against the **new** schema (N−1 compatibility test). Both checks are cheap, and both would fail on #161.

## Why review missed it

The PR said "reviewed the SQL," and the SQL was three lines. Reviewers read `DROP … ADD` as "rename" because the PR title said rename. The data-loss warning appeared only in the author's terminal. All tests run on a fresh database, where there is no data to lose, and against a single code version, so there's no N−1 window. See `apprenticeship/curriculum/05-verify-before-trust.md`: check the claim ("it's a rename") against the artifact (the SQL).

## Postmortem (short)

Impact: 5xx for 4 min; story points destroyed for about 250k issues; writes from old tabs silently dropped. Action items: PITR drill; migration linter; N−1 compatibility test; strict Zod (`.strict()`) or at least a logged warning on unknown keys; RUNBOOK corrected ("code rollback is safe **only** if the migration was backward-compatible"); ladder S2 as the team's reference plan.
