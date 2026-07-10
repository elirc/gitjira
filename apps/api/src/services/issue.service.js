import { prisma } from '../lib/prisma.js';
import { notFound, conflict } from '../lib/errors.js';
import { keyBetween } from '@gitjira/shared/fractional-index';
import { requireMembership, authorize } from './project.service.js';
import { recordActivity } from './activity.service.js';
import { autoWatch } from './notification.service.js';
import { enqueueNotification } from '../jobs/queue.js';

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
  await authorize(project.id, actorId, 'issue:create');

  const columnId = input.columnId ?? project.columns[0].id;

  // LEARN: sub-tasks are max depth 1 — a sub-task can't have sub-tasks. We
  // enforce it here (the parent must not itself have a parent) rather than
  // trusting the client, so the checklist stays a flat list, not a tree.
  if (input.parentId) {
    const parent = await prisma.issue.findFirst({
      where: { id: input.parentId, projectId: project.id },
      select: { parentId: true },
    });
    if (!parent) throw notFound('Parent issue');
    if (parent.parentId) throw conflict('Sub-tasks cannot have sub-tasks (max depth 1)');
  }

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

    const created = await tx.issue.create({
      data: {
        projectId: project.id,
        number: issueCounter,
        type: input.type,
        title: input.title,
        description: input.description,
        priority: input.priority,
        columnId,
        position,
        parentId: input.parentId ?? null,
        assigneeId: input.assigneeId ?? null,
        reporterId: actorId,
        labels: input.labels ?? [],
      },
    });
    await recordActivity(tx, {
      issueId: created.id,
      actorId,
      kind: 'issue.created',
      payload: { title: created.title },
      projectId: project.id,
    });
    return created;
  });

  // If created already assigned to someone else, notify them (off the request path).
  if (issue.assigneeId && issue.assigneeId !== actorId) {
    await autoWatch(null, issue.id, issue.assigneeId);
    await enqueueNotification({
      kind: 'issue.assigned',
      issueId: issue.id,
      actorId,
      payload: { key: `${project.key}-${issue.number}`, title: issue.title },
    });
  }

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
      sprintId: true,
      storyPoints: true,
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

async function loadIssueForActor(projectKey, number, actorId, action = 'issue:read') {
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) throw notFound('Project');
  // LEARN (sprint 13): the action is a PARAMETER, so the same loader enforces
  // read for getIssue and write for update/move/delete — one authz path, the
  // right action per caller. A VIEWER passes 'issue:read' but is stopped at
  // 'issue:update'.
  await authorize(project.id, actorId, action);

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
  const { project, issue } = await loadIssueForActor(projectKey, number, actorId, 'issue:update');

  // LEARN: optimistic concurrency control. If the client sends the
  // `expectedUpdatedAt` it started editing from, and the issue has changed
  // since (someone else edited it), we reject with 409 instead of silently
  // overwriting their work. This is the cheap, no-merge answer to "two people
  // edit at once" — a version check, not a lock. The client shows "this
  // changed, reload." (ADR 0017.)
  if (patch.expectedUpdatedAt) {
    const current = issue.updatedAt.toISOString();
    if (current !== new Date(patch.expectedUpdatedAt).toISOString()) {
      throw conflict('This issue was changed by someone else — reload and try again');
    }
  }

  // LEARN: PATCH is partial by design. We build the update from ONLY the
  // fields present in the request — `undefined` means "leave alone", which
  // is different from `null` ("clear it"). Conflating those two is a
  // classic source of "why did my assignee vanish" bugs.
  const data = {};
  for (const field of [
    'type',
    'title',
    'description',
    'priority',
    'columnId',
    'labels',
    'storyPoints',
  ]) {
    if (patch[field] !== undefined) data[field] = patch[field];
  }
  if ('assigneeId' in patch) data.assigneeId = patch.assigneeId; // null clears

  // LEARN: record the domain events in the SAME transaction as the update.
  // If the update rolls back, its history entry rolls back too — the activity
  // trail can never claim something that didn't happen.
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.issue.update({
      where: { id: issue.id },
      data,
      include: { assignee: true },
    });

    if (data.priority !== undefined && data.priority !== issue.priority) {
      await recordActivity(tx, {
        issueId: issue.id,
        actorId,
        kind: 'priority.changed',
        payload: { from: issue.priority, to: data.priority },
      });
    }
    if ('assigneeId' in data && data.assigneeId !== issue.assigneeId) {
      await recordActivity(tx, {
        issueId: issue.id,
        actorId,
        kind: 'assignee.changed',
        payload: { from: issue.assigneeId, to: data.assigneeId },
      });
    }

    return result;
  });

  // LEARN: enqueue notification work AFTER the transaction commits, off the
  // request path — the person assigning gets an instant response; the worker
  // does the fan-out. If we enqueued inside the transaction and it rolled back,
  // we'd notify about a change that never happened.
  if ('assigneeId' in data && data.assigneeId && data.assigneeId !== issue.assigneeId) {
    await autoWatch(null, issue.id, data.assigneeId); // assignee auto-watches
    await enqueueNotification({
      kind: 'issue.assigned',
      issueId: issue.id,
      actorId,
      payload: { key: `${project.key}-${updated.number}`, title: updated.title },
    });
  }

  return { ...updated, key: `${project.key}-${updated.number}` };
}

