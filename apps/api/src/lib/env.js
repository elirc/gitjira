// @ts-check
import { z } from 'zod';

// LEARN (sprint 15): the env-validation pattern comes FULL CIRCLE. Sprint 2 used
// Zod to validate untrusted HTTP input; env vars are untrusted input too — set
// by whoever configured the deploy, easy to typo or forget. Validate them ONCE,
// at boot, and FAIL FAST with a precise message. The alternative is the 2am
// classic: the app starts fine, then crashes on the first request that reads
// `process.env.JWT_SECRET` and finds `undefined` — far from the real cause.
//
// "Crash at boot with a clear message" beats "misbehave later" every time.

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid postgres URL'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  // Optional with sensible defaults — declared so the schema is the full
  // inventory of what the app reads from the environment.
  PORT: z.coerce.number().int().positive().default(3000),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
});

/**
 * Parse + validate process.env. Returns the typed, defaulted config, or throws
 * a single error listing EVERY problem (not just the first) so one boot tells
 * you everything to fix.
 * @param {NodeJS.ProcessEnv} [source]
 */
export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration — refusing to start.\n${problems}\n` +
        `Set the variables above (see .env.example / the runbook) and restart.`
    );
  }
  return result.data;
}
