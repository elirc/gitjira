import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { io as ioClient } from 'socket.io-client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initSocketServer } from '../src/realtime/socket-server.js';
import { emitToProject } from '../src/realtime/emit.js';
import { makeUser } from './helpers.js';

// NOTE: the shared beforeEach (test/setup.js) truncates tables before EACH
// test, so we create the user + project INSIDE each test, not in beforeAll —
// beforeAll data wouldn't survive the truncation.
let httpServer, url, socketServer;
const clients = new Set();
const app = createApp();

beforeAll(async () => {
  httpServer = createServer(app);
  socketServer = initSocketServer(httpServer);
  await new Promise((r) => httpServer.listen(0, r));
  url = `http://localhost:${httpServer.address().port}`;
});
afterEach(() => {
  for (const client of clients) client.close();
  clients.clear();
});
afterAll(() => new Promise((resolve) => socketServer.close(resolve)));

function connect(token) {
  const client = ioClient(url, { auth: { token }, transports: ['websocket'], forceNew: true });
  clients.add(client);
  return client;
}
async function setupProject(auth) {
  await request(app)
    .post('/api/projects')
    .set('Authorization', auth)
    .send({ key: 'RT', name: 'RT' });
  return (await request(app).get('/api/projects/RT').set('Authorization', auth)).body.project;
}

// LEARN: real socket tests — a real client connects to a real server. The
// handshake auth and room broadcasting are exactly the kind of thing that
// looks fine in code and breaks in practice, so we exercise the wire.
describe('socket server', () => {
  it('rejects a connection with no/invalid token', async () => {
    const sock = connect('garbage');
    const err = await new Promise((resolve) => sock.on('connect_error', resolve));
    expect(err.message).toMatch(/token/i);
    sock.close();
  });

  it("a member in a project room receives that project's events", async () => {
    const ana = await makeUser('sock@t.dev');
    const project = await setupProject(ana.auth);

    const sock = connect(ana.token);
    await new Promise((resolve) => sock.on('connect', resolve));
    const joined = new Promise((resolve) => sock.once('presence', resolve));
    sock.emit('join-project', { projectId: project.id });
    await joined;

    const received = new Promise((resolve) => sock.on('activity', resolve));
    emitToProject(project.id, 'activity', { kind: 'issue.moved', issueId: 'i1' });
    const evt = await received;
    expect(evt.kind).toBe('issue.moved');
    sock.close();
  });
});

// LEARN: authz follows the transport. The handshake authenticated the user;
// joining a project's room is a separate authorization check.
describe('socket room authorization (review finding)', () => {
  it('a non-member is refused the join and receives none of the room events', async () => {
    const ana = await makeUser('sockana@t.dev');
    const project = await setupProject(ana.auth);
    const ben = await makeUser('bensock@t.dev'); // NOT a member of RT

    const benSock = connect(ben.token);
    await new Promise((r) => benSock.on('connect', r));

    const denied = new Promise((resolve) => benSock.once('join-error', resolve));
    let benGotActivity = false;
    benSock.on('activity', () => (benGotActivity = true));

    benSock.emit('join-project', { projectId: project.id });
    expect(await denied).toMatchObject({ projectId: project.id });
    const serverSocket = socketServer.sockets.sockets.get(benSock.id);
    expect(serverSocket.rooms.has(`project:${project.id}`)).toBe(false);

    emitToProject(project.id, 'activity', { kind: 'issue.moved', issueId: 'x' });
    await new Promise((r) => setTimeout(r, 80));
    expect(benGotActivity).toBe(false); // never in the room, never hears it

    benSock.close();
  });
});
