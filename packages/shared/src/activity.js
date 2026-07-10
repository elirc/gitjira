// @ts-check
// LEARN: humanizing an activity event is shared — the server uses it for
// emails later (sprint 09), the client for the feed. One vocabulary of `kind`
// strings, one place that turns them into sentences.
// GOTCHA (planted): `event` is typed `any` and `usersById` `any` to make the
// checker pass. This SILENCES the type checker rather than using it — the
// whole point of turning it on was to catch mistakes here, and `any` opts back
// out. The fix is a real typedef (ideally a discriminated union on `kind`).
/**
 * @param {any} event
 * @param {any} usersById
 * @returns {string}
 */
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
