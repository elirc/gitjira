import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { projectRoutes } from './project.routes.js';
import { requireAuth } from '../middleware/require-auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { download } from '../controllers/attachment.controller.js';

export const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/auth', authRoutes);
routes.use('/projects', projectRoutes);

// LEARN: download is addressed by attachment id at the top level, NOT nested
// under a project. That URL shape is convenient - and it is exactly why the
// project-scoped authz that guards everything else does not apply here.
routes.get('/attachments/:id', requireAuth, asyncHandler(download));
