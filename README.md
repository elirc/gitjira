# GitJira

A Jira-style issue tracker, built in public as a teaching codebase — **15 sprints,
each landing as one reviewed pull request** full of learning artifacts. **v1.0.0
complete.** The product is real; the point is the _journey_ — every commit
message, review conversation, ADR, and planted-bug-caught-in-review is there to
take a junior engineer to mid/senior.

Start with **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the whole system
on one page, then read the PRs oldest-first.

## Quickstart (goal: under 5 minutes)

```bash
# prerequisites: Node 22 (see .nvmrc), Docker Desktop (not needed until sprint 02)
git clone https://github.com/elirc/gitjira.git
cd gitjira
npm install          # one install for all workspaces
npm run dev          # boots API (:3000) and web (:5173) together
docker compose up -d # postgres + redis
npm run db:migrate -w @gitjira/api   # apply migrations
npm run db:seed -w @gitjira/api      # demo data (ana@gitjira.dev / demo-password-1)
```

Open http://localhost:5173 — the footer shows a live health check from the API.

## Where things live

| Path              | What                                                            |
| ----------------- | --------------------------------------------------------------- |
| `apps/web`        | React + Vite frontend                                           |
| `apps/api`        | Express API (`src/README.md` explains the layering)             |
| `packages/shared` | Code both sides import                                          |
| `docs/adr/`       | Architecture Decision Records — why things are the way they are |
| `docs/sprints/`   | Per-sprint learning briefs with exercises                       |
| `docs/state/`     | Snapshot of the system after each sprint                        |

## How to study this repo

1. Read the merged PRs oldest-first, **commit by commit** — each commit message explains
   its reasoning; `// LEARN:` comments explain patterns in place.
2. Read the review conversations. The disagreements teach more than the approvals.
3. After each sprint, read its pinned **Snapshot issue** and answer the checkpoint questions.
4. Do the exercises in `docs/sprints/sprint-NN.md` on your own branches.

## Study path — 15 sprints, 15 skills

Each sprint is one merged PR. Read them in order; the skill in bold is the one to
walk away with.

| Sprint                  | Release | Skill to internalize                                                                     |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------- |
| 01 Foundation           | —       | **Walking skeleton** — end-to-end thin slice before features                             |
| 02 Data & Auth          | —       | **Refresh-token rotation + replay detection**; validation at the boundary                |
| 03 Projects & Issues    | v0.1    | **Check-then-act is a lie under concurrency** (atomic key allocation)                    |
| 04 Kanban board         | —       | **Fractional indexing** — one-row moves; optimistic UI                                   |
| 05 Detail & comments    | v0.1    | Serializers; the MVP release                                                             |
| 06 Search & JQL         | v0.2    | **Hand-written tokenizer/parser**; parameterized raw SQL                                 |
| 07 Backlog & sprints    | v0.3    | **State machine as data**; partial unique index for one-active-sprint                    |
| 08 Real-time            | v0.4    | **Authz follows the transport** (socket rooms)                                           |
| 09 Notifications & jobs | v0.5    | **Idempotent fan-out**; work off the request path                                        |
| 10 TypeScript           | v0.6    | **Strangler-fig migration**; checkJs + a ratchet                                         |
| 11 Testing & E2E        | v0.7    | **Believable green** — rollback isolation, contract tests, the flake taxonomy            |
| 12 Performance          | v0.8    | **Measure before you optimize** — indexes, cache, code splitting, budgets                |
| 13 Security & RBAC      | v0.9    | **The server is the security boundary** — matrix, IDOR sweep, the pentest                |
| 14 Design system & a11y | v0.10   | **Tokens as the design/code API**; accessible by construction                            |
| 15 Production & v1.0    | v1.0    | **"Works on my box" ≠ "works during a deploy"** — release phases, observability, runbook |

Recurring themes tallied across the project live in **[RETRO.md](docs/RETRO.md)**.

## Production

- **Run it prod-like locally:** `docker compose -f docker-compose.prod.yml up --build`
- **Operate it:** **[docs/RUNBOOK.md](docs/RUNBOOK.md)** (deploy, rollback, incidents)
- **Observe it:** `GET /metrics` (Prometheus RED metrics), `GET /api/health`
- **Deploy:** staging auto on `main`; prod on a `vX.Y.Z` tag behind an approval gate

## Scripts

| Command                           | What                           |
| --------------------------------- | ------------------------------ |
| `npm run dev`                     | API + web, concurrently        |
| `npm run lint` / `npm run format` | ESLint / Prettier              |
| `npm test`                        | Test suite (arrives sprint 02) |
| `npm run build`                   | Production builds              |
