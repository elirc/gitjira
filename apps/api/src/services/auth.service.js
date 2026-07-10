import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApiError, conflict, unauthenticated } from '../lib/errors.js';

// LEARN: bcrypt cost factor 12 ≈ 250ms of deliberate slowness per hash.
// Slow is the feature: it turns "leaked table + GPU" from an afternoon
// into centuries. See ADR 0004 for the cost-factor reasoning.
// LEARN (sprint 11): the cost is env-configurable so TESTS can drop it to ~4.
// This is a legitimate test/prod difference (Django and Rails ship the same
// idea): the security margin is irrelevant to a throwaway test user, and cost
// 12 × dozens of registrations was making the auth suite time out under load —
// a real flake. Production reads no env var and stays at 12; only the test
// setup lowers it. NEVER lower it in a real environment.
const BCRYPT_COST = Number(process.env.BCRYPT_COST) || 12;

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
