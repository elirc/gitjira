# Agentic exercise: ship ladder M3 (Redis as a soft dependency) with an implementer and an adversarial reviewer

**Ticket:** [`ladder/M3-redis-soft-dependency.md`](../ladder/M3-redis-soft-dependency.md). Do the ticket's "Explain before touching" questions first. This exercise is about _how_ you ship it with agents, not a replacement for thinking.
**Time:** about 4 h. **Base:** a worktree off `0c1a640`, the commit every `training/` line number refers to.

```bash
git worktree add ../gitjira-m3 -b training/m3-redis-soft 0c1a640   # run from the root of your clone
```

Background you should not re-derive here: [curriculum 01 (outbox)](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/01-transactional-outbox.md), [02 (idempotency)](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/02-idempotency.md), [05 (verify before trust)](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/05-verify-before-trust.md). (Private companion repo elirc/opusorganize.)

## Step 1: you write the spec and the design note (45 min, no agent)

Write `training/agentic/MY_SPEC.md` with these sections. Keep it to one page.

1. **Problem, in this repo's terms.** Which calls reach Redis on the request path? Name every one with file:line. At minimum look at `apps/api/src/lib/cache.js` (the member map read by `requireMembership` in `apps/api/src/services/project.service.js`), `apps/api/src/jobs/queue.js` (`enqueueNotification`), and its three callers (`issue.service.js:87`, `issue.service.js:241`, `comment.service.js:55`).
2. **Behaviour contract when Redis is down, slow (2 s per command), or flapping.** For each of: `GET /api/projects/:key/issues`, `PATCH /api/projects/:key/issues/:number` with an `assigneeId`, `POST .../comments` with an `@mention`. State status code, latency ceiling, and what happens to the notification.
3. **The committed-but-errored window.** Today a comment is committed in `comment.service.js:35`, then `enqueueNotification` runs at line 55. If that throws, the client sees a 500 for a comment that exists. What does the client do next (retry = duplicate comment?), and what does your design do instead?
4. **Chosen design and one rejected alternative**, each with its failure mode. Options to weigh: bounded timeouts + `enableOfflineQueue: false` + log-and-drop; fall back to Postgres for the member map; a transactional outbox table drained by the worker (curriculum 01); try-enqueue-then-outbox-on-failure.
5. **Proof plan.** Which tests prove it, and against what (real Redis stopped? a closed port?). Read the "traps" section below before you write this.

## Step 2: implementer agent (60 min)

Give the implementer agent exactly this, plus your `MY_SPEC.md`:

> You are implementing a spec in the GitJira monorepo (Node 22, Express 4, Prisma 6, BullMQ 5, ioredis 5). Work only in this worktree. Implement `training/agentic/MY_SPEC.md`. Constraints: do not change the public HTTP contract except where the spec says so; keep the `{ error: { code, message } }` shape from `apps/api/src/lib/errors.js`; every Redis call on the request path must have a bounded time budget; no new infrastructure beyond Postgres and Redis. Add tests that fail on `main` and pass on your branch. When done, list: files changed, each test you added and what it proves, every command you ran with its real output, and anything you could not verify. Do not claim anything you did not run.

## Step 3: adversarial reviewer agent (30 min)

Use a different model than the implementer if you have one. Give it the diff (`git diff main...`), your spec, and this prompt:

> You are an adversarial reviewer. Review ONLY for correctness, architecture, security, performance, tests and failure handling. No style, naming or formatting comments. For each finding give: severity (blocker / major / minor), file:line, the concrete failure scenario (inputs, timing, which process dies where), and the smallest fix. You must specifically check: (1) whether any test actually exercises a real or simulated Redis outage, given `apps/api/test/setup.js` sets `CACHE_BACKEND=memory` and `DISABLE_QUEUE=1`; (2) what happens when Postgres commits and the queue write fails; (3) whether a slow Redis (not down, slow) still blocks requests; (4) whether falling back to Postgres for the member map can serve a stale or missing authorization decision; (5) whether notifications can now be lost silently or duplicated, and how an operator would know. Say "no blockers" only if you checked all five.

## Step 4: revision (45 min)

Triage every finding into: fix now / fix in a follow-up ticket / reject with a written reason. You decide, not the implementer. Send only the "fix now" list back to the implementer. Rejections go in `training/agentic/REVIEW_LOG.md` with one sentence each.

## Step 5: verification (45 min, you, not an agent)

Run through [`VERIFY_CHECKLIST.md`](VERIFY_CHECKLIST.md). The M3-specific part:

```bash
docker compose up -d postgres redis
npm test -w @gitjira/api          # integration tests need Postgres (DATABASE_URL, see apps/api/test/setup.js)
npm run dev -w @gitjira/api       # with REDIS_HOST=localhost and CACHE_BACKEND unset
```

Then simulate the outage two ways and record numbers in a table (status code, p50/p95 latency from 20 requests each):

- **Redis down:** `docker compose stop redis`.
- **Redis unreachable (a closed port):** restart the API with `REDIS_PORT=6390` (nothing listens there).
- **Redis slow (optional):** `redis-cli DEBUG SLEEP 5` while you fire requests.

For each: `GET /api/projects/GJ/issues`, assign an issue, comment with `@ana`. Then bring Redis back and check: did every notification you expected arrive exactly once (`SELECT kind, "dedupeKey" FROM "Notification" ORDER BY "createdAt" DESC LIMIT 20`)?

## Step 6: your written explanation (30 min), graded by the reviewer

Write `training/agentic/MY_EXPLANATION.md` (at most 400 words): what changed, the failure matrix (Redis down / slow / back up; Postgres commits then enqueue fails), what you chose not to do and why, and how an on-call engineer would see this fail in production. Give it to the reviewer agent with `training/_answers/agentic-rubric.md` **only after** you've written it. The reviewer grades; you don't edit the explanation after grading.

## Traps specific to this repo

- **"All green" proves nothing about Redis.** `apps/api/test/setup.js` sets `CACHE_BACKEND=memory` and `DISABLE_QUEUE=1`. No existing test ever opens a Redis connection. An agent that reports "all 200 tests pass" has told you nothing about M3.
- **The rollback harness hides after-commit behaviour.** `apps/api/test/tx.js` runs every test inside one transaction that is rolled back. Nothing "commits" in a test, so the committed-then-enqueue-failed window cannot be observed there. A test for it needs `globalThis.__NO_ROLLBACK__ = true` (see `apps/api/test/metrics.test.js`) or a separate harness.
- **The docs will agree with a wrong answer.** `docs/RUNBOOK.md:46` says the API "degrades gracefully (enqueue fails are logged, requests still succeed)". The code does not do that. If the agent cites the runbook as evidence, that's a finding.
- **`enableOfflineQueue`.** ioredis queues commands while disconnected by default. A "down" Redis can therefore look like a hang rather than an error. Make the agent tell you which one happens, measured.
- **Hooks.** Commits run `lint-staged` and `commitlint` (`.husky/`). Don't let the agent `--no-verify`.
