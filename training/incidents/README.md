# Incidents (on-call drills)

Five incidents, each a realistic bug committed on its own branch on top of committed `main` (`0c1a640`). Each brief is what on-call would see: the alert, metrics, logs and the suspect PR. None of them tells you the cause.

| #   | Brief                                                                | Branch                                         | Area                              |
| --- | -------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------- |
| 001 | [Board page burns CPU, Postgres follows](001-board-cpu-storm.md)     | `training/incidents/001-board-cpu-storm`       | React rendering, realtime         |
| 002 | [Some notifications never arrive](002-missing-notifications.md)      | `training/incidents/002-missing-notifications` | BullMQ semantics                  |
| 003 | [Deploy 5xx, then story points are gone](003-deploy-story-points.md) | `training/incidents/003-deploy-story-points`   | Prisma migrations, rolling deploy |
| 004 | [Dashboards say "No data"](004-dashboards-flatline.md)               | `training/incidents/004-dashboards-flatline`   | Observability, memory             |
| 005 | [Live board stops updating](005-live-board-goes-stale.md)            | `training/incidents/005-live-board-goes-stale` | Socket.IO lifecycle               |

## How to work an incident

Never check out an incident branch in your main working tree (it has uncommitted work). Use a worktree:

```bash
git worktree add ../gj-inc-001 training/incidents/001-board-cpu-storm
cd ../gj-inc-001
git log --oneline -2          # the top commit is the suspect PR
git show HEAD                 # read the diff as a reviewer would
# ... investigate, reproduce, fix ...
cd - && git worktree remove ../gj-inc-001
```

For each incident, write down before you open the answer:

1. **Triage.** What's the blast radius? Is it still getting worse? What do you do in the first 10 minutes (roll back, feature-flag, scale, nothing)?
2. **Hypotheses.** List two or three, and name the one signal in the brief that rules each in or out.
3. **Root cause.** Give the mechanism, step by step, with file:line on the branch.
4. **Fix plus regression test.** The test must fail on the branch and pass with your fix.
5. **Why review missed it.** Each PR looked reasonable. Say what a reviewer would have had to ask.
6. **Postmortem.** One page, using the template in `docs/RUNBOOK.md` ("Incident template").

Sealed answers: `training/_answers/incident-00N.md`.

Environment notes:

- The API tests need Postgres (`docker compose up -d`, then `npm test -w @gitjira/api`). The web tests (`npm test -w @gitjira/web`) need nothing, but on a slow machine run them with `-- --pool=threads --maxWorkers=1`.
- Incidents 002 and 005 need Redis or a second browser tab to reproduce live. Each answer also gives a way to reproduce without the full stack.
