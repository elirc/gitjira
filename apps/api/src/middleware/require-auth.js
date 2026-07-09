import { verifyAccessToken } from '../services/token.service.js';

// LEARN: authentication middleware answers exactly one question — "who is
// this?" — and attaches the answer to req.user. It does NOT answer "may
// they do this?"; that's authorization, a different concern that lands in
// sprint 03 (row-level checks) and gets formalized in sprint 13.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  const claims = verifyAccessToken(token);
  req.user = { id: claims.sub, email: claims.email, name: claims.name };
  next();
}
