import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

async function setup() {
  const ana = await makeUser('ca@t.dev');
  const project = await makeProject(ana.auth, 'GJ');
  // add ben as a member so we can test cross-author rules
  const ben = await makeUser('cb@t.dev');
  await request(app)
    .post(`/api/projects/${project.id}/members`)
    .set('Authorization', ana.auth)
    .send({ userId: ben.id, role: 'MEMBER' });
  const issue = await request(app)
    .post('/api/projects/GJ/issues')
    .set('Authorization', ana.auth)
    .send({ title: 'discuss me' });
  return { ana, ben, issue: issue.body.issue };
}

describe('comments', () => {
  it('adds a comment and records a comment.added activity event', async () => {
    const { ana, issue } = await setup();
    const res = await request(app)
      .post(`/api/projects/GJ/issues/${issue.number}/comments`)
      .set('Authorization', ana.auth)
      .send({ body: 'first!' });
    expect(res.status).toBe(201);
    expect(res.body.comment.body).toBe('first!');

    const detail = await request(app)
      .get(`/api/projects/GJ/issues/${issue.number}/detail`)
      .set('Authorization', ana.auth);
    const kinds = detail.body.issue.activityEvents.map((e) => e.kind);
    expect(kinds).toContain('comment.added');
  });

  it('a member cannot edit or delete someone else’s comment', async () => {
    const { ana, ben, issue } = await setup();
    const created = await request(app)
      .post(`/api/projects/GJ/issues/${issue.number}/comments`)
      .set('Authorization', ana.auth)
      .send({ body: 'ana wrote this' });
    const id = created.body.comment.id;

    const edit = await request(app)
      .patch(`/api/projects/GJ/issues/${issue.number}/comments/${id}`)
      .set('Authorization', ben.auth)
      .send({ body: 'ben edits' });
    const del = await request(app)
      .delete(`/api/projects/GJ/issues/${issue.number}/comments/${id}`)
      .set('Authorization', ben.auth);
    expect(edit.status).toBe(403);
    expect(del.status).toBe(403);
  });
});

describe('activity trail', () => {
  it('records status.changed when an issue moves columns', async () => {
    const { ana, issue } = await setup();
    const project = await request(app).get('/api/projects/GJ').set('Authorization', ana.auth);
    const inProgress = project.body.project.columns.find((c) => c.category === 'IN_PROGRESS');

    await request(app)
      .patch(`/api/projects/GJ/issues/${issue.number}/move`)
      .set('Authorization', ana.auth)
      .send({ columnId: inProgress.id, position: 'n' });

    const detail = await request(app)
      .get(`/api/projects/GJ/issues/${issue.number}/detail`)
      .set('Authorization', ana.auth);
    const status = detail.body.issue.activityEvents.find((e) => e.kind === 'status.changed');
    expect(status).toBeTruthy();
    expect(status.payload.to).toBe('In Progress');
  });
});

describe('sub-tasks', () => {
  it('creates a sub-task and rejects nesting beyond depth 1', async () => {
    const { ana, issue } = await setup();
    const sub = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'a sub-task', parentId: issue.id });
    expect(sub.status).toBe(201);

    const nested = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'too deep', parentId: sub.body.issue.id });
    expect(nested.status).toBe(409); // sub-tasks can't have sub-tasks
  });
});
