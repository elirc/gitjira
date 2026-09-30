# 11. Atomic numbering does not make every creation decision atomic

createIssue allocates a project-local number by incrementing issueCounter inside the same transaction that creates the issue and records creation activity. This is a strong local boundary: the number allocation and issue row should commit or roll back together. The method also makes decisions before that transaction, including parent validation, target column selection and fractional position calculation. Review each decision at its own boundary.

## Follow the counter

Two issue creations in project GJ should receive distinct numbers because the project update uses an atomic increment. A read-counter-then-write-counter implementation would allow both callers to choose the same next value. The current operation delegates increment arbitration to the database. A relational concurrency test can assert distinct returned numbers and corresponding stored rows.

If issue creation fails after the counter update within the transaction, the counter increment should roll back with it. Design a failure after allocation and before successful issue insertion, then inspect the counter and rows. A mocked transaction that throws before executing anything does not prove the rollback. Use a disposable database and an independent before/after query.

Do not infer that numbers can never have gaps over the entire product lifetime. Deleting issues, imports, administrative changes or different workflows can affect that property. The inspected transaction prevents one particular failed create from consuming a number under its supported database semantics. That narrower claim is useful and testable.

## Parent depth and ownership

The method looks up a supplied parent within the project and rejects a parent that already has a parent. This enforces a maximum subtask depth of one at the service check. Consider concurrent deletion or reparenting if such operations exist. The lookup occurs before the creation transaction, so a complete invariant review must inspect other writers and foreign-key constraints.

Write a source map for parentId mutations. If the current API never reparents an issue, the race surface differs from a future feature that does. Do not add speculative complexity without establishing a writer. Conversely, a new reparent endpoint would need to join the depth and cycle protocol rather than assume createIssue's check covers it automatically.

## Column identity is an authority question

The default column comes from the loaded project's ordered columns. A caller-supplied columnId follows a different path and deserves explicit project-ownership validation somewhere in the request flow. The moveIssue method contains such a target-column check; inspect route schemas and creation code before claiming the same protection exists for createIssue.

A schema can validate that columnId looks like an identifier while still accepting a real column from another project. Shape validation and ownership validation are different. Build a two-project fixture and attempt creation with the foreign column. Record current behavior and propose a consistent cross-project rule if needed. Do not change app code merely to make the exercise pass.

## Position is chosen before insertion

The method reads the last position in the target column and computes a new fractional key before entering the number-allocation transaction. Two concurrent creates can read the same last key and calculate the same new position. Distinct issue numbers do not automatically imply distinct ordering keys. Whether tied positions are permitted and how the board orders them is a separate contract.

Design a test that pauses both creates after reading the last position. After both commit, inspect numbers, positions and displayed ordering. A correct numbering invariant can pass while ordering remains ambiguous. This is why large methods should be decomposed conceptually by invariant rather than described as “transactional” in one blanket sentence.

## Postcommit work

If the new issue is assigned to someone else, autoWatch and notification enqueue occur after the creation transaction, and the method awaits them before returning. That means issue creation may be durable even if a later postcommit step fails. The user can receive an error despite the issue existing. A client retry without a command identity may create another issue.

This is a new external or multi-store boundary, distinct from the atomic counter. A proposed creation receipt or outbox could improve recovery, but it needs clear identity and response semantics. The next chapters examine those choices. For now, draw the transaction box and put postcommit work outside it.

## Submission

Produce an invariant table for numbering, parent depth, column ownership, ordering and notification intent. Include one controlled race and one postcommit failure. A strong answer celebrates the actual atomic increment while identifying the other decisions it does not protect. The engineering skill is precise composition of guarantees.

[Index](README.md) · [Review notes](answers/06-creation-and-pagination.md)
