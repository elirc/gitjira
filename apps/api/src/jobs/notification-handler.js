import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';

// LEARN: the fan-out handler. Given a domain event, figure out WHO should be
// notified (assignee, @mentioned users, watchers) and create a notification
// row for each. This runs in the WORKER, off the request path, so it can be
// slow and can be retried without the user waiting.

// Resolve the recipients for an event. Deduped so one person isn't notified
// twice for the same event (assignee AND watcher = one notification).
async function resolveRecipients({ kind, issueId, actorId, mentionedUserIds = [] }) {
  const recipients = new Set(mentionedUserIds);

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { assigneeId: true },
  });
  if (kind === 'issue.assigned' && issue?.assigneeId) recipients.add(issue.assigneeId);

  const watchers = await prisma.watcher.findMany({ where: { issueId }, select: { userId: true } });
  for (const w of watchers) recipients.add(w.userId);

  // Never notify the person who caused the event.
  recipients.delete(actorId);
  return [...recipients];
}

export async function handleNotificationJob(job) {
  const data = job.data ?? job; // accept a raw payload in tests
  const recipients = await resolveRecipients(data);

  for (const userId of recipients) {
    // GOTCHA (planted): dedupeKey is a fresh random UUID per run. It looks
    // "unique per notification", but it defeats the whole point — a RETRIED
    // job (BullMQ is at-least-once) generates a NEW uuid and inserts a SECOND
    // notification for the same event. The key must be derived from the event
    // identity (stable across retries), and the unique-violation must be caught
    // as "already delivered". As written, run this job twice and the user gets
    // notified twice.
    const dedupeKey = crypto.randomUUID();

    await prisma.notification.create({
      data: {
        userId,
        kind: data.kind,
        issueId: data.issueId ?? null,
        actorId: data.actorId ?? null,
        payload: data.payload ?? {},
        dedupeKey,
      },
    });
  }

  return { notified: recipients.length };
}
