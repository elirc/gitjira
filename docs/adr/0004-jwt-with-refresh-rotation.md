# 0004 — Short-lived JWTs + rotating refresh tokens

**Status:** accepted · **Sprint:** 02

## Context

Requirements from #10: week-long sessions, scripts on the page must not be able to steal
them, and sessions must be revocable ("kick their sessions"). Classic options: server-side
sessions (cookie + session table) or JWTs; JWTs alone cannot be revoked.

## Decision

Both, each doing what it is good at:

- **Access token**: 15-minute JWT, returned in the response body, held in client memory.
  Stateless verification (no DB read per request).
- **Refresh token**: 32 random bytes — a lookup key, not a claims object — in an httpOnly
  cookie, hashed at rest, **single-use with rotation**. Reuse of a spent token revokes the
  whole token family (replay containment).
- bcrypt cost 12 for passwords (~250ms: hostile to GPUs, imperceptible to humans).

## Consequences

- ✅ XSS cannot read the refresh cookie (httpOnly) and the access token dies with the tab.
- ✅ Revocation works despite JWTs: kill the family, the 15-minute JWT is the max exposure.
- ✅ Stolen-refresh-token replay is detected and contained automatically.
- ❌ More moving parts than a session table; the rotation dance must be exactly right
  (hence the test-first replay test).
- ❌ A 15-minute window exists where a revoked user's access token still works. Accepted;
  tightening it means a DB read per request — the exact cost JWTs avoid.
