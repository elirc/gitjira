import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { registerSchema } from '@gitjira/shared/auth-schemas';
import { register } from '../controllers/auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema), asyncHandler(register));
