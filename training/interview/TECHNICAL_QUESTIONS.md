# Technical questions (20), all about this codebase

Answer out loud or in writing before opening `training/_answers/interview-technical.md`. Cite a file for every answer. Questions 16–20 carry a **spoiler warning**: they reveal the causes of incidents 001–005. Do the incidents first.

## API design

1. `GET /api/projects/:key/issues` returns `{ issues, nextCursor }` (`apps/api/src/services/issue.service.js:98-147`). The board calls it with no `limit`. What does the client actually get for a 400-issue project, and how would you change the contract so the board is correct **without** breaking a client that ignores `nextCursor`?
2. Attachments upload under a project (`/projects/:key/issues/:number/attachments`) but download at the top level (`/api/attachments/:id`, `apps/api/src/routes/index.js:22`). What operational property does the current storage (`attachment.service.js:7`) lack on a two-machine deployment, and what does `attachment.controller.js` do when the file isn't on this machine?

## Database and migrations

3. `migrations/20260710000000_perf_indexes/migration.sql` runs `CREATE INDEX` on `"Issue"`. What lock does that take, and what would the same migration do to writes at 2M rows? How would you write it for Prisma so it can use `CONCURRENTLY`?
4. `migrations/20260709194359_issue_position_fractional` changes `position` from `DOUBLE PRECISION` to `TEXT`. Describe the expand/contract sequence (per release) you'd use instead, given `fly.toml` runs `release_command` before new machines take traffic.
5. `completeSprint` (`sprint.service.js:59-97`) counts unfinished issues outside the transaction and moves them inside it. What can the returned `movedCount` disagree with, and does it matter? (Link: curriculum 03.)

## React and frontend performance

6. `useLiveProject` (`apps/web/src/lib/useLiveProject.js:18-21`) invalidates `['projects']` on every `activity` event. List the queries that refetch for a user who has the board open with the detail panel showing, and estimate requests per event for 30 viewers.
7. `BacklogPage` (`apps/web/src/pages/BacklogPage.jsx`, committed version) defines `SprintSection` inside the component body. What does React do with that on every render, and what user-visible symptom follows?
8. You open the React Profiler on the board with 400 issues and drag one card. What do you expect to see re-render, and which two changes (in `Board.jsx`/`IssueCard.jsx`/`ProjectBoardPage.jsx`) would cut it most?

## Testing

9. `apps/api/test/setup.js` sets `DISABLE_QUEUE=1` and `CACHE_BACKEND=memory`, and `test/tx.js` wraps every test in a rolled-back transaction. Name two production failure modes in this repo that the suite therefore **cannot** detect, and how you'd test each.
10. The only realtime e2e journey (`e2e/journeys/04-realtime.spec.js`) creates issues. Which realtime claim does that leave untested, and what would the missing test do?

## Security

11. `POST /api/issues/:issueId/watch` (`routes/index.js:28`, `notification.controller.js`). What authorization does it perform, and what can a user of project A learn about project B through it?
12. `/metrics` is mounted outside `API_PREFIX` with no auth (`apps/api/src/app.js:33`), and `fly.toml` exposes port 3000 publicly. What does it leak, and how would you expose it only to the scraper on Fly and on AWS?

## Operations, deployment, observability

13. Walk through what `deploy.yml` + `fly.toml` actually deploy on a `v1.1.0` tag. Which of `apps/api`, `apps/worker`, `apps/web` reach production, and does a red CI run stop it?
14. Fly's default kill signal is SIGINT with a 5 s timeout. What does `apps/api/src/server.js` do on SIGINT today, and what happens to open WebSockets and in-flight `PATCH /move` requests during a rolling deploy? Write the shutdown sequence you'd add.
15. Define two SLIs for GitJira from the metrics that exist in `apps/api/src/lib/metrics.js`, one SLO each, and a burn-rate alert. What does the current `route` label (`req.route?.path`) do to your SLI for `GET /api/projects/:key/issues`?

## Spoilers below (incidents 001–005)

16. **(INC-002)** BullMQ ignores `add()` when a job with the same `jobId` exists (`removeOnComplete: 1000`, `removeOnFail: false` in `jobs/queue.js`). If a job id is derived from `kind + issueId + actorId`, which real user actions stop producing notifications, and for how long? What should identify a notification event instead?
17. **(INC-003)** You rename a Prisma field `storyPoints` → `estimate` without `@map`. What SQL does Prisma generate, what do the two old API machines do between `release_command` and their replacement, and what happens to a PATCH from a browser tab still running the old bundle (zod `z.object` strips unknown keys)?
18. **(INC-004)** A PR changes the metrics label to `req.originalUrl` minus the query string. Estimate the series count after a week (issue numbers, cuids in `/attachments/:id` and `/me/notifications/:id/read`, scanner 404s, 8 histogram buckets). What happens to the API's memory, to `/metrics` scrape time, and to alerts built on `rate()`?
19. **(INC-001)** A hook takes `options = {}` and lists `options` in a `useEffect` dependency array whose effect emits `join-project`/`leave-project`. The server broadcasts `presence` to the room on every join and leave (`socket-server.js:53,58`). Trace the loop for one viewer, then for 30.
20. **(INC-005)** `socket.disconnect().connect()` is called after a token refresh. What happens to the room membership created by `socket.join('project:<id>')`, and why don't the client's `socket.on('activity')` listeners help? What's the correct client pattern?
