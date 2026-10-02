# Exercises: from reading this system to designing your own

Reading finished code teaches less than changing it and watching what breaks.
These exercises are ordered by tier; each has a **done when** so you can check
yourself. Work on a branch, and before every exercise write down your
prediction first — the learning is in comparing it with what happened.

Baseline for everything below:

```powershell
npm run check; npm test; npm run test:browser
```

All three must pass before you start and after you finish each exercise.

## How to work these with builder/reviewer/verifier agents

When you use agents (as the original build did — see
[journal/READ-ME-FIRST.txt](journal/READ-ME-FIRST.txt) §8), keep the protocol
that made that build work:

- Ask the **builder** for two viable designs and the conditions under which its
  preferred one would be wrong.
- Ask the **reviewer** for a concrete failure scenario — a specific input, an
  observed result, a violated promise — never "improve validation."
- Ask the **verifier** to turn each accepted objection into a test or
  measurement that fails before the fix and passes after.
- Rotate the roles on the next exercise so no model always defends its own
  earlier choices. Write your own prediction before reading any proposal.

---

## Tier 1 — Trace and break (half a day each)

The test suite is a teaching instrument: break one guarantee on purpose and
watch which test catches it. Revert with `git checkout -- <file>` afterward.

**1.1 Break the compare-and-swap.** In `src/app.js`, remove `AND version=?`
from the PATCH UPDATE (and the matching bind argument).
*Predict first:* which of the 12 API tests fail? Does the two-process
concurrency test fail every run or only sometimes, and why is a sometimes-
failing test the scarier result?
*Done when:* you can name the failing assertions without re-reading the test
file, and explain why the UI conflict box alone could not preserve the
guarantee.

A completed run of this exercise, with real captured output, is in
[journal/worked-examples/break-the-cas.md](journal/worked-examples/break-the-cas.md) —
do your own run first, then compare how you observed and reported against it.

**1.2 Break the transaction boundary.** In `src/database.js`, change
`BEGIN IMMEDIATE` to `BEGIN`.
*Predict first:* which suite notices — the in-process API tests or the
two-process test? Run `npm test` several times.
*Done when:* you can explain the lock-upgrade problem in your own words and why
one synchronous process can never reveal it.

**1.3 Break a request identity.** In `public/app.js`, delete the
`state.issueToken++` in the issue dialog's `close` handler.
*Predict first:* which of the seven delayed-response scenarios in
`tests/ui-races.mjs` fails, and what would a user actually see?
*Done when:* the predicted scenario fails and you can describe the row-version
/ request-token parallel from [CODE-TOUR.md](CODE-TOUR.md) §4 without notes.

**1.4 Break escaping.** In `public/dom.js`, make `escape()` return its input
unchanged.
*Predict first:* which browser scenario fails? Create an issue titled
`<img src=x onerror=alert(1)>` and describe exactly where it executes.
*Done when:* you can say which layer owns this guarantee and why the server
storing the text verbatim is correct behavior, not the bug.

**1.5 Trace a different promise.** Repeat the CODE-TOUR walk for **last-owner
protection**: UI control state → `guardLastOwner` in `src/app.js` → the 409 →
`tests/api.test.js` ("owner membership rules preserve an owner").
*Done when:* you've written a half-page tour in the CODE-TOUR format, including
the step where the check runs inside the transaction and why.

## Tier 2 — Extend inside the existing boundaries (1–3 days each)

Write the failing test *first*, in the style of `tests/api.test.js` (tests talk
HTTP to a real listener, never to internals).

**2.1 Labels.** Add a `labels` field to issues: up to five short strings,
filterable with the existing filters, versioned like every other field.
*Covers:* schema change, validation, contract update, UI rendering.
*Done when:* new API tests cover validation and the version bump on label
change; the stale-edit test still passes with labels in the draft; CONTRACT.md
documents the field.

**2.2 Restore from archive.** The README admits "this version has no restore
UI." Add `POST /api/issues/:id/restore` (versioned, editor/owner, activity
event `restored`) and an "Archived" view with a restore button.
*Covers:* designing an endpoint from an invariant, soft-delete symmetry.
*Done when:* a stale restore gets 409; restore+event are atomic under a forced
trigger; a browser scenario archives and restores an issue.

