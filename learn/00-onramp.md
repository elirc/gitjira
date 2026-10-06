# GitJira on-ramp: 9 warm-ups before `training/`

All line numbers refer to commit `0c1a640`. Current `main` differs from it in 12 application/test/script files (the
sprint/backlog work committed in `4dba9ab`; list them with `git diff --name-only 0c1a640 4dba9ab -- apps packages scripts`),
so read with
`git show 0c1a640:<path>` or use a worktree (see `learn/README.md`). For every exercise, **write your prediction before you
run anything.** Sealed answers are in `learn/_answers/00-onramp.md`. Open them only after you've written yours.

Time: sessions 1 and 2 of the study route (about 2.5 h in total).

---

## 1. Predict `keyBetween` (15 min)

File: `packages/shared/src/fractional-index.js`. The alphabet is `0-9`, then `A-Z`, then `a-z` (62 digits).

Predict the return value, or "throws", for each call:

| Call                     | Your prediction |
| ------------------------ | --------------- |
| `keyBetween(null, null)` |                 |
| `keyBetween('V', null)`  |                 |
| `keyBetween(null, 'V')`  |                 |
| `keyBetween('1', '2')`   |                 |
| `keyBetween('V', 'V')`   |                 |

Then answer:

- (a) Why must `DIGITS` be listed in exactly this order for the board to sort correctly with plain `<` on strings?
- (b) `schema.prisma` gives `Issue.position` a default of `"U"`, but `keyBetween(null, null)` doesn't return `"U"`. Does
  that mismatch break anything? Where does a new issue's position actually come from (`issue.service.js:38-43`)?

Check: `node --input-type=module -e "import {keyBetween} from './packages/shared/src/fractional-index.js'; console.log(keyBetween(null,null))"`
from the worktree root.

## 2. Trace one request end to end (25 min)

The user clicks "Create" in the create-issue modal for project `GJ` with title `"  Fix login  "` and nothing else.

Write the path as a numbered list of `file:line → what happens`. Start at `apps/web/src/lib/hooks.js` (`useCreateIssue`)
and end with the HTTP response the browser receives. You must pass through at least:
`apps/web/src/lib/api.js`, `apps/api/src/app.js`, `routes/index.js`, `routes/project.routes.js`, `routes/issue.routes.js`,
`middleware/validate.js`, `controllers/issue.controller.js`, `services/issue.service.js`, `services/activity.service.js`,
`realtime/emit.js`.

Then answer:

- (a) What's the status code and the top-level JSON key of the response?
- (b) What is `req.body` inside `createIssue` (exact object)?
- (c) Inside the `$transaction`, how many rows are written, and to which tables?
- (d) After success, which TanStack Query key does the web invalidate?

## 3. Create vs. update validation (10 min)

File: `packages/shared/src/issue-schemas.js`. Predict what `.safeParse(...)` returns (`success` plus the `data`, or the
failing field):

| Schema and input                                              | Prediction |
| ------------------------------------------------------------- | ---------- |
| `createIssueSchema`, `{ title: 'x' }`                         |            |
| `updateIssueSchema`, `{}`                                     |            |
| `createIssueSchema`, `{ title: '   ' }`                       |            |
| `updateIssueSchema`, `{ storyPoints: 101 }`                   |            |
| `createIssueSchema`, `{ title: 'x', labels: [' ui ', 'ui'] }` |            |

Then explain in two sentences the bug that the `LEARN:` comment above `issueFields` prevents. Name the HTTP method where it
would bite.

## 4. Who gets 403, and who gets 404? (15 min)

Files: `packages/shared/src/policy.js`, `apps/api/src/services/project.service.js` (`authorize`, `requireMembership`),
`apps/api/src/middleware/error-handler.js`, `apps/api/src/lib/errors.js`.

For `PATCH /api/projects/GJ/issues/7`, predict the status code and `error.code` for:

