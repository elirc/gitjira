# Sealed answers: GitJira on-ramp

Grade yourself on your **prediction**, not on whether you later got it right by running the code. All references are to
`0c1a640`.

## 1. `keyBetween`

| Call                     | Result | Why                                                                                                                                                                                                             |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keyBetween(null, null)` | `'V'`  | `MID = DIGITS[floor(62/2)] = DIGITS[31]`. Index 10 is `A`, so index 31 is `V`.                                                                                                                                  |
| `keyBetween('V', null)`  | `'k'`  | `b` is open, so `digitB = 62`. `digitA = 31`. The gap is 31 > 1, so `DIGITS[floor(93/2)] = DIGITS[46]`, and 46 − 36 = 10 → `k`.                                                                                 |
| `keyBetween(null, 'V')`  | `'F'`  | `a = ''`. The prefix loop breaks at once because `val('V') > 0`. `digitA = 0`, `digitB = 31`, so `DIGITS[15] = 'F'`.                                                                                            |
| `keyBetween('1', '2')`   | `'1V'` | The digits are adjacent (1 and 2), so it keeps `'1'` and recurses with an open top: `midpoint('', null)` → `'V'`. `packages/shared/test/fractional-index.test.js` pins this case ("adjacent low first-digits"). |
| `keyBetween('V', 'V')`   | throws | Guard at line 31: `a >= b`.                                                                                                                                                                                     |

- (a) Keys are compared with JavaScript's `<` on strings, which compares UTF-16 code units. In ASCII, `0-9` < `A-Z` < `a-z`.
  The algorithm assumes "digit index order == string order". If `DIGITS` were in any other order, a key built as "between"
  could sort outside its neighbours.
- (b) It doesn't break anything today. `createIssue` never relies on the default: it computes
  `keyBetween(last?.position ?? null, null)` (`issue.service.js:38-43`) and always writes `position` explicitly. The `"U"`
  default only matters for rows inserted by raw SQL or seed scripts. `"U"` is still a valid key, just not the midpoint.
  Noticing a default that code never uses is a good review habit.

## 2. The create-issue trace

1. `CreateIssueModal.jsx`: react-hook-form with `zodResolver(createIssueSchema)` validates **on the client first**. The
   parsed values include the form defaults: `type: 'TASK'`, `priority: 'MEDIUM'`, `columnId: columns[0].id`, and
   `description: ''`. The title is already trimmed by the resolver.
2. `hooks.js:48-55` `useCreateIssue` → `api('/projects/GJ/issues', { method: 'POST', body })`.
3. `api.js` `rawFetch` → `fetch(apiPath(route))` adds the `/api` prefix and the `Authorization: Bearer` header. On a 401 it
   refreshes once and retries.
4. `app.js`: `helmet`, `express.json`, `cookieParser`, `requestLogger`, `metricsMiddleware`, then `app.use(API_PREFIX, routes)`
   (line 38).
5. `routes/index.js:17` `/projects` → `project.routes.js:12` `requireAuth` sets `req.user`, then line 26 mounts
   `/:key/issues` → `issue.routes.js` (`mergeParams: true`, so `req.params.key === 'GJ'`).
6. `issue.routes.js:25` → `validate(createIssueSchema)` replaces `req.body` with the parsed value (`validate.js:23`).
7. `asyncHandler(issues.create)` → `issue.controller.js:11-14` → `createIssue('GJ', req.user.id, req.body)`.
8. `issue.service.js:14-96`: find the project with its columns, `authorize(..., 'issue:create')`, find the last position
   in the column, `keyBetween(last, null)`, then `$transaction`:
   `project.update { issueCounter: { increment: 1 } }` → `issue.create` → `recordActivity(tx, ...)`.
9. `activity.service.js:13-30` inserts the `ActivityEvent` row, then `emitToProject(projectId, 'activity', {...})`
   (`realtime/emit.js:8-12`). Note that this runs _inside_ the transaction callback.
10. There's no assignee, so the notification branch (lines 85-93) is skipped. It returns `{ ...issue, key: 'GJ-<n>' }`.
11. The controller answers `res.status(201).json({ issue })`.

Answers:

- (a) `201`, with the top-level key `issue`.
- (b) `{ title: 'Fix login', type: 'TASK', priority: 'MEDIUM', columnId: '<first column id>', description: '' }`. If you
  predicted only `{ title, type, priority }`, you missed that the _form_ sends its default values. Half credit.
- (c) 3 writes: `UPDATE "Project"` (the counter), `INSERT "Issue"`, `INSERT "ActivityEvent"`. The two `findUnique` and
  `findFirst` reads happen before the transaction.
- (d) `['projects', 'GJ', 'issues']`.

## 3. Validation

| Input                           | Result                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| create `{ title: 'x' }`         | success: `{ title: 'x', type: 'TASK', priority: 'MEDIUM' }`                               |
| update `{}`                     | success: `{}`, with no defaults filled in                                                 |
| create `{ title: '   ' }`       | fails on `title`, "Title is required" (trim runs before `min(1)`)                         |
| update `{ storyPoints: 101 }`   | fails on `storyPoints` (`max(100)`)                                                       |
| create `labels: [' ui ', 'ui']` | success, `labels: ['ui', 'ui']`. Each label is trimmed, but **duplicates aren't removed** |

The bug it prevents: if the update schema reused `.default('MEDIUM')`, every `PATCH` that didn't mention `priority` would be
parsed to `priority: 'MEDIUM'` and silently overwrite the stored value. "Leave it alone" would become "reset it".

## 4. 403 vs. 404

1. VIEWER: `requireMembership` finds the role, then `can('VIEWER', 'issue:update')` is false → `forbidden(...)` → **403
   `FORBIDDEN`**, message "Your role (VIEWER) is not permitted to issue:update".
2. Non-member: `requireMembership` finds no role → `notFound('Project')` → **404 `NOT_FOUND`**.
3. Missing issue: `loadIssueForActor` → `notFound('Issue')` → **404 `NOT_FOUND`**.
4. Plain `TypeError`: it isn't an `ApiError` and has no `statusCode` → **500 `INTERNAL`**, message
   `"Internal server error"` in production (the real message only outside production). It's logged at `error` with the stack.

- (a) A 403 confirms the project exists. With 404 for non-members, an outsider can't list other teams' project keys by
  probing. This is existence hiding, the same idea as the IDOR tests in `apps/api/test/isolation.test.js`.
- (b) A typo in an action name (`'issue:archve'`) returning `false` would deny silently, and a typo in a _negative_ check
  could allow silently. Throwing turns a programming mistake into a loud failure in the first test that touches it.

## 5. The `Issue` model

- (a) There's at most one issue per `(project, number)`, so `GJ-7` is unambiguous. `loadIssueForActor` uses it through
  `findUnique({ where: { projectId_number: ... } })` (`issue.service.js:158-161`). The atomic counter in `createIssue`
  produces the number, and the unique index is the backstop if two creates ever raced.
- (b) It's built in `issue.service.js` (`issueKey` at line 12, and inline at lines 95, 144 and 168). A stored copy could
  disagree with `project.key + number`, for example after a project key rename. One source of truth can't drift.
- (c) `listIssues` (`issue.service.js:114-138`): `where projectId = ?` and `orderBy createdAt desc, id desc`. The equality
  column comes first, then the sort columns in sort order, so Postgres walks the index already sorted and stops at
  `LIMIT` with no sort node. The `LEARN (sprint 12)` comment in the schema records the measured Sort node that it removed.
- (d) Any good example earns credit: "all issues assigned to me across projects" (`assigneeId` isn't a leading column),
  "issues in a sprint" (`sprintId` isn't indexed), or free-text search (that's the GIN index on `searchVector`).
- (e) Postgres writes it. It's a `GENERATED ... STORED` column from
  `migrations/20260709210254_add_fulltext_search/migration.sql`, recomputed on every title or description change. App code
  never writes it.

## 6. Cursor pagination

- (a) `undefined` → 50, `'abc'` → 50, `'0'` → 50, `'7.9'` → 7 (`parseInt` stops at the dot), `'500'` → 100.
- (b) Prisma fetches `take: limit + 1 = 3` rows. `hasMore` is true, so `issues.length === 2` and `nextCursor` is the id of
  the 2nd row.
- (c) `cursor: { id }` _includes_ the cursor row. `skip: 1` drops it, so the page starts after it.
- (d) The cursor says "rows after this specific row in `(createdAt desc, id desc)` order". A new issue sorts at the top, so
  it doesn't shift the following page. `OFFSET 2` would count the new row and repeat one issue on page 2.

## 7. Characterization of `extractMentions`

The regex is `/@([a-zA-Z0-9_.-]+)/g`. Results are lowercased and de-duplicated through a `Set` in first-seen order.

| Input                              | Result               | Surprise?                                                                                                            |
| ---------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `'Hey @Ana and @ana, please look'` | `['ana']`            | the case-insensitive de-dupe is intended                                                                             |
| `'cc @ana.b, @bob_2!'`             | `['ana.b', 'bob_2']` | the comma and `!` end the token                                                                                      |
| `'thanks @ana.'`                   | `['ana.']`           | **yes**: the trailing period is part of the handle. User `ana` is _not_ notified, because the server looks up `ana.` |
| `'mail bob@example.com'`           | `['example.com']`    | **yes**: an email address produces a mention of `example.com`. It's harmless unless a user with that handle exists   |
| `null`                             | `[]`                 | `text ?? ''` guards it                                                                                               |

A good test file has one `it` per row, and its names describe the behaviour ("keeps a trailing period in the handle"), not
a judgment ("bug: ..."). The two surprises are real: a sentence-final mention silently fails to notify. That's a product
bug worth a ticket, but not a fix in this exercise.

## 8. `useLiveProject`

- (a) The dependencies are `projectId` and `qc`. `projectId` changes only when the route changes. `qc` comes from
  `useQueryClient()`, which returns the one `QueryClient` from the provider in `main.jsx`, so it's stable for the app's
  lifetime. `setViewers` is a state setter and is always stable. (The skill here: for each dependency, find where it's
  created and whether that code runs again on every render.)
- (b) The cleanup for A runs first: `off('activity')`, `off('presence')`, `emit('leave-project', { projectId: A })`. Then
  the effect for B: `emit('join-project', { projectId: B })`, `on('activity')`, `on('presence')`.
- (c) The same cleanup runs: two `off` calls and `leave-project` for the current project.
- (d) The `activity` and `presence` listeners would pile up, one more per visit. After 3 visits, one server `activity`
  event runs `invalidateQueries` 3 times, so the board refetches 3 times. The server also never receives `leave-project`,
  so presence keeps showing you in rooms you left.

## 9. The health check

- (a) `200 { status: 'ok', version, uptimeSeconds }`. `health.service.js` never touches Postgres or Redis.
- (b) Fly keeps routing traffic to instances that can't serve a single real request, because nothing marks them unhealthy.
  (If you said "it restarts them", note that this endpoint can _never_ fail, so it can't trigger a restart either.)
- (c) Any version of: "What does a 200 from this endpoint promise the load balancer? Should that promise include the DB,
  and if so, should failing it restart the process or only take it out of rotation?" That's J1's readiness vs liveness
  split.
