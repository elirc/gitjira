# GitJira

A Jira-style issue tracker, built in public as a teaching codebase — 15 sprints, each
landing as one reviewed pull request full of learning artifacts.

## Quickstart (goal: under 5 minutes)

```bash
# prerequisites: Node 22 (see .nvmrc), Docker Desktop (not needed until sprint 02)
git clone https://github.com/elirc/gitjira.git
cd gitjira
npm install          # one install for all workspaces
npm run dev          # boots API (:3000) and web (:5173) together
```

Open http://localhost:5173 — the footer shows a live health check from the API.

## Where things live

| Path | What |
|---|---|
| `apps/web` | React + Vite frontend |
| `apps/api` | Express API (`src/README.md` explains the layering) |
| `packages/shared` | Code both sides import |
| `docs/adr/` | Architecture Decision Records — why things are the way they are |
| `docs/sprints/` | Per-sprint learning briefs with exercises |
| `docs/state/` | Snapshot of the system after each sprint |

## How to study this repo

1. Read the merged PRs oldest-first, **commit by commit** — each commit message explains
   its reasoning; `// LEARN:` comments explain patterns in place.
2. Read the review conversations. The disagreements teach more than the approvals.
3. After each sprint, read its pinned **Snapshot issue** and answer the checkpoint questions.
4. Do the exercises in `docs/sprints/sprint-NN.md` on your own branches.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | API + web, concurrently |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm test` | Test suite (arrives sprint 02) |
| `npm run build` | Production builds |