export async function deleteIssue(projectKey, number, actorId) {
  const { issue } = await loadIssueForActor(projectKey, number, actorId, 'issue:delete');
  await prisma.issue.delete({ where: { id: issue.id } });
}

// LEARN: the board's write path. A move sets the issue's column and a new
// fractional position between its target neighbors. The client computes the
// position (it knows the visual order); the server persists it. Note this is
// a NEW way to mutate an issue — every new mutation path needs its own authz
// check (the recurring theme). See the move test.
export async function moveIssue(projectKey, number, actorId, { columnId, position }) {
  const { project, issue } = await loadIssueForActor(projectKey, number, actorId, 'issue:move');

  // LEARN: columnId is a client-supplied foreign key — an authorization
  // question, not just data (review finding on PR #39). Without this check a
  // member of GJ could move a GJ issue into another project's column,
  // corrupting both boards. Verify the target column belongs to THIS project.
  const targetColumn = await prisma.workflowColumn.findFirst({
    where: { id: columnId, projectId: project.id },
    select: { id: true },
  });
  if (!targetColumn) throw notFound('Column');

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.issue.update({
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
    if (columnId !== issue.columnId) {
      // record a status change using column names for a readable trail
      const [from, to] = await Promise.all([
        tx.workflowColumn.findUnique({ where: { id: issue.columnId }, select: { name: true } }),
        tx.workflowColumn.findUnique({ where: { id: columnId }, select: { name: true } }),
      ]);
      await recordActivity(tx, {
        issueId: issue.id,
        actorId,
        kind: 'status.changed',
        payload: { from: from?.name, to: to?.name },
      });
    }
    return result;
  });

  return { ...updated, key: `${project.key}-${updated.number}` };
}

// The full issue for the detail panel: description, sub-tasks, comments,
// activity trail, attachments — everything the panel shows, one query set.
// How many recent activity events the detail panel shows. The feed used to be
// UNBOUNDED — an issue with thousands of events fetched every one of them on
// every detail load (measured at scale, sprint 12). The panel only shows the
// recent tail; older history is a separate paginated concern.
const ACTIVITY_FEED_LIMIT = 20;

export async function getIssueDetail(projectKey, number, actorId) {
  // LEARN (sprint 12): this used to call loadIssueForActor (which fetches the
  // project + membership + the issue-with-assignee) and THEN re-fetch the full
  // issue by id — loading the issue TWICE. At scale the measurement showed 12
  // queries/request. Here we do the authz (project + membership) and then ONE
  // findUnique with everything the panel needs, keyed on (projectId, number).
  const project = await prisma.project.findUnique({
    where: { key: projectKey },
    select: { id: true, key: true },
  });
  if (!project) throw notFound('Project');
  await requireMembership(project.id, actorId);

  const columns = await prisma.workflowColumn.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true, category: true },
  });

  const full = await prisma.issue.findUnique({
    where: { projectId_number: { projectId: project.id, number } },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      children: {
        select: { id: true, number: true, title: true, columnId: true },
        orderBy: { position: 'asc' },
      },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      activityEvents: {
        // Bounded feed: newest ACTIVITY_FEED_LIMIT only, not the whole history.
        take: ACTIVITY_FEED_LIMIT,
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      attachments: {
        select: { id: true, filename: true, size: true, mimeType: true, createdAt: true },
      },
    },
  });
  if (!full) throw notFound('Issue');

  const column = columns.find((c) => c.id === full.columnId);
  const doneChildren = full.children.filter((c) => {
    const col = columns.find((pc) => pc.id === c.columnId);
    return col?.category === 'DONE';
  }).length;

  return {
    ...full,
    key: `${project.key}-${full.number}`,
    columnName: column?.name,
    progress: { done: doneChildren, total: full.children.length },
  };
}
