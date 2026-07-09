# Sprint 03 — Projects & Issue CRUD · Learning brief

**Levels:** L2, L3 · **PR:** #27

## What this sprint teaches

1. **Resource-oriented + nested REST**: `/projects/:key/issues/:number`; PATCH as partial update. → issue routes/service
2. **Concurrency**: the issue-key counter is a textbook race — and the review catches it. → the concurrency finding + fix
3. **Cursor pagination**: why offset degrades and drifts. → ADR 0006
4. **Authorization as a matrix**: 404-not-403, member-of-A can't touch B. → `authorization.test.js`, and the recurring theme comment inside it
5. **Server-state caching**: query keys as a public API; invalidation. → `lib/hooks.js`, ADR nods to TanStack Query

## Read the PR in this order

Migration (1) → error contract (2) → services (project, then issue — note `allocateNumber`) → shared schemas → the schema-default `fix:` (a bug caught by writing tests) → API tests → **the review thread (two findings: the counter race, and over-fetching)** → web (hooks → pages).

## Exercises (on your own branch)

1. Add a `labels` filter to the issue list, end to end (API query param → hook → a filter control).
2. Revert the counter fix locally and run the concurrency test; watch it fail, then read why.
3. Write the DELETE authorization test (member-of-B deleting an issue in A) _before_ looking at how delete is implemented.

<details><summary>Hints</summary>

1. The service already destructures `...filters`; you're adding one `where` clause and one query-key field.
2. `git log` for the `perf(api): allocate issue keys atomically` commit; `git revert` it locally.
3. It mirrors the read/patch authz tests exactly — 404 is the expected status.

</details>
