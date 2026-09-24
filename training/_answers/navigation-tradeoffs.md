# Sealed: reference analysis for the four trade-off drills

These are short. Grade yourself on whether you named the **mechanism** and cited the file, not on wording.

## Drill 1: hint and invalidate

- **Naive approach:** push the full new issue in the event, and clients patch their cache.
- **Where it fails:**
  - The event is emitted from inside the caller's transaction (`activity.service.js:25-27`). With full state, a rolled-back transaction leaves clients showing data that never existed.
  - Events can arrive out of order across rooms and reconnects.
  - Every event type needs its own patch logic on the client.
- **Options:**
  - A: push state and patch.
  - B: push a hint (`{kind, issueId, actorId}`), then invalidate and refetch.
  - C: poll, as the bell does (`hooks.js:242`).
- **Choice:** B. It's simple, the refetch reads committed state (in theory), and there's one code path.
- **Failure modes in today's code:**
  - The hint is emitted **before commit**. A fast client refetches, reads the pre-change row, and caches it. No second event comes to correct it (see `apprenticeship/curriculum/01-transactional-outbox.md` for the "after commit" discipline).
  - `onActivity` invalidates `['projects']`, the root key (`useLiveProject.js:20`). Every project query in the cache refetches for every viewer on every event, so load grows with viewers × events × open queries.
  - Only `create` and `comment` emit at all.
  - There's no adapter, so events stay on one instance.
- **Tested by:** `socket.test.js` (a direct `emitToProject` reaches a room member; a non-member is refused) and the e2e creation journey. Nothing tests moves, commit ordering, or two instances.
- **Monitor:**
  - an events-emitted counter by kind
  - the refetch rate per client (API request rate on the list endpoints versus the event rate)
  - a socket connection gauge per instance
- **Revisit:** when the refetch fan-out dominates API load (for example, more than 20 viewers on busy projects), or when you need sub-second consistency. Then emit after commit with a version, and patch or invalidate a narrow key (`queryKeys.issues(projectKey)`).

## Drill 2: fractional string positions

- **Naive approach:** integer positions. A move rewrites O(n) rows.
- **Why not floats:** float midpoints run out of precision after about 50 halvings between the same neighbors. That's why the column went `DOUBLE PRECISION` → `TEXT` (migration `20260709194359`).
- **Options:**
  - A: gapped integers plus periodic renumbering.
  - B: floats.
  - C: base-62 string keys (`keyBetween`).
- **Choice:** C. A move writes one row with no renumbering. The client computes the key (`board.js:23-28`), and the server stores it blindly (`issue.service.js:275-278`).
- **Failure modes:**
  - **Collation mismatch.** JavaScript sorts by code unit, where `'B' < 'a'`. A Postgres `TEXT` column uses the database collation, and a linguistic collation such as `en_US` can order `'a' < 'B'`. The alphabet mixes cases (`DIGITS`). `createIssue` picks "last" with SQL `ORDER BY position desc` (`issue.service.js:38-42`), while the board sorts in JavaScript (`board.js:14`), so they can disagree. Fix: `COLLATE "C"` on the column, or compare with a byte-order collation in SQL.
  - **Concurrent drops between the same neighbors** produce identical keys. Order is then undefined, since there's no unique index and no tie-breaker.
  - **Keys grow without bound** under repeated inserts at one spot, and there's no rebalancing (the file comment admits this).
  - **The server doesn't validate** that the key falls between the neighbors.
- **Tested by:** the shared unit tests for `keyBetween` ordering under JavaScript comparison. Nothing tests SQL ordering, collation, or concurrent moves.
- **Monitor:** max and p99 `length(position)` per column, and duplicate `(columnId, position)` counts.
- **Revisit:** when key length exceeds about 50 characters, or duplicates appear. Add rebalancing or a `(position, id)` tie-break.

## Drill 3: release-phase migrations and expand/contract

- **Naive approach:** migrate in the start command. With `min_machines_running = 2`, instances race, which ranges from a lock wait to partial failure mid-rollout.
- **Options:**
  - A: start command plus an advisory lock. Prisma does take one, but a boot still blocks on it.
  - B: a platform release phase that runs once before swapping (`fly.toml:25`).
  - C: an explicit pipeline job, gated by a person, before deploy.
- **Choice:** B. It's simple, a failed migration aborts the deploy, and old machines keep serving.
- **Failure modes:**
  - The schema changes **before** any new code serves, and old code keeps running during the rollout. Any destructive change breaks the old machines. Expand/contract (ADR 0031) is the only mitigation, and no migration in history follows it.
  - `CREATE INDEX` without `CONCURRENTLY` (`perf_indexes`) and table-rewriting `ALTER`s (`issue_position_fractional`, the stored generated column) take blocking locks, with no `lock_timeout`.
  - `CREATE INDEX CONCURRENTLY` can't run inside a transaction block. Verify on a scratch DB how Prisma applies a multi-statement migration file before relying on it. The usual workaround is one statement per migration file.
  - A code rollback (RUNBOOK) doesn't undo schema changes.
  - Deploys don't wait for CI.
- **Tested by:** nothing automated. CI runs `migrate` on an empty DB in global setup.
- **Monitor:**
  - release-phase duration
  - Postgres lock waits (`pg_locks`, or `log_lock_waits`)
  - the 5xx rate during a deploy window
- **Revisit:** at a table size where the lock time is visible (hundreds of thousands of rows), or with more than one team shipping migrations. Then add a migration linter (squawk-style), mandatory `lock_timeout`, and separate the "expand" and "contract" releases.

## Drill 4: Postgres FTS

- **Naive approach:** `ILIKE`, which is a sequential scan with no stemming or ranking.
- **Options:**
  - A: a generated `tsvector` plus GIN (the chosen option).
  - B: `pg_trgm` for substrings and typos.
  - C: Elasticsearch or OpenSearch fed from activity events.
- **Choice:** A. It's transactionally consistent (the vector is recomputed on write), needs no extra system, and fits the scale (ADR 0013).
- **Failure modes:**
  - `LIMIT 200` in `fullTextIssueIds` silently caps results.
  - The outer query re-sorts by `createdAt`, discarding the rank.
  - Cursor pagination runs over the capped id list.
  - The `english` config stems badly for code identifiers and non-English text.
  - Adding the stored column rewrote the table.
  - Prisma can't model it (`Unsupported`), so later migrations are hand-written ("Prisma's diff fights the generated column", notifications migration header).
- **Tested by:** `search.test.js` for matches and the parameterized path. Nothing tests more than 200 matches or ranking order.
- **Monitor:** search p95, the rate of results equal to the cap (log when `ids.length === 200`), and GIN index size.
- **Revisit:** for cross-project or global search, fuzzy matching, or search load large enough to justify its own store. At that point, event-fed indexing brings its own consistency lag to design for.
