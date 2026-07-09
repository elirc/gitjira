import { prisma } from '../lib/prisma.js';
import { notFound, forbidden, conflict } from '../lib/errors.js';

const DEFAULT_COLUMNS = [
  { name: 'To Do', category: 'TODO', position: 0 },
  { name: 'In Progress', category: 'IN_PROGRESS', position: 1 },
  { name: 'Done', category: 'DONE', position: 2 },
];

export async function createProject({ key, name, description }, creatorId) {
  const existing = await prisma.project.findUnique({ where: { key } });
  if (existing) throw conflict(`Project key "${key}" is already taken`);

  // LEARN: project + its columns + the creator's membership are ONE
  // transaction. A project that half-exists (no columns, no admin) is a
  // broken project; $transaction makes "all or nothing" the guarantee.
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        key,
        name,
        description,
        leadId: creatorId,
        members: { create: { userId: creatorId, role: 'ADMIN' } },
        columns: { create: DEFAULT_COLUMNS },
      },
      include: { columns: true },
    });
    return project;
  });
}

// LEARN: this is the authorization workhorse of the sprint. Every project-
// scoped action calls it FIRST. Returning 404 (not 403) for non-members is
// deliberate: 403 confirms the project exists, which is information a
// stranger should not get. "You can't see this" and "this isn't here" look
// identical from outside.
export async function requireMembership(projectId, userId, roles = null) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) throw notFound('Project');
  if (roles && !roles.includes(membership.role)) {
    throw forbidden('Your role does not permit this action');
  }
  return membership;
}

export async function listProjectsForUser(userId) {
  return prisma.project.findMany({
    where: { members: { some: { userId } } },
    include: { _count: { select: { issues: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getProjectByKey(key, userId) {
  const project = await prisma.project.findUnique({
    where: { key },
    include: { columns: { orderBy: { position: 'asc' } } },
  });
  if (!project) throw notFound('Project');
  await requireMembership(project.id, userId);
  return project;
}

export async function addMember(projectId, actorId, { userId, role }) {
  await requireMembership(projectId, actorId, ['ADMIN']);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User');
  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { role },
    create: { projectId, userId, role },
  });
}
