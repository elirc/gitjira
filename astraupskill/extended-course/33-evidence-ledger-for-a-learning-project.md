# 33. Build an evidence ledger for your completed work

The final learning deliverable is an evidence ledger that connects claims to artifacts. It should let a reviewer distinguish source reading, executed models, actual-source tests, relational tests and proposed designs. This is especially useful in a project with extensive existing training material, where historical test reports can otherwise be mistaken for current verification.

## Record claims narrowly

Start with five claims from the course. For example: the assignment predicate uses expectedUpdatedAt when supplied; the retry helper has at most three attempts for recognized P2034 errors; the partial unique index is defined in the sprint migration; the Node harness checked generated keys from the actual function; and a proposed command receipt can recover a lost response under its stated design.

Each claim has a different evidence type. Source inspection supports the first two. The migration file supports intended schema definition, while applied database state needs another check. The Node execution supports a bounded pure-function property. The receipt design remains a proposal until implemented and tested. Put those distinctions in explicit columns.

## Include limitations beside results

For the Node harness, state that database collation and concurrent clients were not exercised. For the Python sprint model, state that it enumerates serial outcomes rather than executing PostgreSQL isolation. For a UI review, state whether it was source-only or rendered with interaction. A limitation should be adjacent to the result so it cannot be lost when a summary is copied elsewhere.

Do not let a large assertion count dominate the report. Six thousand generated checks can be valuable for a pure function while one controlled transaction failure proves a different critical boundary. Compare evidence by the claim it supports, not by raw count. The ledger should make that comparison possible.

## Preserve artifacts and identity

Record source paths and, where useful, content hashes at inspection time. Save exact commands and their exit outcomes for executed labs. Keep synthetic fixtures and counterexamples with the course so another learner can reproduce them. Avoid storing real credentials, private issue content or unrelated environment data in a learning report.

If source changes later, mark affected claims for review. Do not automatically delete historical evidence; it may explain why a design decision existed. Instead record the new inspection and whether the claim still holds, moved to another enforcement point or became obsolete. This creates a useful history of learning and engineering decisions.

## Final self-assessment

Explain one distinction from each layer: shape versus ownership validation, legal state versus actor permission, read comparison versus atomic predicate, current association versus historical scope, local commit versus notification delivery, and immutable snapshot versus ordered optimistic mutations. Use a concrete GitJira example for each.

Then identify the weakest remaining claim in your own portfolio. Design the smallest next experiment that would strengthen it. A good answer may be a controlled cache schedule, a relational collation check or a browser test with a second page of issues. It should not be a vague promise to test everything.

The course is complete when the learner can produce a reviewable change proposal with truthful evidence and useful limits. Reading volume alone is not the outcome. The outcome is the ability to find the right boundary, reason about its failures and explain what the evidence actually establishes.

[Index](README.md)
