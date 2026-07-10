import { Server } from 'socket.io';
import { verifyAccessToken } from '../services/token.service.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../middleware/request-logger.js';

// LEARN: Socket.IO rides on the same HTTP server as the REST API. A WebSocket
// is a persistent, two-way connection — unlike a request/response, it stays
// open, and the server can PUSH to it. That's what makes "live" possible: no
// polling, the server tells you when something changed.

let io = null;

// One io instance for the process; the emitter (below) uses it.
export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // LEARN: authenticate on the HANDSHAKE, once, before any events flow — not
  // per-message. The client sends its access token in the connection auth
  // payload; we verify it exactly like the REST requireAuth middleware. A
  // socket that fails here never connects.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const claims = verifyAccessToken(token);
      socket.data.user = { id: claims.sub, name: claims.name };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    logger.info({ userId: user.id, socketId: socket.id }, 'socket connected');

    // LEARN: authorize the room join (review finding). The handshake proved
    // WHO the user is; it did NOT prove they may see THIS project. A socket is
    // just a new transport, and authz follows the transport — the same
    // membership check the REST endpoints run must gate the room join, or any
    // authenticated user could subscribe to any team's live events.
    socket.on('join-project', async ({ projectId }) => {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
      });
      if (!membership) {
        socket.emit('join-error', { projectId, message: 'Not a member of this project' });
        return;
      }
      socket.join(`project:${projectId}`);
      io.to(`project:${projectId}`).emit('presence', await presenceFor(projectId));
    });

    socket.on('leave-project', async ({ projectId }) => {
      socket.leave(`project:${projectId}`);
      io.to(`project:${projectId}`).emit('presence', await presenceFor(projectId));
    });

    socket.on('disconnect', () => {
      logger.info({ userId: user.id, socketId: socket.id }, 'socket disconnected');
    });
  });

  return io;
}

// Who is currently in a project room (distinct users).
async function presenceFor(projectId) {
  if (!io) return [];
  const sockets = await io.in(`project:${projectId}`).fetchSockets();
  const byId = new Map();
  for (const s of sockets) byId.set(s.data.user.id, s.data.user);
  return [...byId.values()];
}

export function getIo() {
  return io;
}
