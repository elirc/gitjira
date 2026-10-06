# Before your first production change to GitJira

This is one page. It covers what will bite you here in particular, not in general. Read it against committed `main` (`git show HEAD:<path>`).

**1. Every domain change goes through `recordActivity`, and it has two hidden behaviors** (`apps/api/src/services/activity.service.js:13-30`).

- It writes the `ActivityEvent` row with whatever client you pass. Pass `tx` so the history rolls back with the change.
- It **broadcasts** to the project room only when you pass `projectId`. Today only `createIssue` and `addComment` pass it.
- It broadcasts **before your transaction commits**, because it's called inside the transaction.

Adding a new mutation means deciding all three explicitly: which `tx`, whether to emit, and when. Write the decision in your PR.

**2. Authorization is `authorize(projectId, userId, action)`, backed by a cache** (`services/project.service.js:65-85`).

- It checks object-level membership (a non-member gets 404) and the role matrix (`packages/shared/src/policy.js`).
- The member map is cached for 60 s (`lib/cache.js`). Any code that writes `ProjectMember` must call `invalidate(cacheKeys.projectMembers(id))`, like `addMember`/`removeMember` do (`project.service.js:116, 129`).
- A new policy action needs a row in `POLICY`. `can()` throws on unknown actions.

**3. Side effects after commit are not atomic with the write.**

- `autoWatch` and `enqueueNotification` run after `$transaction` resolves (`issue.service.js:85-93, 239-247`; `comment.service.js:54-61`).
- If Redis is slow or down, the request fails or hangs **after** the data committed. The client may retry and create a duplicate.
- Before adding another "do X after commit" step, read `apprenticeship/curriculum/01-transactional-outbox.md` and `02-idempotency.md`.

**4. The test harness can't see several classes of bug.** Tests run inside one rolled-back transaction (`apps/api/test/tx.js`), with `DISABLE_QUEUE=1`, `CACHE_BACKEND=memory` and `RATE_LIMIT_DISABLED=1` (`test/setup.js`). So a green suite says nothing about:

- commit ordering
- Redis or BullMQ behavior
- two instances
- concurrent transactions

When your change touches those, write a test with `globalThis.__NO_ROLLBACK__ = true` (the TRUNCATE mode). Or say in the PR that it's unverified (`apprenticeship/curriculum/05-verify-before-trust.md`).

**5. Migrations run before your code, while the old code is still serving.**

- `fly.toml` `release_command` runs `prisma migrate deploy` once. Then the machines are replaced one by one. With `min_machines_running = 2`, old and new code overlap.
- Every schema change must be readable and writable by the **previous** release (ADR 0031). No `DROP` or `RENAME` in the same release that stops using a column.
- Before merging, run `prisma migrate diff --from-migrations ... --to-schema-datamodel ...` and read the SQL Prisma generated.
- Only the API deploys (`.github/workflows/deploy.yml`). A change the worker needs won't reach production by that path.

**6. `main` has moved past the base commit.**

- When this was written, the owner had uncommitted work in `apps/api/src/services/sprint.service.js`, `issue.service.js`, `apps/web/src/pages/BacklogPage.jsx`, `apps/web/src/lib/hooks.js`, and related tests (serializable sprint transactions, `astraupskill/`). It landed on `main` in `4dba9ab` (2026-09-30).
- Do your changes in a `git worktree` off `0c1a640` so the line numbers in `training/` match.

**7. Don't trust these docs as evidence.**

- `docs/postmortems/2026-07-10-redis-outage.md` (the "~90 s rollback drill", a queue-depth gauge that doesn't exist).
- The RUNBOOK's "api degrades gracefully (enqueue fails are logged, requests still succeed)".
- `docs/process/AUDIT-2026-07.md` item 4 admits these were narrated, not executed. Grep before you believe a runbook step.

**First-change checklist** (write the answers in your PR description):

- [ ] Which `recordActivity` calls did I add or change? `tx`? `projectId`? Emit before or after commit?
- [ ] Which `authorize` action gates it? Did I touch `ProjectMember` without invalidating the cache?
- [ ] What runs after commit, and what does the user see if Redis times out right then?
- [ ] Does my migration work with the previous release still running? Did I read the generated SQL?
- [ ] Which of my claims did the test suite actually prove, given the rollback harness?
