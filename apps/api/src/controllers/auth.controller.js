import { registerUser, verifyCredentials } from '../services/auth.service.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeByRawToken,
} from '../services/token.service.js';

const REFRESH_COOKIE = 'gj_refresh';

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req, res) {
  const user = await registerUser(req.body);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const user = await verifyCredentials(req.body);

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  res.json({ accessToken, user });
}

export async function refresh(req, res) {
  const raw = req.cookies?.gj_refresh;
  if (!raw) {
    return res.status(401).json({ error: { message: 'No refresh token' } });
  }

  const { user, refreshToken } = await rotateRefreshToken(raw);
  setRefreshCookie(res, refreshToken);

  res.json({ accessToken: signAccessToken(user), user });
}

export async function logout(req, res) {
  const raw = req.cookies?.gj_refresh;
  if (raw) await revokeByRawToken(raw);

  res.clearCookie(REFRESH_COOKIE);
  res.status(204).end();
}

export async function me(req, res) {
  res.json({ user: req.user });
}
