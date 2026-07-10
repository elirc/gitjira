import { prisma } from '../lib/prisma.js';
import { notFound, forbidden } from '../lib/errors.js';
import { extractMentions } from '@gitjira/shared/mentions';
import { authorize } from './project.service.js';
import { recordActivity } from './activity.service.js';
import { autoWatch } from './notification.service.js';
import { enqueueNotification } from '../jobs/queue.js';

// Resolve @handles (email local-part) to user ids among project members.
async function resolveMentions(projectId, handles) {
  if (handles.length === 0) return [];
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { user: { select: { id: true, email: true } } },
  });
  return members
    .filter((m) => handles.includes(m.user.email.split('@')[0].toLowerCase()))
    .map((m) => m.user.id);
}

async function loadIssue(projectKey, number, actorId) {
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) throw notFound('Project');
  await authorize(project.id, actorId, 'comment:create');
  const issue = await prisma.issue.findUnique({
    where: { projectId_number: { projectId: project.id, number } },
  });
  if (!issue) throw notFound('Issue');
  return issue;
}

export async function addComment(projectKey, number, actorId, body) {
  const issue = await loadIssue(projectKey, number, actorId);

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { issueId: issue.id, authorId: actorId, body },
      include: { author: { select: { id: true, name: true } } },
    });
    await recordActivity(tx, {
      issueId: issue.id,
      actorId,
      kind: 'comment.added',
      projectId: issue.projectId,
    });
    // commenting auto-watches the issue
    await autoWatch(tx, issue.id, actorId);
    return created;
  });

  // Off the request path: notify @mentioned members (and watchers via the
  // fan-out). Resolving + enqueuing happens after commit — the comment is
  // already saved, so the user isn't waiting on notification work.
  const mentionedUserIds = await resolveMentions(issue.projectId, extractMentions(body));
  await enqueueNotification({
    kind: 'comment.mention',
    issueId: issue.id,
    actorId,
    mentionedUserIds,
    payload: { commentId: comment.id },
  });

  return comment;
}

export async function editComment(projectKey, number, actorId, commentId, body) {
  const issue = await loadIssue(projectKey, number, actorId);
  const comment = await prisma.comment.findFirst({ where: { id: commentId, issueId: issue.id } });
  if (!comment) throw notFound('Comment');
  // LEARN: membership lets you SEE the issue; authorship lets you EDIT the
  // comment. Two different questions — being in the project doesn't make
  // someone else's words yours to change.
  if (comment.authorId !== actorId) throw forbidden('You can only edit your own comments');

  return prisma.comment.update({
    where: { id: commentId },
    data: { body, editedAt: new Date() },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function deleteComment(projectKey, number, actorId, commentId) {
  const issue = await loadIssue(projectKey, number, actorId);
  const comment = await prisma.comment.findFirst({ where: { id: commentId, issueId: issue.id } });
  if (!comment) throw notFound('Comment');
  if (comment.authorId !== actorId) throw forbidden('You can only delete your own comments');
  await prisma.comment.delete({ where: { id: commentId } });
}
