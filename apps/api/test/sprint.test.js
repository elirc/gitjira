import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';
import { __realClient } from '../src/lib/prisma.js';

// These tests exercise real transaction and compare-and-swap behavior across
// connections, so they use truncate isolation instead of the rollback proxy.
globalThis.__NO_ROLLBACK__ = true;

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
  it('strictly advances the assignment token when the wall clock has not advanced', async () => {
    const { ana, i1 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    const captured = new Date(Date.now() + 60_000);
    await __realClient.issue.update({
      where: { id: i1.id },
      data: { updatedAt: captured },
    });

    const assigned = await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: captured.toISOString() })
      .expect(200);

    expect(new Date(assigned.body.issue.updatedAt).getTime()).toBe(captured.getTime() + 1);
  });

  it('allows exactly one assignment with a shared stale-write token', async () => {
    const { ana, i1 } = await setup();
    const listed = await request(app)
      .get('/api/projects/GJ/issues')
      .set('Authorization', ana.auth)
      .expect(200);
    const backlogIssue = listed.body.issues.find((issue) => issue.id === i1.id);
    expect(backlogIssue.updatedAt).toBe(i1.updatedAt);
    const s1 = (await createSprint(ana, { name: 'S1' })).body.sprint;
    const s2 = (await createSprint(ana, { name: 'S2' })).body.sprint;

    const assignment = (sprintId) =>
      request(app)
        .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
        .set('Authorization', ana.auth)
        .send({ sprintId, expectedUpdatedAt: backlogIssue.updatedAt });
    const [r1, r2] = await Promise.all([assignment(s1.id), assignment(s2.id)]);

    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    const winner = r1.status === 200 ? r1 : r2;
    expect(winner.body.issue.updatedAt).not.toBe(i1.updatedAt);
    expect([s1.id, s2.id]).toContain(winner.body.issue.sprintId);
  });

  it('denies a nonmember sprint assignment', async () => {
    const { ana, i1 } = await setup();
    const outsider = await makeUser('sprint-outsider@t.dev');
    const sprint = (await createSprint(ana)).body.sprint;

    const denied = await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', outsider.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt });

    // Nonmembers receive the existing concealed-project response.
    expect(denied.status).toBe(404);
    const stored = await __realClient.issue.findUnique({ where: { id: i1.id } });
    expect(stored.sprintId).toBeNull();
    expect(stored.updatedAt.toISOString()).toBe(i1.updatedAt);
  });

  it('rejects assignment to a completed sprint', async () => {
    const { ana, i1, i2 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i2.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i2.updatedAt })
      .expect(200);
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth)
      .expect(200);
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
      .set('Authorization', ana.auth)
      .send({ moveUnfinishedTo: 'backlog' })
      .expect(200);

    const rejected = await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt });

    expect(rejected.status).toBe(409);
  });

  it('rejects cross-project completion destinations without changing source state', async () => {
    const { ana, i1 } = await setup();
    const source = (await createSprint(ana, { name: 'Source' })).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: source.id, expectedUpdatedAt: i1.updatedAt });
    await request(app)
      .post(`/api/projects/GJ/sprints/${source.id}/start`)
      .set('Authorization', ana.auth)
      .expect(200);

    await makeProject(ana.auth, 'OTHER', 'Other project');
    const foreign = (
      await request(app)
        .post('/api/projects/OTHER/sprints')
        .set('Authorization', ana.auth)
        .send({ name: 'Foreign' })
    ).body.sprint;

    await request(app)
      .post(`/api/projects/GJ/sprints/${source.id}/complete`)
      .set('Authorization', ana.auth)
      .send({ moveUnfinishedTo: foreign.id })
      .expect(404);

    const sprints = await request(app)
      .get('/api/projects/GJ/sprints')
      .set('Authorization', ana.auth)
      .expect(200);
    expect(sprints.body.sprints.find((s) => s.id === source.id).state).toBe('ACTIVE');
    const detail = await request(app)
      .get(`/api/projects/GJ/issues/${i1.number}/detail`)
      .set('Authorization', ana.auth)
      .expect(200);
    expect(detail.body.issue.sprintId).toBe(source.id);
  });

  it('allows only one concurrent completion to move unfinished issues', async () => {
    const { ana, i1 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt });
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth)
      .expect(200);

    const complete = () =>
      request(app)
        .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
        .set('Authorization', ana.auth)
        .send({ moveUnfinishedTo: 'backlog' });
    const [r1, r2] = await Promise.all([complete(), complete()]);

    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    const winner = r1.status === 200 ? r1 : r2;
    expect(winner.body.movedCount).toBe(1);
    expect(winner.body.sprint.state).toBe('COMPLETED');
  });

  it('never strands a concurrent assignment in a sprint being completed', async () => {
    const { ana, i1, i2 } = await setup();
    const sprint = (await createSprint(ana)).body.sprint;
    await request(app)
      .patch(`/api/projects/GJ/issues/${i1.number}/sprint`)
      .set('Authorization', ana.auth)
      .send({ sprintId: sprint.id, expectedUpdatedAt: i1.updatedAt })
      .expect(200);
    await request(app)
      .post(`/api/projects/GJ/sprints/${sprint.id}/start`)
      .set('Authorization', ana.auth)
      .expect(200);

    const [completed, assigned] = await Promise.all([
      request(app)
        .post(`/api/projects/GJ/sprints/${sprint.id}/complete`)
        .set('Authorization', ana.auth)
        .send({ moveUnfinishedTo: 'backlog' }),
      request(app)
        .patch(`/api/projects/GJ/issues/${i2.number}/sprint`)
        .set('Authorization', ana.auth)
        .send({ sprintId: sprint.id, expectedUpdatedAt: i2.updatedAt }),
    ]);

    expect(completed.status).toBe(200);
    expect([200, 409]).toContain(assigned.status);
    const detail = await request(app)
      .get(`/api/projects/GJ/issues/${i2.number}/detail`)
      .set('Authorization', ana.auth)
      .expect(200);
    expect(detail.body.issue.sprintId ?? null).toBeNull();
  });

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
    expect(statuses, JSON.stringify([r1.body, r2.body])).toEqual([200, 409]);
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
