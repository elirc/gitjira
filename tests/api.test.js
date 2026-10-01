import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from '../src/app.js';

async function fixture(dbPath = ':memory:') {
  const { app, db, close } = createApp({ dbPath });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(method, path, body, cookie) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (method !== 'GET') headers['X-GitJira-Request'] = '1';
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await response.text();
    let data;
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = raw; }
    }
    return { status: response.status, data, headers: response.headers };
  }
  async function login(userId) {
    const result = await request('POST', '/api/session', { userId });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const cookie = result.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie, 'login must issue a session cookie');
    assert.match(result.headers.get('set-cookie'), /httponly/i);
    assert.match(result.headers.get('set-cookie'), /samesite=strict/i);
    return {
      cookie,
      get: (path) => request('GET', path, undefined, cookie),
      post: (path, body) => request('POST', path, body, cookie),
      put: (path, body) => request('PUT', path, body, cookie),
      patch: (path, body) => request('PATCH', path, body, cookie),
      delete: (path, body) => request('DELETE', path, body, cookie),
    };
  }
  async function stop() {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    close();
  }
  return { db, serverPort: server.address().port, request, login, stop };
}

test('demo sessions require login, set HttpOnly SameSite cookies, and logout revokes access', async () => {
  const api = await fixture();
  try {
    assert.equal((await api.request('GET', '/api/health')).status, 200);
    assert.equal((await api.request('GET', '/api/projects')).status, 401);
    const users = await api.request('GET', '/api/demo-users');
    assert.deepEqual(users.data.users.map((user) => user.id), [1, 2, 3, 4]);
    const owner = await api.login(1);
    assert.equal((await owner.get('/api/session')).data.user.id, 1);
    const missingWriteHeader = await fetch(`http://127.0.0.1:${api.serverPort}/api/projects`, {
      method: 'POST',
      headers: { cookie: owner.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'NOGATE', name: 'No gate' }),
    });
    assert.equal(missingWriteHeader.status, 403);
    const foreignOrigin = await fetch(`http://127.0.0.1:${api.serverPort}/api/projects`, {
      method: 'POST',
      headers: {
        cookie: owner.cookie,
        origin: 'http://example.invalid',
        'X-GitJira-Request': '1',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ key: 'NOORIGIN', name: 'Wrong origin' }),
    });
    assert.equal(foreignOrigin.status, 403);
    assert.equal((await owner.delete('/api/session')).status, 204);
    assert.equal((await owner.get('/api/session')).status, 401);
  } finally { await api.stop(); }
});

test('expired sessions, malformed JSON, and oversized requests are rejected', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const token = owner.cookie.split('=')[1];
    const tokenHash = createHash('sha256').update(token).digest('hex');
    api.db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').run(Date.now() - 1, tokenHash);
    assert.equal((await owner.get('/api/session')).status, 401);
    const base = `http://127.0.0.1:${api.serverPort}`;
    const headers = { 'X-GitJira-Request': '1', 'content-type': 'application/json' };
    const malformed = await fetch(base + '/api/session', { method: 'POST', headers, body: '{' });
    assert.equal(malformed.status, 400);
    const tooLarge = await fetch(base + '/api/session', {
      method: 'POST', headers,
      body: JSON.stringify({ userId: 1, filler: 'x'.repeat(132000) }),
    });
    assert.equal(tooLarge.status, 413);
  } finally { await api.stop(); }
});

test('escaped 10,000-character descriptions round-trip while NUL text and nonprimitive IDs fail validation', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const escapedDescription = '\u0001'.repeat(10000);
    const created = await owner.post('/api/projects/1/issues', {
      title: 'Maximum escaped description',
      description: escapedDescription,
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.equal((await owner.get(`/api/issues/${created.data.issue.id}`)).data.issue.description, escapedDescription);
    assert.equal((await owner.post('/api/projects/1/issues', { title: 'Bad\u0000title' })).status, 400);
    assert.equal((await owner.post('/api/projects/1/issues', { title: 'Bad body', description: 'x\u0000y' })).status, 400);
    assert.equal((await owner.post(`/api/issues/${created.data.issue.id}/comments`, { body: 'Bad\u0000comment' })).status, 400);
    assert.equal((await api.request('POST', '/api/session', { userId: [1] })).status, 400);
    assert.equal((await api.request('POST', '/api/session', { userId: { value: 1 } })).status, 400);
    assert.equal((await owner.post('/api/projects/1/issues', { title: 'Bad assignee', assigneeId: [1] })).status, 400);
    assert.equal((await owner.post('/api/projects/1/issues', { title: 'Bad assignee', assigneeId: { value: 1 } })).status, 400);
  } finally { await api.stop(); }
});

