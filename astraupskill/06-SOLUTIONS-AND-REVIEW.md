# Review the transition contract

For the shared-version race, one assignment succeeds and one returns a conflict. The final sprint belongs to the winner, and the timestamp advances. The version belongs in the update predicate because a prior read can become stale before the write. Serializable retry may rerun the transaction, but the unchanged expected version must still lose against the winner's update.

With a future stored timestamp, the next value is precisely the previous value plus one millisecond. This retains a strictly advancing version without assuming a monotonic wall clock. The test compares the exact difference, so replacing the expression with Date.now would be detected.

In the assignment-versus-completion race, assignment can succeed before completion moves it or can lose with a conflict. In either accepted ordering, the final issue cannot remain assigned to the completed sprint. Checking only the assignment response would miss that essential final-state property.

A foreign destination is not found within the authorized project. Self-reference and nonplanned completion destinations are conflicts. The source remains active and its issue remains assigned after rejection. A nonmember receives the established project-concealing 404, with no mutation.

The retry helper permits three attempts only for P2034. After exhaustion it reports a conflict; unrelated errors propagate. Reviewers should check the scope of the entire retry, the state-qualified writes, destination ownership, and the browser's version handling. Passing isolated API tests does not establish the user's browser recovery experience, which requires its own workflow verification.

## Source excerpt

From [apps/api/src/services/sprint.service.js](../apps/api/src/services/sprint.service.js).

```js
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

export async function listSprints(projectKey, actorId) {
  const project = await loadProject(projectKey, actorId);
  return prisma.sprint.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { issues: true } } },
  });
}

export async function createSprint(projectKey, actorId, { name, goal }) {
  const project = await loadProject(projectKey, actorId, 'sprint:manage');
  return prisma.sprint.create({ data: { projectId: project.id, name, goal } });
}

export async function startSprint(projectKey, actorId, sprintId) {
  const project = await loadProject(projectKey, actorId, 'sprint:manage');
  return serializable(async (tx) => {
    const sprint = await tx.sprint.findFirst({
      where: { id: sprintId, projectId: project.id },
      include: { _count: { select: { issues: true } } },
    });
    if (!sprint) throw notFound('Sprint');

    // Per-sprint guards live in the state machine (must be PLANNED, must have issues).
    const nextState = assertTransition('start', sprint.state, { issueCount: sprint._count.issues });

    // LEARN: the state machine's guards passed, but the "one active sprint per
    // project" rule is the DB partial unique index — and under concurrency it is
    // the ONLY thing that can enforce it (two starts can both pass the guard).
    // So we must catch the DB's "no": a unique violation is Prisma error P2002.
    // We translate it into a clean 409 instead of leaking a raw 500 (review
    // finding). Check-then-act is a lie under concurrency; the constraint is
    // the truth, and catching its rejection is how you honor it.
    try {
      return await tx.sprint.update({
        where: { id: sprint.id },
        data: { state: nextState, startAt: new Date() },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw conflict('Another sprint is already active in this project');
      }
      throw e;
    }
  });
}

export async function completeSprint(projectKey, actorId, sprintId, { moveUnfinishedTo }) {
  const project = await loadProject(projectKey, actorId, 'sprint:manage');
  const destination = moveUnfinishedTo === 'backlog' ? null : (moveUnfinishedTo ?? null);

  return serializable(async (tx) => {
    const sprint = await tx.sprint.findFirst({ where: { id: sprintId, projectId: project.id } });
    if (!sprint) throw notFound('Sprint');

    const nextState = assertTransition('complete', sprint.state);

    if (destination) {
      if (destination === sprint.id) {
        throw conflict('Unfinished issues cannot stay in the completed sprint');
      }
      const target = await tx.sprint.findFirst({
        where: { id: destination, projectId: project.id },
        select: { state: true },
      });
      if (!target) throw notFound('Destination sprint');
      if (target.state !== 'PLANNED') {
        throw conflict('Unfinished issues can only move to a planned sprint');
      }
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
