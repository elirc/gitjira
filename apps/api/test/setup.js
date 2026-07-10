import { beforeEach, afterAll } from 'vitest';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://gitjira:gitjira_dev@localhost:5432/gitjira_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.LOG_LEVEL = 'silent';
process.env.DISABLE_QUEUE = '1'; // tests run the handler directly, no Redis

const { prisma } = await import('../src/lib/prisma.js');

// LEARN: every test starts from an empty world. Truncating between tests is
// the blunt-but-honest isolation strategy; sprint 11 upgrades this to
// transaction rollbacks when the suite gets big enough to feel the cost.
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "User", "Project", "ProjectMember", "RefreshToken" CASCADE'
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
