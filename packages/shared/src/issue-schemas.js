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

// LEARN: field shapes live in one place (no drift), but defaults do NOT.
// A default is a create-time concept — "if you didn't say, use MEDIUM". On a
// PATCH, `.default()` would fire for every omitted field and silently rewrite
// it, turning "leave this alone" into "reset this". So create ADDS defaults
// on top of the bare shapes; update just makes the bare shapes optional.
const issueFields = {
  type: z.enum(ISSUE_TYPES),
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(PRIORITIES),
  columnId: z.string().optional(),
  assigneeId: z.string().nullish(),
  labels: z.array(z.string().trim().min(1)).max(20).optional(),
  storyPoints: z.number().int().min(0).max(100).nullish(),
};

export const createIssueSchema = z.object({
  ...issueFields,
  type: issueFields.type.default('TASK'),
  priority: issueFields.priority.default('MEDIUM'),
  // parentId is a create-time concept (a new sub-task under a parent) — not a
  // PATCH field, so it lives on create only.
  parentId: z.string().optional(),
});

export const updateIssueSchema = z.object(issueFields).partial();

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const moveIssueSchema = z.object({
  columnId: z.string().min(1),
  position: z.string().min(1),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export const subtaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const savedFilterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  jql: z.string().trim().min(1).max(500),
});

export const createSprintSchema = z.object({
  name: z.string().trim().min(1).max(80),
  goal: z.string().trim().max(200).optional(),
});
export const completeSprintSchema = z.object({
  moveUnfinishedTo: z.string().nullish(), // a sprint id, or 'backlog', or null
});
export const assignSprintSchema = z.object({
  sprintId: z.string().nullish(),
});