test('project membership is enforced for reads and writes, including guessed issue IDs', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const editor = await api.login(2);
    const viewer = await api.login(3);
    const outsider = await api.login(4);
    assert.deepEqual((await owner.get('/api/projects')).data.projects.map((p) => p.id), [1]);
    assert.deepEqual((await outsider.get('/api/projects')).data.projects.map((p) => p.id), [2]);
    const created = await owner.post('/api/projects/1/issues', { title: 'Private launch task' });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.issue.id;
    assert.equal((await viewer.get(`/api/issues/${id}`)).status, 200);
    assert.equal((await viewer.post('/api/projects/1/issues', { title: 'No' })).status, 403);
    assert.equal((await viewer.patch(`/api/issues/${id}`, { version: 1, title: 'No' })).status, 403);
    assert.equal((await viewer.delete(`/api/issues/${id}`, { version: 1 })).status, 403);
    assert.equal((await viewer.post(`/api/issues/${id}/comments`, { body: 'No' })).status, 403);
    assert.equal((await editor.get(`/api/issues/${id}`)).status, 200);
    assert.equal((await outsider.get('/api/projects/1/issues')).status, 404);
    assert.equal((await outsider.get('/api/projects/1/activity')).status, 404);
    assert.equal((await outsider.get(`/api/issues/${id}`)).status, 404);
    assert.equal((await outsider.patch(`/api/issues/${id}`, { version: 1, title: 'No' })).status, 404);
    assert.equal((await outsider.post(`/api/issues/${id}/comments`, { body: 'No' })).status, 404);
  } finally { await api.stop(); }
});

test('issue lifecycle persists comments and activity, and filtering treats search as literal text', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const editor = await api.login(2);
    const baseline = (await owner.get('/api/projects/1/issues')).data.issues;
    const nextNumber = Math.max(0, ...baseline.map((item) => item.number)) + 1;
    const created = await editor.post('/api/projects/1/issues', {
      title: "Fix Bob's 100% launch flow",
      description: 'A real description',
      priority: 'high',
      assigneeId: 2,
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const issue = created.data.issue;
    assert.equal(issue.key, `LAUNCH-${nextNumber}`);
    assert.equal(issue.version, 1);
    assert.equal(issue.assigneeId, 2);
    const patched = await editor.patch(`/api/issues/${issue.id}`, {
      version: issue.version,
      status: 'in_progress',
      priority: 'urgent',
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.data));
    assert.equal(patched.data.issue.version, 2);
    const comment = await owner.post(`/api/issues/${issue.id}/comments`, { body: 'Please check the regression.' });
    assert.equal(comment.status, 201, JSON.stringify(comment.data));
    const detail = await owner.get(`/api/issues/${issue.id}`);
    assert.equal(detail.data.comments[0].body, 'Please check the regression.');
    const filter = await owner.get(`/api/projects/1/issues?q=${encodeURIComponent("Bob's 100%")}&status=in_progress&priority=urgent&assigneeId=2`);
    assert.deepEqual(filter.data.issues.map((item) => item.id), [issue.id]);
    assert.ok(!(await owner.get('/api/projects/1/issues?status=done')).data.issues.some((item) => item.id === issue.id));
    const events = (await owner.get('/api/projects/1/activity')).data.events.filter((event) => event.issueId === issue.id);
    assert.deepEqual(new Set(events.map((event) => event.action)), new Set(['created', 'updated', 'commented']));
    assert.equal((await owner.delete(`/api/issues/${issue.id}`, { version: 2 })).status, 204);
    assert.deepEqual(
      (await owner.get('/api/projects/1/issues')).data.issues.map((item) => item.id).sort((a, b) => a - b),
      baseline.map((item) => item.id).sort((a, b) => a - b),
    );
    const archivedEvents = (await owner.get('/api/projects/1/activity')).data.events;
    assert.equal(archivedEvents.filter((event) => event.issueId === issue.id && event.action === 'archived').length, 1);
  } finally { await api.stop(); }
});

