# Senior trade-offs: four "Why?" drills

For each decision, fill in every heading **before** opening `training/_answers/navigation-tradeoffs.md`. Cite files. Keep each drill to about half a page.
The format is Problem → naive approach → where it fails → options A/B/C → trade-offs → choice → failure modes → how it's tested → how it's monitored → when to revisit.
Authorization, idempotency and outbox decisions are deliberately left out. They're drilled elsewhere (`apprenticeship/curriculum/01-03`).

---

## Drill 1: realtime sends a hint and the client refetches, instead of pushing the new state

Evidence: ADR 0016 (`docs/adr/0016-socketio-over-raw-ws-and-sse.md`), `apps/api/src/services/activity.service.js:18-27`, `apps/api/src/realtime/emit.js`, `apps/web/src/lib/useLiveProject.js:18-21`.

- **Problem:** Two people look at one board. Changes by one must show up for the other.
- **Naive approach:**
- **Where it fails:**
- **Options A / B / C:** (for example: push full entity state and patch the cache; push a hint and invalidate; poll)
- **Trade-offs:** consider bandwidth, correctness under rollback and reordering, refetch fan-out at N viewers, and server CPU.
- **Choice (what the code does, and why the maintainers probably chose it):**
- **Failure modes:** name at least two that the code has today. Hint: look at _when_ the emit fires, and at _what_ `onActivity` invalidates.
- **How it's tested:** what `apps/api/test/socket.test.js` and `e2e/journeys/04-realtime.spec.js` actually cover.
- **How it's monitored:**
- **When to revisit:** what number of viewers per project, or events per second, would change your answer?

---

## Drill 2: fractional-index string positions

Evidence: ADR 0008, `packages/shared/src/fractional-index.js` (`DIGITS`, `keyBetween`), migration `20260709194359_issue_position_fractional`, `apps/web/src/lib/board.js:14, 23-28`, `apps/api/src/services/issue.service.js:38-43`.

- **Problem:** Reordering a card must be cheap and must survive concurrent moves.
- **Naive approach:** integer positions, 1..n.
- **Where it fails:**
- **Options A / B / C:** (for example: gapped integers; float midpoints, which is where the schema started; LexoRank-style strings)
- **Trade-offs:** consider key growth, rebalancing, what happens when two users drop between the same two neighbors, and **who compares the keys** (JavaScript and SQL).
- **Choice:**
- **Failure modes:** include one about sorting in Postgres versus JavaScript. Check the column's collation.
- **How it's tested:** `packages/shared/test/fractional-index.test.js`. What does it not test?
- **How it's monitored:**
- **When to revisit:**

---

## Drill 3: migrations run in a PaaS release phase, and schema changes follow expand/contract

Evidence: ADR 0030, ADR 0031, `fly.toml:17-25, 34-35`, `.github/workflows/deploy.yml`, `apps/api/package.json` (`db:deploy`), `docs/RUNBOOK.md` "Migration failure".

- **Problem:** Change the schema while two or more API machines serve traffic, with rollback available.
- **Naive approach:** run `prisma migrate deploy` in each instance's start command.
- **Where it fails:**
- **Options A / B / C:** (for example: a start-command migration with an advisory lock; a release phase; a separate pipeline step or job, gated by a person)
- **Trade-offs:** consider ordering (the schema changes before the new code serves), how long old and new code overlap, what a failed release phase leaves behind, and Prisma wrapping a migration file in one transaction.
- **Choice:**
- **Failure modes:** which existing migration would be unsafe at 2M issues, and why? What does "rollback" in the RUNBOOK leave untouched?
- **How it's tested:**
- **How it's monitored:**
- **When to revisit:**

---

## Drill 4: Postgres full-text search with a generated `tsvector`, not Elasticsearch

Evidence: ADR 0013, migration `20260709210254_add_fulltext_search`, `apps/api/src/services/search.service.js:44-47, 75-91`, `packages/shared/src/jql/compiler.js:25`.

- **Problem:** "Find issues mentioning login" inside a project, combined with JQL filters.
- **Naive approach:** `ILIKE '%login%'`.
- **Where it fails:**
- **Options A / B / C:** (for example: a generated `tsvector` with GIN; `pg_trgm`; an external search engine fed by events)
- **Trade-offs:** consider consistency with writes, operational cost, ranking quality, and how you combine text search with structured filters and pagination.
- **Choice:**
- **Failure modes:** what does the `LIMIT 200` plus `id IN (...)` plus `ORDER BY createdAt` combination do to results? What does adding the stored generated column cost on a large table?
- **How it's tested:** `apps/api/test/search.test.js`
- **How it's monitored:**
- **When to revisit:**
