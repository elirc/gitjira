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

// LEARN: download by attachment id. Anyone logged in can fetch any attachment
// by id — we only require authentication here. (This is exactly the kind of
// object-level check that's easy to forget on a resource added late; sprint 13
// audits it.)
export async function getAttachmentForDownload(attachmentId, actorId) {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw notFound('Attachment');
  // authorization: caller must be logged in (requireAuth middleware handled that)
  void actorId;
  const filePath = path.join(STORAGE_DIR, attachment.storageKey);
  return { attachment, filePath };
}
