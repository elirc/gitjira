import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
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

  // GOTCHA (planted): we only checked the state machine's guards. The "one
  // active sprint per project" rule is enforced by the DB partial unique index,
  // and this code does NOT catch the constraint violation — so two concurrent
  // starts race, and the loser gets a raw 500 from Postgres instead of a clean
  // 409. The state machine passed; the database still says no.
  return prisma.sprint.update({
    where: { id: sprint.id },
    data: { state: nextState, startAt: new Date() },
  });
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
  const unfinished = await prisma.issue.findMany({
    where: { sprintId: sprint.id, columnId: { notIn: doneColumnIds } },
    select: { id: true },
  });

  // Complete the sprint.
  await prisma.sprint.update({
    where: { id: sprint.id },
    data: { state: nextState, endAt: new Date() },
  });

  // GOTCHA (planted): the bulk move of unfinished issues happens OUTSIDE any
  // transaction, one update per issue in a loop. If the process dies mid-loop,
  // the sprint is COMPLETED but half its unfinished issues are stranded in it.
  // The complete + move should be one atomic unit.
  const destination = moveUnfinishedTo === 'backlog' ? null : (moveUnfinishedTo ?? null);
  for (const issue of unfinished) {
    await prisma.issue.update({ where: { id: issue.id }, data: { sprintId: destination } });
  }

  return { sprint: { ...sprint, state: nextState }, movedCount: unfinished.length };
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
