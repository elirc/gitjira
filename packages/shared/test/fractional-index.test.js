import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { keyBetween } from '../src/fractional-index.js';

describe('keyBetween — examples', () => {
  it('produces a key between two opens (the very first key)', () => {
    expect(keyBetween(null, null)).toBeTruthy();
  });

  it('before-first sorts below, after-last sorts above', () => {
    const mid = keyBetween(null, null);
    expect(keyBetween(null, mid) < mid).toBe(true);
    expect(keyBetween(mid, null) > mid).toBe(true);
  });

  it('a value between two adjacent keys sorts strictly between them', () => {
    const a = keyBetween(null, null);
    const b = keyBetween(a, null);
    const mid = keyBetween(a, b);
    expect(a < mid && mid < b).toBe(true);
  });

  it('throws when a >= b (a misuse we want loud, not silent)', () => {
    expect(() => keyBetween('Z', 'A')).toThrow();
    expect(() => keyBetween('M', 'M')).toThrow();
  });

  // LEARN (workflow-hardening): these targeted cases were added to KILL surviving
  // mutants that Stryker found (evidence/mutation-testing.txt). The random
  // property test is MID-seeded, so it never generated inputs with adjacent LOW
  // first-digits — the exact branch where the midpoint "is there room between
  // digits?" check lives. keyBetween('1','2') exercises it: correct code returns
  // '1V' (strictly between); the mutant `digitB + digitA > 1` returns '1' (== a),
  // which the `a < k` assertion below catches. Mutation testing pointed here.
  it('inserts strictly between keys with adjacent low first-digits', () => {
    for (const [a, b] of [
      ['1', '2'],
      ['0', '1'],
      ['A', 'B'],
      ['a', 'b'],
    ]) {
      const k = keyBetween(a, b);
      expect(a < k, `${a} < ${k}`).toBe(true);
      expect(k < b, `${k} < ${b}`).toBe(true);
    }
  });
});

// LEARN: property-based testing. Instead of hand-picking examples, fast-check
// generates thousands of random insertion sequences and asserts an INVARIANT
// holds for all of them. When it finds a failure it SHRINKS the input to the
// minimal reproducer. This is how you test an ordering utility — the bugs live
// in the cases you'd never think to write by hand.
describe('keyBetween — properties', () => {
  it('never collides and stays sorted across random insertions', () => {
    fc.assert(
      fc.property(
        // a sequence of insertion positions, each a fraction of the current length
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 300 }),
        (fractions) => {
          const keys = [keyBetween(null, null)];
          for (const f of fractions) {
            const idx = Math.min(keys.length, Math.floor(f * (keys.length + 1)));
            const a = idx === 0 ? null : keys[idx - 1];
            const b = idx === keys.length ? null : keys[idx];
            const k = keyBetween(a, b);
            // invariant 1: strictly between neighbors
            if (a !== null && !(a < k)) return false;
            if (b !== null && !(k < b)) return false;
            keys.splice(idx, 0, k);
          }
          // invariant 2: the keys, read in insertion order, are already sorted
          const sorted = [...keys].sort();
          if (keys.some((k, i) => k !== sorted[i])) return false;
          // invariant 3: no duplicates
          return new Set(keys).size === keys.length;
        }
      ),
      { numRuns: 500 }
    );
  });
});
