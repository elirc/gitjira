# Project stories (STAR scaffolds)

Fill these in **after** you've done the linked work. Each story has to survive the follow-ups in `MOCK_DEFENSE.md`, so write the mechanism, not the adjectives. Target 90 seconds spoken per story. Leave a blank if you haven't done the work yet. Never invent a number.

## 1. Debugging: "the board that lied about 400 issues"

**Linked work:** ladder M1 (`ladder/M1-board-at-2000-issues.md`), J2.

- **Situation:** A Jira-style tracker (Express, Prisma/Postgres, React + TanStack Query). The seeded scale DB has 20,000 issues across 50 projects (`apps/api/prisma/seed-scale.js`). The performance brief (`docs/performance.md`) measured "GET issue list (50)" and called it done.
- **Task:** Board and backlog at 400 to 2,000 issues per project: correct first, then smooth.
- **Action (fill in):** How you noticed the count mismatch. The chain from `useIssues` (no limit) → `parseLimit` default 50 → a board that ignores `nextCursor`. What the React Profiler showed on one socket event. What you changed and why that design (all issues, per-column queries, or virtualized).
- **Result (fill in):** Issues shown before/after. Commit time per activity event before/after (Profiler). Requests per event per viewer before/after.
- **The lesson in one line:** ____

## 2. Trade-off: "Redis on the request path"

**Linked work:** ladder M3 + `agentic/EXERCISE.md`.

- **Situation:** The runbook says a Redis outage only delays notifications. In the code, the authorization member map (`apps/api/src/lib/cache.js`) and three awaited `enqueueNotification` calls sit on the request path.
- **Task:** Make Redis a soft dependency without losing notifications or weakening authorization.
- **Action (fill in):** Options you weighed (log-and-drop, fall back to Postgres, outbox). Which you chose, what it costs, and how you proved it with Redis actually down.
- **Result (fill in):** Your outage table (status/p95 with Redis down/slow/closed port). Notifications lost: expected vs observed.
- **Trade-off sentence:** "I chose ___ over ___ because ___; it would stop being right when ___."

## 3. Incident: pick one of INC-002 or INC-004

**Linked work:** `incidents/002-missing-notifications.md` or `incidents/004-dashboards-flatline.md` and your postmortem.

- **Situation:** What the alert or the customer said, with the real numbers from the brief.
- **Task:** Your role (on-call, reviewer of the suspect PR).
- **Action (fill in):** The first three things you checked, in order, and why that order. The query or metric that turned the suspicion into proof. The fix and the regression test.
- **Result (fill in):** Time to mitigate vs time to root cause. What you changed so this class of bug can't ship again (a test, a lint rule, a review checklist item).
- **Blameless line:** what in the system let a reasonable PR cause this.

## 4. Migration: "rename a column without an outage" (INC-003 + ladder S2)

**Linked work:** `incidents/003-deploy-story-points.md`, `ladder/S2-labels-expand-contract.md`.

- **Situation:** Two API machines (`fly.toml` `min_machines_running = 2`). Migrations run once in `release_command` before the new code takes traffic. The Issue table is heading toward 2M rows.
- **Task:** A schema change (the S2 labels normalization) while writes continue.
- **Action (fill in):** Your expand → dual-write → backfill → switch-reads → contract plan, release by release. Which step needs `CONCURRENTLY` and a migration file of its own. Your `lock_timeout`. How big the backfill batches were and how you throttled them.
- **Result (fill in):** Measured lock waits or none. What rollback was possible at each step.

## 5. Agent-caught bug (or bug an agent introduced that you caught)

**Linked work:** `agentic/EXERCISE.md` Step 3–5, `agentic/REVIEW_LOG.md`.

- **Situation:** You drove an implementer agent on M3 and had a second model review it.
- **Task:** Ship only what was verified.
- **Action (fill in):** The strongest reviewer finding (or the claim you caught that wasn't true, for example "tests pass" when `CACHE_BACKEND=memory` meant Redis was never touched). How you checked it yourself.
- **Result (fill in):** What changed in the diff because of it. What you now always check in agent output.
- **One line for the interviewer:** "The agent was fast at ___; I was the one who had to ___."
