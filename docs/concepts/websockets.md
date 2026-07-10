# Concept: real-time with WebSockets

_A one-page primer, readable without the codebase. Behind the live board in Sprint 08._

A normal HTTP request is one-shot: the client asks, the server answers, the connection
closes. That's fine for "load the board," but useless for "tell me when someone ELSE moves
a card" — the server has no way to reach a client that isn't currently asking.

## The options

- **Polling**: the client asks "anything new?" every few seconds. Simple, but wasteful and
  laggy — you're either hammering the server or behind by your poll interval.
- **Server-Sent Events (SSE)**: a one-way stream from server to client. Good for feeds; can't
  send client→server on the same channel.
- **WebSockets**: a persistent, two-way connection. Either side can send at any time. This is
  what "live" apps use.

We use **Socket.IO**, a library over WebSockets that adds reconnection, fallbacks, and — the
feature we lean on — **rooms**.

## Rooms

A room is a named group of connections. A client viewing project GJ joins `project:GJ`; the
server broadcasts an event `to('project:GJ')` and only those clients get it. Rooms are how
you scope events so you don't fan every change out to every user.

## Authentication happens on the handshake

A WebSocket connects once and stays open, so you authenticate ONCE, at connection time (the
"handshake"), not per message. The client sends its token in the handshake; the server
verifies it exactly like an HTTP auth middleware. A socket that fails never connects.

**Authorization is separate.** Authenticating the _user_ on the handshake does NOT authorize
them to join any _room_. Joining `project:GJ` needs the same membership check the REST
endpoints have — the transport changed, but the authz question didn't. (Forgetting this is a
planted bug in Sprint 08's PR: "authz follows the transport.")

## The hard part is the client, not the socket

Getting an event to the browser is easy. The subtlety is what the client does with it. Two
strategies:

- **Patch the cache**: apply the event's data directly. Fast, but if the event is stale or the
  change rolled back, you've shown wrong data.
- **Invalidate and refetch**: treat the event as a "something changed" hint and re-read
  authoritative state. Slightly more network, always correct.

We invalidate. It's the safe default, especially since our events fire from inside database
transactions (before commit).

## Two client footguns

- **Subscription leaks**: `socket.on(...)` in a component effect must be paired with
  `socket.off(...)` in the effect's cleanup. Skip it and every remount stacks another
  listener, so one event fires your handler N times. (Also a planted bug this sprint.)
- **Reconnection gaps**: while disconnected, you miss events. On reconnect, refetch everything
  rather than trying to replay — you can't know what you missed.

## Go deeper

- Socket.IO docs — rooms and middleware.
- "optimistic concurrency" (this sprint's stale-write 409) is the companion idea: real-time
  shows you conflicts fast, and a version check stops silent overwrites.
