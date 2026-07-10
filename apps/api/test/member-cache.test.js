import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

// LEARN (sprint 12 review): the regression test for the stale-authz cache bug.
// requireMembership reads the member map THROUGH the cache, so this test has to
// WARM the cache (a request as the member) BEFORE removing them — otherwise the
// removal happens against a cold cache and the bug can't reproduce. That warming
// step is the whole point: it's what made the missing invalidation a security
// hole instead of a harmless miss.

describe('member removal invalidates the authz cache (no stale access)', () => {
  it('a removed member is denied on the very next request', async () => {
    const admin = await makeUser('cache-admin@t.dev');
    const project = await makeProject(admin.auth, 'CACHE');
    const mallory = await makeUser('mallory@t.dev');

    // admin adds Mallory as a member
    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', admin.auth)
      .send({ userId: mallory.id, role: 'MEMBER' })
      .expect(201);

    // Mallory accesses the board — this WARMS the member cache with her present.
    await request(app).get('/api/projects/CACHE').set('Authorization', mallory.auth).expect(200);

    // admin removes Mallory
    await request(app)
      .delete(`/api/projects/${project.id}/members/${mallory.id}`)
      .set('Authorization', admin.auth)
      .expect(204);

    // The NEXT request must be denied immediately — not after the TTL. If the
    // removal forgot to invalidate the cache, this returns 200 (the bug).
    await request(app).get('/api/projects/CACHE').set('Authorization', mallory.auth).expect(404);
  });

  it('an added member is authorized immediately (add invalidates too)', async () => {
    const admin = await makeUser('cache-admin2@t.dev');
    const project = await makeProject(admin.auth, 'CACHE2');
    const newbie = await makeUser('newbie@t.dev');

    // Warm the cache without the newbie (admin loads the board).
    await request(app).get('/api/projects/CACHE2').set('Authorization', admin.auth).expect(200);

    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', admin.auth)
      .send({ userId: newbie.id, role: 'MEMBER' })
      .expect(201);

    // Immediately authorized — add must have invalidated the warmed cache.
    await request(app).get('/api/projects/CACHE2').set('Authorization', newbie.auth).expect(200);
  });
});
