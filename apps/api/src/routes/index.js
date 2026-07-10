import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { projectRoutes } from './project.routes.js';
import { requireAuth } from '../middleware/require-auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { download } from '../controllers/attachment.controller.js';
import * as notify from '../controllers/notification.controller.js';
import { validate } from '../middleware/validate.js';
import * as searchCtl from '../controllers/search.controller.js';
import { savedFilterSchema } from '@gitjira/shared/issue-schemas';

export const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/auth', authRoutes);
routes.use('/projects', projectRoutes);

// LEARN: download is addressed by attachment id at the top level, NOT nested
// under a project. That URL shape is convenient - and it is exactly why the
// project-scoped authz that guards everything else does not apply here.
routes.get('/attachments/:id', requireAuth, asyncHandler(download));

// Notifications belong to the current user.
routes.get('/me/notifications', requireAuth, asyncHandler(notify.list));
routes.post('/me/notifications/read-all', requireAuth, asyncHandler(notify.markAllRead));
routes.post('/me/notifications/:id/read', requireAuth, asyncHandler(notify.markRead));
routes.post('/issues/:issueId/watch', requireAuth, asyncHandler(notify.watch));

// Saved filters belong to the current user, not a project.
routes.get('/me/filters', requireAuth, asyncHandler(searchCtl.listFilters));
routes.post(
  '/me/filters',
  requireAuth,
  validate(savedFilterSchema),
  asyncHandler(searchCtl.saveFilter)
);
routes.delete('/me/filters/:id', requireAuth, asyncHandler(searchCtl.removeFilter));
