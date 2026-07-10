import * as notifications from '../services/notification.service.js';

export async function list(req, res) {
  res.json({
    notifications: await notifications.listNotifications(req.user.id),
    unread: await notifications.unreadCount(req.user.id),
  });
}
export async function markRead(req, res) {
  await notifications.markRead(req.user.id, req.params.id);
  res.status(204).end();
}
export async function markAllRead(req, res) {
  await notifications.markAllRead(req.user.id);
  res.status(204).end();
}
export async function watch(req, res) {
  const { watchIssue, unwatchIssue } = notifications;
  if (req.body.watch) await watchIssue(req.params.issueId, req.user.id);
  else await unwatchIssue(req.params.issueId, req.user.id);
  res.status(204).end();
}
