import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://gitjira:gitjira_dev@localhost:5432/gitjira_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.LOG_LEVEL = 'silent';
process.env.DISABLE_QUEUE = '1'; // tests run the handler directly, no Redis
// LEARN (sprint 11): drop the bcrypt cost for tests. Production hashes at cost
// 12 (~250ms) on purpose; a test user needs no such margin, and cost 12 across
// dozens of registrations was timing the auth suite out under Docker load — a
// real flake. This env var only exists in tests. See auth.service.js.
process.env.BCRYPT_COST = process.env.BCRYPT_COST ?? '4';

// LEARN (sprint 12): tests use the in-memory cache backend (no Redis to run the
// suite). The cache is a module-level Map, so it must be cleared between tests
// or a cached member map from one test leaks into the next — a shared-state
// flake. CACHE_BACKEND=memory forces the fallback store even if REDIS_HOST is set.
process.env.CACHE_BACKEND = 'memory';

const { __realClient } = await import('../src/lib/prisma.js');
const { beginRollbackTx, endRollbackTx } = await import('./tx.js');
const { __clearMemoryCache } = await import('../src/lib/cache.js');

// LEARN (sprint 11): isolation is now transaction ROLLBACK, not TRUNCATE.
// Each test runs inside a transaction that is rolled back afterward — same
// clean-slate guarantee, a fraction of the cost, because nothing is ever
// committed for the next test to clean up. See ADR 0022 + test/tx.js.
//
// OPT-OUT: a suite that tests real transaction/constraint behavior under
// concurrency (many connections racing) can't share one transaction — it sets
// `globalThis.__NO_ROLLBACK__ = true` at module load and gets a TRUNCATE
// instead. That's the honest boundary: rollback isolation can't test the very
// mechanism it relies on.
const usesRollback = () => !globalThis.__NO_ROLLBACK__;

beforeAll(async () => {
  // Start every run from a known-empty world. With rollback isolation nothing
  // ever commits, so this one truncate keeps the DB clean across the whole file.
  await __realClient.$executeRawUnsafe(
    'TRUNCATE "User", "Project", "ProjectMember", "RefreshToken" CASCADE'
  );
});

beforeEach(async () => {
  __clearMemoryCache(); // no cached member map may survive into the next test
  if (usesRollback()) {
    await beginRollbackTx();
  } else {
    await __realClient.$executeRawUnsafe(
      'TRUNCATE "User", "Project", "ProjectMember", "RefreshToken" CASCADE'
    );
  }
});

afterEach(async () => {
  if (usesRollback()) await endRollbackTx();
});

afterAll(async () => {
  await __realClient.$disconnect();
});
