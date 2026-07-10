// @ts-check
// LEARN: humanizing an activity event is shared — the server uses it for
// emails later (sprint 09), the client for the feed. One vocabulary of `kind`
// strings, one place that turns them into sentences.
//
// TYPES (sprint 10 review): the parameter used to be `any`. That made the
// checker pass while checking nothing — a caller could hand us `event.paylod`
// (typo) or the wrong payload shape and TypeScript would stay silent. The fix
// is a DISCRIMINATED UNION: a union of object types distinguished by the shared
// literal field `kind`. Once TS knows `kind`, it NARROWS `payload` to exactly
// that variant's shape inside each `case` — so reading `payload.to` is only
// legal where a `to` actually exists. This is the whole reason to turn the
// checker on: it now catches the mistakes this function is here to make safe.

/** @typedef {{ id: string, name?: string | null }} ActorRef */
/** @typedef {Record<string, ActorRef>} UsersById */

/**
 * The shapes `recordActivity` actually writes (see issue.service.js /
 * comment.service.js). The union is the source of truth: add a `kind` here and
 * the switch below stops compiling until you handle it.
 * @typedef {(
 *   | { kind: 'issue.created';   payload: { title: string } }
 *   | { kind: 'status.changed';  payload: { from: string | null; to: string | null } }
 *   | { kind: 'priority.changed'; payload: { from: string | null; to: string | null } }
 *   | { kind: 'assignee.changed'; payload: { from: string | null; to: string | null } }
 *   | { kind: 'comment.added';   payload?: Record<string, never> }
 * ) & { actorId?: string; actor?: ActorRef; createdAt?: string | Date }} ActivityEvent
 */

/**
 * @param {ActivityEvent} event
 * @param {UsersById} [usersById]
 * @returns {string}
 */
export function describeActivity(event, usersById = {}) {
  const who =
    usersById[event.actorId ?? event.actor?.id ?? '']?.name ?? event.actor?.name ?? 'Someone';

  // LEARN: notice payload is read INSIDE each case, after `event.kind` has
  // narrowed the union — not once at the top. The old code did
  // `const p = event.payload ?? {}` up front and then read `p.from`; with a
  // real union the checker rejects that, because `payload` on an
  // `issue.created` event has no `from`. Narrow first, then read.
  switch (event.kind) {
    case 'issue.created':
      return `${who} created this issue`;
    case 'status.changed':
      return `${who} moved this from ${event.payload.from ?? '—'} to ${event.payload.to ?? '—'}`;
    case 'assignee.changed':
      return `${who} changed the assignee`;
    case 'priority.changed':
      return `${who} set priority to ${event.payload.to ?? '—'}`;
    case 'comment.added':
      return `${who} commented`;
    default:
      // Unknown/forward-compatible kind (e.g. a notification-only kind that
      // leaked into the feed). Fail soft rather than throw in the UI.
      return `${who} updated this issue`;
  }
}
