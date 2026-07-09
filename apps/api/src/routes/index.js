import { Router } from 'express';
import { healthRoutes } from './health.routes.js';

export const routes = Router();

routes.use('/health', healthRoutes);
