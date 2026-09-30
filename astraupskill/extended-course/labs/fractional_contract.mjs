// Read-only import of the project's actual pure function; no application startup.
import assert from 'node:assert/strict';
import { keyBetween } from '../../../packages/shared/src/fractional-index.js';

let seed = 731;
const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
const keys = [];
let checks = 0;
for (let i = 0; i < 2000; i++) {
  const gap = next() % (keys.length + 1);
  const left = gap ? keys[gap - 1] : null;
  const right = gap < keys.length ? keys[gap] : null;
  const key = keyBetween(left, right);
  assert.match(key, /^[0-9A-Za-z]+$/);
  assert.ok(left === null || left < key, `lower bound at insertion ${i}`);
  assert.ok(right === null || key < right, `upper bound at insertion ${i}`);
  keys.splice(gap, 0, key);
  checks += 3;
}
assert.equal(new Set(keys).size, keys.length); checks++;
assert.throws(() => keyBetween('B', 'A')); checks++;
assert.throws(() => keyBetween('A', 'A')); checks++;
const a = keyBetween(null, null);
assert.equal(keyBetween(a, null), keyBetween(a, null)); checks++;
console.log(JSON.stringify({checks, inserted: keys.length, maximumKeyLength: Math.max(...keys.map(x => x.length)), seed: 731, scope: 'Actual pure keyBetween function; generated-key domain only. No database, collation, or concurrent-client execution.'}));
