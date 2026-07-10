# 0016 — Socket.IO for real-time (over raw WebSocket / SSE)

**Status:** accepted · **Sprint:** 08

## Context

Live board updates need server→client push. Options: raw `ws`, Server-Sent Events, or
Socket.IO.

## Decision

Socket.IO, mounted on the existing HTTP server, with one room per project.

## Consequences

- ✅ Rooms, reconnection with backoff, and handshake middleware come for free — exactly the
  primitives we need.
- ✅ Two-way (SSE is one-way), so presence and future typing indicators fit the same channel.
- ✅ Handshake auth mirrors the REST auth middleware.
- ❌ A protocol/library dependency and a slightly heavier client than raw ws.
- ❌ Single-node only right now: broadcasting works within one process. Horizontal scaling
  needs the Redis adapter (noted; deferred until we run more than one instance — sprint 15
  territory).
