import { registerUser, verifyCredentials } from '../services/auth.service.js';
import { signAccessToken, issueRefreshToken } from '../services/token.service.js';

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
