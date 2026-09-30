# 29. Keep comments, tests and behavior aligned

This course repeatedly compares explanatory comments with actual code. Comments can preserve valuable design intent, but they can also describe a stronger guarantee than the current boundary provides. A maintenance review should treat them as hypotheses to verify, then update documentation and tests in a way that preserves historical context.

## Three examples to practice

The issue update comment describes optimistic concurrency, while the inspected final write lacks the expected timestamp predicate. The notification comment describes work off the request path, while enqueue is awaited before return. The activity comment explains safe invalidation, while an early refetch can still precede commit. None of these observations requires dismissing all comments; they require precise interpretation.

For each example, write a revised explanation that states the useful intent and the remaining boundary. If implementation changes later, update the explanation to match the verified new contract. Do not simply remove cautionary material because a test passes; identify what the test actually proves.

## Maintain a claim map

Create a small table of source symbol, lesson claim, supporting test and inspection date or hash. A file change triggers review of affected claims. It does not automatically invalidate every lesson. A renamed variable may leave behavior unchanged, while a new writer can invalidate an invariant without changing the original service method.

Include incoming references to shared contracts. If expectedUpdatedAt becomes required, update schemas, clients, service tests, API examples and conflict guidance. If a new workflow category is added, review completion queries, progress calculations and historical reports. The map should follow meaning across layers rather than only track file names.

## Avoid implementation-mirroring tests

A test that calculates expected moved issues by calling the same production filter can repeat its mistake. A test that checks only a comment's promised behavior without observing rows can miss drift. Prefer independent fixture expectations and meaningful mutations. Keep broad snapshots only where reviewers can understand which differences matter.

When a characterization test changes after a deliberate fix, preserve the old counterexample as context. The new test should demonstrate the desired behavior under the same dangerous schedule. This makes the reason for a predicate, constraint or generation check visible to future maintainers who might otherwise simplify it away.

## Review a proposed pull request

Imagine a patch makes general issue updates use an atomic version predicate and records activity from the matched version. A good description starts with the trigger: two users edit the same version concurrently. It states that the stale writer now receives conflict and cannot overwrite the winner. It names the controlled schedule and activity assertions used to verify the change.

Avoid a description that only lists files or says “improved concurrency.” Include the user-visible behavior and any compatibility change, such as making a token mandatory. If the patch also changes notifications, consider whether that belongs in the same review or should be separated so each boundary remains understandable.

## Exercise

Submit a claim map for five course topics and a sample pull-request description for one proposed fix. Include validation evidence and one remaining limitation. The reviewer should understand the problem without reading this conversation or the full course. The skill is communicating a final implementation clearly while keeping unsupported guarantees out of the narrative.

[Index](README.md) · [Review notes](answers/13-final-workshop.md)
