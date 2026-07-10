import { prisma } from '../lib/prisma.js';
import { notFound, forbidden, conflict } from '../lib/errors.js';
import { cached, invalidate, cacheKeys } from '../lib/cache.js';

// TTL for the cached member map. Short enough that a missed invalidation heals
// on its own quickly; long enough to absorb the burst of membership checks that
// every authorized request makes.
const MEMBERS_TTL = 60;

// LEARN (sprint 12): the member map ({ userId: role }) for a project is read on
// essentially EVERY authorized request (requireMembership). It changes rarely.
// That's the textbook profile for a read-through cache — hot read, cold write.
async function getMemberMap(projectId) {
  return cached(cacheKeys.projectMembers(projectId), MEMBERS_TTL, async () => {
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true, role: true },
    });
    return Object.fromEntries(members.map((m) => [m.userId, m.role]));
  });
}

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
  // Read the member map through the cache — this is the hot read the cache
  // exists for. NOTE (security-relevant): because authz reads this cache, ANY
  // membership mutation MUST invalidate it, or a stale entry becomes a stale
  // authorization decision.
  const memberMap = await getMemberMap(projectId);
  const role = memberMap[userId];
  if (!role) throw notFound('Project');
  if (roles && !roles.includes(role)) {
    throw forbidden('Your role does not permit this action');
  }
  return { projectId, userId, role };
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
  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { role },
    create: { projectId, userId, role },
  });
  // Invalidate the cached member map so the new member / new role is visible
  // immediately, not after the TTL.
  await invalidate(cacheKeys.projectMembers(projectId));
  return member;
}

export async function removeMember(projectId, actorId, userId) {
  await requireMembership(projectId, actorId, ['ADMIN']);
  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });
  return { removed: true };
}
