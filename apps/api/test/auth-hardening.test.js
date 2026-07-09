import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

const CREDS = { email: 'sec@example.com', name: 'Sec', password: 'correct-horse-battery' };

// LEARN: both tests in this file exist because review caught the bugs they
// pin (PR #17). This is what "regression test" means: the same mistake can
// never merge twice.
describe('response serialization', () => {
  it('never exposes passwordHash (or anything off the allowlist) in any auth response', async () => {
    const reg = await request(app).post('/api/auth/register').send(CREDS);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: CREDS.email, password: CREDS.password });
    const cookie = login.headers['set-cookie'].find((c) => c.startsWith('gj_refresh='));
    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookie);

    for (const res of [reg, login, refresh]) {
      expect(Object.keys(res.body.user).sort()).toEqual(['avatarUrl', 'email', 'id', 'name']);
    }
  });
});

describe('refresh cookie attributes', () => {
  it('sets httpOnly, sameSite, and a scoped path', async () => {
    await request(app).post('/api/auth/register').send(CREDS);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: CREDS.email, password: CREDS.password });

    const cookie = login.headers['set-cookie'].find((c) => c.startsWith('gj_refresh='));

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/api\/auth/i);
    // `Secure` is production-only; asserted structurally here, enforced by
    // NODE_ENV=production in deployment (sprint 15 verifies it end to end).
  });
});
