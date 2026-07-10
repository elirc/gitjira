import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

// LEARN (sprint 12): a PERF BUDGET as a CI gate. Performance rots one innocent
// import at a time — nobody means to double the bundle, it just happens over
// months. This fails the build if the INITIAL JS chunk (what every visitor
// downloads before anything is interactive) exceeds its gzip budget. Route
// chunks are excluded on purpose: they load on demand, so they don't count
// against first paint. The number is justified in ADR 0025.

const DIST = 'apps/web/dist/assets';
// Budget for the entry chunk, gzipped. Current ~72 kB after code splitting;
// this leaves headroom for normal growth but catches a heavy new dependency
// landing in the initial load.
const BUDGET_GZIP_KB = 85;

function entryChunkBytes() {
  const files = readdirSync(DIST).filter((f) => /^index-.*\.js$/.test(f));
  if (files.length !== 1) {
    throw new Error(
      `Expected exactly one entry chunk (index-*.js), found ${files.length}: ${files}`
    );
  }
  const raw = readFileSync(join(DIST, files[0]));
  return { name: files[0], gzip: gzipSync(raw).length, raw: raw.length };
}

const { name, gzip, raw } = entryChunkBytes();
const gzipKb = gzip / 1024;
const rawKb = raw / 1024;

console.log(`Entry chunk: ${name}`);
console.log(`  raw:  ${rawKb.toFixed(1)} kB`);
console.log(`  gzip: ${gzipKb.toFixed(1)} kB  (budget: ${BUDGET_GZIP_KB} kB)`);

if (gzipKb > BUDGET_GZIP_KB) {
  console.error(
    `\n❌ Bundle budget exceeded: entry chunk is ${gzipKb.toFixed(1)} kB gzip, over the ${BUDGET_GZIP_KB} kB budget.\n` +
      `   Did a heavy dependency land in the initial load? Consider lazy-loading it, or\n` +
      `   justify a new budget in ADR 0025 before raising it.`
  );
  process.exit(1);
}
console.log(`\n✅ Under budget by ${(BUDGET_GZIP_KB - gzipKb).toFixed(1)} kB.`);
