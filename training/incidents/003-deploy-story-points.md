# INC-003: Deploy throws 5xx, and afterwards story points are gone

**Severity:** SEV-2 (data loss, visible to every team using sprints)
**Branch:** `training/incidents/003-deploy-story-points`
**Alert:** `ApiErrorRate5xx > 2%` fired at 14:03 and resolved by itself at 14:07. Production deploy of tag `v1.3.0` was approved at 14:01 (`deploy.yml` → `flyctl deploy --app gitjira-api`).

## Timeline (from the deploy log and dashboards)

| Time         | Event                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 14:01:20     | `release_command` machine starts: `npm run db:deploy -w @gitjira/api` (`fly.toml` `[deploy]`)                                                                |
| 14:01:31     | `Applying migration 20260801120000_rename_story_points_to_estimate` → `All migrations have been successfully applied.`                                       |
| 14:01:40     | Rolling update starts: machine 1 of 2 replaced, then machine 2. `min_machines_running = 2`                                                                   |
| 14:03–14:07  | 5xx on `GET /api/projects/:key/issues` and `GET /api/projects/:key/sprints/:id/report` (4.8 % of requests)                                                   |
| 14:07        | Both machines on v1.3.0. 5xx back to baseline                                                                                                                |
| 14:40 onward | Support: "Our sprint report says 0 committed points." "The backlog shows `–` for every issue." "I set points on 3 issues this morning and they didn't save." |

## Logs

```
14:03:12.551 ERROR unhandled error  url=/api/projects/GJ/issues
  err="Invalid `prisma.issue.findMany()` invocation: The column `Issue.storyPoints` does not exist in the current database."  machine=e784…(v1.2.4)
14:05:40.102 INFO  request completed PATCH /api/projects/OPS/issues/88 200 22ms   machine=91a0…(v1.3.0)
```

Postgres, after the deploy:

```sql
SELECT count(*) FILTER (WHERE "estimate" IS NOT NULL) AS with_estimate, count(*) AS total FROM "Issue";
--  with_estimate | total
--             14 | 412905
```

On Monday, about 61 % of issues had story points.

## The suspect PR (#161, merged Fri, CI green, 2 approvals)

> **refactor(db): rename Issue.storyPoints to estimate.** Jira calls the field "Estimate", and the CSV importer (next sprint) maps columns 1:1 by name. Generated with `prisma migrate dev`, and I reviewed the SQL.

```diff
--- a/apps/api/prisma/schema.prisma
-  storyPoints    Int?
+  // Story points, named like Jira's "Estimate" field so imports map 1:1.
+  estimate       Int?
+++ b/apps/api/prisma/migrations/20260801120000_rename_story_points_to_estimate/migration.sql
+-- AlterTable
+ALTER TABLE "Issue" DROP COLUMN "storyPoints",
+ADD COLUMN     "estimate" INTEGER;
--- a/apps/api/src/services/sprint.service.js
-    select: { storyPoints: true, columnId: true, number: true, title: true },
+    select: { estimate: true, columnId: true, number: true, title: true },
```

It also renames the field in `issue.service.js` (list select plus the PATCH allow-list), `packages/shared/src/issue-schemas.js`, `response-schemas.js`, `BacklogPage.jsx` and `sprint.test.js`. The tests pass: they run on a fresh database.

## Your tasks

1. Explain the four minutes of 5xx. Which code was running against which schema, and why does `release_command` running "before" the new code make things worse here, not safer?
2. Where did the data go? Was it the migration, the application, or both?
3. "I set points this morning and they didn't save": that happened after 14:07, when every machine ran v1.3.0. Explain it. (Hint: what's still running in users' browsers, and what does Zod do with a key it doesn't know? Look at `updateIssueSchema`.)
4. Recovery plan: how do you get 412k issues' points back without losing the 14 new values written since? List what you need from the database platform. Then say what you do **first** (before 14:45), while you think.
5. Rewrite PR #161 as a zero-downtime change: list each release, what it deploys, and what the database looks like after each. Where does Prisma's `@map` fit, and when is a rename not worth it at all?
6. Add one CI check that would have blocked this PR.
