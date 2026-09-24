# Ladder: GitJira at production pressure

All tickets target committed `main` (`0c1a640`). Do each one on its own branch in a worktree (`git worktree add ../gj-J1 -b ladder/J1 0c1a640`). The owner's uncommitted work touches `sprint.service.js`, `issue.service.js`, `hooks.js` and `BacklogPage.jsx`, so rebase carefully if you ever bring a ladder change back to `main`.

This lab deliberately skips what the archive already trains well: authz, idempotency keys, the outbox, check-then-act races. When a ticket needs one of those, it links the central page in `apprenticeship/curriculum/` instead. The ladder leans into what's thin: **deployment, zero-downtime migrations, observability and SLOs, React rendering, BullMQ failure modes, and Socket.IO at more than one instance.**

| Rung   | Ticket                                                                       | Theme                                                               | Est.       |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| Junior | [J1: readiness vs liveness](J1-readiness-probe.md)                           | operability, status codes, one raw query, unit and integration test | 3 h        |
| Junior | [J2: the table stops at 50](J2-issue-table-load-more.md)                     | API contract, `useInfiniteQuery`, RTL + MSW test                    | 4 h        |
| Junior | [J3: queue metrics that exist](J3-queue-metrics.md)                          | BullMQ job counts and lag on `/metrics`                             | 3 h        |
| Mid    | [M1: board at 2,000 issues](M1-board-at-2000-issues.md)                      | React Profiler, memoization, query invalidation, data shape         | 8 h        |
| Mid    | [M2: SLOs you can alert on](M2-slos-and-route-labels.md)                     | route labels, SLIs, burn-rate alerts                                | 6 h        |
| Mid    | [M3: Redis is down, and the board shouldn't be](M3-redis-soft-dependency.md) | timeouts, fallbacks, after-commit side effects                      | 8 h        |
| Mid    | [M4: live board across 2 machines](M4-live-board-across-instances.md)        | Socket.IO adapter, stickiness, emit-after-commit, reconnect         | 8 h        |
| Senior | [S1: GitJira on AWS](S1-aws-production.md)                                   | ECS/RDS/ElastiCache/S3/ALB, OIDC deploy, migrations, rollback       | 5 h design |
| Senior | [S2: labels, expand/contract, 2M rows](S2-labels-expand-contract.md)         | Prisma migrations under load, backfill, JQL compiler switch         | 5 h design |
| Senior | [S3: "assigned → bell in 10 s", p99](S3-notification-latency-slo.md)         | end-to-end latency SLO over DB → queue → worker → socket            | 4 h design |

Every ticket opens with **"Explain before touching."** Write the answers in `training/ladder/notes/<id>.md` _before_ you (or an agent) change code. The sealed answer (`training/_answers/ladder-<id>.md`) compares your prediction with a reference analysis. Grade yourself on the prediction, not on the code.
