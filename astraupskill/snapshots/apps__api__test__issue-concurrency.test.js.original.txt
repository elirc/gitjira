// Opts out of transaction-rollback isolation: this suite races real
// connections / tests transaction+constraint behavior, which a single shared
// transaction cannot reproduce (see test/setup.js + ADR 0022).
globalThis.__NO_ROLLBACK__ = true;

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

// LEARN: this test exists because review caught the race. It is written to
// FAIL against read-then-increment allocation and PASS against atomic
// allocation. Fire many creates at once and demand distinct, gapless
// numbers — the concurrency a sequential test can never exercise.
describe('issue-key allocation under concurrency', () => {
  it('never allocates a duplicate number for simultaneous creates', async () => {
    const ana = await makeUser('race@t.dev');
    await makeProject(ana.auth, 'GJ');

    const N = 20;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        request(app)
          .post('/api/projects/GJ/issues')
          .set('Authorization', ana.auth)
          .send({ title: `concurrent-${i}` })
      )
    );

    const numbers = results.map((r) => r.body.issue.number).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(N); // no collisions
    expect(numbers).toEqual(Array.from({ length: N }, (_, i) => i + 1)); // exactly 1..N, no gaps
  });
});
