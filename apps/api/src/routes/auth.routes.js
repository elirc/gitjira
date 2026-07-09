import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { registerSchema, loginSchema } from '@gitjira/shared/auth-schemas';
import { register, login } from '../controllers/auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema), asyncHandler(register));
authRoutes.post('/login', validate(loginSchema), asyncHandler(login));
