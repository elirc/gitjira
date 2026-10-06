# Workflow-hardening — outcome & full recounting

**Branch:** `chore/workflow-hardening` · **Date:** 2026-07-10

> **Status note (2026-10-06):** this is a frozen record. The branch merged to `main` as PR #143 (merge
> commit `7ac8b6b`). Every repo path in §1 still exists on `main`, and nothing under `evidence/` or `docs/process/`
> has changed since. "`Desktop/gitjira`, the planning repo" means the author's local planning folder, which is not
> part of this repository. The in-repo copy of the playbook is `docs/process/WORKFLOW-IMPROVEMENTS.md`, also published in
> elirc/gitjira-answer-key. The §4 items were still undone as of this note. Later work on `main` (`rebuild/`,
> `astraupskill/`, `learn/`, `training/`, `reinforcement/`) came after this round, so this file does not cover it.

This round _implements_ the `WORKFLOW-IMPROVEMENTS.md` playbook by **using it** on
real work: every commit went through the git hooks (no `--no-verify`), every
"done" claim was executed with committed evidence, and the previously-missing
senior skills were run for real — with the thrash and one self-caught mistake
left visible. Deferred items are labelled honestly, not hidden.

---

## 1. What was added — by file and location

### Process framework (the durable rules)

| Path                                                                 | What                                                                                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `docs/process/AUDIT-2026-07.md`                                      | The honest self-audit (findings), committed so the trajectory can be diffed.                                                       |
| `docs/process/WORKFLOW-IMPROVEMENTS.md`                              | The forward-looking corrective playbook (copied into the repo so it travels with the project).                                     |
| `docs/process/SKILLS-LEDGER.md`                                      | Which artifact shows which skill, and whether it was **executed** or is config/narrative. Updated with this round's honest status. |
| `.github/pull_request_template.md`                                   | Now requires a **Verification** section (real command output), honest review-type labelling, and "measured not estimated".         |
| `WORKFLOW-IMPROVEMENTS.md` (in `Desktop/gitjira`, the planning repo) | The original cross-project playbook (pre-existing; the repo copy above mirrors it).                                                |

### Executed skills + their committed evidence (`evidence/`)

| Path                                                                    | What it proves                                                                                                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `evidence/security-scan.txt`                                            | `npm audit` = 0 vulns; `npm outdated` full table; analysis incl. the real eslint-10 upgrade blocker.                                   |
| `evidence/axe-a11y.txt`                                                 | Real `axe-core` run on Button + Modal — 0 violations.                                                                                  |
| `packages/ui/test/a11y.test.jsx` + `packages/ui/test/setup.js`          | The axe test itself (Sprint 14 claimed this, never ran it).                                                                            |
| `evidence/docker-inspect.txt`                                           | Image builds (exit 0), `User=app`, runtime `uid=10001` (non-root proven), healthcheck configured, **1.8GB → 1.2GB**, server **boots**. |
| `evidence/docker-debugging-session.md`                                  | The full real debugging narrative — symptom → hypothesis → root cause → fix, thrash intact, incl. the false-278MB self-correction.     |
| `evidence/mutation-testing.txt`                                         | Stryker run: 82.93% → **83.74%** after killing a real surviving mutant; 16 survivors honestly still flagged.                           |
| `packages/shared/stryker.config.json` + `test/fractional-index.test.js` | Mutation-testing config + the targeted test that kills the marquee mutant.                                                             |

### Code fixes discovered by actually running things

