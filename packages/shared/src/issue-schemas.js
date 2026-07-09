import { z } from 'zod';

export const ISSUE_TYPES = ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'];
export const PRIORITIES = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'];

export const createProjectSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, 'Key: 2–10 letters/digits, starting with a letter'),
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(500).optional(),
});

export const createIssueSchema = z.object({
  type: z.enum(ISSUE_TYPES).default('TASK'),
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  columnId: z.string().optional(),
  assigneeId: z.string().nullish(),
  labels: z.array(z.string().trim().min(1)).max(20).optional(),
});

// LEARN: PATCH schema = the create schema with everything optional. `.partial()`
// generates it — one schema stays the source of truth, the update variant is
// derived, not hand-maintained (and can't drift).
export const updateIssueSchema = createIssueSchema.partial();

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});