**2.3 Cursor pagination.** The issues endpoint returns the whole collection.
Add `?after=<id>&limit=` cursor pagination without breaking existing clients.
*Covers:* API evolution, index-aware queries, the difference between offset
and cursor under concurrent inserts.
*Done when:* a test inserts during pagination and proves no issue is skipped
or duplicated; the board still renders (it may fetch all pages).

**2.4 Schema migration v2.** The database rejects newer schemas but has never
migrated. Pick any Tier-2 schema change and ship it as a real migration:
`user_version` 1 → 2, transactional, idempotent on restart, rejecting v3+.
*Covers:* the single most common gap in CRUD codebases.
*Done when:* a test opens a copied v1 database file, runs the new server
against it, and proves old data survived and the new column works; a fresh
database still seeds correctly.

**2.5 Rate limiting.** Add per-session write rate limiting (e.g. 30 writes /
10 s) returning 429 with a `Retry-After` header.
*Covers:* middleware ordering, state that is per-session rather than per-row.
*Done when:* a test proves reads are unaffected, the limit resets, and two
sessions do not share a bucket.

## Tier 3 — Move a boundary (1–2 weeks each)

These are the "next experiments" from [ARCHITECTURE.md](ARCHITECTURE.md) §5,
scaffolded. Do **one at a time** so disagreements have a clear object. For
each: write a one-page design note first (two alternatives, chosen tradeoffs,
what evidence would make you revisit), then build, then update
ARCHITECTURE.md as if the next learner inherits your version.

**3.1 Real authentication.** Replace demo login with username/password:
credential hashing (scrypt/argon2), login throttling, session fixation on
privilege change. Keep every existing authorization test passing unchanged —
that is the point: identity changed, authorization didn't.
*Done when:* the old demo-login tests are deleted deliberately (not skipped),
new auth tests cover lockout and wrong-password timing, and the README's
security boundary section is rewritten honestly.

**3.2 PostgreSQL port.** Same contract, new database, async driver.
`tests/api.test.js` and `tests/concurrency.test.js` are your acceptance
suite — port them, not the implementation. Note where SQLite habits break:
`BEGIN IMMEDIATE` has no direct equivalent; what isolation level and locking
strategy replace it?
*Done when:* both suites pass against Postgres and you can explain which
guarantees moved from application code into the database, and which moved the
other way.

**3.3 Polling → Server-Sent Events.** Replace the 25-second poll with SSE.
The costs named in ARCHITECTURE.md §4 become your checklist: reconnection,
missed-event recovery (last-event-id), project-scoped subscriptions,
identity changes mid-stream.
*Done when:* a delayed/failure-response test in the `ui-races.mjs` style
proves a reconnecting client misses no update, and switching accounts closes
the old stream.

**3.4 Transactional outbox.** Add notifications ("you were assigned LAUNCH-7")
via an outbox table written in the same transaction as the mutation, drained
by a separate process with at-least-once delivery and a dedupe key.
*Done when:* a forced crash between commit and drain delivers exactly once
after restart, proven by a two-process test.

**3.5 CI.** Wire `.github/workflows/ci.yml` (already in this folder) to a
GitHub repository of this project and make it green, including the Playwright
browser install that the local README says a fresh machine needs.
*Done when:* a PR that reintroduces exercise 1.1's bug is blocked by CI, and
you can say what CI still cannot catch here (the screenshots nobody inspects,
the audit that is point-in-time).

---

## Calibration: what "senior" looks like against this repo

You are operating at the level this project teaches toward when you can:

1. Name the system's invariants unprompted, and for each one say which layer
   enforces it and why that layer.
2. State the strength of evidence honestly — "12 tests pass" vs. "lost updates
   are impossible for same-version PATCH races across processes, unproven
   beyond two writers."
3. Review a change by supplying a concrete counterexample, and accept a review
   by turning it into a test rather than an apology.
4. Know when the current design stops being right (ARCHITECTURE.md §1's
   PostgreSQL paragraph is the model) and say what measurement would tell you.
