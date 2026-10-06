# GitJira sprint consistency workshop

Continue from the [original starter course](../README.md). Read the source-linked lessons, make predictions before opening answers, run the isolated teaching lab, and complete an independent capstone. Proposed changes are explicitly labeled; application code is unchanged. Historical verification claims are not current execution evidence.

## Learning route

- [1. Decide which layer owns a sprint rule](01-invariants-and-ownership.md)
- [2. A timestamp can be a version token](02-version-tokens-and-time.md)
- [3. Completing a sprint changes a collection](03-completion-as-a-transaction.md)
- [4. Two correct-looking commands can form a race](04-assignment-versus-completion.md)
- [5. A transaction callback may run more than once](05-retry-policy.md)
- [6. Fresh data and current authority are different](06-authorization-and-stale-clients.md)
- [7. Build evidence for a concurrency claim](07-model-lab-and-capstone.md)
- [8. Similar version checks can have different strength](08-compare-the-issue-writers.md)
- [9. Invalidation can race a pending cache load](09-single-flight-and-invalidation.md)
- [10. A stable cursor needs a stable ordering contract](10-pagination-and-visible-state.md)
- [11. Atomic numbering does not make every creation decision atomic](11-issue-number-allocation.md)
- [12. An invalidation hint before commit can arrive too early](12-activity-events-and-realtime-hints.md)
- [13. Awaited enqueue is still part of the response path](13-notification-handoff.md)
- [14. A position key is ordered data, not a floating-point number](14-fractional-ordering.md)
- [15. A detail screen can be bounded in one relation and unbounded in another](15-bounded-detail-and-history.md)
- [16. A role is meaningful only inside an object scope](16-policy-matrix-and-object-scope.md)
- [17. Make the dangerous schedule observable](17-build-a-concurrency-test-harness.md)
- [18. A page of issues is not necessarily the whole backlog](18-backlog-completeness.md)
- [19. Whole-cache rollback can erase a newer optimistic change](19-overlapping-optimistic-moves.md)
- [20. Defaults belong to creation, not every patch](20-schema-defaults-and-partial-updates.md)
- [21. Inspect the migration that creates the invariant](21-database-constraints-and-migrations.md)
- [22. Define commitment before calculating it](22-historical-sprint-reporting.md)
- [23. Diagnose four inconsistent-looking sprint incidents](23-independent-incident-dossiers.md)
- [24. Use mutations to test the strength of your reasoning](24-mutation-and-property-workshop.md)
- [25. Design a recoverable command receipt](25-command-receipt-capstone.md)
- [26. A conflict response should preserve the user's next decision](26-conflict-messages-and-recovery.md)
- [27. Check the real ordering function without starting the app](27-actual-source-ordering-lab.md)
- [28. Measure one bottleneck at a time](28-performance-experiment-design.md)
- [29. Keep comments, tests and behavior aligned](29-source-maintenance-and-review.md)
- [30. Conduct a paired review of one command](30-paired-system-review.md)
- [31. Completion depends on workflow metadata too](31-workflow-category-changes.md)
- [32. A data repair must preserve domain meaning](32-repairing-existing-data.md)
- [33. Build an evidence ledger for your completed work](33-evidence-ledger-for-a-learning-project.md)

## Separate review material

- [Answers: rules and version tokens](answers/01-state-and-time.md)
- [Answers: completion and concurrent assignment](answers/02-transactions.md)
- [Answers: retries, authority and clients](answers/03-policy-and-client.md)
- [Answers: model interpretation and capstone](answers/04-lab-and-capstone.md)
- [Review notes: issue writers and cache races](answers/05-issue-and-cache.md)
- [Review notes: creation and pagination](answers/06-creation-and-pagination.md)
- [Review notes: activity, notifications and positions](answers/07-events-and-order.md)
- [Review notes: detail views and historical meaning](answers/08-detail-and-reporting.md)
- [Review notes: policy and controlled testing](answers/09-policy-and-tests.md)
- [Review notes: browser state and schemas](answers/10-browser-and-schema.md)
- [Review notes: storage and historical reports](answers/11-storage-and-history.md)
- [Review notes: incidents, mutations and receipts](answers/12-incidents-and-capstone.md)
- [Review notes: actual-source lab and final review](answers/13-final-workshop.md)
- [Review notes: dependencies, repair and evidence](answers/14-dependencies-repair-and-evidence.md)

The Python lab in `labs` uses synthetic state and no network or application database. Its guide describes the model limitations. The execution evidence for this extended route was recorded outside this repository and is not included here. Both labs were re-run from this directory on 2026-10-06 with no install. `python labs/sprint_model.py` printed `7 sprint-model properties passed`. `node labs/fractional_contract.mjs`, which imports the real `packages/shared/src/fractional-index.js`, printed `"checks":6004,"inserted":2000`. Treat a matching line as your **Check** for lessons 7 and 27.
