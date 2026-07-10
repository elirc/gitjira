# State of GitJira — after Sprint 12 (v0.8.0)

**Tag:** `v0.8.0` / `sprint-12` · **PR:** #110 · **Version:** 0.8.0

## What the system can do

Same features as v0.7.0 — this sprint made the app **fast at scale** and put a
guardrail in CI so it stays that way. Measured against a reproducible world of 50
projects / 20k issues / 100k events.

## The change

```
   MEASURE  →  FIX  →  PROVE   (no optimization commit without a measurement before it)

   scale seed (deterministic) ─► baseline (queries, ms, bundle) ─► fixes ─► after
        │                                                            │
   50 proj / 20k issues / 100k events            board sort 8.7ms → 1.9ms (index)
                                                  issue detail 12q/74ms → 9q/55ms
                                                  member cache: -1 query / request
                                                  initial bundle 137kB → 72kB gzip
                                                            │
                                          GUARDRAIL: CI bundle budget (ADR 0025)
```

## Metrics

| Metric                   | Value                              | Prev |
| ------------------------ | ---------------------------------- | ---- |
| Board list query         | **1.9 ms** (was 8.7 ms, heapsort)  | 8.7  |
| Issue detail             | **9 q / 55 ms** (was 12 q / 74 ms) | 12q  |
| Initial JS bundle (gzip) | **72 kB** (was 137 kB)             | 137  |
| Composite indexes added  | 2 (board list, activity feed)      | —    |
| Read-through cache       | member map (single-flight)         | —    |
| Perf budgets in CI       | bundle ≤ 85 kB gzip                | none |
| Migrations               | 11 (perf indexes)                  | 10   |

## Tech-debt register (delta)

| Debt                              | Why                                                  | Due       |
| --------------------------------- | ---------------------------------------------------- | --------- |
| No list virtualization yet        | Backlog/notification lists still render all rows     | sprint 14 |
| No Web-Vitals field data          | Only lab/build metrics; LCP/INP/CLS not beaconed     | later     |
| Lighthouse-CI not gated           | Needs a browser; size is the deterministic gate      | E2E home  |
| Cache reads feeding authz (audit) | Only requireMembership today; re-audit as RBAC grows | sprint 13 |

## Known limitations

Only the measured hot paths were touched — `listIssues` was already optimized and
deliberately left alone. The perf budget gates bundle SIZE (deterministic), not
Lighthouse (browser, noisy). Long lists aren't virtualized yet.

## For the junior: what to study here

1. **Measure before you optimize** — the seed + harness, and the "what we did NOT
   touch" note. → `docs/performance.md`
2. **Index column order** — how (projectId, createdAt DESC, id DESC) deletes the
   sort step. Read the EXPLAIN before/after.
3. **Read-through cache + single-flight** — and the security edge: cache under an
   authz check. → the PR review (the stale-authz bug, red→green).
4. **Code splitting** — React.lazy halving the initial download.
5. **A budget is a ratchet** — the CI bundle gate; raising it requires editing ADR 0025.
