# Performance brief — Sprint 12

> The iron rule: **no optimization without a measurement before it.** Every number
> below is reproducible — seed the scaled DB (`npm run db:seed:scale`) and run
> `npm run perf:measure` (backend) or `npm run build` (bundle).

## The scaled world

Deterministic seed (`apps/api/prisma/seed-scale.js`, fixed PRNG): **50 projects,
20,000 issues, 100,000 activity events, 30 users**. Same bytes for every dev and
CI run, so a p95 here is comparable to a p95 there.

## Backend: before → after

Measured with the real service code against the scaled DB, through a
query-logging Prisma client (`npm run perf:measure`).

| Endpoint (project SCL0)  | Baseline     | After sprint 12 |
| ------------------------ | ------------ | --------------- |
| GET board (project+cols) | 3 q / 11 ms  | **2 q / 7 ms**  |
| GET issue list (50)      | 4 q / 22 ms  | **3 q / 11 ms** |
| GET issue detail         | 12 q / 74 ms | **9 q / 55 ms** |

Three changes, each measurement-driven:

### 1. Issue detail — duplicate load + unbounded feed (12 q → 10 q)

`getIssueDetail` loaded the issue **twice** (once for authz, once for the full
payload) and fetched the **entire** activity history on every open. Fixed: one
authz + one `findUnique`, and the feed bounded to the newest 20.

### 2. Composite indexes — the sort disappears

The board list filtered by `projectId` then **top-N heapsorted** by `createdAt`.

```
BEFORE:  Bitmap Index Scan (projectId,columnId) → Sort (top-N heapsort) → Limit
         actual time ≈ 8.7 ms
AFTER:   Index Scan using (projectId, createdAt DESC, id DESC) → Limit
         actual time ≈ 1.9 ms      (~4.6× on the query)
```

The rule EXPLAIN teaches: an index that serves a query puts the **equality**
column first, then the **ORDER BY** columns in their sort direction. Then the
sort step vanishes and `LIMIT` stops early. Same fix for the activity feed on
`(issueId, createdAt DESC)`.

### 3. Read-through cache — one query off every request

The member map (`{ userId: role }`) is read on **every** authorized request and
changes rarely. A read-through cache with single-flight (stampede protection)
removes that query from the hot path: board 3 q → 2 q, detail 10 q → 9 q.

> ⚠️ Cache + authz is dangerous: because `requireMembership` reads this cache,
> **every** membership mutation must invalidate it, or a stale entry becomes a
> stale authorization decision. (See the sprint-12 PR review.)

## Frontend: before → after

Route-level code splitting (`React.lazy` + dynamic `import()`), measured from the
Vite build.

| Bundle (gzip)          | Before       | After            |
| ---------------------- | ------------ | ---------------- |
| **Initial download**   | 137 kB       | **72 kB**        |
| ProjectBoardPage chunk | (in initial) | 34 kB, on demand |
| schemas (zod)          | (in initial) | 29 kB, on demand |

The initial download roughly **halved**. A logged-out visitor no longer downloads
the board's drag-and-drop engine to see a login form.

**Guardrail:** `scripts/bundle-budget.mjs` fails CI if the initial chunk exceeds
85 kB gzip (currently ~70). Performance can't quietly rot back. See ADR 0025.

## What the measurements did NOT point at

`listIssues` was already cursor-paginated and projected (sprints 3/6) — the
board list showed **no N+1**. We didn't "optimize" it beyond the index, because
the numbers said the time was in the sort, not the fetch. Measuring first is what
kept us from polishing a fast path while a slow one hid in the detail endpoint.