| Path                                            | Fix                                                                                                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/Dockerfile`, `apps/worker/Dockerfile` | `npx prisma` → `npm run db:generate -w @gitjira/api` (the binary is nested, not hoisted; `npx` from `/app` failed with exit 127). Also `npm prune --omit=dev`, and a clean non-root `useradd`. |
| `fly.toml`                                      | `release_command` had the **same** `npx prisma migrate deploy` bug — the production deploy would have failed. Fixed to `npm run db:deploy -w @gitjira/api`.                                    |
| `packages/shared/test/fractional-index.test.js` | Targeted cases that kill a Stryker-found surviving mutant.                                                                                                                                     |

---

## 2. Full recounting — what happened, in order (with real numbers)

1. **Committed the process framework through the hooks.** The pre-commit hook
   (lint-staged: prettier + eslint) ran and reformatted the docs — no
   `--no-verify`. This is item #1 proven, not asserted.

2. **Dependency/security tools, executed.** `npm audit` → **0 vulnerabilities**.
   `npm outdated` → full table. Real finding recorded: eslint 9→10 is **blocked**
   by `eslint-plugin-react`'s peer range (the exact conflict that bit the Sprint
   15 lockfile) — "upgrade when the ecosystem is ready". Major migrations
   (express 5, react 19, prisma 7) **deferred and labelled**, not faked.

3. **Real accessibility run (de-faked Sprint 14).** Added `vitest-axe` + `axe-core`
   and ran axe against Button and Modal → **0 violations**. Honest scope: jsdom
   can't compute layout, so color-contrast is skipped here.

4. **Built the container images — and they didn't build.** `npx prisma generate`
   failed with `prisma: not found` (exit 127). First red herring: a piped exit
   code lied ("0"). Traced the root cause (prisma binary nested in
   `apps/api/node_modules/.bin`, not hoisted), fixed it in **three** places
   (api + worker Dockerfiles + `fly.toml` release command — the deploy would have
   failed in prod). Rebuild succeeded.

5. **Second defect: 1.8GB image.** `docker inspect` proved non-root (`uid=10001`)
   and a working healthcheck, but the image was **1.8GB** (runtime copied the whole
   monorepo `node_modules`). Added `npm prune --omit=dev` → **1.2GB** (~600MB
   saved) and confirmed the server **actually boots**
   (`"gitjira api + realtime listening"`).

6. **Caught my own false number.** I first read the pruned size as "278MB" and
   nearly committed "6.5× smaller". Re-checked — that was a mid-build misread; the
   real figure is 1.2GB. Corrected it _before_ it entered history. The
   measured-not-estimated rule catching its intended target.

7. **The commit-msg hook rejected a commit.** commitlint flagged `subject-case`
   and `body-max-line-length`. I **complied** (rewrote the message) rather than
   bypass — exactly the behaviour the old history lacked.

8. **Mutation testing (never done before).** Stryker on the shared package:
   line coverage ~100% but mutation score **80%** on `fractional-index.js`. It
   flagged `digitB - digitA > 1 → +` as undetected. I traced it to the MID-seeded
   property test never hitting adjacent low first-digits, added
   `keyBetween('1','2')`-style cases, re-ran → mutant **killed**, score
   80.00%→**81.11%** (overall 82.93→83.74%). **16 survivors remain and are
   flagged** — I killed one, not the gap.

---

## 3. Where the new content lives

- **This repo (`gitjira-app`), branch `chore/workflow-hardening`:**
  `docs/process/` (audit, playbook, ledger), `evidence/` (all tool output),
  `workflowoutcome.md` (this file), plus the code fixes above and the hardened PR
  template.
- **Planning repo (`Desktop/gitjira`):** `WORKFLOW-IMPROVEMENTS.md` — the original
  cross-project playbook (the version you have open in the editor).
- **Docker images (local only):** `gitjira-api:workflow-test` (1.8GB, pre-prune)
  and `gitjira-api:pruned` (1.2GB) — evidence of the real builds; not pushed to a
  registry.

---

## 4. Honestly deferred (the backlog, not claimed done)

- **Load / stress test** (autocannon) — not run this round.
- **Live incident** (kill Redis and recover on the running stack) — Sprint 15's
  narrated version stays labelled 🎭; not re-done live here.
- **Profiling** (flamegraph / memory) — not done.
- **A breaking dependency upgrade** (express 5 / react 19 / prisma 7) — analysed
  and deferred; doing one badly is worse than not doing it.
- **Further image slimming** (distroless base / Prisma engine trim) below 1.2GB.
- **The 16 remaining fractional-index mutants** — flagged, not killed.

These are the truthful edges of this round. Leaving them visible — rather than
narrating them as complete — is the single biggest change from the audited
history.
