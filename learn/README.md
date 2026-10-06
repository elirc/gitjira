# Learn GitJira: a study route for a junior engineer

This folder is the on-ramp to `training/`. `training/` was written for someone who already reads Express, Prisma and React
fluently. `learn/` gets you there first. Then it walks you through `training/` in an order that builds skill, and it shows
which parts you do yourself and which parts you hand to a coding agent and then check.

Central concept pages live in the private companion repo
[elirc/opusorganize](https://github.com/elirc/opusorganize/tree/main/apprenticeship/curriculum), under
`apprenticeship/curriculum/`. The links below point there.

## What this app is, and why it's in the portfolio

GitJira is a Jira clone. It's an npm-workspaces monorepo with four parts:

- an Express + Prisma/Postgres API with Socket.IO (`apps/api/src/app.js`, `apps/api/prisma/schema.prisma`);
- a BullMQ notification worker (`apps/worker/src/index.js`);
- a React + TanStack Query SPA (`apps/web/src/`);
- shared Zod, JQL and policy code (`packages/shared/src/`).

At the base commit `0c1a640` it has 209 commits (223 on `main` as of 2026-10-06), 31 ADRs (`docs/adr/`) and a real CI
and deploy pipeline (`.github/workflows/ci.yml`, `deploy.yml`, `fly.toml`). It's one of the portfolio's **two flagships**.
`portfolio-audit/PRIORITY_ROADMAP.md` in elirc/opusorganize (Wave 1) says to
take it to production on AWS and keep it alive there. That makes it your "I shipped and operated a real TypeScript app" story.

## Prerequisites (do these first, or in parallel with sessions 1 and 2)

| #   | Fundamental                                                                          | Where to learn it                                                                                                                                                                 | How you know you have it                                                                   |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| P1  | How an Express request flows: router, middleware, controller, service, error handler | Read `apps/api/src/app.js`, `routes/index.js`, `middleware/validate.js`, `middleware/async-handler.js`, `middleware/error-handler.js` (every file has `LEARN:` comments)          | You can do onramp exercise 2 without notes                                                 |
| P2  | SQL basics: joins, indexes, what a query plan is                                     | [10 query plans and indexes](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/10-query-plans-and-indexes.md) + `apps/api/prisma/migrations/20260710000000_perf_indexes/migration.sql` | You can say which index `listIssues` uses (onramp 5)                                       |
| P3  | React effects and cleanup, TanStack Query invalidation                               | [12 frontend performance](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/12-frontend-performance.md) + `apps/web/src/lib/useLiveProject.js`, `useDebounced.js`                      | Onramp 8                                                                                   |
| P4  | Schema changes that don't break the running version                                  | [07 zero-downtime migrations](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/07-zero-downtime-migrations.md) + ADR `docs/adr/0031-*`                                                | You can explain why `fly.toml`'s `release_command` runs before the new code serves traffic |
| P5  | Metrics you can trust: counters, histograms, label cardinality, SLOs                 | [09 telemetry correctness](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/09-telemetry-correctness.md) + `apps/api/src/lib/metrics.js`                                              | You can explain why the file uses a route _pattern_ and not the raw URL                    |
| P6  | Checking code you didn't write, whether an agent or a person wrote it                | [05 verify before trust](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/05-verify-before-trust.md)                                                                                  | You've read `training/agentic/VERIFY_CHECKLIST.md` once end to end                         |

Background you'll need later (link, don't study up front): [08 realtime fan-out](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/08-realtime-fanout.md),
[13 release safety](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/13-release-safety.md),
[14 load and back-pressure](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/14-load-backpressure-timeouts.md),
[06 caching](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/06-caching-correctness.md) (for M3).

## Ground rules for every session

