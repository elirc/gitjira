# Sealed: reference answer for interview/SYSTEM_DESIGN.md

This is one defensible design. The interviewer grades reasoning and numbers, not agreement.

## 1. Sizing (say this out loud first)

- **Sockets:** 40k concurrent. A Node process comfortably holds ~5–10k mostly idle Socket.IO connections, so about 6–8 realtime nodes plus headroom. **Split realtime from REST** so a REST deploy doesn't drop 40k sockets, and REST autoscaling isn't driven by connection count.
- **Writes:** 1,500/s peak. Each write adds ~1 `ActivityEvent` row, so ~100M events/year at the sustained average. `ActivityEvent` is the fastest-growing table.
- **Fan-out:** a 600-viewer project at 20 moves/s. The current hint-then-refetch design produces 12,000 list requests/s (each 50–400 rows) for **one** project. This is the number that forces the redesign.
- **Redis:** the member-map cache is read on every authorized request (tens of thousands of ops/s). Pub/sub for sockets adds 1,500 messages/s × fan-in.

## 2. Architecture

- **Edge:** CDN for the SPA (static, immutable hashed assets). ALB/Fly proxy → REST service (stateless, autoscale on CPU/p95) and a **realtime gateway** service (websocket-only transport so no stickiness is needed; if polling fallback is required, sticky sessions by cookie).
- **Events:** writes append an **outbox row in the same transaction** as the change (fixes review R5: today `recordActivity` emits before commit, see curriculum 01). A relay (the worker, or Postgres logical decoding/Debezium at larger scale) publishes committed events to a stream (Redis Streams per shard, or Kafka/SQS FIFO if the org already runs one), keyed by `projectId` for per-project ordering.
- **Realtime:** gateways subscribe to the stream and push **the change itself** (issue id, new columnId/position, version), not a "refetch" hint. Clients apply the change if `version > cached.version`, otherwise ignore it. Each event carries a per-project sequence number. On reconnect the client sends its last seen sequence; the gateway replays from the stream (bounded retention, for example 10 min), and beyond that the client does a full refetch. This fixes lost room membership on reconnect too: rooms are re-derived from the client's subscribe message on every `connect`.
- **Notifications:** the relay → BullMQ (or the stream consumer group) → the worker creates `Notification` rows (`dedupeKey` per event id, curriculum 02) → publishes `notification.created` to the user's channel → bell updates by push. The 30 s polling stays only as a fallback. Autoscale workers on **oldest-job age**, not queue length. The SLO is measured end to end: `notification.createdAt − activityEvent.createdAt`, as a histogram.
- **Postgres:** a larger primary; `ActivityEvent` range-partitioned by month (drop or archive old partitions; the detail panel only reads the newest 20). `Issue` at 5M rows doesn't need partitioning; it needs the composite indexes that exist plus a `(projectId, columnId, position)` index for the board query. A read replica for search, reports and the sprint report, **not** for the board after your own write (read-your-writes). PgBouncer in transaction mode (Prisma needs `pgbouncer=true`).
- **Search:** keep Postgres FTS until the 200-id cap (`search.service.js:88`) and ranking quality bite. Then OpenSearch, fed from the same event stream (eventually consistent; a search result opens the authoritative detail).
- **Redis:** separate instances for the cache, BullMQ and pub/sub (different failure and eviction profiles; BullMQ needs `noeviction`). The member map treats Redis as optional: a miss or timeout falls back to Postgres (ladder M3), so a failover degrades latency, not availability.

## 3. Tenancy and residency

- **Cells:** a cell = REST + realtime + worker + Postgres + Redis in one region. The EU customer's organization is pinned to the EU cell. A thin global directory maps `orgId → cell` (for login and routing). No cross-cell joins. Backups and logs stay in-region.
- Within a cell: shared tables with an `organizationId` on `Project` (issues inherit through `projectId`), plus Postgres RLS as defense in depth. Room names include the org (`org:<id>:project:<id>`).
- **SSO:** OIDC/SAML per organization at the auth layer. The access token keeps the `sub`, so the authorization model is unchanged.

## 4. Migrations at this size

Expand/contract only (ADR 0031, done for real). `CREATE INDEX CONCURRENTLY` alone in its own Prisma migration file. A `lock_timeout` on every DDL step. Backfills as throttled jobs (keyset batches, pause when replica lag or p95 rises). Each release is compatible with the previous and the next schema, because the migration runs before old instances drain.

## 5. What I would not build yet

Kafka if the team doesn't run it (Redis Streams + outbox covers 1,500 writes/s). Multi-region active-active for one tenant. CRDT-based concurrent editing of descriptions (last-write-wins + the existing `expectedUpdatedAt` 409 is fine).

## Scoring hints

- **Strong:** computes the 12,000 req/s refetch amplification, moves to push-the-change with versions, fixes emit-before-commit with an outbox, handles reconnect catch-up, separates realtime from REST, and sizes Redis roles separately.
- **Weak:** "add Kubernetes and Kafka" with no numbers. Keeping "invalidate and refetch" at this scale. Any design where a Redis failover makes authorization fail.
