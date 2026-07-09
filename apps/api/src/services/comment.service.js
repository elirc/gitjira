import { prisma } from '../lib/prisma.js';
import { notFound, forbidden } from '../lib/errors.js';
import { requireMembership } from './project.service.js';
import { recordActivity } from './activity.service.js';

async function loadIssue(projectKey, number, actorId) {
  const project = await prisma.project.findUnique({ where: { key: projectKey } });
  if (!project) throw notFound('Project');
  await requireMembership(project.id, actorId);
  const issue = await prisma.issue.findUnique({
    where: { projectId_number: { projectId: project.id, number } },
  });
  if (!issue) throw notFound('Issue');
  return issue;
}

export async function addComment(projectKey, number, actorId, body) {
  const issue = await loadIssue(projectKey, number, actorId);

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: { issueId: issue.id, authorId: actorId, body },
      include: { author: { select: { id: true, name: true } } },
    });
    await recordActivity(tx, { issueId: issue.id, actorId, kind: 'comment.added' });
    return comment;
  });
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
