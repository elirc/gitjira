# Keep sprint assignment and completion consistent

GitJira lets project members plan issues into sprints and complete active sprints by moving unfinished work elsewhere. These operations share state. If assignment and completion race, an issue must not remain assigned to a sprint that has already completed. A stale browser must also receive a conflict instead of silently replacing a newer assignment.

The improvement coordinates these paths with serializable transactions, bounded retries for recognized database conflicts, and conditional updates. Completion validates its destination inside the transaction and changes only an active source sprint. Assignment checks destination state and can compare the issue's updatedAt value supplied by the browser. The next timestamp advances even when the wall clock has not moved forward.

This course follows the service and its real PostgreSQL regressions. Read the map to connect browser input, authorization, state transitions, and database writes. Concepts separates transaction isolation from optimistic concurrency. The worked example follows completion; the exercises ask you to predict competing requests and inspect durable state after rejection.

Tests run in a helper-owned temporary PostgreSQL cluster. The verification chapter records accepted commands and distinguishes them from failed attempts. No deployed service, external queue, or browser interaction is certified by the API checks. Existing project documentation remains useful background; these chapters focus on the specific state transitions changed in this improvement.

## Where the change lives

The whole improvement is one commit on `main`, `4dba9ab` (2026-09-30), on top of `0c1a640`. Run `git diff --stat 0c1a640 4dba9ab -- apps packages scripts` to list the 12 files it touched. The ones this course reads:

| File | What changed | Read in |
| --- | --- | --- |
| `apps/api/src/services/sprint.service.js` | `serializable()` retry helper (lines 14–28); `completeSprint` (77–128); `assignIssueToSprint` (130–165) | 01, 02, 03, 06 |
| `apps/api/src/services/issue.service.js` | issue-list projection now selects `updatedAt` (lines 135–136) | 01 |
| `packages/shared/src/issue-schemas.js` | `assignSprintSchema` accepts `expectedUpdatedAt` (lines 77–80) | 01 |
| `apps/web/src/pages/BacklogPage.jsx` | the backlog `<select>` sends `expectedUpdatedAt: issue.updatedAt` (around line 135) | 01 |
| `apps/api/test/sprint.test.js` | seven new regressions (lines 96–275) ahead of the two older race tests in the `sprint concurrency + atomicity` block | 04, 05, 07 |
| `apps/web/test/backlog-stale-assignment.test.jsx` | component test: the stale 409 reaches the user as an alert | 04 |
| `scripts/test-local.py` | throwaway PostgreSQL cluster for the API suite | VERIFICATION |

`astraupskill/snapshots/` keeps pre-change copies of the ten changed source and test files (plus the old `README.md`), so you can diff before against after without checking out `0c1a640`.

## Check your setup (no install needed)

- **Goal:** confirm you are reading the code this course describes.
  **Check:** `git grep -n "async function serializable" -- apps/api/src/services/sprint.service.js` prints line 14. If it prints nothing, you are on a commit older than `4dba9ab`.

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)

## Extended learning route

[Open the deeper lessons, isolated labs, answers and capstone](extended-course/README.md).
