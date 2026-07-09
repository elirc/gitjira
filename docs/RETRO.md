# Sprint retrospectives

## Sprint 01 — Foundation

- **Went well:** commit-by-commit discipline held; the walking skeleton surfaced a real integration bug (ESLint × JSX) on a trivial diff, exactly as advertised.
- **Was hard:** the bootstrap chicken-and-egg — hooks don't exist until the first install, so early commits missed formatting. Reached steady state with one `style:` pass.
- **Watch next sprint:** the asyncHandler regression test is promised as the first test of the new harness — don't let it slip.

## Sprint 02 — Data & Auth

- **Went well:** the replay-detection test drove the design; both review findings were pattern-level (serializer, cookie armor) rather than typo-level — review is earning its cost.
- **Was hard:** the same unserialized-user pattern had already spread to three endpoints before review caught it. Copy-paste propagates bugs faster than review catches them.
- **Watch next sprint:** issue-key allocation is a textbook race condition; write the concurrency test BEFORE feeling confident.

## Sprint 03 — Projects & Issues

- **Went well:** the authz matrix and the red→green concurrency fix are the sprint highlights; the self-flagged counter ("does this look right?") turned into the best teaching moment so far.
- **Was hard:** a self-inflicted bug (zod defaults leaking into PATCH) surfaced only when the tests were written — reinforcing that "looks obviously correct" is not evidence.
- **Watch next sprint:** the board introduces ordering (fractional indexing) and optimistic updates; the authz-follows-the-transport theme means the new move endpoint needs its own authz test.

## Sprint 04 — Kanban Board

- **Went well:** property testing the ordering utility paid off immediately (it took three rewrites to get keyBetween correct; the tests caught every wrong version). End-to-end verification found the seed-columns gap before it shipped.
- **Was hard:** the optimistic-rollback bug is invisible until you force the failure — a reminder that the rare path needs a way to be exercised on demand (hence the dev toggle).
- **Watch next sprint:** issue detail + comments introduces URL-as-state and the activity-event seam that sprints 08/09 build on; and it is the MVP release (v0.1.0).
