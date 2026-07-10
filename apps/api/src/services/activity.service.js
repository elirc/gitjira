import { prisma } from '../lib/prisma.js';
import { emitToProject } from '../realtime/emit.js';

// LEARN: one place records history. Services call recordActivity() after a
// meaningful change; nobody writes ActivityEvent rows directly. This single
// seam is what sprints 08 (emit to sockets) and 09 (enqueue notifications)
// will wrap — build the choke-point now so those sprints plug in instead of
// hunting every mutation site. Sprint 08 adds the first consumer below.
//
// Deliberately NOT a database trigger: business events ("assignee changed
// from X to Y") carry intent that lives in the service layer, not in raw row
// diffs. A trigger sees columns change; the service knows *why*. (ADR 0011.)
export async function recordActivity(tx, { issueId, actorId, kind, payload = {}, projectId }) {
  const event = await (tx ?? prisma).activityEvent.create({
    data: { issueId, actorId, kind, payload },
  });

  // WHY emit a lightweight "something changed" hint, not the full new state:
  // this fires from inside the caller's transaction (before commit). If we
  // sent the new values and a client trusted them, a rolled-back transaction
  // would leave clients showing data that never committed. Instead we emit
  // just the kind + ids; the client INVALIDATES its cache and refetches, which
  // reads committed state (or the unchanged state, if we rolled back). This is
  // the safe half of the "patch cache vs invalidate" decision — invalidate.
  if (projectId) {
    emitToProject(projectId, 'activity', { kind, issueId, actorId });
  }

  return event;
}

export { describeActivity } from '@gitjira/shared/activity';
