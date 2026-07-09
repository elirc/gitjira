import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LEARN: a seed script is a contract with every developer (and every
// screenshot in every PR): the same demo world, every time. Idempotent by
// design — upserts keyed on stable unique fields, safe to run twice.
const PASSWORD = 'demo-password-1';

// LEARN: seeded projects need the same default columns the API creates on
// real project creation — otherwise the board (sprint 04) has nowhere to put
// cards and issue creation (which places into columns[0]) fails. The seed must
// mirror the app's invariants, not just its tables.
const DEFAULT_COLUMNS = [
  { name: 'To Do', category: 'TODO', position: 0 },
  { name: 'In Progress', category: 'IN_PROGRESS', position: 1 },
  { name: 'Done', category: 'DONE', position: 2 },
];

const USERS = [
  { email: 'ana@gitjira.dev', name: 'Ana Petrov' },
  { email: 'ben@gitjira.dev', name: 'Ben Okafor' },
  { email: 'cho@gitjira.dev', name: 'Cho Min-seo' },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const users = [];
  for (const u of USERS) {
    users.push(
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash },
      })
    );
  }

  const [ana, ben, cho] = users;

  const gj = await prisma.project.upsert({
    where: { key: 'GJ' },
    update: {},
    create: {
      key: 'GJ',
      name: 'GitJira',
      description: 'The tracker, tracked in itself.',
      leadId: ana.id,
      members: {
        create: [
          { userId: ana.id, role: 'ADMIN' },
          { userId: ben.id, role: 'MEMBER' },
          { userId: cho.id, role: 'VIEWER' },
        ],
      },
      columns: { create: DEFAULT_COLUMNS },
    },
  });

  const web = await prisma.project.upsert({
    where: { key: 'WEB' },
    update: {},
    create: {
      key: 'WEB',
      name: 'Marketing site',
      leadId: ben.id,
      members: {
        create: [
          { userId: ben.id, role: 'ADMIN' },
          { userId: cho.id, role: 'MEMBER' },
        ],
      },
      columns: { create: DEFAULT_COLUMNS },
    },
  });

  console.log(`Seeded ${users.length} users and projects ${gj.key}, ${web.key}`);
  console.log(`All demo passwords: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