test('stale edits fail with current server state and cannot create an activity event', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const created = await owner.post('/api/projects/1/issues', { title: 'Initial' });
    assert.equal(created.status, 201);
    const id = created.data.issue.id;
    const winner = await owner.patch(`/api/issues/${id}`, { version: 1, title: 'Winner' });
    assert.equal(winner.status, 200);
    const loser = await owner.patch(`/api/issues/${id}`, { version: 1, title: 'Stale overwrite' });
    assert.equal(loser.status, 409);
    assert.equal(loser.data.current.title, 'Winner');
    const staleArchive = await owner.delete(`/api/issues/${id}`, { version: 1 });
    assert.equal(staleArchive.status, 409);
    assert.equal(staleArchive.data.current.title, 'Winner');
    assert.equal((await owner.get(`/api/issues/${id}`)).data.issue.title, 'Winner');
    const updates = (await owner.get('/api/projects/1/activity')).data.events.filter((event) => event.issueId === id && event.action === 'updated');
    assert.equal(updates.length, 1);
  } finally { await api.stop(); }
});

test('invalid values are rejected and owner membership rules preserve an owner', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const editor = await api.login(2);
    for (const body of [
      { title: '' },
      { title: 'x'.repeat(181) },
      { title: 'Bad status', status: 'blocked' },
      { title: 'Bad priority', priority: 'critical' },
      { title: 'Bad assignee', assigneeId: 4 },
    ]) assert.equal((await owner.post('/api/projects/1/issues', body)).status, 400, JSON.stringify(body));
    assert.equal((await editor.put('/api/projects/1/members/3', { role: 'editor' })).status, 403);
    const ownDemotion = await owner.put('/api/projects/1/members/1', { role: 'viewer' });
    assert.equal(ownDemotion.status, 409, 'sole owner must not demote self');
    const ownRemoval = await owner.delete('/api/projects/1/members/1');
    assert.equal(ownRemoval.status, 409, 'sole owner must not remove self');
    const promote = await owner.put('/api/projects/1/members/2', { role: 'owner' });
    assert.equal(promote.status, 200, JSON.stringify(promote.data));
    const add = await owner.put('/api/projects/1/members/4', { role: 'viewer' });
    assert.equal(add.status, 200, JSON.stringify(add.data));
    const newViewer = await api.login(4);
    assert.ok((await newViewer.get('/api/projects')).data.projects.some((project) => project.id === 1));
    assert.equal((await newViewer.post('/api/projects/1/issues', { title: 'Still read only' })).status, 403);
    assert.equal((await owner.put('/api/projects/1/members/1', { role: 'editor' })).status, 200);
    assert.equal((await editor.delete('/api/projects/1/members/1')).status, 200);
    const members = (await editor.get('/api/projects/1/members')).data.members;
    assert.equal(members.filter((member) => member.role === 'owner').length, 1);
  } finally { await api.stop(); }
});

test('project creation validates keys and gives only its creator owner access', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const outsider = await api.login(4);
    assert.equal((await owner.post('/api/projects', { key: 'lower', name: 'Bad' })).status, 400);
    assert.equal((await owner.post('/api/projects', { key: 'LAUNCH', name: 'Duplicate' })).status, 409);
    const created = await owner.post('/api/projects', { key: 'NEWLAB', name: 'New laboratory' });
    assert.equal(created.status, 201);
    assert.equal(created.data.project.role, 'owner');
    const projectId = created.data.project.id;
    assert.equal((await owner.get(`/api/projects/${projectId}/members`)).data.members[0].id, 1);
    assert.equal((await outsider.get(`/api/projects/${projectId}/members`)).status, 404);
    assert.equal((await outsider.get(`/api/projects/${projectId}/issues`)).status, 404);
    assert.equal((await owner.post(`/api/projects/${projectId}/issues`, { title: 'First issue' })).data.issue.key, 'NEWLAB-1');
    assert.equal((await owner.get(`/api/projects/${projectId}/activity`)).data.events.some((event) => event.action === 'project_created'), true);
  } finally { await api.stop(); }
});

