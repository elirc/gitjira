# Sprint retrospectives

## Sprint 01 — Foundation

- **Went well:** commit-by-commit discipline held; the walking skeleton surfaced a real integration bug (ESLint × JSX) on a trivial diff, exactly as advertised.
- **Was hard:** the bootstrap chicken-and-egg — hooks don't exist until the first install, so early commits missed formatting. Reached steady state with one `style:` pass.
- **Watch next sprint:** the asyncHandler regression test is promised as the first test of the new harness — don't let it slip.

## Sprint 02 — Data & Auth

- **Went well:** the replay-detection test drove the design; both review findings were pattern-level (serializer, cookie armor) rather than typo-level — review is earning its cost.
- **Was hard:** the same unserialized-user pattern had already spread to three endpoints before review caught it. Copy-paste propagates bugs faster than review catches them.
- **Watch next sprint:** issue-key allocation is a textbook race condition; write the concurrency test BEFORE feeling confident.
