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
});
