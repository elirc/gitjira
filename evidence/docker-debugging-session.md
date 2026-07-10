# Debugging session — the Dockerfiles that never actually built

A real investigation, thrash left in on purpose (WORKFLOW-IMPROVEMENTS §4/§5).
The Sprint 15 Dockerfiles were documented as done but had never been built. The
moment they were, two genuine defects fell out.

## Symptom

`docker build -f apps/api/Dockerfile .` failed:

```
#17 [build 11/11] RUN npx prisma generate --schema apps/api/prisma/schema.prisma
#17 10.42 sh: 1: prisma: not found
#17 ERROR: ... exit code: 127
```

First red herring: the background task that ran the build reported "exit code 0".
That was a lie of my own making — `docker build ... | tail` returns _tail's_ exit
status, not docker's. **Lesson: never trust an exit code that came through a
pipe.** Re-ran with `> log 2>&1; echo $?` to get the true code (1).

## Hypothesis → root cause (not guessed)

Exit 127 = command not found. Hypothesis: `npx prisma` can't resolve the prisma
binary from the container's `/app` WORKDIR. Checked where npm actually puts it in
this workspace:

```
$ ls node_modules/.bin | grep prisma        → (nothing) NOT hoisted to root
$ ls apps/api/node_modules/.bin | grep prisma → prisma   nested in the workspace
```

Confirmed: prisma is **not hoisted** to the root `node_modules/.bin`; it lives in
`apps/api/node_modules/.bin`. So `npx prisma` from `/app` genuinely can't find it.

## Fix

Run prisma through the workspace's own script, so npm sets cwd + PATH to the api
workspace where prisma resolves:

```diff
- RUN npx prisma generate --schema apps/api/prisma/schema.prisma
+ RUN npm run db:generate -w @gitjira/api
```

Same latent bug existed in **two more places** the grep found — the worker
Dockerfile and `fly.toml`'s `release_command` (`npx prisma migrate deploy …`).
The production deploy would have failed the same way. Fixed all three.

## Second defect (only visible once it built): a 1.8 GB image

Rebuild succeeded, then `docker inspect` gave the real numbers:

```
User=app                              # non-root ✓
uid=10001(app) gid=10001(app)         # actually runs non-root ✓
Healthcheck=configured                # ✓
Size=1.8GB                            # ✗ ~9x too big for a Node API
```

Cause: the runtime stage copies the **entire monorepo** `node_modules` — every
workspace's dev tooling (vitest, playwright, stryker, testing-library) — instead
of production deps only. The "small multi-stage image" claim was false.

Fix: prune dev deps in the build stage before the runtime copy —
`RUN npm prune --omit=dev`. (After-size recorded in
`evidence/docker-build-pruned.log`.)

## Takeaway

"Documented as done" is worth nothing until it runs. One `docker build` turned a
green-looking Sprint 15 into: a build that never worked, a deploy command that
would have failed in production, and an image an order of magnitude too large.
This is exactly the class of bug that a claim-without-execution hides — and
exactly why the new PR template demands a Verification section with real output.
