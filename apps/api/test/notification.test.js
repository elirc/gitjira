import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';
import { handleNotificationJob } from '../src/jobs/notification-handler.js';
import { prisma } from '../src/lib/prisma.js';

async function seed() {
  const ana = await makeUser('nt-ana@t.dev');
  const ben = await makeUser('nt-ben@t.dev');
  const project = await makeProject(ana.auth, 'GJ');
  await request(app)
    .post(`/api/projects/${project.id}/members`)
    .set('Authorization', ana.auth)
    .send({ userId: ben.id, role: 'MEMBER' });
  return { ana, ben, project };
}

// LEARN: these run with DISABLE_QUEUE=1 so the enqueue is a no-op — we test the
// fan-out HANDLER directly (as if the worker ran it), without needing Redis or
// a live worker in the test. Test the unit, not the infrastructure.
describe('notification fan-out', () => {
  it('assigning an issue auto-watches the assignee and notifies them', async () => {
    const { ana, ben } = await seed();
    const issue = (
      await request(app)
        .post('/api/projects/GJ/issues')
        .set('Authorization', ana.auth)
        .send({ title: 'assign to ben', assigneeId: ben.id })
    ).body.issue;

    // the assign path auto-watched ben
    const watching = await prisma.watcher.findUnique({
      where: { issueId_userId: { issueId: issue.id, userId: ben.id } },
    });
    expect(watching).toBeTruthy();

    // run the fan-out as the worker would
    await handleNotificationJob({
      data: { kind: 'issue.assigned', issueId: issue.id, actorId: ana.id },
    });

    const notes = await prisma.notification.findMany({ where: { userId: ben.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe('issue.assigned');
  });

  it('never notifies the actor about their own action', async () => {
    const { ana } = await seed();
    const issue = (
      await request(app)
        .post('/api/projects/GJ/issues')
        .set('Authorization', ana.auth)
        .send({ title: 'self', assigneeId: ana.id })
    ).body.issue;
    await prisma.watcher.create({ data: { issueId: issue.id, userId: ana.id } });

    await handleNotificationJob({
      data: { kind: 'issue.assigned', issueId: issue.id, actorId: ana.id },
    });
    const notes = await prisma.notification.count({ where: { userId: ana.id } });
    expect(notes).toBe(0); // ana caused it; ana isn't notified
  });

  it('mark-all-read clears the unread count', async () => {
    const { ana, ben } = await seed();
    const issue = (
      await request(app)
        .post('/api/projects/GJ/issues')
        .set('Authorization', ana.auth)
        .send({ title: 'x', assigneeId: ben.id })
    ).body.issue;
    await handleNotificationJob({
      data: { kind: 'issue.assigned', issueId: issue.id, actorId: ana.id },
    });

    const before = await request(app).get('/api/me/notifications').set('Authorization', ben.auth);
    expect(before.body.unread).toBe(1);
    await request(app).post('/api/me/notifications/read-all').set('Authorization', ben.auth);
    const after = await request(app).get('/api/me/notifications').set('Authorization', ben.auth);
    expect(after.body.unread).toBe(0);
  });
});
