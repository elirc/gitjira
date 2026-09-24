# Blind code review: GitJira at v1.0.0 (60 minutes)

**Target:** committed `main` @ `0c1a640`. Review it in a clean worktree so the owner's uncommitted work doesn't mix in:

```bash
git worktree add ../gj-review 0c1a640 && cd ../gj-review
```

**Your role:** a staff engineer asked, "We want to put paying teams on this next month. What will hurt us?" The repo has 31 ADRs, a runbook and a postmortem, and it calls itself production-ready. Your job is to find where the **code** disagrees with that.

## Rules

- **60 minutes, timeboxed.** Write findings as you go into `training/review/MY_REVIEW.md`.
- **Don't read** `training/_answers/review.md`, `docs/process/AUDIT-2026-07.md`, `docs/RETRO.md`, or the GitHub PR review threads until you've finished. They contain some of the answers.
- Treat docs (`docs/RUNBOOK.md`, `docs/postmortems/`, `// LEARN:` comments) as **claims to verify**, not as facts.
- Each finding needs: **severity** (Critical, High, Medium or Low), **evidence** (`path:line`), **failure scenario** (concrete: who does what, and what breaks), and **category** (correctness, security, data integrity, concurrency, failure handling, performance, operability, tests, maintainability).

## Where to look (a map, not the answers)

1. `fly.toml`, `.github/workflows/deploy.yml`, `docker-compose.prod.yml`, the three Dockerfiles. What exactly gets deployed, how many copies, and what state lives on the machine?
2. `apps/api/src/realtime/*`, `services/activity.service.js`, `apps/web/src/lib/useLiveProject.js`, `lib/socket.js`. Which mutations actually reach other viewers, and when relative to the commit? What changes with two API machines?
3. `apps/api/src/lib/cache.js`, `jobs/queue.js`, `apps/worker/src/index.js`, and the RUNBOOK "Queue backlog" section. What happens to an ordinary request when Redis is down?
4. `apps/api/src/lib/metrics.js`, `services/health.service.js`, `server.js`. Could you operate this at 2 a.m.? What happens on SIGINT or SIGTERM?
5. `apps/web/src/lib/hooks.js`, `pages/ProjectBoardPage.jsx`, `pages/BacklogPage.jsx`, `components/board/*`. Does the board show every issue? What re-renders when one event arrives?
6. `apps/api/prisma/migrations/*`, then ADR 0031. Does any migration in history follow the policy the ADR describes?
7. `apps/api/test/setup.js`, `test/tx.js`. What _can't_ this harness observe?

## Output

- A ranked list, most severe first. Aim for 15 or more findings. Ten well-evidenced findings beat 25 guesses.
- Tag every finding that looks like an **old-AI-generated smell**: docs claiming behavior the code doesn't have, dead code presented as a feature, tests that can't fail for the risk they name, fabricated operational evidence.
- End with a top 3: the three fixes you'd demand before the first paying customer, and why these three.

Then fill in [COMPARE.md](COMPARE.md) against `training/_answers/review.md`.
