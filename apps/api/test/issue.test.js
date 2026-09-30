import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

describe('issue CRUD', () => {
  it('creates an issue with a derived project key', async () => {
    const ana = await makeUser('ana@t.dev');
    await makeProject(ana.auth, 'GJ');

    const res = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ type: 'BUG', title: 'Login button misaligned', priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body.issue.key).toBe('GJ-1');
    expect(res.body.issue.title).toBe('Login button misaligned');
  });

  it('numbers issues sequentially per project', async () => {
    const ana = await makeUser('ana@t.dev');
    await makeProject(ana.auth, 'GJ');
    await makeProject(ana.auth, 'WEB', 'Web');

    const gj1 = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'a' });
    const gj2 = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'b' });
    const web1 = await request(app)
      .post('/api/projects/WEB/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'c' });

    expect(gj1.body.issue.key).toBe('GJ-1');
    expect(gj2.body.issue.key).toBe('GJ-2');
    expect(web1.body.issue.key).toBe('WEB-1'); // per-project counter
  });

  it('applies a PATCH partially, leaving unset fields intact', async () => {
    const ana = await makeUser('ana@t.dev');
    await makeProject(ana.auth, 'GJ');
    await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'original', priority: 'HIGH', type: 'BUG' });

    const patched = await request(app)
      .patch('/api/projects/GJ/issues/1')
      .set('Authorization', ana.auth)
      .send({ title: 'renamed' });

    expect(patched.body.issue.title).toBe('renamed');
    expect(patched.body.issue.priority).toBe('HIGH'); // untouched
    expect(patched.body.issue.type).toBe('BUG'); // untouched
  });

  it('paginates with a stable cursor', async () => {
    const ana = await makeUser('ana@t.dev');
    await makeProject(ana.auth, 'GJ');
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/projects/GJ/issues')
        .set('Authorization', ana.auth)
        .send({ title: `t${i}` });
    }

    const page1 = await request(app)
      .get('/api/projects/GJ/issues?limit=2')
      .set('Authorization', ana.auth);
    expect(page1.body.issues).toHaveLength(2);
    for (const issue of page1.body.issues) {
      expect(typeof issue.updatedAt).toBe('string');
      expect(new Date(issue.updatedAt).toISOString()).toBe(issue.updatedAt);
    }
    expect(page1.body.nextCursor).toBeTruthy();

    const page2 = await request(app)
      .get(`/api/projects/GJ/issues?limit=2&cursor=${page1.body.nextCursor}`)
      .set('Authorization', ana.auth);
    const ids1 = page1.body.issues.map((i) => i.id);
    const ids2 = page2.body.issues.map((i) => i.id);
    expect(ids1.some((id) => ids2.includes(id))).toBe(false); // no overlap
  });
});
