import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

// LEARN: bcrypt cost factor 12 ≈ 250ms of deliberate slowness per hash.
// Slow is the feature: it turns "leaked table + GPU" from an afternoon
// into centuries. See ADR 0004 for the cost-factor reasoning.
const BCRYPT_COST = 12;

export class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function registerUser({ email, name, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError('An account with this email already exists', 409);
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
    throw new AuthError('Invalid email or password');
  }

  return user;
}
