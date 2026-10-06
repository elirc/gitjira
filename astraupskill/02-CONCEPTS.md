# Separate isolation, state guards, and stale edits

Serializable isolation addresses interactions among concurrent transactions. Assignment and completion can each read valid state at the beginning, yet their combined writes could violate the lifecycle contract. Running both through the same isolation policy lets the database reject an incompatible interleaving. A bounded retry repeats the entire transaction against a fresh view; it does not merely repeat the last statement.

A conditional update answers a different question: does this row still have the state required for this transition? Completion updates only ACTIVE. Assignment optionally matches the version the browser originally saw. A zero-row update becomes a conflict, preserving a meaningful response for a losing caller.

Timestamp advancement must be strict. If two assignments occur within one clock millisecond, assigning the current wall time again could leave the version unchanged. The new value is the greater of wall time and the previous timestamp plus one millisecond. The regression places the stored timestamp in the future and verifies an exact one-millisecond advance.

Authorization and destination validation remain independent of these concurrency mechanisms. A serializable transaction cannot make a foreign sprint an allowed target. The service requires the destination to belong to the same project, and completion accepts only a planned destination other than itself. Each mechanism protects a distinct invariant and should retain its own test.

## Source excerpt

From [apps/api/src/services/sprint.service.js](../apps/api/src/services/sprint.service.js), lines 130–165: assignment uses all three mechanisms at once.

```js
export async function assignIssueToSprint(
  projectKey,
  actorId,
  number,
  { sprintId = null, expectedUpdatedAt }
) {
  const project = await loadProject(projectKey, actorId, 'sprint:manage');
  return serializable(async (tx) => {
    const issue = await tx.issue.findUnique({
      where: { projectId_number: { projectId: project.id, number } },
    });
    if (!issue) throw notFound('Issue');
    // sprintId null = move to backlog. Validate the sprint belongs to the project.
    if (sprintId) {
      const sprint = await tx.sprint.findFirst({
        where: { id: sprintId, projectId: project.id },
      });
      if (!sprint) throw notFound('Sprint');
      if (sprint.state === 'COMPLETED')
        throw conflict('Issues cannot be assigned to a completed sprint');
    }

    const nextUpdatedAt = new Date(Math.max(Date.now(), issue.updatedAt.getTime() + 1));
    const changed = await tx.issue.updateMany({
      where: {
        id: issue.id,
        ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}),
      },
      data: { sprintId, updatedAt: nextUpdatedAt },
    });
    if (changed.count === 0) {
      throw conflict('Issue changed since you loaded it; refresh and try again');
    }
    return tx.issue.findUnique({ where: { id: issue.id } });
  });
}
```

## Concept checks (read-only)

1. **Goal:** in the excerpt, label which lines are isolation, which are ownership/lifecycle guards, and which are the optimistic version check.
   **Check:** isolation is the `serializable(` call (line 137). Guards are the project-scoped sprint lookup and the `COMPLETED` rejection (lines 143–150). The version check is the `updatedAt` term in the `updateMany` predicate (line 156) plus `changed.count === 0` → 409 (lines 160–162). If you can delete any one of the three and still name a test that fails, you have them separated correctly. The tests are listed in [04](04-TESTING-AND-DEBUGGING.md).
2. **Goal:** compute the next token when the stored timestamp is ahead of the clock.
   **Check:** `apps/api/test/sprint.test.js` lines 96–112 set `updatedAt` to `Date.now() + 60_000` and expect exactly `captured.getTime() + 1` (line 111). `Math.max(Date.now(), previous + 1)` (line 152) picks the second argument because the wall clock is a minute behind.
3. **Goal:** compare this with the *other* writer that uses `expectedUpdatedAt`, and judge which is stronger.
   **Check:** `updateIssue` in `apps/api/src/services/issue.service.js` (lines 173–186) reads the issue, compares timestamps in JavaScript, and only then runs an `update` whose `where` is just `{ id }` (lines 210–212). The compare is not in the write predicate, so two requests can both pass it. Assignment puts the token in the `updateMany` predicate instead. Extended lesson [08](extended-course/08-compare-the-issue-writers.md) works through this difference.

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
