// @ts-check
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// LEARN: a RATCHET. It counts how many files have opted into type checking
// (`// @ts-check`) and compares against a checked-in baseline. The count may
// only go UP — if a PR removes a @ts-check, CI fails. This is how you migrate a
// living codebase safely: not a big-bang flip, but a number that only improves,
// so the type-checked surface can never regress while feature work continues.
const ROOTS = ['apps/api/src', 'apps/worker/src', 'packages/shared/src'];
const BASELINE = Number(readFileSync('scripts/ts-ratchet.baseline', 'utf8').trim());

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.js') || full.endsWith('.jsx')) out.push(full);
  }
  return out;
}

let checked = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (readFileSync(file, 'utf8').startsWith('// @ts-check')) checked += 1;
  }
}

console.log(`@ts-check files: ${checked} (baseline ${BASELINE})`);
if (checked < BASELINE) {
  console.error(
    `RATCHET FAILED: coverage dropped from ${BASELINE} to ${checked}. The type-checked surface may only grow.`
  );
  process.exit(1);
}
if (checked > BASELINE) {
  console.log(`Coverage grew — bump scripts/ts-ratchet.baseline to ${checked}.`);
}
