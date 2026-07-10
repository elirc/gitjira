import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

// LEARN (sprint 13, found in the pentest review): the IDOR exploit test. It
// drives the ACTUAL attack — a member of one project fetching another project's
// attachment by id — and asserts it's denied. Written first, RED, to prove the
// vulnerability is real before the fix makes it green. An exploit test is the
// only honest evidence that an authz hole is actually closed.

describe('attachment download — object-level authorization (IDOR)', () => {
  it('denies a user who is not a member of the attachment’s project', async () => {
    // Alice owns project AAA and uploads a private file.
    const alice = await makeUser('idor-alice@t.dev');
    await makeProject(alice.auth, 'AAA');
    const issue = (
      await request(app)
        .post('/api/projects/AAA/issues')
        .set('Authorization', alice.auth)
        .send({ title: 'has an attachment' })
    ).body.issue;
    const uploaded = await request(app)
      .post(`/api/projects/AAA/issues/${issue.number}/attachments`)
      .set('Authorization', alice.auth)
      .attach('file', Buffer.from('CONFIDENTIAL customer data'), 'secret.txt')
      .expect(201);
    const attachmentId = uploaded.body.attachment.id;

    // Mallory is a legitimate user, but of a DIFFERENT project — not AAA.
    const mallory = await makeUser('idor-mallory@t.dev');
    await makeProject(mallory.auth, 'BBB');

    // The attack: fetch Alice's attachment by id. Must be denied (404 — same
    // "not found" we give non-members everywhere, no existence oracle).
    await request(app)
      .get(`/api/attachments/${attachmentId}`)
      .set('Authorization', mallory.auth)
      .expect(404);
  });

  it('still lets a member of the project download it', async () => {
    const alice = await makeUser('idor-owner@t.dev');
    const project = await makeProject(alice.auth, 'OWN');
    const issue = (
      await request(app)
        .post('/api/projects/OWN/issues')
        .set('Authorization', alice.auth)
        .send({ title: 'mine' })
    ).body.issue;
    const uploaded = await request(app)
      .post(`/api/projects/OWN/issues/${issue.number}/attachments`)
      .set('Authorization', alice.auth)
      .attach('file', Buffer.from('hello'), 'hello.txt')
      .expect(201);

    // add a second member of OWN; they should be able to download
    const bob = await makeUser('idor-bob@t.dev');
    await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', alice.auth)
      .send({ userId: bob.id, role: 'MEMBER' })
      .expect(201);

    const res = await request(app)
      .get(`/api/attachments/${uploaded.body.attachment.id}`)
      .set('Authorization', bob.auth)
      .expect(200);
    expect(res.text).toBe('hello');
  });
});
