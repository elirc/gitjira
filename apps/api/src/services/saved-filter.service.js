import { prisma } from '../lib/prisma.js';
import { parseJql } from '@gitjira/shared/jql';
import { notFound, forbidden, ApiError } from '../lib/errors.js';

// LEARN: validate the JQL at SAVE time, not just at run time. Storing a query
// that can never parse is a landmine for future-you; failing fast when the
// user saves it gives them the error while they still have context.
export async function createSavedFilter(userId, { name, jql }) {
  try {
    parseJql(jql);
  } catch (e) {
    throw new ApiError('VALIDATION_FAILED', `Invalid query: ${e.message}`);
  }
  return prisma.savedFilter.create({ data: { userId, name, jql } });
}

export function listSavedFilters(userId) {
  return prisma.savedFilter.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

export async function deleteSavedFilter(userId, id) {
  const filter = await prisma.savedFilter.findUnique({ where: { id } });
  if (!filter) throw notFound('Filter');
  // ownership: your filters are yours (membership isn't the question here)
  if (filter.userId !== userId) throw forbidden('You can only delete your own filters');
  await prisma.savedFilter.delete({ where: { id } });
}
