import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app, makeUser } from './helpers.js';
import { __setRateLimitEnabled, __clearRateLimits } from '../src/middleware/rate-limit.js';

// LEARN (sprint 13): the rest of the suite runs with rate limiting OFF (it logs
// in constantly from one IP). This file turns it ON to prove the limiter works,
// then OFF again so it can't leak to other files.
describe('login rate limiting', () => {
  beforeEach(() => {
    __clearRateLimits();
    __setRateLimitEnabled(true);
  });
  afterEach(() => {
    __setRateLimitEnabled(false);
    __clearRateLimits();
  });

  it('429s after too many login attempts, with a Retry-After header', async () => {
    await makeUser('throttle@t.dev'); // makeUser itself logs in once
    // hammer wrong-password logins until we cross the window
    let last;
    for (let i = 0; i < 15; i++) {
      last = await request(app)
        .post('/api/auth/login')
        .send({ email: 'throttle@t.dev', password: 'wrong-password' });
      if (last.status === 429) break;
    }
    expect(last.status).toBe(429);
    expect(last.headers['retry-after']).toBeDefined();
    expect(last.body.error.code).toBe('RATE_LIMITED');
  });

  it('trips per-account, so one attacked account does not lock out others (dual-key)', async () => {
    await makeUser('victim@t.dev');
    await makeUser('bystander@t.dev');

    // Hammer the victim account until throttled (same test IP throughout).
    let victim;
    for (let i = 0; i < 15; i++) {
      victim = await request(app)
        .post('/api/auth/login')
        .send({ email: 'victim@t.dev', password: 'wrong' });
      if (victim.status === 429) break;
    }
    expect(victim.status).toBe(429);

    // A DIFFERENT account from the SAME IP must NOT be throttled — the bucket is
    // keyed on IP AND account, so the victim's storm doesn't spill over. If we
    // keyed on IP alone, this would be 429 (the office-lockout bug).
    const bystander = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bystander@t.dev', password: 'correct-horse-battery' });
    expect(bystander.status).toBe(200);
  });
});
