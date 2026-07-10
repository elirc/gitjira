import { getIo } from './socket-server.js';

// LEARN: ONE function to emit domain events to a project room. The activity
// seam (recordActivity, sprint 05) calls this after writing an event, so every
// change that gets recorded also gets broadcast — no scattered io.emit() calls.
// Build the choke-point once and every future event type flows through it for
// free (sprint 09 will add a SECOND consumer of the same seam: the job queue).
export function emitToProject(projectId, event, payload) {
  const io = getIo();
  if (!io) return; // tests / no socket server: emitting is a no-op, not a crash
  io.to(`project:${projectId}`).emit(event, payload);
}
