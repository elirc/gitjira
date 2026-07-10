// @ts-check
import { z } from 'zod';
import { ISSUE_TYPES, PRIORITIES } from './issue-schemas.js';

// LEARN (sprint 11): these are RESPONSE schemas — the shape the API promises to
// send BACK. We already validate what comes IN (issue-schemas.js). Contract
// tests parse every integration response through these, so if a handler starts
// returning a differently-shaped object, a test fails loudly instead of a
// client discovering it in production. The schema is the contract; both the
// server (here) and the typed client (via z.infer) are held to it.
//
// Dates are strings: JSON has no Date type, so DateTime serializes to an ISO
// string over the wire. Asserting z.string() here is asserting the real
// on-the-wire shape, not the in-memory one — a subtlety worth internalizing.

export const publicUserSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  })
  .strict(); // .strict(): an UNEXPECTED field is a contract violation too.

export const authResponseSchema = z
  .object({
    accessToken: z.string().min(10),
    user: publicUserSchema,
  })
  .strict();

export const columnSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    name: z.string(),
    position: z.number().int(),
    category: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  })
  .strict();

export const projectSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    leadId: z.string(),
    issueCounter: z.number().int(),
    createdAt: z.string(),
    // Create/detail responses embed the default board columns; list responses
    // omit them. Optional in the contract, validated when present.
    columns: z.array(columnSchema).optional(),
  })
  .strict();

export const issueSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    number: z.number().int().positive(),
    type: z.enum(ISSUE_TYPES),
    title: z.string(),
    description: z.string().nullable(),
    priority: z.enum(PRIORITIES),
    columnId: z.string(),
    assigneeId: z.string().nullable(),
    reporterId: z.string(),
    labels: z.array(z.string()),
    parentId: z.string().nullable(),
    position: z.string(),
    storyPoints: z.number().int().nullable(),
    sprintId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    // The service augments the row with a human key like "GJ-12".
    key: z.string(),
  })
  .strict();

/** @typedef {z.infer<typeof publicUserSchema>} PublicUser */
/** @typedef {z.infer<typeof issueSchema>} IssueResponse */
/** @typedef {z.infer<typeof projectSchema>} ProjectResponse */
