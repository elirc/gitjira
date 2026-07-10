import { Prisma } from '@prisma/client';
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

  // LEARN: the event identity for dedup. Prefer an explicit eventId; fall back
  // to the job id. Either way it's STABLE across retries — the same job that
  // runs twice produces the same key, unlike a random UUID (review finding).
  const eventId = data.eventId ?? job.id ?? `${data.kind}:${data.issueId}`;

  let notified = 0;
  for (const userId of recipients) {
    // dedupeKey = event + recipient. A redelivered job produces the SAME key,
    // hits the UNIQUE constraint, and we treat that as "already delivered"
    // (not an error). This is what makes at-least-once delivery safe.
    const dedupeKey = `${eventId}:${userId}`;
    try {
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
      notified += 1;
    } catch (e) {
      // P2002 = unique violation = this notification already exists from a
      // prior (successful) run of this same job. Idempotent success, not error.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
      throw e;
    }
  }

  return { notified };
}
