# Review notes: dependencies, repair and evidence

The workflow-category exercise should identify that completion's definition of unfinished depends on current column categories as well as issue assignment. A source inventory is required before claiming a category-edit writer exists. If it does not, the scenario is a future-feature review requirement. If it does, the chosen policy must define acceptable serial histories and how later category changes affect completed-sprint meaning.

A historical completion record can preserve the category interpretation used at the time. It should not silently replace current UI state; current and historical views answer different questions. A strong answer labels both and explains why an issue can appear different under a later workflow definition. The dependency graph should include all writers that can affect the invariant, with unverified paths marked explicitly.

For data repair, the inventory must use the same domain meaning of DONE categories rather than hardcoded display names. Duplicate active sprints are grouped by project. The plan should preserve IDs, counts and relevant history before proposing changes. Moving rows or completing a sprint is a domain decision, so a repair cannot simply choose whichever update makes a constraint pass fastest.

Conditional application protects against changes between review and execution. A row that no longer matches the inspected state should be skipped or reported as a conflict. The audit artifact should retain before and after values and the repair reason. Reversal is conditional too: later user actions can make a blind rollback unsafe. A dry run should expose exact candidates and planned transformations without writing.

A constraint rollout needs to address the interval between cleanup and enforcement. Otherwise a concurrent old writer can recreate the invalid state. A complete plan coordinates compatible code, temporary write policy or another explicit deployment mechanism. A migration file's existence is not evidence that an arbitrary database has applied it, and a successful SQL command is not proof that user meaning was preserved.

The evidence ledger should connect each claim to its narrow support. Source inspection can establish a predicate is present; a controlled relational test can establish behavior under a particular database schedule; a pure-function harness can establish generated-key properties. None should be relabeled as another layer merely because all are called tests. Historical execution remains historical until rerun.

The final self-assessment should use concrete examples. A valid column ID can belong to another project. A MEMBER role needs target-project membership. A pre-write timestamp comparison differs from an update predicate. A current issue sum differs from initial sprint commitment. An issue commit can precede a failed queue submission. An immutable cache snapshot can still be restored in the wrong order. These distinctions are the core of the course.

Award full credit when the learner names the weakest remaining claim and proposes a focused experiment that would change confidence in it. A relational collation check is appropriate for database ordering; it does not answer browser rollback. A second-page browser fixture answers backlog completeness; it does not establish authorization freshness. Choosing the right next observation demonstrates engineering judgment more clearly than adding an indiscriminate suite of checks.

[Index](../README.md)
