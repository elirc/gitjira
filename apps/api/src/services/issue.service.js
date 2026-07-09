import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { requireMembership } from './project.service.js';

// LEARN: the display key "GJ-101" is assembled here from parts, never
// stored. One source of truth (project.key + issue.number) can't disagree
// with itself.
export const issueKey = (project, issue) => `${project.key}-${issue.number}`;

export async function createIssue(projectKey, actorId, input) {
  const project = await prisma.project.findUnique({
    where: { key: projectKey },
    include: { columns: { orderBy: { position: 'asc' } } },
  });
  if (!project) throw notFound('Project');
  await requireMembership(project.id, actorId);

  const firstColumn = project.columns[0];

  // LEARN: number allocation + issue create in ONE transaction, and the
  // allocation is an ATOMIC increment — `{ increment: 1 }` compiles to
  // `UPDATE ... SET issueCounter = issueCounter + 1 RETURNING issueCounter`,
  // which the database serializes per row. No read-then-write gap means no
  // race (review finding on PR #27). The transaction ensures a failed
  // create can't burn a number.
  const issue = await prisma.$transaction(async (tx) => {
    const { issueCounter } = await tx.project.update({
      where: { id: project.id },
      data: { issueCounter: { increment: 1 } },
      select: { issueCounter: true },
    });

    return tx.issue.create({
      data: {
        projectId: project.id,
        number: issueCounter,
        type: input.type,
        title: input.title,
        description: input.description,
        priority: input.priority,
        columnId: input.columnId ?? firstColumn.id,
        assigneeId: input.assigneeId ?? null,
        reporterId: actorId,
        labels: input.labels ?? [],
      },
    });
  });

  return { ...issue, key: `${project.key}-${issue.number}` };
}

export async function listIssues(projectKey, actorId, { cursor, limit = 50, ...filters }) {
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) throw notFound('Project');
  await requireMembership(project.id, actorId);

  const where = {
    projectId: project.id,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.columnId ? { columnId: filters.columnId } : {}),
  };

  // LEARN: CURSOR pagination, not offset. `skip: 1, cursor: {id}` asks the DB
  // for "the page after this id" — stable even as rows are inserted mid-scroll,
  // and it stays fast at any depth (offset N makes the DB count past N rows
  // every time). ADR 0006 has the full comparison.
  const rows = await prisma.issue.findMany({
    where,
    take: limit + 1, // fetch one extra to know if there's a next page
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { assignee: true },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    issues: page.map((i) => ({ ...i, key: `${project.key}-${i.number}` })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

async function loadIssueForActor(projectKey, number, actorId) {
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) throw notFound('Project');
  await requireMembership(project.id, actorId);

  const issue = await prisma.issue.findUnique({
    where: { projectId_number: { projectId: project.id, number } },
    include: { assignee: true },
  });
  if (!issue) throw notFound('Issue');
  return { project, issue };
}

export async function getIssue(projectKey, number, actorId) {
  const { project, issue } = await loadIssueForActor(projectKey, number, actorId);
  return { ...issue, key: `${project.key}-${issue.number}` };
}

export async function updateIssue(projectKey, number, actorId, patch) {
  const { project, issue } = await loadIssueForActor(projectKey, number, actorId);

  // LEARN: PATCH is partial by design. We build the update from ONLY the
  // fields present in the request — `undefined` means "leave alone", which
  // is different from `null` ("clear it"). Conflating those two is a
  // classic source of "why did my assignee vanish" bugs.
  const data = {};
  for (const field of ['type', 'title', 'description', 'priority', 'columnId', 'labels']) {
    if (patch[field] !== undefined) data[field] = patch[field];
  }
  if ('assigneeId' in patch) data.assigneeId = patch.assigneeId; // null clears

  const updated = await prisma.issue.update({
    where: { id: issue.id },
    data,
    include: { assignee: true },
  });
  return { ...updated, key: `${project.key}-${updated.number}` };
}

export async function deleteIssue(projectKey, number, actorId) {
  const { issue } = await loadIssueForActor(projectKey, number, actorId);
  await prisma.issue.delete({ where: { id: issue.id } });
}
