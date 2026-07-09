import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AuthError } from './auth.service.js';

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
};

export function signAccessToken(user) {
  // LEARN: the access token is a bearer credential with a 15-minute blast
  // radius. It is stateless on purpose — no DB hit to verify — which is
  // also why it CANNOT be revoked. Revocability lives in the refresh
  // token, which is why the refresh token gets a database table.
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, secret(), {
    expiresIn: ACCESS_TTL,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, secret());
  } catch {
    throw new AuthError('Invalid or expired access token');
  }
}

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

export async function issueRefreshToken(userId, familyId = crypto.randomUUID()) {
  // LEARN: 32 random bytes, not a JWT. The refresh token carries no claims —
  // it is a lookup key. All its meaning lives server-side, which is exactly
  // what makes it revocable.
  const raw = crypto.randomBytes(32).toString('hex');

  await prisma.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return raw;
}

export async function rotateRefreshToken(raw) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new AuthError('Invalid refresh token');
  }

  // LEARN: replay detection. A refresh token is single-use; seeing a
  // REVOKED one again means it was stolen and someone (owner or thief)
  // already spent it. We can't tell which party this caller is — so we
  // revoke the entire family and force a fresh login. Containment beats
  // optimism.
  if (record.revokedAt) {
    await revokeFamily(record.familyId);
    throw new AuthError('Refresh token reuse detected — session revoked');
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const nextRaw = await issueRefreshToken(record.userId, record.familyId);

  return { user: record.user, refreshToken: nextRaw };
}

export async function revokeFamily(familyId) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeByRawToken(raw) {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (record) await revokeFamily(record.familyId);
}
