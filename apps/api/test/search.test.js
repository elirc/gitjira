import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, makeUser, makeProject } from './helpers.js';

async function seed() {
  const ana = await makeUser('sa@t.dev');
  const ben = await makeUser('sb@t.dev');
  const project = await makeProject(ana.auth, 'GJ');
  await request(app)
    .post(`/api/projects/${project.id}/members`)
    .set('Authorization', ana.auth)
    .send({ userId: ben.id, role: 'MEMBER' });
  const mk = (auth, body) =>
    request(app).post('/api/projects/GJ/issues').set('Authorization', auth).send(body);
  await mk(ana.auth, { title: 'Fix login redirect', type: 'BUG', priority: 'HIGH' });
  await mk(ana.auth, { title: 'Add dark mode', type: 'STORY', priority: 'LOW' });
  await mk(ben.auth, {
    title: 'Login button misaligned',
    type: 'BUG',
    description: 'the login page button',
  });
  return { ana, ben };
}

const searchJql = (auth, jql) =>
  request(app)
    .get(`/api/projects/GJ/issues/search?jql=${encodeURIComponent(jql)}`)
    .set('Authorization', auth);

describe('JQL search', () => {
  it('filters by type', async () => {
    const { ana } = await seed();
    const res = await searchJql(ana.auth, 'type = bug');
    expect(res.status).toBe(200);
    expect(res.body.issues.every((i) => i.type === 'BUG')).toBe(true);
    expect(res.body.issues).toHaveLength(2);
  });

  it('resolves me to the caller (reporter = me)', async () => {
    const { ben } = await seed();
    const res = await searchJql(ben.auth, 'reporter = me');
    expect(res.body.issues).toHaveLength(1);
    expect(res.body.issues[0].title).toBe('Login button misaligned');
  });

  it('combines conditions with AND', async () => {
    const { ana } = await seed();
    const res = await searchJql(ana.auth, 'type = bug AND priority = high');
    expect(res.body.issues).toHaveLength(1);
    expect(res.body.issues[0].title).toBe('Fix login redirect');
  });

  it('returns a helpful error for an unknown field', async () => {
    const { ana } = await seed();
    const res = await searchJql(ana.auth, 'passwordHash = x');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Unknown field/);
  });
});

describe('full-text search', () => {
  it('finds words in titles and descriptions', async () => {
    const { ana } = await seed();
    const res = await request(app)
      .get('/api/projects/GJ/issues/search?text=login')
      .set('Authorization', ana.auth);
    expect(res.status).toBe(200);
    // "Fix login redirect", "Login button misaligned" (title), + the description mention
    expect(res.body.issues.length).toBeGreaterThanOrEqual(2);
    expect(res.body.issues.every((i) => /login/i.test(i.title))).toBe(true);
  });
});

describe('saved filters', () => {
  it('saves and lists a filter, and validates the jql', async () => {
    const { ana } = await seed();
    const ok = await request(app)
      .post('/api/me/filters')
      .set('Authorization', ana.auth)
      .send({ name: 'My Bugs', jql: 'type = bug AND reporter = me' });
    expect(ok.status).toBe(201);

    const bad = await request(app)
      .post('/api/me/filters')
      .set('Authorization', ana.auth)
      .send({ name: 'Broken', jql: 'type = = =' });
    expect(bad.status).toBe(400);

    const list = await request(app).get('/api/me/filters').set('Authorization', ana.auth);
    expect(list.body.filters).toHaveLength(1);
  });
});

describe('full-text search — injection safety (review finding)', () => {
  it('treats a malicious term as data, not SQL (no error, no rows)', async () => {
    const { ana } = await seed();
    const evil = '\'; DROP TABLE "Issue"; --';
    const res = await request(app)
      .get(`/api/projects/GJ/issues/search?text=${encodeURIComponent(evil)}`)
      .set('Authorization', ana.auth);
    expect(res.status).toBe(200); // parameterized: the string is just a search term
    expect(res.body.issues).toHaveLength(0);

    // and the table still exists — a follow-up query works
    const still = await request(app)
      .get('/api/projects/GJ/issues/search?text=login')
      .set('Authorization', ana.auth);
    expect(still.status).toBe(200);
  });

  it("handles an apostrophe in the search term (O'Brien)", async () => {
    const { ana } = await seed();
    const res = await request(app)
      .get(`/api/projects/GJ/issues/search?text=${encodeURIComponent("O'Brien")}`)
      .set('Authorization', ana.auth);
    expect(res.status).toBe(200); // would have been a 500 with string interpolation
  });
});
