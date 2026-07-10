# Architecture

The whole system on one page, with every major decision linking its ADR.

## System diagram

```
                         ┌─────────────┐
        browser ───────► │   web       │  nginx: static React build
                         │  (nginx)    │  + reverse-proxy /api, /socket.io
                         └──────┬──────┘
                                │ /api, /socket.io
                                ▼
   ┌───────────────────────────────────────────────┐
   │                  api (Express)                 │
   │  auth · RBAC policy · issues · board · search  │
   │  Socket.IO (per-project rooms)                 │
   │  /metrics (Prometheus)   /api/health           │
   └───────┬───────────────────────────┬───────────┘
           │                           │ enqueue
           ▼                           ▼
   ┌───────────────┐           ┌───────────────┐
   │  Postgres     │           │  Redis        │◄──────┐
   │  (Prisma)     │           │  (BullMQ)     │       │ drain
   └───────────────┘           └───────┬───────┘       │
                                       │               │
                                       ▼               │
                               ┌───────────────┐       │
                               │   worker      │───────┘
                               │  (BullMQ)     │  notification fan-out
                               └───────────────┘
```

## The stack (and why)

| Layer    | Choice                               | Why / ADR                                       |
| -------- | ------------------------------------ | ----------------------------------------------- |
| Monorepo | npm workspaces                       | shared code without publish/version churn       |
| Frontend | React + Vite + TanStack Query        | server-state as cache; optimistic UI (sprint 4) |
| API      | Express + Prisma + Postgres          | boring, well-understood, typed data access      |
| Realtime | Socket.IO, per-project rooms         | authz follows the transport (sprint 8)          |
| Jobs     | BullMQ on Redis                      | off-request-path fan-out, idempotent (sprint 9) |
| Types    | JSDoc + checkJs (no build)           | ADR 0020                                        |
| Ordering | fractional indexing                  | one-row moves at any scale (sprint 4)           |
| Authz    | RBAC matrix + can()                  | ADR 0026; object + action layers (sprint 13)    |
| Deploy   | PaaS (Fly), release-phase migrations | ADR 0030 / 0031                                 |

## Cross-cutting decisions (the recurring themes)

- **Authz follows the transport.** Every new way in (HTTP, the move endpoint, the
  socket room, attachment download) needs its own authorization — proven four
  times across the project, most memorably by the sprint-13 IDOR.
- **Check-then-act is a lie under concurrency.** Issue-key allocation, the active
  sprint, notification idempotency — correctness lives in the database (unique
  indexes, atomic updates), not in application `if`s.
- **Measure before you optimize.** Sprint 12 fixed what the numbers pointed at
  (issue-detail queries, a heapsort) and left the already-fast path alone.
- **The server is the security boundary.** UI checks are UX; every real decision
  is enforced server-side, in one auditable place.

## Where the reasoning lives

- **ADRs** (`docs/adr/`): 31 decisions, each with context/decision/consequences.
- **State snapshots** (`docs/state/sprint-NN.md`): the system after each sprint.
- **Concepts** (`docs/concepts/`, `docs/TESTING.md`, `docs/SECURITY.md`,
  `docs/performance.md`): the reusable ideas, readable on their own.
- **RETRO.md**: the fifteen-sprint retrospective and recurring-theme tally.
