// This suite tests a pure function (no DB), so it opts out of rollback isolation.
globalThis.__NO_ROLLBACK__ = true;

import { describe, it, expect } from 'vitest';
import { loadEnv } from '../src/lib/env.js';

// LEARN (sprint 15): the env validator is pure and easy to test — give it a
// fake process.env and assert it accepts good config and REJECTS bad config
// with a message naming the offending var. This is the "fail fast, fail loud"
// guarantee, verified.

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'a-sufficiently-long-secret',
};

describe('env validation', () => {
  it('accepts valid config and applies defaults', () => {
    const env = loadEnv(valid);
    expect(env.PORT).toBe(3000); // default
    expect(env.NODE_ENV).toBe('development'); // default
    expect(env.REDIS_HOST).toBe('localhost');
  });

  it('refuses to start when JWT_SECRET is missing, naming the var', () => {
    const { JWT_SECRET, ...missing } = valid;
    void JWT_SECRET;
    expect(() => loadEnv(missing)).toThrow(/JWT_SECRET/);
    expect(() => loadEnv(missing)).toThrow(/refusing to start/);
  });

  it('rejects a too-short secret and a non-URL database', () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/at least 16/);
    expect(() => loadEnv({ ...valid, DATABASE_URL: 'not-a-url' })).toThrow(/valid postgres URL/);
  });

  it('lists EVERY problem at once, not just the first', () => {
    let msg = '';
    try {
      loadEnv({ DATABASE_URL: 'nope', JWT_SECRET: 'x' });
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toMatch(/DATABASE_URL/);
    expect(msg).toMatch(/JWT_SECRET/);
  });
});
