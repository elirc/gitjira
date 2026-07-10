import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';
import { registerSchema, loginSchema } from '@gitjira/shared/auth-schemas';
import { register, login, refresh, logout, me } from '../controllers/auth.controller.js';
import { rateLimit, keyByIp } from '../middleware/rate-limit.js';

export const authRoutes = Router();

// LEARN (sprint 13): throttle login to blunt brute-force / credential-stuffing.
// 10 attempts per minute, then 429 + Retry-After.
const loginLimiter = rateLimit({
  name: 'login',
  windowMs: 60_000,
  max: 10,
  keyFn: keyByIp,
});

authRoutes.post('/register', validate(registerSchema), asyncHandler(register));
authRoutes.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
authRoutes.post('/refresh', asyncHandler(refresh));
authRoutes.post('/logout', asyncHandler(logout));
authRoutes.get('/me', requireAuth, asyncHandler(me));
