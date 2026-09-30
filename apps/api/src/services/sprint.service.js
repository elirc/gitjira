import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { notFound, conflict } from '../lib/errors.js';
import { authorize } from './project.service.js';
import { assertTransition } from '../domain/sprint-state-machine.js';

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
    }

    // Find unfinished issues (not in a DONE column).
    const doneColumnIds = (
      await tx.workflowColumn.findMany({
        where: { projectId: project.id, category: 'DONE' },
        select: { id: true },
      })
    ).map((c) => c.id);
    // LEARN: complete + move in ONE transaction (review finding). Either the
    // sprint completes AND every unfinished issue moves, or nothing changes — a
    // crash mid-way can no longer leave a COMPLETED sprint with issues stranded
    // in it. The N-update loop also collapses into one `updateMany`, which is
    // faster too. Atomicity is a transaction's entire reason for existing; ask
    // it of every operation that writes more than once.
    const completed = await tx.sprint.updateMany({
      where: { id: sprint.id, projectId: project.id, state: 'ACTIVE' },
      data: { state: nextState, endAt: new Date() },
    });
    if (completed.count === 0) throw conflict('Sprint was already completed');

    const moved = await tx.issue.updateMany({
      where: { sprintId: sprint.id, columnId: { notIn: doneColumnIds } },
      data: { sprintId: destination },
    });
    const persisted = await tx.sprint.findUnique({ where: { id: sprint.id } });

    return { sprint: persisted, movedCount: moved.count };
  });
}

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
