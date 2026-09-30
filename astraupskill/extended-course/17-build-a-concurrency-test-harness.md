# 17. Make the dangerous schedule observable

A concurrency test should establish that its intended overlap occurred. Launching two promises together is useful smoke coverage, but it does not guarantee both requests read the same version or that a write happened between validation and mutation. A deterministic harness uses explicit gates and records events at the boundaries relevant to the invariant.

## Define a gate contract

A gate exposes an entered signal and a release signal. The tested operation announces that it reached a named point, then waits until the test releases it. A timeout bounds failure if the point is never reached. The timeout is not the scheduling mechanism. This structure makes the test independent of machine speed while still preventing indefinite hangs.

For general issue update, a useful gate is after expectedUpdatedAt comparison and before the final transaction. For cache invalidation, it is after loading an old value and before storing it. For realtime timing, it is after emission and before commit. Different bugs require different gates; one global delay is not a substitute.

## Keep test seams out of product behavior

Prefer injected repositories, provider fakes or a disposable copy when adding gates for learning. Do not add a production environment flag that pauses arbitrary user requests unless there is a carefully reviewed operational reason. The course's purpose is to understand boundaries without changing the application's normal behavior.

If a test uses method spies, verify that the spy still permits the actual transaction or query behavior needed for the claim. A spy that replaces the entire database operation with a constant result can make an atomicity test meaningless. Document which layers are real and which are simulated in the harness diagram.

## Collect a minimal event trace

Record request identity, gate name, attempt number and selected version or state. Avoid logging full issue descriptions or credentials. A trace such as A read version T, B committed T1, A attempted predicate T is sufficient to explain a stale-write test. For a retry test, include callback attempt numbers so a passing final response does not hide an unexpected unbounded loop.

The trace should support assertions about order. If the test claims a cache load resumed after invalidation, assert those event positions. If it claims a client refetched before commit, record the returned version and commit event. A human-readable trace is useful when an assertion fails, but the crucial schedule should also be checked programmatically.

## Test isolation

Use a disposable database with a unique name or schema owned by the test harness. Verify the resolved connection before migrations and cleanup. Avoid resetting the user's existing development database. Create synthetic users and projects with deterministic roles. Restore spies, barriers and injected failures in finally blocks so one failed test cannot poison later tests.

For cache tests, clear the memory store and in-flight state through the test helper only in the controlled process. For queue tests, use a fake or disposable queue with a unique prefix. A global Redis flush would exceed the scope of a focused learning test and could affect unrelated work. Isolation is part of reproducibility, not a ceremonial checklist.

## Oracle quality

Write acceptable outcomes before running the schedule. In assignment versus completion, assignment may succeed or conflict, but the final unfinished issue must be outside the completed sprint. In two starts, one active sprint remains under the intended constraint. In stale update, a proposed atomic version contract should reject the losing token. Do not assert a particular winner unless the gate deliberately chooses one.

Add a mutation for each test. Removing the timestamp predicate should break the stale-write test. Removing a cache generation check in a proposed repair should break stale-resurrection protection. Emitting only before commit without later refresh should expose the early-refetch gap under the defined freshness contract. Mutation sensitivity helps show that the harness reaches the intended boundary.

## Deliverable

Submit a gate API sketch, one complete event trace, acceptable outcome table and cleanup strategy. Mark whether it is a proposed harness or an executed test. A strong report gives enough detail for another developer to reproduce the schedule and understand what remains unproved about other writers or deployment topologies.

[Index](README.md) · [Review notes](answers/09-policy-and-tests.md)
