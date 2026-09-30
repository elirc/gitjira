# Trace browser intent to database predicates

The backlog page forms sprint assignment requests. Its current issue timestamp accompanies the chosen sprint so the API can detect a stale edit. The shared assignment schema permits the version value, and the issue route passes validated input to the sprint controller. The service is the point where project membership, allowed action, destination state, and persistence meet.

loadProject finds the project and calls authorize. A nonmember receives the existing concealed-project 404 response. A member whose role lacks the requested action receives the policy's denial. Those checks must precede mutation; destination identifiers supplied by the client do not establish ownership.

The serializable helper surrounds start, completion, and assignment work. It retries Prisma P2034 conflicts at most three attempts, then returns a domain conflict. The sprint state machine still defines valid lifecycle transitions, and the database's partial unique index still enforces one active sprint per project.

The sprint test file opts out of the usual transaction rollback proxy. Competing operations need separate real transactions to exercise isolation and constraints. Its setup creates project members, workflow columns, issues, and sprints inside the isolated database. When debugging, follow the request through the controller into this service, then compare the persisted issue and sprint with the response. A status assertion alone can miss stranded work.

The issue-list projection now includes updatedAt, so the backlog actually receives the token it sends. The stale-assignment regression obtains that token from the list endpoint before racing its requests; a service-only test using a creation response would miss this wiring gap.

## Source excerpt

From [apps/api/src/services/sprint.service.js](../apps/api/src/services/sprint.service.js).

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
```

## Source excerpt

From [apps/api/src/services/issue.service.js](../apps/api/src/services/issue.service.js).

```js
// Backlog assignment sends this version for the atomic stale-write check.
      updatedAt: true,
      storyPoints: true,
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  const hasMore = rows.length > limit;
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
