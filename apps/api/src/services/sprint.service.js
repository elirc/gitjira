import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { notFound, conflict } from '../lib/errors.js';
import { requireMembership } from './project.service.js';
import { assertTransition } from '../domain/sprint-state-machine.js';

async function loadProject(projectKey, actorId) {
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) throw notFound('Project');
  await requireMembership(project.id, actorId);
  return project;
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
  const project = await loadProject(projectKey, actorId);
  return prisma.sprint.create({ data: { projectId: project.id, name, goal } });
}

export async function startSprint(projectKey, actorId, sprintId) {
  const project = await loadProject(projectKey, actorId);
  const sprint = await prisma.sprint.findFirst({
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
    return await prisma.sprint.update({
      where: { id: sprint.id },
      data: { state: nextState, startAt: new Date() },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw conflict('Another sprint is already active in this project');
    }
    throw e;
  }
}

export async function completeSprint(projectKey, actorId, sprintId, { moveUnfinishedTo }) {
  const project = await loadProject(projectKey, actorId);
  const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, projectId: project.id } });
  if (!sprint) throw notFound('Sprint');

  const nextState = assertTransition('complete', sprint.state);

  // Find unfinished issues (not in a DONE column).
  const doneColumnIds = (
    await prisma.workflowColumn.findMany({
      where: { projectId: project.id, category: 'DONE' },
      select: { id: true },
    })
  ).map((c) => c.id);
  const unfinishedCount = await prisma.issue.count({
    where: { sprintId: sprint.id, columnId: { notIn: doneColumnIds } },
  });

  const destination = moveUnfinishedTo === 'backlog' ? null : (moveUnfinishedTo ?? null);

  // LEARN: complete + move in ONE transaction (review finding). Either the
  // sprint completes AND every unfinished issue moves, or nothing changes — a
  // crash mid-way can no longer leave a COMPLETED sprint with issues stranded
  // in it. The N-update loop also collapses into one `updateMany`, which is
  // faster too. Atomicity is a transaction's entire reason for existing; ask
  // it of every operation that writes more than once.
  await prisma.$transaction([
    prisma.sprint.update({
      where: { id: sprint.id },
      data: { state: nextState, endAt: new Date() },
    }),
    prisma.issue.updateMany({
      where: { sprintId: sprint.id, columnId: { notIn: doneColumnIds } },
      data: { sprintId: destination },
    }),
  ]);

  return { sprint: { ...sprint, state: nextState }, movedCount: unfinishedCount };
}

export async function assignIssueToSprint(projectKey, actorId, number, sprintId) {
  const project = await loadProject(projectKey, actorId);
  const issue = await prisma.issue.findUnique({
    where: { projectId_number: { projectId: project.id, number } },
  });
  if (!issue) throw notFound('Issue');
  // sprintId null = move to backlog. Validate the sprint belongs to the project.
  if (sprintId) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, projectId: project.id },
    });
    if (!sprint) throw notFound('Sprint');
  }
  return prisma.issue.update({ where: { id: issue.id }, data: { sprintId } });
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
