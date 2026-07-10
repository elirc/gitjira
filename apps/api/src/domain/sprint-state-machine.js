// @ts-check
import { conflict } from '../lib/errors.js';

// LEARN: a STATE MACHINE modeled as data, not control flow. A sprint is in one
// of three states, and only certain transitions are legal. Instead of scattering
// `if (sprint.state === 'ACTIVE' && ...)` checks across the codebase, the rules
// live here in one table you can read top to bottom and audit. Adding a state
// later (CANCELLED?) means adding rows, not hunting for every conditional.
//
//   PLANNED ──start──▶ ACTIVE ──complete──▶ COMPLETED
//
// Each transition names its guards — preconditions that must hold. The guards
// are pure functions of a context object, so they're trivially unit-testable
// without a database or an HTTP request in sight.

export const SPRINT_STATE = { PLANNED: 'PLANNED', ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED' };

/** @typedef {{ issueCount?: number }} TransitionContext */
/** @typedef {(ctx: TransitionContext) => string | null} Guard */
/** @typedef {{ from: string, to: string, guards: Guard[] }} Transition */

// WHY a table: the set of legal transitions is now literally readable, and
// "can I go from X to Y?" is a lookup, not a code path.
/** @type {Record<string, Transition>} */
const TRANSITIONS = {
  start: {
    from: SPRINT_STATE.PLANNED,
    to: SPRINT_STATE.ACTIVE,
    guards: [
      // A sprint must have at least one issue to start (stakeholder rule).
      (ctx) => ((ctx.issueCount ?? 0) > 0 ? null : 'Cannot start a sprint with no issues'),
    ],
  },
  complete: {
    from: SPRINT_STATE.ACTIVE,
    to: SPRINT_STATE.COMPLETED,
    guards: [],
  },
};

// Assert a transition is legal from the sprint's current state, running its
// guards. Throws a domain error (409) on any violation; returns the target
// state on success. NOTE: the "only one ACTIVE sprint per project" rule is NOT
// checked here — that's enforced by the database partial unique index, because
// only the database can make it true under concurrency. This module owns the
// per-sprint rules; the DB owns the cross-sprint invariant.
/**
 * @param {string} action
 * @param {string} currentState
 * @param {TransitionContext} [ctx]
 * @returns {string} the target state
 */
export function assertTransition(action, currentState, ctx = {}) {
  const t = TRANSITIONS[action];
  if (!t) throw conflict(`Unknown sprint action "${action}"`);
  if (currentState !== t.from) {
    throw conflict(`Cannot ${action} a sprint that is ${currentState} (must be ${t.from})`);
  }
  for (const guard of t.guards) {
    const problem = guard(ctx);
    if (problem) throw conflict(problem);
  }
  return t.to;
}

/**
 * @param {string} action
 * @param {string} currentState
 */
export const canTransition = (action, currentState) =>
  TRANSITIONS[action]?.from === currentState;
