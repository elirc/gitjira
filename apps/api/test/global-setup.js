import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const TEST_URL =
  process.env.DATABASE_URL ?? 'postgresql://gitjira:gitjira_dev@localhost:5432/gitjira_test';

// LEARN: global setup runs ONCE before the suite: create the test database
// if needed (local convenience; CI's service container already has one) and
// apply migrations. Tests must never run against the dev database — the
// default URL here points at gitjira_test, not gitjira.
export default async function () {
  const dbName = new URL(TEST_URL).pathname.slice(1);
  const adminUrl = TEST_URL.replace(`/${dbName}`, '/postgres');
  const admin = new PrismaClient({ datasourceUrl: adminUrl });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch {
    // already exists — fine
  } finally {
    await admin.$disconnect();
  }

  const apiDir = fileURLToPath(new URL('..', import.meta.url));
  execSync('npx prisma migrate deploy', {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: 'inherit',
  });
}