- **Work in a worktree off `0c1a640`, not on `main`.** Every line number in `learn/` and `training/` refers to
  `0c1a640`. The sprint/backlog work that was still uncommitted when these notes were written (`sprint.service.js`,
  `issue.service.js`, `hooks.js`, `BacklogPage.jsx`, `astraupskill/`) landed on `main` in `4dba9ab` (2026-09-30), so
  `main` no longer matches those line numbers. From the root of your clone:
  `git worktree add ../gj-learn -b learn/scratch 0c1a640`.
- Run `npm ci` once at the root of your worktree before anything that runs. The API tests need Postgres
  (`docker compose up -d`). Web and shared tests need nothing (on a slow machine:
  `npm test -w @gitjira/web -- --pool=threads --maxWorkers=1`).
- Spoilers: don't open `training/_answers/`, `learn/_answers/`, `docs/process/AUDIT-2026-07.md` or `docs/RETRO.md` before
  the matching exercise.
- Write everything in a notebook file (`learn/notes/NN.md` in your worktree). "I understood it" doesn't count. A written
  prediction that you later check does.

## Study route

Each session is 45 to 90 minutes. Sessions 1 to 12 are the core route (about 16 h). W1 to W4 are the **Wave-1 production track**,
which is the roadmap deliverable (each is two or more 90-minute blocks). The **Do / Delegate** line marks what you do by hand
and what you give to an agent and then verify.

### Session 1: read and predict (60 min)

- **Files:** `learn/00-onramp.md` exercises 1 to 4 (`packages/shared/src/fractional-index.js`, `issue-schemas.js`,
  `policy.js`, the create-issue path).
- **Do by hand:** all of it. Predict first, then check by running `npm test -w @gitjira/shared` in your worktree, or with a
  scratch `node -e` import.
- **Delegate:** nothing. You're building the mental model that you'll later use to judge agent output.
- **Exit:** your predictions for `keyBetween` match real output, and you can draw the create-issue path from memory with
  file names.

### Session 2: schema, pagination, and your first test (75 min)

- **Files:** `learn/00-onramp.md` exercises 5 to 8 (`schema.prisma` `model Issue`, `listIssues`, `mentions.js`,
  `useLiveProject.js`).
- **Do by hand:** the schema explanation, and the _list of cases_ for the characterization test.
- **Delegate:** you may have an agent write the test file from your case list. You check that each `expect` matches your
  prediction, not the agent's.
- **Exit:** `packages/shared/test/mentions.characterization.test.js` exists in your worktree and passes, and at least one
  assertion records behaviour you found surprising.

### Session 3: blind review, cold (90 min)

- **Files:** `training/review/EXERCISE.md` (60 min timer), then stop.
- **Do by hand:** the whole review. Don't let an agent "help": this is the one exercise that measures _your_ eye.
- **Exit:** at least 8 written findings, each with file:line and a failure scenario.

### Session 4: compare, then read the map (75 min)

- **Files:** `training/review/COMPARE.md` against `training/_answers/review.md`, then `training/navigation/ARCHITECTURE.md`
  and `FIRST_CHANGE.md`.
- **Do by hand:** the comparison table: which of the 29 findings you missed, and _why_ (didn't read the file, read it but
  didn't know the pattern, knew it but didn't think it mattered).
- **Delegate:** after you've written your own table, ask an agent: "for findings R2, R3, R5 and R9, list the file:line
  evidence." Check two of its citations against the code by hand.
- **Exit:** you can name 3 of GitJira's "only fails in production" weaknesses (more than one machine, deploys, reconnects,
  Redis down) and point at the file for each.

### Session 5: J1, readiness vs liveness (90 min)

- **Files:** `training/ladder/J1-readiness-probe.md`, `apps/api/src/services/health.service.js`, `fly.toml`.
- **Do by hand:** the "Explain before touching" answers, and the spec (status codes, what each probe checks, timeouts).
- **Delegate:** the implementation and tests, to an agent, using your spec. Then run `VERIFY_CHECKLIST.md` sections 1, 2
  and 4 yourself.
