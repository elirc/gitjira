import { describe, it, beforeEach } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

// LEARN (sprint 13): the enforcement side of the permission matrix. The policy
// unit tests (packages/shared) prove can() is correct in isolation; THESE tests
// prove the API actually calls it — a VIEWER can read but is stopped at every
// write, closing the gap the matrix surfaced (before this, any member could edit).

describe('RBAC enforcement — VIEWER is read-only', () => {
  let admin;
  let viewer;

  beforeEach(async () => {
    admin = await makeUser('rbac-admin@t.dev');
    const project = await makeProject(admin.auth, 'RBAC');
    viewer = await makeUser('rbac-viewer@t.dev');
    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', admin.auth)
      .send({ userId: viewer.id, role: 'VIEWER' })
      .expect(201);
  });

  it('lets a VIEWER READ the board', async () => {
    await request(app).get('/api/projects/RBAC').set('Authorization', viewer.auth).expect(200);
  });

  it('blocks a VIEWER from creating an issue (403)', async () => {
    await request(app)
      .post('/api/projects/RBAC/issues')
      .set('Authorization', viewer.auth)
      .send({ title: 'should be blocked' })
      .expect(403);
  });

  it('blocks a VIEWER from adding members (403, admin-only action)', async () => {
    const other = await makeUser('rbac-other@t.dev');
    // resolve the project id via the board
    const board = await request(app)
      .get('/api/projects/RBAC')
      .set('Authorization', admin.auth)
      .expect(200);
    await request(app)
      .post(`/api/projects/${board.body.project.id}/members`)
      .set('Authorization', viewer.auth)
      .send({ userId: other.id, role: 'MEMBER' })
      .expect(403);
  });

  it('still lets an ADMIN create an issue (control)', async () => {
    await request(app)
      .post('/api/projects/RBAC/issues')
      .set('Authorization', admin.auth)
      .send({ title: 'allowed' })
      .expect(201);
  });
});
