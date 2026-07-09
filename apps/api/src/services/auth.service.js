import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApiError, conflict, unauthenticated } from '../lib/errors.js';

// LEARN: bcrypt cost factor 12 ≈ 250ms of deliberate slowness per hash.
// Slow is the feature: it turns "leaked table + GPU" from an afternoon
// into centuries. See ADR 0004 for the cost-factor reasoning.
const BCRYPT_COST = 12;

// Kept as an alias so existing imports read naturally; the error contract
// (sprint 03) unified all domain errors under ApiError.
export { ApiError as AuthError };

export async function registerUser({ email, name, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  return user;
}

export async function verifyCredentials({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // LEARN: same error for "no such user" and "wrong password" — a login
  // endpoint that answers differently is an account-enumeration oracle.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthenticated('Invalid email or password');
  }

  return user;
}
