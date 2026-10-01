import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function startServer(dbPath) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: '0', DB_PATH: dbPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errorOutput = '';
  child.stderr.setEncoding('utf8').on('data', (chunk) => { errorOutput += chunk; });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server startup timed out: ${output}\n${errorOutput}`)), 15000);
    function fail(error) {
      clearTimeout(timer);
      reject(error);
    }
    child.once('error', fail);
    child.once('exit', (code) => fail(new Error(`server exited ${code}: ${output}\n${errorOutput}`)));
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
      const match = output.match(/GitJira ready (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  return { child, base };
}

async function stopServer(server) {
  if (!server || server.child.exitCode !== null) return;
  const exited = once(server.child, 'exit');
  server.child.kill();
  await exited;
}

async function request(base, method, path, body, cookie) {
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
  return { status: response.status, data: raw ? JSON.parse(raw) : undefined, headers: response.headers };
}

test('two independent processes accept one versioned edit and survive a restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gitjira-concurrency-'));
  const dbPath = join(dir, 'tracker.sqlite');
  let first;
  let second;
  let restarted;
  try {
    first = await startServer(dbPath);
    second = await startServer(dbPath);
    const session = await request(first.base, 'POST', '/api/session', { userId: 1 });
    assert.equal(session.status, 200, JSON.stringify(session.data));
    const cookie = session.headers.get('set-cookie').split(';')[0];
    assert.equal((await request(second.base, 'GET', '/api/session', undefined, cookie)).data.user.id, 1,
      'the second process must read the persisted session');
    const created = await request(first.base, 'POST', '/api/projects/1/issues', { title: 'Before race' }, cookie);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.issue.id;
    const version = created.data.issue.version;
    const [left, right] = await Promise.all([
      request(first.base, 'PATCH', `/api/issues/${id}`, { version, title: 'Process A won' }, cookie),
      request(second.base, 'PATCH', `/api/issues/${id}`, { version, title: 'Process B won' }, cookie),
    ]);
    assert.deepEqual([left.status, right.status].sort(), [200, 409],
      `both processes must use an atomic version predicate: ${JSON.stringify([left, right])}`);
    const winner = left.status === 200 ? left : right;
    const loser = left.status === 409 ? left : right;
    assert.equal(loser.data.current.title, winner.data.issue.title);
    const read = await request(second.base, 'GET', `/api/issues/${id}`, undefined, cookie);
    assert.equal(read.data.issue.title, winner.data.issue.title);
    assert.equal(read.data.issue.version, version + 1);
    const activity = await request(first.base, 'GET', '/api/projects/1/activity', undefined, cookie);
    assert.equal(activity.data.events.filter((event) => event.issueId === id && event.action === 'updated').length, 1);
    const [createdA, createdB] = await Promise.all([
      request(first.base, 'POST', '/api/projects/1/issues', { title: 'Created by A' }, cookie),
      request(second.base, 'POST', '/api/projects/1/issues', { title: 'Created by B' }, cookie),
    ]);
    assert.equal(createdA.status, 201, JSON.stringify(createdA.data));
    assert.equal(createdB.status, 201, JSON.stringify(createdB.data));
    assert.deepEqual(
      [createdA.data.issue.number, createdB.data.issue.number].sort((a, b) => a - b),
      [created.data.issue.number + 1, created.data.issue.number + 2],
      'both processes must allocate distinct consecutive project issue numbers',
    );
    await stopServer(first);
    first = undefined;
    await stopServer(second);
    second = undefined;
    restarted = await startServer(dbPath);
    assert.equal((await request(restarted.base, 'GET', '/api/session', undefined, cookie)).data.user.id, 1);
    assert.equal((await request(restarted.base, 'GET', `/api/issues/${id}`, undefined, cookie)).data.issue.title, winner.data.issue.title);
  } finally {
    await Promise.all([stopServer(first), stopServer(second), stopServer(restarted)]);
    await rm(dir, { recursive: true, force: true });
  }
});
