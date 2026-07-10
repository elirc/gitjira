import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createSprintSchema, completeSprintSchema, assignSprintSchema } from '@gitjira/shared/issue-schemas';
import * as sprints from '../controllers/sprint.controller.js';

// mergeParams to see :key from the project router.
export const sprintRoutes = Router({ mergeParams: true });
sprintRoutes.use(requireAuth);

sprintRoutes.get('/', asyncHandler(sprints.list));
sprintRoutes.post('/', validate(createSprintSchema), asyncHandler(sprints.create));
sprintRoutes.post('/:id/start', asyncHandler(sprints.start));
sprintRoutes.post('/:id/complete', validate(completeSprintSchema), asyncHandler(sprints.complete));
sprintRoutes.get('/:id/report', asyncHandler(sprints.report));