- **Exit:** the new readiness test fails on `0c1a640` and passes on your branch. You ran it against a real Postgres, and
  you have the output.

### Session 6: J2 (the table stops at 50) or J3 (queue metrics) (90 min)

- **Files:** `training/ladder/J2-issue-table-load-more.md` (frontend) _or_ `J3-queue-metrics.md` (backend). Do the other one
  later.
- **Do by hand:** "Explain before touching", plus the MSW or metrics test _cases_.
- **Delegate:** the component or metric code.
- **Exit:** J2: an RTL test renders more than 50 issues after "Load more". J3: `grep -rn queue_ apps` finds the metric you
  added, and it's visible on `/metrics`.

### Session 7: incidents 004 and 002 (90 min)

- **Files:** `training/incidents/004-dashboards-flatline.md`, `002-missing-notifications.md`. Use a worktree per branch (see
  `training/incidents/README.md`).
- **Do by hand:** triage, hypotheses and root cause. **Diagnosis is never delegated.** Reading `git show HEAD` on the branch
  is part of the exercise.
- **Delegate:** once you've written the root cause, have an agent draft the regression test. Make it fail on the branch
  before you believe it.
- **Exit:** for each incident you've written a one-paragraph mechanism with file:line _before_ opening
  `training/_answers/incident-00N.md`, and you scored yourself against it.

### Session 8: agentic drill A, then ladder M2 (SLOs) (90 min)

- **Files:** `learn/01-agentic-practice.md` drill A (INC-004 fixed by an agent under your spec), then
  `training/ladder/M2-slos-and-route-labels.md` "Explain before touching".
- **Do by hand:** the spec, the review, and the SLI definitions.
- **Delegate:** the `metrics.js` change and the cardinality test.
- **Exit:** the cardinality test (1,000 random paths give fewer than 50 `route` values) passes, and you've scored drill A
  against `learn/_answers/01-agentic-practice.md`.

### Session 9: incident 003, then S2 expand/contract design (90 min)

- **Files:** `training/incidents/003-deploy-story-points.md`, `training/ladder/S2-labels-expand-contract.md`, and
  [07](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/07-zero-downtime-migrations.md).
- **Do by hand:** everything. The migration reasoning _is_ the skill. Read the branch's `migration.sql`, not only
  `schema.prisma`.
- **Exit:** you can list the expand/contract steps for `storyPoints → estimate` as separate deploys, and say which old
  release still works after each one.

### Session 10: the scripted agentic exercise on M3 (two 90-min blocks)

- **Files:** `training/agentic/EXERCISE.md` (spec, implementer, adversarial reviewer, revision, verification, explanation).
- **Do by hand:** steps 1, 4, 5 and 6 (spec, triage, verification with Redis really stopped, and the explanation).
- **Delegate:** step 2 (implementer) and step 3 (reviewer, ideally a different model).
- **Exit:** a latency table from the three outage modes, and `MY_EXPLANATION.md` graded against
  `training/_answers/agentic-rubric.md`.

### Session 11: incidents 001 and 005 (frontend and realtime) (90 min)

- **Files:** `training/incidents/001-board-cpu-storm.md`, `005-live-board-goes-stale.md`, and
  [08](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/08-realtime-fanout.md).
- **Do by hand:** the render-count reasoning for 001, and the reconnect timeline for 005.
- **Delegate:** a render-count test harness for 001 (you specify: fake socket, count `join-project` emits).
- **Exit:** a test that counts `join-project` emits fails on the 001 branch and passes on your fix.

### Session 12: M1 or M4, and drills B and C (two 90-min blocks)

- **Files:** `training/ladder/M1-board-at-2000-issues.md` _or_ `M4-live-board-across-instances.md`, plus
  `learn/01-agentic-practice.md` drills B and C.
- **Exit:** drills B and C scored against their rubrics.

### Wave-1 production track (the roadmap deliverable)

