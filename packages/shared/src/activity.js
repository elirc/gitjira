// LEARN: humanizing an activity event is shared — the server uses it for
// emails later (sprint 09), the client for the feed. One vocabulary of `kind`
// strings, one place that turns them into sentences.
export function describeActivity(event, usersById = {}) {
  const who = usersById[event.actorId ?? event.actor?.id]?.name ?? event.actor?.name ?? 'Someone';
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
      return `${who} updated this issue`;
  }
}
