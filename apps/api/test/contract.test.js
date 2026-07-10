import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';
import {
  authResponseSchema,
  publicUserSchema,
  projectSchema,
  issueSchema,
} from '@gitjira/shared/response-schemas';

// LEARN (sprint 11): CONTRACT tests. We validate input with Zod on the way in;
// here we parse the response with the shared schema on the way OUT. If a
// handler starts returning a field the schema doesn't know about (or drops one
// it promised), `.parse()` throws and the test fails — the schema is the
// contract and the server is held to it. This closes the gap between "valid
// request" and "correctly-shaped response" that unit tests routinely miss.
//
// The schemas are `.strict()`, so an UNEXPECTED field fails too — that's how
// you catch a handler accidentally leaking `passwordHash`.

describe('API response contracts', () => {
  it('POST /auth/login satisfies authResponseSchema (and never leaks a hash)', async () => {
    await makeUser('contract@t.dev');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'contract@t.dev', password: 'correct-horse-battery' });

    expect(res.status).toBe(200);
    // .parse throws on any mismatch; the assertion is "this doesn't throw".
    const parsed = authResponseSchema.parse(res.body);
    expect(parsed.user.email).toBe('contract@t.dev');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('GET /auth/me satisfies publicUserSchema', async () => {
    const ana = await makeUser('me@t.dev');
    const res = await request(app).get('/api/auth/me').set('Authorization', ana.auth);
    expect(res.status).toBe(200);
    expect(() => publicUserSchema.parse(res.body.user)).not.toThrow();
  });

  it('POST /projects satisfies projectSchema', async () => {
    const ana = await makeUser('proj@t.dev');
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', ana.auth)
      .send({ key: 'CT', name: 'Contract' });
    expect(res.status).toBe(201);
    expect(() => projectSchema.parse(res.body.project)).not.toThrow();
  });

  it('POST /projects/:key/issues satisfies issueSchema', async () => {
    const ana = await makeUser('iss@t.dev');
    await makeProject(ana.auth, 'CT');
    const res = await request(app)
      .post('/api/projects/CT/issues')
      .set('Authorization', ana.auth)
      .send({ title: 'contract issue' });
    expect(res.status).toBe(201);
    const issue = issueSchema.parse(res.body.issue);
    expect(issue.key).toBe(`CT-${issue.number}`);
  });
});
