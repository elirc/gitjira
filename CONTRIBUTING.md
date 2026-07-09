# Contributing

This project doubles as a curriculum, so process is strict on purpose — the workflow is
part of what the repo teaches.

## Git workflow

- **Branches:** `sprint/NN-short-name` for sprint work, `fix/short-name` for follow-ups.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org)
  (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `perf:`, `ci:`), enforced by
  commitlint. Write a body: 1–3 sentences on the _why_. Commits should tell a story —
  each must build and pass lint on its own.
- **Merges:** merge commits, never squash. History is curriculum here: the fix-after-review
  commits are the most instructive ones, and squashing would erase them.
- **Never** force-push or rebase a shared branch. Pushed history is immutable.

## Pull requests

- One PR per sprint, from the sprint branch to `main`, using the PR template.
- Open as **draft** early so CI runs on every push; mark ready when the story is complete.
- The author self-reviews first: inline comments walking a reviewer through the diff.
- Review comments must explain _why_, and disagreement is expected — resolve threads with
  reasoning or code, not silence.

## Quality gates

- Pre-commit: lint-staged (ESLint + Prettier on staged files). Pre-commit must stay fast.
- commit-msg: commitlint.
- CI: install → lint → format check → test → build. Red CI blocks merge, no exceptions.

## Sprint rituals

- Sprint scope is decomposed from a stakeholder request issue into child issues before
  any code is written.
- Issues stay alive during the sprint: checklists ticked, approach notes commented.
- After merge: the sprint is tagged, a snapshot lands in `docs/state/`, a Snapshot issue
  is pinned, and a retro entry is appended to `docs/RETRO.md`.