1. a `VIEWER` of project GJ;
2. a logged-in user who isn't a member of GJ;
3. a `MEMBER` of GJ, where issue 7 doesn't exist;
4. a `MEMBER`, where the service hits a bug and throws a plain `TypeError`, with `NODE_ENV=production`. What's the
   `message`?

Then answer:

- (a) Why does case 2 return 404 and not 403? What would an attacker learn from a 403?
- (b) `can(role, 'issue:archive')` throws instead of returning `false`. Why is that the safer choice?

## 5. Read the `Issue` model like a reviewer (15 min)

File: `apps/api/prisma/schema.prisma`, `model Issue`.

- (a) What does `@@unique([projectId, number])` guarantee, and which function relies on it to find an issue
  (`issue.service.js`)?
- (b) The display key `GJ-101` isn't a column. Where is it built, and why is not storing it a good decision?
- (c) The composite index `@@index([projectId, createdAt(sort: Desc), id(sort: Desc)])` was added for one query. Which one
  (file:line)? Why does its column order match that query's `where` and `orderBy`?
- (d) Name one query the app might plausibly run that this index does **not** help, and say why.
- (e) `searchVector` is `Unsupported("tsvector")`. Who writes that column? (Hint: find the migration that creates it.)

## 6. Cursor pagination by hand (10 min)

Files: `apps/api/src/controllers/issue.controller.js` (`parseLimit`), `services/issue.service.js` (`listIssues`).

- (a) Predict `parseLimit` for `undefined`, `'abc'`, `'0'`, `'7.9'`, `'500'`.
- (b) A project has 5 issues. The client calls with `limit=2` and no cursor. How many rows does Prisma fetch? What are
  `issues.length` and `nextCursor`?
- (c) The client calls again with that `nextCursor`. Why does the query use `skip: 1`?
- (d) Why is cursor pagination stable when a teammate creates an issue between the two calls, and offset pagination isn't?

## 7. Write one characterization test (30 min)

File: `packages/shared/src/mentions.js`. There's no test for it today (`packages/shared/test/` has none). A
characterization test records what the code **does**, not what it should do. See
[04 characterization tests](https://github.com/elirc/opusorganize/blob/main/apprenticeship/curriculum/04-characterization-tests.md).

1. Predict `extractMentions(text)` for each input. Write the predictions down _before_ running anything:
   - `'Hey @Ana and @ana, please look'`
   - `'cc @ana.b, @bob_2!'`
   - `'thanks @ana.'`
   - `'mail bob@example.com'`
   - `null`
2. Create `packages/shared/test/mentions.characterization.test.js` in your worktree with one `it` per input (vitest, like
   the neighbouring `jql.test.js`). Run `npm test -w @gitjira/shared`.
3. For every case where reality differed from your prediction, write one line: is this a bug a user would notice? Who
   would be notified wrongly, or not at all? (`comment.service.js` is the caller.)

Don't fix `mentions.js`. The test is the deliverable.

## 8. When does this effect run? (15 min)

File: `apps/web/src/lib/useLiveProject.js`.

- (a) List the effect's dependencies. For each one, can it change between two renders of the same page? How do you know?
- (b) The user navigates from project A's board to project B's board. Write the exact sequence of socket emits and
  `on`/`off` calls.
- (c) The component unmounts. What's emitted?
- (d) If you removed the `return () => { ... }` cleanup, what would the user see after visiting the same board 3 times in
  one session? (The `LEARN:` comment is a hint. Say _what_ repeats, and _how many times_.)

## 9. What the health check really checks (10 min)

Files: `apps/api/src/routes/health.routes.js`, `controllers/health.controller.js`, `services/health.service.js`, `fly.toml`.

- (a) Postgres is down. What does `GET /api/health` return?
- (b) Fly uses this endpoint to decide whether an instance is healthy. In one sentence, what's the consequence of (a) during an
  outage?
- (c) Write the one question you'd ask in code review about this endpoint. (Ladder J1 is the full ticket, so don't solve
  it here.)

---

**When you've finished all 9:** check your answers, then count your misses. Three or more misses in exercises 2, 4 or 6
means you should re-read P1 before the blind review (session 3).
