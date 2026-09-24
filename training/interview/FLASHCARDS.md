# Flashcards (24)

Front / back. Each card names a file or an incident. **Spoiler warning:** cards 20–24 reveal incident causes. Stop at card 19 until you've done incidents 001–005.

1. **Q:** Where are migrations applied in production, and how many times per deploy? **A:** `fly.toml` `[deploy] release_command = "npm run db:deploy -w @gitjira/api"`, once, on a throwaway machine, _before_ new machines take traffic. Old machines still serve against the new schema.
2. **Q:** What does `deploy.yml` deploy on a `v*` tag? **A:** Only the API (`fly.toml` builds `apps/api/Dockerfile`). No worker, no web, no dependency on CI passing.
3. **Q:** What does `GET /api/health` check? **A:** Nothing external: version and uptime (`services/health.service.js`). It's liveness, not readiness (ladder J1).
4. **Q:** Why does the metrics `route` label read `/` for three different endpoints? **A:** `lib/metrics.js` uses `req.route?.path`, which is relative to the router. It needs `req.baseUrl + req.route.path` (ladder M2).
5. **Q:** Which Redis call sits on _every_ authorized request? **A:** The member-map read in `requireMembership` via `lib/cache.js` `cached()` (when `REDIS_HOST` is set and `CACHE_BACKEND` isn't `memory`).
6. **Q:** What happens to a comment request if `enqueueNotification` throws? **A:** The comment is already committed (`comment.service.js:35`). The await at line 55 throws, so the client gets a 500 for a saved comment. Retrying duplicates it. (Curriculum 01.)
7. **Q:** Why doesn't the test suite catch Redis problems? **A:** `test/setup.js` sets `DISABLE_QUEUE=1` and `CACHE_BACKEND=memory`, and `test/tx.js` rolls every test back, so nothing commits.
8. **Q:** What makes notification fan-out safe to retry? **A:** `Notification.dedupeKey @unique` + the P2002 catch in `jobs/notification-handler.js`: same event + recipient = same key. (Curriculum 02.)
9. **Q:** What does BullMQ do with a failed job after 5 attempts here? **A:** Keeps it forever (`removeOnFail: false` in `jobs/queue.js`). A "DLQ" nobody alerts on or replays.
10. **Q:** When does `recordActivity` emit a socket event? **A:** Only when the caller passes `projectId`. Just `createIssue` and `addComment` do, so moves and updates are never broadcast (`activity.service.js:25`).
11. **Q:** When is that emit sent relative to the commit? **A:** Inside the transaction, before commit. A fast client refetch can read the old state (review R5).
12. **Q:** Why do two Fly machines break live updates and presence? **A:** No Socket.IO adapter (`socket-server.js:15`): `io.to(room)` only reaches sockets on the same process. And polling transport needs sticky sessions.
13. **Q:** How many issues does the board render for a 400-issue project? **A:** 50. `useIssues` sends no limit, `parseLimit` defaults to 50, and `nextCursor` is ignored.
14. **Q:** What does one `activity` event invalidate in the browser? **A:** `['projects']`, the prefix of every query key in `packages/shared/src/query-keys.js`: lists, detail, sprints, search.
15. **Q:** Where are attachments stored, and why is that a production bug? **A:** `process.cwd()/uploads` (`attachment.service.js:7`): per machine, ephemeral. A download on the wrong machine hits an unhandled stream error and crashes the process.
16. **Q:** What happens to the API on SIGINT/SIGTERM? **A:** Immediate exit (no handler in `server.js`). Requests and sockets drop on every deploy and every `auto_stop_machines` stop.
17. **Q:** Which committed migration would lock `Issue` against writes at 2M rows? **A:** `20260710000000_perf_indexes` (plain `CREATE INDEX`, SHARE lock) and `20260709194359_issue_position_fractional` (`ALTER COLUMN TYPE`, table rewrite, ACCESS EXCLUSIVE).
18. **Q:** Why is `CREATE INDEX CONCURRENTLY` awkward in Prisma migrations? **A:** It can't run in a transaction block. Prisma sends a migration file as one script, so keep it alone in its own migration file and check for an invalid index after a failure.
19. **Q:** Which runbook claims are false in code? **A:** "The API degrades gracefully when Redis is down" (`docs/RUNBOOK.md:46`), and "the queue-depth gauge" (line 47). No such metric exists; the postmortem's metrics don't either.

--- spoilers below ---

20. **Q:** (INC-001) Why does a hook with `options = {}` in a socket effect's deps melt the board? **A:** A new object every render → leave/join every render → server `presence` broadcast → `setViewers` → render → loop. N² across viewers, plus a `ProjectMember` lookup per join.
21. **Q:** (INC-002) Why can a deterministic BullMQ `jobId` silently drop notifications? **A:** `add()` with an existing id is a no-op (completed jobs are kept, failed jobs forever). An entity-based id (`kind|issue|actor`) swallows the _next_ event, and the reused `dedupeKey` blocks it in the DB too. Use a per-event id.
22. **Q:** (INC-003) What does Prisma generate for a field rename without `@map`? **A:** DROP COLUMN + ADD COLUMN: data loss, plus old machines selecting a dropped column (5xx) during rollout.
23. **Q:** (INC-004) Why did dashboards show "No data" after the path-label PR? **A:** Unbounded label cardinality: heap grows, `/metrics` too slow → scrape timeout → `up == 0` → `rate()`-based alerts go silent.
24. **Q:** (INC-005) Why do live updates stop after `socket.disconnect().connect()`? **A:** Rooms belong to the old server-side connection. The client must re-emit `join-project` on every `connect`.
