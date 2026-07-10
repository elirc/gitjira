// @ts-check
// LEARN (sprint 13): the CENTRAL POLICY module — the single source of truth for
// "who can do what". Before this, authorization was scattered: a `['ADMIN']`
// check here, an implicit "any member can" there, and VIEWER could edit issues
// simply because no code stopped them. Scattered checks can't be audited and
// silently disagree. One table, one function, one place to reason about.
//
// This lives in `shared` so the SERVER enforces it and the CLIENT can mirror it
// for UX (hide buttons a user can't use). But note the golden rule: the UI check
// is a courtesy; the SERVER is the security boundary. Never trust the client.

/** @typedef {'ADMIN' | 'MEMBER' | 'VIEWER'} Role */
export const ROLES = /** @type {const} */ (['ADMIN', 'MEMBER', 'VIEWER']);

// The matrix: action -> the roles allowed to perform it. This is the
// authoritative source; docs/SECURITY.md mirrors it and a test asserts they
// match, so the doc and the code can't drift.
/** @type {Record<string, Role[]>} */
export const POLICY = {
  // Projects
  'project:read': ['ADMIN', 'MEMBER', 'VIEWER'],
  'project:update': ['ADMIN'],
  'project:delete': ['ADMIN'],
  // Membership
  'member:add': ['ADMIN'],
  'member:remove': ['ADMIN'],
  // Issues
  'issue:read': ['ADMIN', 'MEMBER', 'VIEWER'],
  'issue:create': ['ADMIN', 'MEMBER'],
  'issue:update': ['ADMIN', 'MEMBER'],
  'issue:move': ['ADMIN', 'MEMBER'],
  'issue:delete': ['ADMIN', 'MEMBER'],
  // Comments
  'comment:read': ['ADMIN', 'MEMBER', 'VIEWER'],
  'comment:create': ['ADMIN', 'MEMBER'],
  // Attachments
  'attachment:read': ['ADMIN', 'MEMBER', 'VIEWER'],
  'attachment:upload': ['ADMIN', 'MEMBER'],
  // Sprints
  'sprint:read': ['ADMIN', 'MEMBER', 'VIEWER'],
  'sprint:manage': ['ADMIN', 'MEMBER'],
};

/** @typedef {keyof typeof POLICY} Action */
export const ACTIONS = /** @type {Action[]} */ (Object.keys(POLICY));

/**
 * Does `role` permit `action`? Pure role→action check. Object-level
 * authorization (is the user a member of THIS resource's project?) is enforced
 * separately, at the data layer — both must pass.
 * @param {Role | null | undefined} role
 * @param {Action} action
 * @returns {boolean}
 */
export function can(role, action) {
  if (!role) return false;
  const allowed = POLICY[action];
  if (!allowed) throw new Error(`Unknown policy action: ${action}`);
  return allowed.includes(role);
}
