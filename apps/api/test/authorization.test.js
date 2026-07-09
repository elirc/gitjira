import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

// LEARN: authorization is a MATRIX — every (actor, resource, action) cell
// needs a verdict, and the dangerous cells are the ones nobody thinks to
// click. Table-driven tests make the matrix explicit and catch the cell you
// forgot. The theme to watch across this whole project: authz gaps reappear
// wherever a NEW way to reach data is added (here CRUD; sprint 04 the move
// endpoint; sprint 08 sockets). Same test, new surface.
describe('cross-project authorization', () => {
  it('a non-member cannot see a project (404, not 403 — existence is information)', async () => {
    const ana = await makeUser('ana@t.dev');
    const ben = await makeUser('ben@t.dev');
    await makeProject(ana.auth, 'GJ');

    const res = await request(app).get('/api/projects/GJ').set('Authorization', ben.auth);
    expect(res.status).toBe(404);
  });

  it('a non-member cannot list a project’s issues', async () => {
    const ana = await makeUser('ana@t.dev');
    const ben = await makeUser('ben@t.dev');
    await makeProject(ana.auth, 'GJ');
    await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'secret' });

    const res = await request(app).get('/api/projects/GJ/issues').set('Authorization', ben.auth);
    expect(res.status).toBe(404);
  });

  it('a non-member cannot create an issue in someone else’s project', async () => {
    const ana = await makeUser('ana@t.dev');
    const ben = await makeUser('ben@t.dev');
    await makeProject(ana.auth, 'GJ');

    const res = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ben.auth)
      .send({ title: 'intrusion' });
    expect(res.status).toBe(404);
  });

  it('a non-member cannot read or patch a specific issue', async () => {
    const ana = await makeUser('ana@t.dev');
    const ben = await makeUser('ben@t.dev');
    await makeProject(ana.auth, 'GJ');
    await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'x' });

    const read = await request(app).get('/api/projects/GJ/issues/1').set('Authorization', ben.auth);
    const patch = await request(app)
      .patch('/api/projects/GJ/issues/1')
      .set('Authorization', ben.auth)
      .send({ title: 'hijacked' });
    expect(read.status).toBe(404);
    expect(patch.status).toBe(404);
  });

  it('only an admin can add members', async () => {
    const ana = await makeUser('ana@t.dev'); // creator → ADMIN
    const ben = await makeUser('ben@t.dev');
    const cho = await makeUser('cho@t.dev');
    const project = await makeProject(ana.auth, 'GJ');

    // ana (admin) adds ben as a plain member
    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', ana.auth)
      .send({ userId: ben.id, role: 'MEMBER' });

    // ben (member, not admin) tries to add cho → forbidden
    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', ben.auth)
      .send({ userId: cho.id, role: 'MEMBER' });
    expect(res.status).toBe(403);
  });

  it('unauthenticated requests are rejected before any project logic', async () => {
    const res = await request(app).get('/api/projects/GJ/issues');
    expect(res.status).toBe(401);
  });
});
