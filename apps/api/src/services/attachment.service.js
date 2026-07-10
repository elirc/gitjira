import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { requireMembership } from './project.service.js';

const STORAGE_DIR = path.join(process.cwd(), 'uploads');

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

export async function addAttachment(projectKey, number, actorId, file) {
  const issue = await loadIssue(projectKey, number, actorId);
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const storageKey = `${issue.id}-${Date.now()}-${file.originalname}`;
  await fs.writeFile(path.join(STORAGE_DIR, storageKey), file.buffer);

  return prisma.attachment.create({
    data: {
      issueId: issue.id,
      uploaderId: actorId,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      storageKey,
    },
    select: { id: true, filename: true, size: true, mimeType: true, createdAt: true },
  });
}

// LEARN (sprint 13, IDOR fix — found in the pentest review, NOT the self-audit):
// download by attachment id must prove object-level authorization, not just
// authentication. The attack: a member of project A fetches project B's
// attachment by id. The fix walks attachment -> issue -> project and runs the
// SAME requireMembership check every other project-scoped read uses. "Logged in"
// is not "allowed to see THIS object" — that gap is the entire IDOR class.
export async function getAttachmentForDownload(attachmentId, actorId) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { issue: { select: { projectId: true } } },
  });
  if (!attachment) throw notFound('Attachment');
  // Object-level authz: caller must be a member of the attachment's project.
  // requireMembership throws 404 (not 403) for non-members — no existence oracle.
  await requireMembership(attachment.issue.projectId, actorId);
  const filePath = path.join(STORAGE_DIR, attachment.storageKey);
  return { attachment, filePath };
}
