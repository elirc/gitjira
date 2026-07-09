import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

// LEARN: yes, this is over-engineered for a health check — a service layer
// for reading uptime! It exists to model the pattern on something trivial.
// The next service (auth, sprint 02) will have real logic and an identical
// shape. Consistency is what makes a codebase navigable.
export async function checkHealth() {
  return {
    status: 'ok',
    version,
    uptimeSeconds: Math.round(process.uptime()),
  };
}
