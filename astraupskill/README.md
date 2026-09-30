# Keep sprint assignment and completion consistent

GitJira lets project members plan issues into sprints and complete active sprints by moving unfinished work elsewhere. These operations share state. If assignment and completion race, an issue must not remain assigned to a sprint that has already completed. A stale browser must also receive a conflict instead of silently replacing a newer assignment.

The improvement coordinates these paths with serializable transactions, bounded retries for recognized database conflicts, and conditional updates. Completion validates its destination inside the transaction and changes only an active source sprint. Assignment checks destination state and can compare the issue's updatedAt value supplied by the browser. The next timestamp advances even when the wall clock has not moved forward.

This course follows the service and its real PostgreSQL regressions. Read the map to connect browser input, authorization, state transitions, and database writes. Concepts separates transaction isolation from optimistic concurrency. The worked example follows completion; the exercises ask you to predict competing requests and inspect durable state after rejection.

Tests run in a helper-owned temporary PostgreSQL cluster. The verification chapter records accepted commands and distinguishes them from failed attempts. No deployed service, external queue, or browser interaction is certified by the API checks. Existing project documentation remains useful background; these chapters focus on the specific state transitions changed in this improvement.

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
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)

## Extended learning route

[Open the deeper lessons, isolated labs, answers and capstone](extended-course/README.md).
