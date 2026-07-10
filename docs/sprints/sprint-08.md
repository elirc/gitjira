# Sprint 08 — Real-time Collaboration · Learning brief

**Levels:** L2, L3, L5 · **PR:** #74 · **Release:** v0.4.0

## What this sprint teaches

1. **WebSockets & rooms** — push, not poll; handshake auth; per-project scoping. → `socket-server.js`, `docs/concepts/websockets.md`, ADR 0016
2. **The activity seam pays off** — one function (recordActivity) now also emits; sprints 05→08→09 build on it.
3. **Cache reconciliation** — invalidate vs patch, and why we invalidate. → `useLiveProject.js`
4. **Optimistic concurrency** — the stale-write 409, no locks. → ADR 0017
5. Two client footguns as planted findings: room-join authz, and the subscription leak.

## Read the PR in this order

`socket-server.js` (handshake, rooms — spot the GOTCHA) → `emit.js` + the recordActivity
change (the seam) → `useLiveProject.js` (the leak) → stale-write in `issue.service.js` → **the
review threads** → the socket + stale-write tests.

## Exercises

1. Add a typing indicator on comments (emit on keypress, show "X is typing…").
2. Kill the API mid-drag; document what the client does, then improve the reconnect refetch.
3. Reproduce the subscription leak: add a console counter, navigate away and back three times, move a card.

<details><summary>Hints</summary>

1. A new event to the room; debounce the emit; clear after a timeout.
2. Socket.IO auto-reconnects; the gap is what you missed while offline.
3. The fix is one cleanup return from the effect.

</details>
