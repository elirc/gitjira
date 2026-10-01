# Code tour: one promise, end to end

This tour follows a single promise through every layer of the system:

> **A stale edit can never silently overwrite newer work, and the loser never
> loses their draft.**

Read it with the app running (`npm start`, then http://127.0.0.1:4317) and the
files open. Line numbers refer to the current source; if they drift, search for
the quoted code instead.

The same walk works for any other promise in [CONTRACT.md](CONTRACT.md) —
viewer write denial, last-owner protection, atomic activity — and tracing one
of those yourself is the first exercise in [EXERCISES.md](EXERCISES.md).

## 0. Set the scene

Open issue LAUNCH-5 ("Stress-test simultaneous edits") in two browser tabs as
Avery. Both dialogs show **Version 1** in the issue metadata. Change the title
in tab A and save; then change the title in tab B and save. Tab B gets a
conflict box and keeps its draft. Everything below explains exactly why.

## 1. The browser sends the version it read

- `public/dialogs.js:42` — `openIssue()` fetches the issue; the response
  includes `issue.version`, which is stored on `state.issue` and shown in the
  dialog metadata. The version is **what the user is editing against**, not
  decoration.
- `public/dialogs.js:95` — `saveIssue()` builds the PATCH body and spreads in
  `{ version: editing.version }`: the version from the read, never a fresh one.
- `public/api.js:5` — `api()` sends the request same-origin with the session
  cookie and the `X-GitJira-Request: 1` header that all writes must carry.

Before moving on, predict: what should the server do if that version no longer
matches the row?

## 2. The server gate before any handler runs

- `src/app.js:64` — the Host allowlist and write-header checks. A hostile page
  on another origin cannot forge this PATCH even though the demo has no
  passwords: it cannot set the custom header cross-site, and a mismatched
  `Origin` is rejected.
- `src/app.js:79` — the JSON parser cap (128 KB). It is sized so the largest
  *valid* field survives JSON escaping — the parser and the field validator
  must agree about what "valid" means (journal/reviews/04-astra-backend.md §3).
- `src/app.js:143` — the session middleware maps the cookie's hashed token to
  `req.user`. No route below this line runs unauthenticated.

## 3. The transaction owns everything that must succeed together

- `src/app.js:265` — the PATCH handler. Note the order *inside*
  `transaction(...)`:
  1. `getIssue(issueId, req.user.id, true)` re-checks membership (`src/app.js:91`
     — `member()`), **inside** the transaction. A concurrent process revoking
     membership cannot slip between the check and the write.
  2. The compare-and-swap UPDATE (`src/app.js:277`): it matches
     `WHERE id=? AND version=?` and increments `version` in the same
     statement. Stale version ⇒ zero rows changed.
  3. `src/app.js:279` — zero rows throws `VERSION_CONFLICT` (409) carrying the
     *current* issue, so the client can show what won without another request.
  4. The activity event is inserted in the same transaction. If it fails, the
     edit rolls back too — proven by the forced-trigger test below.
- `src/database.js:9` — `BEGIN IMMEDIATE` takes the write lock before any of
  that reading happens, serializing competing writers across processes.
- `src/database.js:50` — the schema makes `version` a checked column; the
  database is the final authority, not the API code.

## 4. The losing browser keeps the draft

- `public/dialogs.js:85` — `showConflict()` runs on the 409. Look at what it
  does **not** do: it does not touch the form fields, does not retry with the
  fresh version, and disables Save/Archive so the stale write cannot be
  resubmitted.
- `public/dialogs.js:151` — `reloadIssue()` is the only way forward, and it is an
  explicit user action with a warning that it replaces the draft. The comment
  draft is even carried across the re-render.
- `public/state.js` (header comment) — the token system that keeps delayed
  responses from landing in the wrong dialog. The row version and the request
  token are the same idea at two layers: every piece of async work needs an
  owner.

## 5. The tests that pin the promise

- `tests/api.test.js:199` — stale PATCH returns 409 with the winner's state and
  writes **no** activity event.
- `tests/api.test.js:295` — a SQLite trigger forces the activity insert to
  fail; the test asserts the issue, the edit, and even the allocated issue
  number were rolled back.
- `tests/concurrency.test.js:62` — two *separate server processes* race the
  same version against one database file: exactly one 200, one 409, one
  activity event, and the winner survives a restart. This is the strongest
  evidence in the repo, and also its limit — it is a correctness proof for this
  case, not a throughput benchmark.
- `tests/browser.mjs` — scenario "two browser contexts conflict, preserve
  draft, then explicitly reload winner" checks the human-visible half in real
  Chromium.

## 6. Where the promise stops

The guarantee is per-issue and local: there is no cross-issue transaction
exposed to the client, no offline merge, and no production identity behind the
roles. [ARCHITECTURE.md](ARCHITECTURE.md) §5 says when those boundaries should
move. When you can explain *why each layer above cannot be replaced by another
layer* — why the UI alone can't prevent lost updates, why the API check alone
can't survive a concurrent membership change, why the database constraint
alone can't preserve a draft — you understand this system.
