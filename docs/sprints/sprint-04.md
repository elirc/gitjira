# Sprint 04 — Kanban Board · Learning brief

**Levels:** L1, L2, L5 · **PR:** #NN

## What this sprint teaches

1. **Why ordering is hard** and how fractional indexing makes a move O(1). → `fractional-index.js` + its property tests; ADR 0008
2. **Optimistic UI as a contract**: snapshot → apply → rollback → reconcile. → `useMoveIssue`; ADR 0009
3. **Property-based testing**: invariants over generated inputs, not hand-picked examples. → the fast-check suite
4. **Accessibility isn't optional**: keyboard drag + live-region announcements. → `Board.jsx` sensors
5. **Authz follows the transport** (again): the new move endpoint gets its own authz test. → `move.test.js`

## Read the PR in this order

`fractional-index.js` (read the header, then the property test) → the move endpoint + its authz test → `useMoveIssue` (the optimistic contract) → the board components → **the review threads** (the move-authz gap and the rollback bug).

## Exercises

1. Add a per-column WIP limit: a badge that warns when a column exceeds N cards.
2. Turn on the "fail next move" toggle and drag a card — watch the rollback. Then read `useMoveIssue` and explain what `onError` restored.
3. Run the property test with `numRuns: 5000`; then deliberately break `keyBetween` (return `'x'` always) and read fast-check's shrunk counterexample.

<details><summary>Hints</summary>

1. `groupByColumn` gives you counts per column; the limit is a column prop.
2. The snapshot is `context.previous`; note the review discussion about object references.
3. fast-check prints the smallest failing sequence — that minimal case is the gift.

</details>
