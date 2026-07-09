import { prisma } from '../lib/prisma.js';

// LEARN: one place records history. Services call recordActivity() after a
// meaningful change; nobody writes ActivityEvent rows directly. This single
// seam is what sprints 08 (emit to sockets) and 09 (enqueue notifications)
// will wrap — build the choke-point now so those sprints plug in instead of
// hunting every mutation site.
//
// Deliberately NOT a database trigger: business events ("assignee changed
// from X to Y") carry intent that lives in the service layer, not in raw row
// diffs. A trigger sees columns change; the service knows *why*. (ADR 0011.)
export async function recordActivity(tx, { issueId, actorId, kind, payload = {} }) {
  return (tx ?? prisma).activityEvent.create({
    data: { issueId, actorId, kind, payload },
  });
}

// Humanize an event for display. Kept next to the writer so the vocabulary of
// `kind` strings has one home.
export function describeActivity(event, usersById = {}) {
  const who = usersById[event.actorId]?.name ?? 'Someone';
  const p = event.payload ?? {};
  switch (event.kind) {
    case 'issue.created':
      return `${who} created this issue`;
    case 'status.changed':
      return `${who} moved this from ${p.from ?? '—'} to ${p.to ?? '—'}`;
    case 'assignee.changed':
      return `${who} changed the assignee`;
    case 'priority.changed':
      return `${who} set priority to ${p.to}`;
    case 'comment.added':
      return `${who} commented`;
    default:
      return `${who} did something (${event.kind})`;
  }
}
