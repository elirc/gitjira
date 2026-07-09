import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

// LEARN: regression tests for bug #29 — a non-numeric ?limit used to crash
// the endpoint (500), and a huge ?limit fetched unbounded. All three inputs
// pinned so the same mistake can't merge twice.
describe('issue list ?limit validation', () => {
  async function seed(n) {
    const ana = await makeUser('limit@t.dev');
    await makeProject(ana.auth, 'GJ');
    for (let i = 0; i < n; i++) {
      await request(app)
        .post('/api/projects/GJ/issues')
        .set('Authorization', ana.auth)
        .send({ title: `t${i}` });
    }
    return ana;
  }

  it('falls back to the default page size on a non-numeric limit (was a 500)', async () => {
    const ana = await seed(3);
    const res = await request(app)
      .get('/api/projects/GJ/issues?limit=abc')
      .set('Authorization', ana.auth);
    expect(res.status).toBe(200);
    expect(res.body.issues).toHaveLength(3);
  });

  it('caps an oversized limit at the maximum', async () => {
    const ana = await seed(3);
    const res = await request(app)
      .get('/api/projects/GJ/issues?limit=999999')
      .set('Authorization', ana.auth);
    expect(res.status).toBe(200);
    // no crash, no unbounded fetch — returns what exists, bounded by MAX_LIMIT
    expect(res.body.issues.length).toBeLessThanOrEqual(100);
  });

  it('honors a valid limit', async () => {
    const ana = await seed(5);
    const res = await request(app)
      .get('/api/projects/GJ/issues?limit=2')
      .set('Authorization', ana.auth);
    expect(res.body.issues).toHaveLength(2);
    expect(res.body.nextCursor).toBeTruthy();
  });
});
