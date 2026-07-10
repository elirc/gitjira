import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { POLICY, ROLES, ACTIONS, can } from '../src/policy.js';

// LEARN (sprint 13): these tests make the permission matrix impossible to get
// silently wrong. (1) The DOC/CODE drift guard parses the table in
// docs/SECURITY.md and asserts it equals POLICY — change one without the other
// and CI goes red. (2) Exhaustive coverage checks can() for EVERY role × action,
// so a new action can't ship without a deliberate decision for each role.

const SECURITY_MD = fileURLToPath(new URL('../../../docs/SECURITY.md', import.meta.url));

/** Parse the "| action | ✓ | | ✓ |" matrix out of the security doc. */
function parseMatrixFromDoc() {
  const md = readFileSync(SECURITY_MD, 'utf8');
  const rows = md.split('\n').filter((l) => /^\|\s*[a-z]+:[a-z]+\s*\|/.test(l)); // matrix rows only
  /** @type {Record<string, string[]>} */
  const doc = {};
  for (const row of rows) {
    const cells = row.split('|').map((c) => c.trim());
    // cells: ['', action, admin, member, viewer, '']
    const action = cells[1];
    const allowed = [];
    if (cells[2] === '✓') allowed.push('ADMIN');
    if (cells[3] === '✓') allowed.push('MEMBER');
    if (cells[4] === '✓') allowed.push('VIEWER');
    doc[action] = allowed;
  }
  return doc;
}

describe('permission policy', () => {
  it('the SECURITY.md matrix matches POLICY exactly (no doc/code drift)', () => {
    const doc = parseMatrixFromDoc();
    // Same set of actions...
    expect(Object.keys(doc).sort()).toEqual(ACTIONS.slice().sort());
    // ...and the same roles per action.
    for (const action of ACTIONS) {
      expect(doc[action].slice().sort(), `mismatch for ${action}`).toEqual(
        POLICY[action].slice().sort()
      );
    }
  });

  it('can() is defined for every role × action (exhaustive)', () => {
    for (const action of ACTIONS) {
      for (const role of ROLES) {
        const expected = POLICY[action].includes(role);
        expect(can(role, action), `${role} × ${action}`).toBe(expected);
      }
    }
  });

  it('denies an unknown or missing role', () => {
    expect(can(null, 'issue:read')).toBe(false);
    expect(can(undefined, 'issue:read')).toBe(false);
  });

  it('throws on an unknown action — a typo is a bug, not a silent allow', () => {
    // @ts-expect-error deliberately invalid action
    expect(() => can('ADMIN', 'issue:teleport')).toThrow(/Unknown policy action/);
  });

  it('VIEWER is read-only (regression on the gap the matrix surfaced)', () => {
    expect(can('VIEWER', 'issue:read')).toBe(true);
    expect(can('VIEWER', 'issue:create')).toBe(false);
    expect(can('VIEWER', 'issue:update')).toBe(false);
    expect(can('VIEWER', 'comment:create')).toBe(false);
  });
});
