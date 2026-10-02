# GitJira Architecture Clinic

Read this alongside [CODE-TOUR.md](../CODE-TOUR.md) and the actual source. The
architecture described as current exists in the rebuild. Proposed ports and
extensions are exercises from [EXERCISES.md](../EXERCISES.md), not delivered
features. This clinic was added with the upskilling expansion; the factual
build history stays in [READ-ME-FIRST.txt](READ-ME-FIRST.txt).

## 1. Name the identities

Circle every ID in the system and ask what it identifies, who creates it, how
long it lives, and what reuse means:

- An **issue version** identifies one stored state of one row. The server
  increments it inside the same UPDATE that changes the row. A client holding
  version 4 is holding a claim about the past, and every write must present
  that claim.
- A **request generation / dialog token** identifies one screen's right to be
  updated by one in-flight response. The browser bumps it on project switch,
  dialog close, and account change ([public/state.js](../public/state.js)
  documents the full set).
- A **session token** identifies a browser's authenticated identity. Only its
  SHA-256 hash is stored; it outlives page loads but not logout.
- A **membership role** identifies what an identity may do inside one project.
  It is read inside the write transaction, never cached across one.

None of these are interchangeable. The version cannot guard a dialog (the
dialog has no row); the token cannot guard a write (another tab shares the
session). Identity should match the lifetime of the thing it protects — the
same review technique the sibling projects apply to checkout keys and lease
tokens.

## 2. Locate the authoritative state

The database owns users, sessions, projects, memberships, issues, comments,
and activity. The browser owns an unsaved draft and the current view — nothing
the server would miss if the tab closed.

Source navigation:

- [src/database.js](../src/database.js): schema, constraints, transaction
  helper, seed.
- [src/app.js](../src/app.js): validation, authorization, every route, the
  compare-and-swap PATCH.
- [public/app.js](../public/app.js): entry point; the modules beside it split
  transport, state, rendering, and dialogs (the README lists them).
- [tests/api.test.js](../tests/api.test.js): contract-driven HTTP tests,
  forced-rollback triggers.
- [tests/concurrency.test.js](../tests/concurrency.test.js): two real server
  processes against one database file.
- [tests/browser.mjs](../tests/browser.mjs) and
  [tests/ui-races.mjs](../tests/ui-races.mjs): user workflows and delayed
  responses.

## 3. Three forms of protection are not redundant

A viewer sees no Edit button (UI), a forged PATCH gets 403 (API), and a title
over 180 characters violates a CHECK constraint (database). It is tempting to
call two of the three redundant. They answer different questions: the UI shapes
honest users' intent, the API is the trust boundary, and the constraint is the
last line of defense when application code is wrong. The worked example
[worked-examples/break-the-cas.md](worked-examples/break-the-cas.md) shows what
happens when the middle layer's enforcement is quietly deleted: the other two
layers do not save you, because they were never answering that question.

## 4. Transaction time is not user thinking time

A user may hold an edit dialog open for an hour. The write transaction lasts
milliseconds. The version precondition is what connects them: instead of
locking the row while the human thinks (pessimistic, and fatal for a web app),
the server lets the human think for free and makes the *write* prove the world
has not moved. `BEGIN IMMEDIATE` then serializes only the milliseconds that
matter. When you meet long-running locks in another codebase, ask which human
pause they are accidentally charging to the database.

## 5. What a response may reveal

A nonmember probing `/api/issues/9999` gets 404, not 403. A 403 would confirm
the issue exists in someone else's project — a small information leak with a
precise lesson: authorization errors are part of the API surface, and their
shape is a design decision. The same thinking governs the error body contract
(`{error, code, current?}`): the 409 deliberately includes the current issue
because the client needs it for recovery, and deliberately nothing else.

## 6. Refresh is a reader

Polling every 25 seconds must never become an accidental writer, never
overwrite a draft, and never win against a newer load. The generation token in
[public/workspace.js](../public/workspace.js) enforces the last rule; the
dialog-open and search-focus checks in [public/app.js](../public/app.js)
enforce the first two. If you replace polling with SSE (exercise Tier 3), the
reader rule survives the transport change — reconnection and missed-event
recovery are new obligations, but "a refresh only reads" is not negotiable.

## 7. The seed is part of the product

Sol's first failing test assumed a fresh project starts at LAUNCH-1; the seed
already had nine issues, so LAUNCH-10 was correct, and the *test* changed.
Useful demo data and test assumptions trade off: tests must derive baselines
from observed state, not from an empty-world assumption. In production
codebases the same bug appears as tests that pass only against a freshly
migrated database.

## 8. When SQLite stops being right

`DatabaseSync` blocks the Node event loop while SQL executes. For one local
user and millisecond transactions this is a feature — the code reads straight
down. It stops being right when sustained concurrent writers, multi-machine
deployment, or latency under contention become real requirements. The honest
migration path is the one the exercises scaffold: keep
[tests/api.test.js](../tests/api.test.js) and
[tests/concurrency.test.js](../tests/concurrency.test.js) as the acceptance
suite and port the implementation under them. Correctness evidence transfers;
throughput claims never did (two processes were a correctness experiment, not
a benchmark).

## 9. A migration is a user story with old data

The schema checks `user_version` and rejects newer versions, but it has only
ever been version 1 — the rejection path has never protected anyone. Exercise
2.4 makes it real: the hard parts are default values for rows that predate the
concept and proving the window where neither version owns the file is empty.
Stockade's clinic has the same section and its workbook the same lab; doing
both shows how little of a migration is the ALTER TABLE.
