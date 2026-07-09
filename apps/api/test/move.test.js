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
