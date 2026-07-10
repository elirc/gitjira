import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

async function setup() {
  const ana = await makeUser('sp@t.dev');
  const project = await makeProject(ana.auth, 'GJ');
  const mk = (body) =>
    request(app).post('/api/projects/GJ/issues').set('Authorization', ana.auth).send(body);
  const i1 = (await mk({ title: 'a', type: 'STORY' })).body.issue;
  const i2 = (await mk({ title: 'b', type: 'STORY' })).body.issue;
  return { ana, project, i1, i2 };
}
const createSprint = (u, body = { name: 'Sprint 1' }) =>
  request(app).post('/api/projects/GJ/sprints').set('Authorization', u.auth).send(body);

describe('sprint lifecycle', () => {
  it('creates, plans, starts, and completes a sprint', async () => {
    const { ana, i1 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;

    // assign an issue to the sprint (from the backlog)
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id });

    // start it
    const started = await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth);
    expect(started.status).toBe(200);
    expect(started.body.sprint.state).toBe('ACTIVE');

    // complete it, moving unfinished to backlog
    const completed = await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
      .set('Authorization', ana.auth)
      .send({ moveUnfinishedTo: 'backlog' });
    expect(completed.status).toBe(200);
    expect(completed.body.sprint.state).toBe('COMPLETED');
  });

  it('refuses to start a sprint with no issues (409)', async () => {
    const { ana } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    const res = await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth);
    expect(res.status).toBe(409);
  });

  it('refuses to complete a PLANNED sprint (409)', async () => {
    const { ana } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    const res = await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
      .set('Authorization', ana.auth)
      .send({ moveUnfinishedTo: 'backlog' });
    expect(res.status).toBe(409);
  });

  it('reports committed vs completed points', async () => {
    const { ana, i1, i2 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    // put points on both, mark one done
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}`)
      .set('Authorization', ana.auth)
      .send({ storyPoints: 5 });
    await request(app)
      .patch(`/api/projects/GJ/issues/${i2.number}`)
      .set('Authorization', ana.auth)
      .send({ storyPoints: 3 });
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id });
    await request(app)
      .patch(`/api/projects/GJ/issues/${i2.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id });
    const report = await request(app)
      .get(`/api/projects/GJ/sprints/${sprint.id}/report`)
      .set('Authorization', ana.auth);
    expect(report.body.committed).toBe(8);
  });
});

describe('sprint concurrency + atomicity (review findings)', () => {
  it('concurrent starts yield exactly one 200 and one 409, never a 500', async () => {
    const ana = await makeUser('spc@t.dev');
    await makeProject(ana.auth, 'GJ');
    const mk = (body) =>
      request(app).post('/api/projects/GJ/issues').set('Authorization', ana.auth).send(body);
    const i1 = (await mk({ title: 'a' })).body.issue;
    const i2 = (await mk({ title: 'b' })).body.issue;
    const s1 = (await createSprint({ auth: ana.auth }, { name: 'S1' })).body.sprint;
    const s2 = (await createSprint({ auth: ana.auth }, { name: 'S2' })).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: s1.id });
    await request(app)
      .patch(`/api/projects/GJ/issues/${i2.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: s2.id });

    // fire both starts at once
    const [r1, r2] = await Promise.all([
      request(app).post(`/api/projects/GJ/sprints/${s1.id}/start`).set('Authorization', ana.auth),
      request(app).post(`/api/projects/GJ/sprints/${s2.id}/start`).set('Authorization', ana.auth),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]); // one wins, one gets a clean conflict — never 500
  });

  it('completing a sprint moves unfinished issues atomically (none stranded)', async () => {
    const ana = await makeUser('spa@t.dev');
    await makeProject(ana.auth, 'GJ');
    const mk = (body) =>
      request(app).post('/api/projects/GJ/issues').set('Authorization', ana.auth).send(body);
    const i1 = (await mk({ title: 'x' })).body.issue;
    const sprint = (await createSprint({ auth: ana.auth }, { name: 'S1' })).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id });
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth);

    const done = await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
      .set('Authorization', ana.auth)
      .send({ moveUnfinishedTo: 'backlog' });
    expect(done.body.movedCount).toBe(1);

    // the issue must be back in the backlog (no sprintId), not stranded
    const detail = await request(app)
      .get(`/api/projects/GJ/issues/${i1.number}/detail`)
      .set('Authorization', ana.auth);
    expect(detail.body.issue.sprintId ?? null).toBeNull();
  });
});
