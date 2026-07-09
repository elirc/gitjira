import { registerUser, verifyCredentials } from '../services/auth.service.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeByRawToken,
} from '../services/token.service.js';
import { toPublicUser } from '../serializers/user.serializer.js';

const REFRESH_COOKIE = 'gj_refresh';

// LEARN: four attributes, four attacks (review finding on PR #17):
// httpOnly - XSS cannot read it; sameSite - other origins cannot send it;
// secure - plaintext networks cannot see it (prod); path - only the auth
// endpoints ever receive it. A refresh credential gets ALL the armor.
function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req, res) {
  const user = await registerUser(req.body);
  res.status(201).json({ user: toPublicUser(user) });
}

export async function login(req, res) {
  const user = await verifyCredentials(req.body);

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  res.json({ accessToken, user: toPublicUser(user) });
}

export async function refresh(req, res) {
  const raw = req.cookies?.gj_refresh;
  if (!raw) {
    return res.status(401).json({ error: { message: 'No refresh token' } });
  }

  const { user, refreshToken } = await rotateRefreshToken(raw);
  setRefreshCookie(res, refreshToken);

  res.json({ accessToken: signAccessToken(user), user: toPublicUser(user) });
}

export async function logout(req, res) {
  const raw = req.cookies?.gj_refresh;
  if (raw) await revokeByRawToken(raw);

  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).end();
}

export async function me(req, res) {
  res.json({ user: req.user });
}
