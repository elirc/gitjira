import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
let count = 0;
for (const folder of ['src', 'public', 'tests', 'scripts']) {
  for (const name of readdirSync(join(root, folder))) {
    if (!/\.(m?js)$/.test(name)) continue;
    const result = spawnSync(process.execPath, ['--check', join(root, folder, name)], { encoding: 'utf8' });
    if (result.status !== 0) {
      process.stderr.write(result.stderr || result.error?.message || 'Syntax check failed');
      process.exit(1);
    }
    count++;
  }
}
console.log(`Syntax checks passed for ${count} JavaScript files.`);
