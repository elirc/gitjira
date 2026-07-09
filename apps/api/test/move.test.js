import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

async function setup() {
  const ana = await makeUser('mover@t.dev');
  const project = await makeProject(ana.auth, 'GJ');
  const cols = project.columns;
  const created = await request(app)
    .post('/api/projects/GJ/issues')
    .set('Authorization', ana.auth)
    .send({ title: 'draggable' });
  return { ana, project, cols, issue: created.body.issue };
}

describe('move endpoint', () => {
  it('moves an issue to another column with a new position', async () => {
    const { ana, cols, issue } = await setup();
    const inProgress = cols.find((c) => c.category === 'IN_PROGRESS');

    const res = await request(app)
      .patch(`/api/projects/GJ/issues/${issue.number}/move`)
      .set('Authorization', ana.auth)
      .send({ columnId: inProgress.id, position: 'n' });

    expect(res.status).toBe(200);
    expect(res.body.issue.columnId).toBe(inProgress.id);
    expect(res.body.issue.position).toBe('n');
  });

  it('a non-member cannot move an issue (authz follows the new path)', async () => {
    const { cols, issue } = await setup();
    const ben = await makeUser('intruder@t.dev');
    const res = await request(app)
      .patch(`/api/projects/GJ/issues/${issue.number}/move`)
      .set('Authorization', ben.auth)
      .send({ columnId: cols[1].id, position: 'n' });
    expect(res.status).toBe(404);
  });
});

describe('move endpoint — cross-project column (review finding)', () => {
  it('rejects moving an issue into another project’s column', async () => {
    const ana = await makeUser('crossmove@t.dev');
    await makeProject(ana.auth, 'GJ');
    const web = await makeProject(ana.auth, 'WEB', 'Web');
    const created = await request(app)
      .post('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'stays put' });

    const webColumn = web.columns[0];
    const res = await request(app)
      .patch(`/api/projects/GJ/issues/${created.body.issue.number}/move`)
      .set('Authorization', ana.auth)
      .send({ columnId: webColumn.id, position: 'n' });

    expect(res.status).toBe(404); // the WEB column isn't in GJ
  });
});
