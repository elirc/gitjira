import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

const CREDS = { email: 'ana@example.com', name: 'Ana', password: 'correct-horse-battery' };

const registerAna = () => request(app).post('/api/auth/register').send(CREDS);
const loginAna = () =>
  request(app).post('/api/auth/login').send({ email: CREDS.email, password: CREDS.password });

// LEARN: these are integration tests — real HTTP shapes, real bcrypt, real
// Postgres. No mocks of our own code. When they're green, the auth system
// works; when a mock-heavy suite is green, the mocks agree with themselves.
const cookieOf = (res) => res.headers['set-cookie']?.find((c) => c.startsWith('gj_refresh='));

describe('register', () => {
  it('creates an account', async () => {
    const res = await registerAna();
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(CREDS.email);
  });

  it('rejects a duplicate email with 409', async () => {
    await registerAna();
    const res = await registerAna();
    expect(res.status).toBe(409);
  });

  it('normalizes email case before the uniqueness check', async () => {
    await registerAna();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...CREDS, email: 'ANA@example.com' });
    expect(res.status).toBe(409);
  });

  it('rejects a short password with field-level detail', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...CREDS, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('password');
  });
});

describe('login', () => {
  it('returns an access token and sets the refresh cookie', async () => {
    await registerAna();
    const res = await loginAna();
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(cookieOf(res)).toBeTruthy();
  });

  it('fails identically for unknown email and wrong password', async () => {
    await registerAna();
    const wrongPw = await request(app)
      .post('/api/auth/login')
      .send({ email: CREDS.email, password: 'wrong-password-here' });
    const noUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'whatever-here' });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPw.body.error.message).toBe(noUser.body.error.message);
  });
});

describe('refresh rotation', () => {
  it('rotates: each refresh issues a new token and access token', async () => {
    await registerAna();
    const login = await loginAna();
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookieOf(login));
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(cookieOf(res)).not.toBe(cookieOf(login));
  });

  // LEARN: written FIRST, before the rotation implementation was finished —
  // the attack this guards against is the reason the feature exists.
  it('detects replay: reusing a rotated token revokes the whole family', async () => {
    await registerAna();
    const login = await loginAna();
    const first = cookieOf(login);

    const rotated = await request(app).post('/api/auth/refresh').set('Cookie', first);
    const second = cookieOf(rotated);

    // attacker (or confused client) replays the ALREADY-USED token
    const replay = await request(app).post('/api/auth/refresh').set('Cookie', first);
    expect(replay.status).toBe(401);

    // containment: even the legitimate successor token is now dead
    const victim = await request(app).post('/api/auth/refresh').set('Cookie', second);
    expect(victim.status).toBe(401);
  });
});

describe('logout and me', () => {
  it('logout revokes the session', async () => {
    await registerAna();
    const login = await loginAna();
    const cookie = cookieOf(login);

    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    const after = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(after.status).toBe(401);
  });

  it('me returns the caller with a valid token, 401 without', async () => {
    await registerAna();
    const login = await loginAna();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(CREDS.email);

    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);
  });
});
