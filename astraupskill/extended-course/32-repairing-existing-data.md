# 32. A data repair must preserve domain meaning

Imagine a historical database created before the current sprint protections contains an unfinished issue in a completed sprint or two active sprints in one project. A repair script can make constraints pass, but it can also erase the evidence needed to understand user intent. This workshop designs a reviewable repair plan using synthetic data. It does not run a repair against the user's database.

## Inventory before mutation

Define read-only queries that identify candidate inconsistencies. For a stranded issue, include project, sprint state, issue column category and current assignment. For duplicate active sprints, include each sprint's issue set, start time and relevant history. Record counts and stable identifiers in a report before proposing changes.

Do not use a broad query whose definition of unfinished differs from the application's workflow-category rule. A script hardcoding a column name such as Done can disagree with category-based service logic. Likewise, a global duplicate-active query must group by project rather than treating one active sprint across the entire database as the intended invariant.

## Decide, then apply conditionally

Moving every stranded issue to backlog may be a reasonable proposed default, but it is still a domain decision. Some rows may reflect an intended reopening or a metadata change. The repair plan should show the proposed destination and reason for each group, with a way to review exceptions. It should not silently complete one of two active sprints because its timestamp is older.

When applying a reviewed repair, use conditional predicates that ensure the row still matches the inspected state. If a user changes the issue between report generation and repair, the script should skip or conflict rather than overwrite fresh work. Record affected row counts and compare them with the approved plan. An unconditional update by ID discards this protection.

## Audit and reversibility

Capture before and after values, actor, repair identifier and reason in a durable audit artifact. A reversible repair needs enough information to restore the prior state, but reversal may no longer be safe after later user actions. Do not promise that every repair can be blindly undone at any time. A rollback should also use expected-state conditions and review conflicts.

If the repair installs a new constraint, separate data correction from schema enforcement in the plan while preserving the window between them. Concurrent writers can reintroduce invalid data before the constraint is active unless the rollout coordinates them. A maintenance window, temporary write gate or compatible application deployment may be needed under the actual environment's policy.

## Dry-run contract

A dry run should perform no writes and produce the exact candidate set and planned transformations. It should use the same selection logic as the apply mode where practical, but the expected results need independent review. A script that prints a count and later uses a different predicate for writes is difficult to trust.

Use a disposable fixture to test zero candidates, one candidate, mixed valid and invalid rows and a concurrent change after planning. Assert that valid rows remain untouched. Add a partial failure and define whether the repair is all-or-nothing or chunked with explicit progress. Large repairs may need chunks, but each chunk must remain reviewable and resumable under stable identity.

## Deliverable

Submit a read-only inventory query plan, proposed decisions, conditional apply contract, audit schema and rollback limitations. The strongest answers treat data repair as an engineering operation with user meaning, not a shortcut around service validation. A successful repair leaves the system explainable as well as structurally valid.

[Index](README.md)