These turn the S-rung _designs_ into things that actually run. The ticket is
`training/ladder/X1-ship-it-for-real.md`. Its sealed rubric is `training/_answers/ladder-X1.md`. Do S1 (design) before W1.

| Session         | What                                                                                                                                                 | Do by hand                                                               | Delegate, then verify                                 | Exit criterion                                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1 (3 × 90 min) | Deploy api + worker + web to AWS (ECS Fargate, RDS Postgres, ElastiCache, S3/CloudFront), using `training/ladder/S1-aws-production.md` as the design | the architecture decision, IAM trust policy review, the rollback runbook | Terraform/CDK scaffolding, the `deploy.yml` rewrite   | a tagged commit deploys through GitHub OIDC with no long-lived keys. You roll back with the ECS circuit breaker in under 5 min, and you have a screenshot or log of it                     |
| W2 (2 × 90 min) | One expand/contract migration **under load** (S2's labels, or a correct `storyPoints → estimate`)                                                    | the step plan and the lock analysis (`lock_timeout`, `CONCURRENTLY`)     | a k6 or `autocannon` load script, the backfill script | the load test's error rate stays at 0 across all deploys of the migration, with the numbers recorded                                                                                       |
| W3 (2 × 90 min) | 2 SLOs + burn-rate alert live (M2 + S3)                                                                                                              | SLI choice, targets, error-budget policy                                 | recording/alert rules, dashboard JSON                 | an induced failure (stop the worker, or `REDIS_PORT=6390`) fires the alert, and you have the timestamps                                                                                    |
| W4 (90 min)     | Your own ADR + blameless postmortem for the W3 induced failure                                                                                       | all of it. An agent may proofread only                                   | none                                                  | `docs/adr/0032-*.md` and `docs/postmortems/<date>-*.md` in your branch, written from real timestamps, not narrated (compare `docs/process/AUDIT-2026-07.md`, _after_ you've written yours) |

Cost warning: W1 to W3 spend real money (RDS, NAT, ALB). Tear the stack down the same day, and put the teardown command in
your runbook.

### Session 13: interview kit (90 min)

- **Files:** `training/interview/PROJECT_STORIES.md` (write stories from what _actually_ happened in sessions 7 to W4),
  `TECHNICAL_QUESTIONS.md`, `SYSTEM_DESIGN.md`, then `MOCK_DEFENSE.md` with a model as the interviewer.
- **Do by hand:** every answer, spoken aloud or written, before you open `training/_answers/interview-*.md`.
- **Exit:** 14/18 or better on the `MOCK_DEFENSE.md` rubric, and each of the 5 stories has one real number in it.

## Do vs. delegate, in one table

| Always by hand                                                                                       | Delegate, then verify                                              | Never delegate                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| predictions, the "Explain before touching" answers, specs, lock/migration analysis, triage decisions | implementation code, test scaffolding, IaC boilerplate, dashboards | the diagnosis of an incident, the blind review, the postmortem, and deciding a review finding is "not a problem" |

The rule behind it: you delegate typing, never judgment. Every delegated piece gets the
`training/agentic/VERIFY_CHECKLIST.md` pass plus the checklist in `learn/01-agentic-practice.md`.

## How you know you're done here

- All 5 incidents diagnosed with a written mechanism before you opened the answer (score yourself: 4/5 is a pass).
- One ladder ticket from each rung merged into your own worktree branch, with tests that fail on `0c1a640`.
- The W1 to W4 evidence pack exists (deploy log, rollback timing, load-test numbers, alert timestamps, ADR, postmortem).
- You pass the mock defense (14/18).

**Next repo in the competency graph:** `C:\Users\Owner\Desktop\gitvg\atlas\learn\` (the .NET/SQL flagship, the other half of
Wave 1). After both flagships: `astraspacegameweb` (Wave 2, operating a live observability stack), and `buildevent` if
M3/W2 showed that load and back-pressure are your weak spot.
