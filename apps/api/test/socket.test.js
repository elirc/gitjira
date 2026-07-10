import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSocketServer } from '../src/realtime/socket-server.js';
import { emitToProject } from '../src/realtime/emit.js';
import { makeUser } from './helpers.js';

let httpServer, url, ana;

beforeAll(async () => {
  ana = await makeUser('sock@t.dev');
  httpServer = createServer(createApp());
  initSocketServer(httpServer);
  await new Promise((r) => httpServer.listen(0, r));
  url = `http://localhost:${httpServer.address().port}`;
});
afterAll(() => new Promise((r) => httpServer.close(r)));

function connect(token) {
  return ioClient(url, { auth: { token }, transports: ['websocket'], forceNew: true });
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

  it("an authenticated client in a project room receives that project's events", async () => {
    const sock = connect(ana.token);
    await new Promise((resolve) => sock.on('connect', resolve));
    sock.emit('join-project', { projectId: 'proj-1' });
    await new Promise((r) => setTimeout(r, 50)); // let the join settle

    const received = new Promise((resolve) => sock.on('activity', resolve));
    emitToProject('proj-1', 'activity', { kind: 'issue.moved', issueId: 'i1' });
    const evt = await received;
    expect(evt.kind).toBe('issue.moved');
    sock.close();
  });
});
