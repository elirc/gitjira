import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createIssueSchema, updateIssueSchema } from '@gitjira/shared/issue-schemas';
import * as issues from '../controllers/issue.controller.js';

// LEARN: mergeParams lets this nested router see :key from the parent
// project router. Without it, req.params.key would be undefined here.
export const issueRoutes = Router({ mergeParams: true });

issueRoutes.get('/', asyncHandler(issues.list));
issueRoutes.post('/', validate(createIssueSchema), asyncHandler(issues.create));
issueRoutes.get('/:number', asyncHandler(issues.getOne));
issueRoutes.patch('/:number', validate(updateIssueSchema), asyncHandler(issues.update));
issueRoutes.delete('/:number', asyncHandler(issues.remove));
