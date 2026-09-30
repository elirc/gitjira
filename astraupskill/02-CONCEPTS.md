# Separate isolation, state guards, and stale edits

Serializable isolation addresses interactions among concurrent transactions. Assignment and completion can each read valid state at the beginning, yet their combined writes could violate the lifecycle contract. Running both through the same isolation policy lets the database reject an incompatible interleaving. A bounded retry repeats the entire transaction against a fresh view; it does not merely repeat the last statement.

A conditional update answers a different question: does this row still have the state required for this transition? Completion updates only ACTIVE. Assignment optionally matches the version the browser originally saw. A zero-row update becomes a conflict, preserving a meaningful response for a losing caller.

Timestamp advancement must be strict. If two assignments occur within one clock millisecond, assigning the current wall time again could leave the version unchanged. The new value is the greater of wall time and the previous timestamp plus one millisecond. The regression places the stored timestamp in the future and verifies an exact one-millisecond advance.

Authorization and destination validation remain independent of these concurrency mechanisms. A serializable transaction cannot make a foreign sprint an allowed target. The service requires the destination to belong to the same project, and completion accepts only a planned destination other than itself. Each mechanism protects a distinct invariant and should retain its own test.

## Source excerpt

From [apps/api/src/services/sprint.service.js](../apps/api/src/services/sprint.service.js).

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

// Sprint report: committed vs completed story points.
export async function sprintReport(projectKey, actorId, sprintId) {
  const project = await loadProject(projectKey, actorId);
  const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, projectId: project.id } });
  if (!sprint) throw notFound('Sprint');

  const doneColumnIds = (
    await prisma.workflowColumn.findMany({
      where: { projectId: project.id, category: 'DONE' },
      select: { id: true },
    })
  ).map((c) => c.id);

  const issues = await prisma.issue.findMany({
    where: { sprintId: sprint.id },
    select: { storyPoints: true, columnId: true, number: true, title: true },
  });

  const committed = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  const completed = issues
    .filter((i) => doneColumnIds.includes(i.columnId))
    .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  const unfinished = issues.filter((i) => !doneColumnIds.includes(i.columnId));

  return { sprint, committed, completed, total: issues.length, unfinished };
}
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
