import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { keyBetween } from '@gitjira/shared/fractional-index';
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

  const columnId = input.columnId ?? project.columns[0].id;

  // New issues append to the bottom of their column: find the current last
  // position and place a fractional key after it (keyBetween(last, null)).
  const last = await prisma.issue.findFirst({
    where: { columnId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const position = keyBetween(last?.position ?? null, null);

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
        columnId,
        position,
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
    // LEARN: project ONLY what the table renders (review finding on PR #27).
    // No `description` (up to 5000 chars/row), no position/updatedAt/
    // reporterId the list never shows. `select` and `include` don't mix, so
    // the assignee relation is selected explicitly too. Payload dropped from
    // ~1.4 KB/issue to ~0.2 KB/issue on the seeded data.
    select: {
      id: true,
      number: true,
      type: true,
      title: true,
      priority: true,
      // columnId + position are tiny and the board groups/sorts by them.
      // Still no `description` — the over-fetch fix (PR #27) stands.
      columnId: true,
      position: true,
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
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

// LEARN: the board's write path. A move sets the issue's column and a new
// fractional position between its target neighbors. The client computes the
// position (it knows the visual order); the server persists it. Note this is
// a NEW way to mutate an issue — every new mutation path needs its own authz
// check (the recurring theme). See the move test.
export async function moveIssue(projectKey, number, actorId, { columnId, position }) {
  const { project, issue } = await loadIssueForActor(projectKey, number, actorId);

  // LEARN: columnId is a client-supplied foreign key — an authorization
  // question, not just data (review finding on PR #39). Without this check a
  // member of GJ could move a GJ issue into another project's column,
  // corrupting both boards. Verify the target column belongs to THIS project.
  const targetColumn = await prisma.workflowColumn.findFirst({
    where: { id: columnId, projectId: project.id },
    select: { id: true },
  });
  if (!targetColumn) throw notFound('Column');

  const updated = await prisma.issue.update({
    where: { id: issue.id },
    data: { columnId, position },
    select: {
      id: true,
      number: true,
      type: true,
      title: true,
      priority: true,
      columnId: true,
      position: true,
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return { ...updated, key: `${project.key}-${updated.number}` };
}
