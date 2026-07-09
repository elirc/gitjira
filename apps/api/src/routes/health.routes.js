import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { getHealth } from '../controllers/health.controller.js';

export const healthRoutes = Router();

healthRoutes.get('/', asyncHandler(getHealth));
