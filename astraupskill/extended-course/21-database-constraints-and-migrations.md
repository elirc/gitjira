# 21. Inspect the migration that creates the invariant

[The sprint migration](../../apps/api/prisma/migrations/20260709220000_sprints/migration.sql) creates the SprintState enum, Sprint table, a project index, a partial unique index for ACTIVE sprints and an Issue foreign key that sets sprintId to null when a sprint is deleted. Reading the migration gives stronger evidence about intended database enforcement than a comment in the service alone.

## Partial uniqueness

The unique index applies to projectId only for rows whose state is ACTIVE. Multiple PLANNED or COMPLETED sprints in the same project are permitted by that index. One active sprint in project A and one in project B are also permitted. Two active rows in the same project should conflict when the index is installed and functioning as intended.

Build a database-only fixture that inserts those combinations. Test the constraint independently of the service so an application precheck cannot hide a missing index. Then test service error translation separately. These two tests answer different questions: whether storage rejects the invalid state and whether the API presents that rejection appropriately.

## Schema files are not deployed state

A migration file in the repository does not prove the current database has applied it. A verification process should inspect migration status or database catalog in a disposable or explicitly selected environment. Do not run migrations against an unknown local connection merely to satisfy a learning exercise. The course's lab plan should name the intended database and preserve unrelated data.

If an existing database already contains two active sprints in one project, adding the unique index may fail. A migration plan needs a data-audit and resolution policy. It should not silently pick a winner and complete the other sprint without business approval, because completion has issue-movement semantics. Data repair is a domain operation, not just a way to make SQL succeed.

## Foreign key deletion behavior

The Issue.sprintId foreign key uses ON DELETE SET NULL. Deleting a sprint therefore does not delete its issues through that relationship; they return to a null association. This is distinct from completing a sprint, which moves only unfinished issues under the service workflow. A user-facing delete operation should explain the difference if such a route is exposed.

Create a fixture containing done and unfinished issues in a sprint, then compare completion with direct sprint deletion in a disposable database. The outcomes differ. The exercise should not encourage bypassing the service in real data; it reveals what the database relation guarantees and what remains a business rule.

## Timestamp precision

The migration uses millisecond-precision timestamp columns for sprint times. Inspect the Issue updatedAt definition separately before making claims about the issue version token. A schema review should follow the exact column used by the concurrency predicate, not infer its precision from a neighboring table. The earlier future-time exercise requires the entire storage and serialization path to preserve distinct values.

## Rollout exercise

Propose a new issue version column replacing timestamp comparison. Define its initial value, atomic increment, API representation and mixed-client behavior. During rollout, old clients may send expectedUpdatedAt while new clients send version. Decide how the server handles both without allowing one path to bypass the desired stale-write rule.

Keep the migration reversible where practical, but do not promise that a schema rollback can undo every command issued under new semantics. Record compatibility assumptions and data preservation. A successful migration is one that maintains meaning and authority throughout deployment, not merely one that finishes quickly.

## Deliverable

Submit the constraint truth table, deployed-state verification plan, deletion/completion comparison and version-column rollout. The reviewer should see explicit storage enforcement and a clear boundary between relational integrity and domain workflow.

[Index](README.md) · [Review notes](answers/11-storage-and-history.md)
