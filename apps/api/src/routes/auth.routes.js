import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/require-auth.js';
import { registerSchema, loginSchema } from '@gitjira/shared/auth-schemas';
import { register, login, refresh, logout, me } from '../controllers/auth.controller.js';
import { rateLimit, keyByIpAndAccount } from '../middleware/rate-limit.js';

export const authRoutes = Router();

// LEARN (sprint 13, pentest fix): throttle login on IP *and* account, not IP
// alone. IP-only locks out a whole office behind one NAT (their typos become a
// self-DoS) and never slows an attacker credential-stuffing ONE account from a
// botnet (no single IP crosses the limit). Keying on both means the office isn't
// collateral and the targeted account is actually protected. 10/min, then 429.
const loginLimiter = rateLimit({
  name: 'login',
  windowMs: 60_000,
  max: 10,
  keyFn: keyByIpAndAccount,
});

authRoutes.post('/register', validate(registerSchema), asyncHandler(register));
authRoutes.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
authRoutes.post('/refresh', asyncHandler(refresh));
authRoutes.post('/logout', asyncHandler(logout));
authRoutes.get('/me', requireAuth, asyncHandler(me));
