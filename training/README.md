# GitJira apprenticeship lab (B02, tier LAB)

GitJira is a Jira clone: an npm-workspaces monorepo with an Express + Prisma/Postgres API with Socket.IO, a BullMQ worker, a React + TanStack Query SPA, and shared Zod, JQL and policy code. It is very well documented (31 ADRs, a runbook, a threat model), well tested, and strong on authz and idempotency. Its weak spots are what only shows up **in production**: more than one machine, a deploy, a reconnect, Redis being down, a real dataset. That's where this lab points you.

**Base commit:** `0c1a640`. All exercises and line numbers target that commit. When this lab was written the owner's sprint and backlog work (`apps/api/src/services/sprint.service.js`, `issue.service.js`, `apps/web/src/lib/hooks.js`, `BacklogPage.jsx`, `astraupskill/`, …) was uncommitted; it landed on `main` in `4dba9ab` (2026-09-30), so `main` now differs from the base in those files. Use `git worktree add <dir> 0c1a640` for everything.

**What's already covered elsewhere, so this lab doesn't re-teach it:** authz, the transactional outbox, idempotency keys, check-then-act races. When an exercise needs them, it links `apprenticeship/curriculum/01..05` in the private companion repo [elirc/opusorganize](https://github.com/elirc/opusorganize/tree/main/apprenticeship/curriculum).

## Suggested order (about 55 hours; S-rung designs are design-only)

| #   | What                                                                          | Where                                                                                                              | Time  |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| 1   | Blind review of `main` (60 min), then compare                                 | [review/EXERCISE.md](review/EXERCISE.md) → [review/COMPARE.md](review/COMPARE.md)                                  | 2.5 h |
| 2   | Architecture reconstruction, plus the self-check                              | [navigation/ARCHITECTURE.md](navigation/ARCHITECTURE.md), [navigation/FIRST_CHANGE.md](navigation/FIRST_CHANGE.md) | 2 h   |
| 3   | Junior rung J1 → J2 → J3                                                      | [ladder/](ladder/README.md)                                                                                        | 10 h  |
| 4   | Incidents 004 (metrics) and 002 (BullMQ)                                      | [incidents/](incidents/README.md)                                                                                  | 3 h   |
| 5   | Mid rung M2 (SLOs), then M3 (Redis) via the **agentic exercise**              | [ladder/M2](ladder/M2-slos-and-route-labels.md), [agentic/EXERCISE.md](agentic/EXERCISE.md)                        | 12 h  |
| 6   | Incidents 001 (React loop) and 005 (reconnect)                                | [incidents/](incidents/README.md)                                                                                  | 3 h   |
| 7   | Mid rung M1 (board at 2k) and M4 (two machines)                               | [ladder/](ladder/README.md)                                                                                        | 16 h  |
| 8   | Incident 003 (deploy and migration), then the senior designs S2 → S1 → S3     | [incidents/003](incidents/003-deploy-story-points.md), [ladder/](ladder/README.md)                                 | 17 h  |
| 9   | Trade-off drills plus change request CR-21                                    | [navigation/TRADEOFFS.md](navigation/TRADEOFFS.md), [navigation/CHANGE_REQUEST.md](navigation/CHANGE_REQUEST.md)   | 3 h   |
| 10  | Interview kit: stories, 20 questions, system design, mock defense, flashcards | [interview/](interview/)                                                                                           | 5 h   |

The order matters for spoilers. Each incident brief shows the _wrong_ fix to a real problem, and some ladder tickets describe the _right_ fix to that same problem. Do INC-004 before M2, INC-005 before M4, and INC-003 before S2.

If you only have one weekend: do 1, J1, INC-003, and M3 via the agentic exercise.

## Layout

- `ladder/`: 10 tickets (3 junior, 4 mid, 3 senior), each gated by "Explain before touching."
- `review/`: the 60-minute blind review and the comparison template (29 model findings, sealed).
- `incidents/`: 5 on-call briefs. The bugs were authored on local branches `training/incidents/001-board-cpu-storm`, `002-missing-notifications`, `003-deploy-story-points`, `004-dashboards-flatline` and `005-live-board-goes-stale`; those branches were never pushed to GitHub (checked with `git ls-remote` on 2026-10-06), so recreate each one from the diff in its brief (see [incidents/README.md](incidents/README.md)).
- `navigation/`: evidence-cited architecture, first-change onboarding, 4 "Why?" trade-off drills, and one change request.
- `agentic/`: a scripted spec → implementer → adversarial reviewer → verify → explain workflow (on M3), plus a GitJira-specific AI-output checklist.
- `interview/`: 5 STAR scaffolds, 20 questions, a system-design prompt, a mock-defense script, 24 flashcards.
- `_answers/`: **sealed**, one file per exercise. Open one only after you've written your own answer.

## Existing docs in this repo: what to read, and what's a spoiler

- **Spoilers. Don't read these before the review and the incidents:**
  - `docs/process/AUDIT-2026-07.md`: it admits the fabricated drill, which gives away review R25.
  - `docs/RETRO.md`.
  - The GitHub PR review threads, and the `docs/sprints/sprint-NN.md` exercises. They contain the course's planted bugs, which are already fixed on `main` and not reused here.
  - `astraupskill/` (committed in `4dba9ab`, after the base): the owner's worked change on sprint completion races, which overlaps review R19.
- **Read as claims, not facts:**
  - `docs/RUNBOOK.md`: its Redis-down section is contradicted by the code; see ladder M3.
  - `docs/postmortems/2026-07-10-redis-outage.md`: narrated, never run.
  - `// LEARN:` comments.
- **Good background (after you've formed your own view):**
  - `docs/adr/` (especially 0016, 0017, 0018, 0019, 0030 and 0031), `docs/concepts/*.md`, `docs/performance.md`, `docs/TESTING.md`.
  - ADR 0031 describes expand/contract, but no migration in the history follows it. That gap is ladder S2.

## Running things

- `npm ci` once at the root. The API tests need Postgres 16 (`docker compose up -d`). The web and shared tests need nothing. On a slow machine, run the web tests with `npm test -w @gitjira/web -- --pool=threads --maxWorkers=1`.
- Commits must pass the repo's hooks: husky runs lint-staged and commitlint (Conventional Commits). Don't use `--no-verify`.
