# Trace browser intent to database predicates

The backlog page forms sprint assignment requests. Its current issue timestamp accompanies the chosen sprint so the API can detect a stale edit. The shared assignment schema permits the version value, and the issue route passes validated input to the sprint controller. The service is the point where project membership, allowed action, destination state, and persistence meet.

loadProject finds the project and calls authorize. A nonmember receives the existing concealed-project 404 response. A member whose role lacks the requested action receives the policy's denial. Those checks must precede mutation; destination identifiers supplied by the client do not establish ownership.

The serializable helper surrounds start, completion, and assignment work. It retries Prisma P2034 conflicts for at most three attempts, then returns a domain conflict. The sprint state machine still defines valid lifecycle transitions, and the database's partial unique index still enforces one active sprint per project.

The sprint test file opts out of the usual transaction rollback proxy. Competing operations need separate real transactions to exercise isolation and constraints. Its setup creates project members, workflow columns, issues, and sprints inside the isolated database. When debugging, follow the request through the controller into this service, then compare the persisted issue and sprint with the response. A status assertion alone can miss stranded work.

The issue-list projection now includes updatedAt, so the backlog actually receives the token it sends. The stale-assignment regression obtains that token from the list endpoint before racing its requests; a service-only test using a creation response would miss this wiring gap.

## The request path, hop by hop

| Hop | File:line | What happens |
| --- | --- | --- |
| 1 | `apps/web/src/pages/BacklogPage.jsx` ~131–136 | `onChange` calls `actions.assign.mutate({ number, sprintId, expectedUpdatedAt: issue.updatedAt })` |
| 2 | `apps/web/src/lib/hooks.js` ~226–229 | the mutation PATCHes `{ sprintId, expectedUpdatedAt }` as JSON |
| 3 | `apps/api/src/routes/issue.routes.js` 30–34 | `PATCH /:number/sprint` → `validate(assignSprintSchema)` → `sprintCtl.assignIssue` |
| 4 | `packages/shared/src/issue-schemas.js` 77–80 | `sprintId: z.string().nullish()`, `expectedUpdatedAt: z.string().datetime().optional()` |
| 5 | `apps/api/src/controllers/sprint.controller.js` 18–26 | converts `:number` with `Number(...)`, passes `req.body` through |
| 6 | `apps/api/src/services/sprint.service.js` 7–12, 130–165 | `loadProject` (authorize `sprint:manage`), then the conditional `updateMany` inside `serializable` |

## Source excerpt

From [apps/api/src/services/sprint.service.js](../apps/api/src/services/sprint.service.js), lines 7–28: the two helpers every lifecycle write goes through.

```js
async function loadProject(projectKey, actorId, action = 'sprint:read') {
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) throw notFound('Project');
  await authorize(project.id, actorId, action);
  return project;
}

async function serializable(work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (retryable && attempt < 2) continue;
      if (retryable) throw conflict('Sprint changed during this request; refresh and try again');
      throw error;
    }
  }
}
```

`startSprint` (lines 44–75), `completeSprint` (77–128) and `assignIssueToSprint` (130–165) all call `serializable`. `listSprints`, `createSprint` and `sprintReport` do not.

From [apps/api/src/services/issue.service.js](../apps/api/src/services/issue.service.js), lines 133–137, inside the `listIssues` projection:

```js
      sprintId: true,
      // Backlog assignment sends this version for the atomic stale-write check.
      updatedAt: true,
      storyPoints: true,
```

## Map exercises (read-only)

1. **Goal:** list every service function that runs inside the serializable boundary.
   **Check:** `git grep -n "return serializable(" -- apps/api/src/services/sprint.service.js` prints three lines (46, 81, 137), one each for `startSprint`, `completeSprint` and `assignIssueToSprint`.
2. **Goal:** find where the sprint suite opts out of rollback isolation, and the code that honors the opt-out.
   **Check:** `apps/api/test/sprint.test.js:8` sets `globalThis.__NO_ROLLBACK__ = true`. `apps/api/test/setup.js:39` reads it (`usesRollback`), and the comment at lines 34–38 explains why: rollback isolation cannot test the transaction behavior it depends on.
3. **Goal:** prove the wiring gap the list-projection change closed.
   **Check:** `diff astraupskill/snapshots/apps__api__src__services__issue.service.js.original.txt apps/api/src/services/issue.service.js` shows `updatedAt: true` (with its comment) added to the list `select`. Without that line, `issue.updatedAt` in `BacklogPage.jsx` would be `undefined`, and `JSON.stringify` drops undefined fields. The service's `expectedUpdatedAt ? … : {}` spread (sprint.service.js:156) would then skip the stale check on every request, and no error would show it. The old backlog (`git show 0c1a640:apps/web/src/pages/BacklogPage.jsx`, line 126) sent no token at all.

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
