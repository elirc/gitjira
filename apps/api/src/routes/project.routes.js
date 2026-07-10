import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createProjectSchema, addMemberSchema } from '@gitjira/shared/issue-schemas';
import * as projects from '../controllers/project.controller.js';
import { issueRoutes } from './issue.routes.js';
import { sprintRoutes } from './sprint.routes.js';

export const projectRoutes = Router();

projectRoutes.use(requireAuth);

projectRoutes.get('/', asyncHandler(projects.list));
projectRoutes.post('/', validate(createProjectSchema), asyncHandler(projects.create));
projectRoutes.get('/:key', asyncHandler(projects.getOne));
projectRoutes.post(
  '/:id/members',
  validate(addMemberSchema),
  asyncHandler(projects.addProjectMember)
);
projectRoutes.delete('/:id/members/:userId', asyncHandler(projects.removeProjectMember));

// LEARN: issues are nested under a project's key — the URL encodes the
// ownership. /projects/GJ/issues/101 reads like the domain talks.
projectRoutes.use('/:key/issues', issueRoutes);
projectRoutes.use('/:key/sprints', sprintRoutes);
