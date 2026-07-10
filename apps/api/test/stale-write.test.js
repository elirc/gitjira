// Opts out of transaction-rollback isolation: this suite races real
// connections / tests transaction+constraint behavior, which a single shared
// transaction cannot reproduce (see test/setup.js + ADR 0022).
globalThis.__NO_ROLLBACK__ = true;

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

// LEARN: optimistic-concurrency test. Two "editors" start from the same
// version; the first write wins, the second (still holding the old version)
// is rejected with 409 instead of silently clobbering.
describe('stale-write detection', () => {
  it('rejects an update whose expectedUpdatedAt is out of date (409)', async () => {
    const ana = await makeUser('sw@t.dev');
    await makeProject(ana.auth, 'GJ');
    const created = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'shared issue' });
    const number = created.body.issue.number;

    // both editors read the same version
    const v0 = (
      await request(app).get(`/api/projects/GJ/issues/${number}`).set('Authorization', ana.auth)
    ).body.issue.updatedAt;

    // editor 1 writes with the correct version → succeeds
    const first = await request(app)
      .patch(`/api/projects/GJ/issues/${number}`)
      .set('Authorization', ana.auth)
      .send({ title: 'edited by one', expectedUpdatedAt: v0 });
    expect(first.status).toBe(200);

    // editor 2 writes with the NOW-STALE version → rejected
    const second = await request(app)
      .patch(`/api/projects/GJ/issues/${number}`)
      .set('Authorization', ana.auth)
      .send({ title: 'edited by two', expectedUpdatedAt: v0 });
    expect(second.status).toBe(409);
  });

  it('allows an update with no expectedUpdatedAt (opt-in check)', async () => {
    const ana = await makeUser('sw2@t.dev');
    await makeProject(ana.auth, 'GJ');
    const created = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'x' });
    const res = await request(app)
      .patch(`/api/projects/GJ/issues/${created.body.issue.number}`)
      .set('Authorization', ana.auth)
      .send({ title: 'renamed' });
    expect(res.status).toBe(200);
  });
});
