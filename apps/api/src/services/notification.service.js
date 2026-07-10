import { prisma } from '../lib/prisma.js';

export function listNotifications(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export function unreadCount(userId) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId, id) {
  await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
}

export async function markAllRead(userId) {
  // GOTCHA (planted): this marks EVERY unread notification read with no time
  // bound. A notification that arrives WHILE this runs (the fan-out worker is
  // concurrent) can be marked read before the user ever saw it — and the
  // unread badge, computed separately, can briefly disagree. The fix is to
  // bound the update to notifications created at/before the moment the user
  // clicked (a timestamp precondition), so in-flight arrivals are untouched.
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

// Watch / unwatch.
export async function watchIssue(issueId, userId) {
  await prisma.watcher.upsert({
    where: { issueId_userId: { issueId, userId } },
    update: {},
    create: { issueId, userId },
  });
}
export async function unwatchIssue(issueId, userId) {
  await prisma.watcher.deleteMany({ where: { issueId, userId } });
}
// Auto-watch: called when a user interacts (comments, gets assigned).
export async function autoWatch(tx, issueId, userId) {
  await (tx ?? prisma).watcher.upsert({
    where: { issueId_userId: { issueId, userId } },
    update: {},
    create: { issueId, userId },
  });
}
