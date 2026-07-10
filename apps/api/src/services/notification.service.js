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
  // LEARN: bound "mark all read" to notifications that existed when the request
  // arrived (review finding). The fan-out worker is concurrent — without the
  // `createdAt <= now` bound, a notification inserted mid-operation could be
  // marked read before the user ever saw it. Anything arriving after `now`
  // stays unread.
  const now = new Date();
  await prisma.notification.updateMany({
    where: { userId, readAt: null, createdAt: { lte: now } },
    data: { readAt: now },
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