test('removing a member revokes project access and unassigns issues with versioned activity atomically', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const editor = await api.login(2);
    const created = await owner.post('/api/projects/1/issues', { title: 'Assigned task', assigneeId: 2 });
    assert.equal(created.status, 201);
    const id = created.data.issue.id;
    const initialVersion = created.data.issue.version;
    api.db.exec("CREATE TRIGGER reject_member_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT, 'forced member failure'); END");
    assert.ok((await owner.delete('/api/projects/1/members/2')).status >= 400);
    assert.equal((await editor.get(`/api/issues/${id}`)).status, 200, 'failed removal must roll back membership');
    assert.equal((await owner.get(`/api/issues/${id}`)).data.issue.assigneeId, 2, 'failed removal must roll back unassignment');
    api.db.exec('DROP TRIGGER reject_member_activity');
    assert.equal((await owner.delete('/api/projects/1/members/2')).status, 200);
    assert.equal((await editor.get(`/api/issues/${id}`)).status, 404, 'existing session must lose project access');
    const current = (await owner.get(`/api/issues/${id}`)).data.issue;
    assert.equal(current.assigneeId, null);
    assert.equal(current.version, initialVersion + 1);
    const events = (await owner.get('/api/projects/1/activity')).data.events;
    assert.equal(events.filter((event) => event.issueId === id && event.action === 'updated').length, 1);
    assert.equal(events.filter((event) => event.action === 'member_removed').length, 1);
  } finally { await api.stop(); }
});

test('activity insert failure rolls back create, edit, comment, and issue numbering', async () => {
  const api = await fixture();
  try {
    const owner = await api.login(1);
    const eventTable = api.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%event%' OR name LIKE '%activ%') LIMIT 1").get()?.name;
    assert.ok(eventTable, 'schema must have a persisted event table');
    const safeTable = `"${eventTable.replaceAll('"', '""')}"`;
    const before = await owner.get('/api/projects/1/issues');
    const nextNumber = Math.max(...before.data.issues.map((issue) => issue.number)) + 1;
    api.db.exec(`CREATE TRIGGER reject_activity BEFORE INSERT ON ${safeTable} BEGIN SELECT RAISE(ABORT, 'forced activity failure'); END`);
    const result = await owner.post('/api/projects/1/issues', { title: 'Must roll back' });
    assert.ok(result.status >= 400, 'injected SQL error must fail request');
    const after = await owner.get('/api/projects/1/issues');
    assert.deepEqual(after.data.issues, before.data.issues);
    api.db.exec('DROP TRIGGER reject_activity');
    const created = await owner.post('/api/projects/1/issues', { title: 'The next number' });
    assert.equal(created.status, 201);
    assert.equal(created.data.issue.number, nextNumber, 'failed create must not consume a project issue number');
    const id = created.data.issue.id;
    const beforeDetail = await owner.get(`/api/issues/${id}`);
    const beforeActivity = await owner.get('/api/projects/1/activity');
    api.db.exec(`CREATE TRIGGER reject_activity BEFORE INSERT ON ${safeTable} BEGIN SELECT RAISE(ABORT, 'forced activity failure'); END`);
    assert.ok((await owner.patch(`/api/issues/${id}`, { version: 1, title: 'Must not save' })).status >= 400);
    assert.ok((await owner.post(`/api/issues/${id}/comments`, { body: 'Must not save' })).status >= 400);
    assert.deepEqual((await owner.get(`/api/issues/${id}`)).data, beforeDetail.data);
    assert.deepEqual((await owner.get('/api/projects/1/activity')).data, beforeActivity.data);
  } finally { await api.stop(); }
});

test('issue and session persist after reopening the same SQLite file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gitjira-api-'));
  const dbPath = join(dir, 'tracker.sqlite');
  try {
    let api = await fixture(dbPath);
    let cookie;
    let issueId;
    try {
      const owner = await api.login(1);
      cookie = owner.cookie;
      const created = await owner.post('/api/projects/1/issues', { title: 'Survives restart' });
      assert.equal(created.status, 201);
      issueId = created.data.issue.id;
    } finally { await api.stop(); }
    api = await fixture(dbPath);
    try {
      assert.equal((await api.request('GET', '/api/session', undefined, cookie)).data.user.id, 1);
      assert.equal((await api.request('GET', `/api/issues/${issueId}`, undefined, cookie)).data.issue.title, 'Survives restart');
    } finally { await api.stop(); }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
