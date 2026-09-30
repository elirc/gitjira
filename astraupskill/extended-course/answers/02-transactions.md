# Answers: completion and concurrent assignment

Completing the three-issue fixture to backlog makes S COMPLETED, moves TODO and IN_PROGRESS issues to null sprint, leaves the DONE issue associated with S, and returns movedCount two. A same-source, cross-project or nonplanned destination is rejected before the intended write set commits. Every affected row should remain unchanged after rejection.

The valid assignment-first serial order permits assignment success followed by completion moving the issue out. The valid completion-first order rejects assignment to COMPLETED. Both leave the unfinished issue outside the completed source. Therefore a concurrency test should accept the documented outward possibilities while requiring the final invariant. Requiring assignment always to fail would exclude a valid serial order.

The unsafe schedule validates ACTIVE in assignment, completes and moves the currently selected issues, then writes the new assignment after completion. It demonstrates why each command's local reasoning is insufficient without compatible isolation or another enforcement mechanism. The current serializable helper is intended to prevent such an accepted nonserial outcome, but that intent needs database-backed evidence rather than a sequential model alone.

A rollback test must inject failure after some transaction work has occurred and reread durable rows. Mocking an immediate transaction rejection only tests handling of that rejection. Separate those claims in the report. The test database must be disposable and independently identified so cleanup cannot affect unrelated project data.

The current report sums current issue associations and current DONE categories. It is not an immutable start-of-sprint commitment snapshot in the inspected method. A historical reporting extension should capture scope at a defined event and record later scope changes separately. Naming a returned number committed does not create historical data that the schema never stored.

[Index](../README.md)
