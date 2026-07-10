import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LEARN (sprint 12): a DETERMINISTIC scale seed. Performance numbers are only
// meaningful if the data is reproducible — "it's slow on my machine" is
// worthless if your machine has different data than mine. A fixed-seed PRNG
// (no faker dependency, no Math.random) means every developer and every CI run
// builds the byte-identical world: 50 projects, 20k issues, 100k events. Run it,
// measure, and your p95 is comparable to everyone else's.
//
// Config via env so you can dial it up locally without editing code.
const PROJECTS = Number(process.env.SCALE_PROJECTS) || 50;
const ISSUES = Number(process.env.SCALE_ISSUES) || 20_000;
const EVENTS = Number(process.env.SCALE_EVENTS) || 100_000;
const USERS = Number(process.env.SCALE_USERS) || 30;
const PASSWORD = 'demo-password-1';

// mulberry32 — a tiny, fast, deterministic PRNG. Seeded once, so the whole run
// is reproducible. This is the entire reason the numbers are trustworthy.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(1337);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randint = (n) => Math.floor(rand() * n);

const TYPES = ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'];
const PRIORITIES = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'];
const KINDS = [
  'issue.created',
  'status.changed',
  'assignee.changed',
  'priority.changed',
  'comment.added',
];
const WORDS = [
  'auth',
  'board',
  'cache',
  'deploy',
  'export',
  'filter',
  'graph',
  'hook',
  'index',
  'login',
  'modal',
  'query',
  'route',
  'socket',
  'token',
  'upload',
  'webhook',
];
const VERBS = ['fix', 'add', 'refactor', 'remove', 'investigate', 'optimize', 'document', 'test'];
const title = () => `${pick(VERBS)} ${pick(WORDS)} ${pick(WORDS)}`;

const DEFAULT_COLUMNS = [
  { name: 'To Do', category: 'TODO', position: 0 },
  { name: 'In Progress', category: 'IN_PROGRESS', position: 1 },
  { name: 'Done', category: 'DONE', position: 2 },
];

async function main() {
  const t0 = Date.now();
  console.log(`Scaling: ${PROJECTS} projects, ${ISSUES} issues, ${EVENTS} events, ${USERS} users…`);

  // LEARN: cost 4 here, not 12 — seed users are throwaway. Cost 12 × 30 users
  // is ~8s of pure hashing for zero benefit (see the sprint-11 bcrypt lesson).
  const passwordHash = await bcrypt.hash(PASSWORD, 4);

  // Users (bulk).
  const userData = Array.from({ length: USERS }, (_, i) => ({
    email: `scale-user-${i}@gitjira.dev`,
    name: `User ${i}`,
    passwordHash,
  }));
  await prisma.user.createMany({ data: userData, skipDuplicates: true });
  const users = await prisma.user.findMany({ where: { email: { startsWith: 'scale-user-' } } });
  const userIds = users.map((u) => u.id);

  // Projects + their columns + memberships. createMany can't create relations,
  // so projects/columns are created per-project but in a tight loop.
  const projects = [];
  for (let p = 0; p < PROJECTS; p++) {
    const leadId = userIds[p % userIds.length];
    const project = await prisma.project.create({
      data: {
        key: `SCL${p}`,
        name: `Scale Project ${p}`,
        leadId,
        columns: { create: DEFAULT_COLUMNS },
        members: {
          create: userIds
            .slice(0, 5 + randint(10))
            .map((userId, i) => ({ userId, role: i === 0 ? 'ADMIN' : 'MEMBER' })),
        },
      },
      include: { columns: true },
    });
    projects.push(project);
  }
  console.log(`  projects done (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  // Issues — bulk in batches. Distribute across projects; number is per-project.
  const perProjectCounter = new Array(PROJECTS).fill(0);
  const BATCH = 2000;
  let made = 0;
  const issueIdsByProject = Array.from({ length: PROJECTS }, () => []);
  while (made < ISSUES) {
    const batch = [];
    for (let i = 0; i < BATCH && made < ISSUES; i++, made++) {
      const p = randint(PROJECTS);
      const project = projects[p];
      const number = ++perProjectCounter[p];
      const column = project.columns[randint(project.columns.length)];
      batch.push({
        projectId: project.id,
        number,
        type: pick(TYPES),
        title: title(),
        priority: pick(PRIORITIES),
        columnId: column.id,
        reporterId: pick(userIds),
        assigneeId: rand() < 0.7 ? pick(userIds) : null,
        position: (made % 900000).toString(36),
      });
    }
    const created = await prisma.issue.createManyAndReturn({
      data: batch,
      select: { id: true, projectId: true },
    });
    for (const row of created) {
      const idx = projects.findIndex((pr) => pr.id === row.projectId);
      if (idx >= 0) issueIdsByProject[idx].push(row.id);
    }
  }
  // Keep each project's issueCounter honest with what we inserted.
  for (let p = 0; p < PROJECTS; p++) {
    await prisma.project.update({
      where: { id: projects[p].id },
      data: { issueCounter: perProjectCounter[p] },
    });
  }
  const allIssueIds = issueIdsByProject.flat();
  console.log(`  ${made} issues done (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  // Activity events — bulk in batches, spread over recent history.
  let events = 0;
  while (events < EVENTS) {
    const batch = [];
    for (let i = 0; i < BATCH && events < EVENTS; i++, events++) {
      const issueId = pick(allIssueIds);
      batch.push({
        issueId,
        actorId: pick(userIds),
        kind: pick(KINDS),
        payload: {},
        createdAt: new Date(Date.now() - randint(60) * 86400000 - randint(86400000)),
      });
    }
    await prisma.activityEvent.createMany({ data: batch });
  }
  console.log(`  ${events} events done (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  console.log(`Scale seed complete in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
