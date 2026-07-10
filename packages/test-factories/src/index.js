// @ts-check
// LEARN: FACTORIES, not fixtures. A fixture is a shared constant every test
// reads (`const testUser = {...}`); it's a drift magnet — tests come to lean on
// incidental fields, and one edit breaks tests that never cared. A factory is a
// FUNCTION that returns a fresh, valid object: the caller overrides only what
// this test is about, and the defaults are irrelevant-but-valid. The override
// list becomes documentation of the test's intent.
//
// Two flavors live here:
//   • build*  — pure, no I/O. Returns a plain object. Use for unit/component
//               tests and as the body of an API request.
//   • create* — persists via a Prisma client you pass in. Use in integration
//               tests. (The factory doesn't own the client, so it works against
//               the per-test transaction from ADR 0022 without knowing about it.)

import bcrypt from 'bcryptjs';

// A per-process counter guarantees uniqueness without coordinating between
// tests — no two factory calls collide on email/key/number. `seq()` is the
// smallest possible "build your own world" primitive.
let _seq = 0;
export const seq = () => ++_seq;
/** Reset the counter — handy in a beforeEach if a test asserts on exact values. */
export const resetSeq = () => {
  _seq = 0;
};

// LEARN: a FIXED low-cost hash for a known password. Real auth uses bcrypt cost
// 12 (~250ms) on purpose; test data doesn't need that security margin, and
// paying it per factory user would dominate suite time. `bcrypt.compare`
// verifies against any cost, so login still works in tests. This is the right
// kind of test/prod difference: cheaper where safety doesn't apply.
export const TEST_PASSWORD = 'correct-horse-battery';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

/**
 * @param {Partial<{ email: string, name: string, passwordHash: string, avatarUrl: string|null }>} [overrides]
 */
export function buildUser(overrides = {}) {
  const n = seq();
  return {
    email: `user${n}@example.test`,
    name: `User ${n}`,
    passwordHash: TEST_PASSWORD_HASH,
    avatarUrl: null,
    ...overrides,
  };
}

/**
 * @param {Partial<{ key: string, name: string, description: string|null }>} [overrides]
 */
export function buildProject(overrides = {}) {
  const n = seq();
  return {
    // Keys are short + uppercase in the product; keep that shape but unique.
    key: `P${n}`,
    name: `Project ${n}`,
    description: null,
    ...overrides,
  };
}

/**
 * @param {Partial<{ title: string, type: string, priority: string, description: string|null, labels: string[] }>} [overrides]
 */
export function buildIssue(overrides = {}) {
  const n = seq();
  return {
    title: `Issue ${n}`,
    type: 'TASK',
    priority: 'MEDIUM',
    description: null,
    labels: [],
    ...overrides,
  };
}

/**
 * Persist a user. Pass the Prisma client (or a transaction handle).
 * @param {import('@prisma/client').PrismaClient} db
 * @param {Parameters<typeof buildUser>[0]} [overrides]
 */
export function createUser(db, overrides = {}) {
  return db.user.create({ data: buildUser(overrides) });
}

/**
 * Persist a project with its owner (lead) and the default board columns — the
 * minimum a project needs to hold issues. Returns { project, lead, columns }.
 * @param {import('@prisma/client').PrismaClient} db
 * @param {{ lead?: any, project?: Parameters<typeof buildProject>[0], columns?: string[] }} [opts]
 */
export async function createProject(db, opts = {}) {
  const lead = opts.lead ?? (await createUser(db));
  const columnNames = opts.columns ?? ['To Do', 'In Progress', 'Done'];
  const project = await db.project.create({
    data: {
      ...buildProject(opts.project),
      leadId: lead.id,
      members: { create: { userId: lead.id, role: 'ADMIN' } },
      columns: {
        create: columnNames.map((name, i) => ({
          name,
          position: i,
          // last column is the terminal/done category; first is the backlog-ish
          category: i === columnNames.length - 1 ? 'DONE' : i === 0 ? 'TODO' : 'IN_PROGRESS',
        })),
      },
    },
    include: { columns: { orderBy: { position: 'asc' } }, members: true },
  });
  return { project, lead, columns: project.columns };
}

/**
 * Persist a project pre-loaded with N issues in its first column. The workhorse
 * for "given a board with some cards" setups. Returns the createProject result
 * plus `issues`.
 * @param {import('@prisma/client').PrismaClient} db
 * @param {{ count?: number, lead?: any, project?: Parameters<typeof buildProject>[0], issue?: Parameters<typeof buildIssue>[0] }} [opts]
 */
export async function createProjectWithIssues(db, opts = {}) {
  const count = opts.count ?? 3;
  const base = await createProject(db, { lead: opts.lead, project: opts.project });
  const { project, lead, columns } = base;
  const firstColumn = columns[0];

  const issues = [];
  for (let i = 0; i < count; i++) {
    // Fractional position keys keep insertion order without renumbering; here a
    // simple ascending letter is enough for test data (see fractional-index).
    const issue = await db.issue.create({
      data: {
        ...buildIssue(opts.issue),
        projectId: project.id,
        columnId: firstColumn.id,
        reporterId: lead.id,
        number: i + 1,
        position: String.fromCharCode(97 + i), // 'a', 'b', 'c', …
      },
    });
    issues.push(issue);
  }
  // Keep the project's issue counter honest with what we inserted.
  await db.project.update({ where: { id: project.id }, data: { issueCounter: count } });

  return { ...base, issues };
}
