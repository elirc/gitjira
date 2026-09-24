# System design: take GitJira to 50x

**Today (evidence):** one Express process type (`apps/api/src/server.js`) serves REST and Socket.IO. There are two Fly machines (`fly.toml` `min_machines_running = 2`), a single Postgres, a single Redis (BullMQ + member-map cache), and one worker (`apps/worker/src/index.js`, concurrency 5). The seeded scale is 50 projects and 20k issues (`apps/api/prisma/seed-scale.js`). Realtime is per-project rooms with no adapter (`realtime/socket-server.js`). Attachments live on the local disk (`attachment.service.js:7`).

## The prompt (45 minutes)

> GitJira is signing three enterprise customers. In 12 months: **2,500 projects, 5M issues, 60M activity events, 40k concurrent board viewers at peak, 1,500 writes/s at peak** (card moves, edits, comments). One customer requires EU data residency; another wants SSO and a guaranteed "assigned → notified within 10 s". Design the system. Start from what exists; say what you keep.

Spend about 5 minutes on requirements and numbers before drawing anything. The interviewer expects you to size: sockets per API node, fan-out per write (viewers per project), activity-event growth per day, Postgres write rate, Redis ops/s.

## Follow-up pressure points (the interviewer picks 4–5)

1. **Fan-out.** A 600-person project board gets 20 moves/s. With today's "emit a hint, every client refetches the list" design, how many list requests per second does that create? What do you change, and what ordering guarantee do clients now need?
2. **Socket.IO at 40k connections.** Adapter choice (Redis pub/sub vs sharded Redis Streams vs a dedicated gateway). Sticky sessions or websocket-only. What happens to every room on a rolling deploy of 20 API nodes? How do clients catch up on events missed during reconnect?
3. **Events before commit.** `recordActivity` emits inside the transaction today. At this scale, what do you emit from, and when? (Outbox / logical decoding.)
4. **Postgres.** Which tables grow fastest? Partition `ActivityEvent`, and by what key? Does `Issue` need partitioning at 5M rows, or just better indexes? Where do you add a read replica, and which reads may use it given the board's read-after-write expectations?
5. **Notifications SLO.** "Assigned → bell within 10 s, p99." Where does latency accumulate today (enqueue after commit, worker concurrency 5, 30 s polling in `useNotifications`)? What do you measure, and what autoscales on what signal?
6. **Tenancy and residency.** Shared tables with a `tenantId` vs schema-per-tenant vs a cell per region. How does the member-map cache and the Socket.IO room naming change? Where does the EU customer's data physically live, including Redis and backups?
7. **Search.** Postgres FTS with `LIMIT 200` ids (`search.service.js:88`) at 5M issues. Keep it, or move to OpenSearch? What's the consistency story?
8. **Deploys and migrations at this size.** A column change on a 5M-row table with 1,500 writes/s. Your release process: expand/contract, `CONCURRENTLY`, backfill throttling, and who can roll back what.
9. **Failure drill.** Redis primary fails over (30 s). What breaks today (authorization reads the cache, the enqueue is awaited) and what breaks in your design?
10. **Cost.** Name the most expensive component in your design and one thing you'd deliberately _not_ build yet.

The reference answer is in `training/_answers/interview-system-design.md`. Open it only after a timed attempt.
