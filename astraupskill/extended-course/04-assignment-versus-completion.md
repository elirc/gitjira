# 4. Two correct-looking commands can form a race

The most instructive sprint race pairs completion with assignment. One request completes active sprint S and moves its unfinished issues to backlog. Another request assigns a previously unassigned unfinished issue I to S. If assignment validates S before completion but writes afterward without compatible transactional protection, I could end up in a completed sprint.

## Serial histories as a specification

First reason about two serial orders. If assignment happens entirely before completion, I joins S and completion subsequently moves I to backlog. Assignment can return success, yet a later read shows backlog because another valid command followed it. If completion happens entirely before assignment, assignment observes COMPLETED and rejects. Both serial histories end with I outside S.

This gives a useful invariant for concurrent execution: after the operations settle, the unfinished issue must not be stranded in the completed source sprint. It does not require assignment always to fail. A test that insists on a 409 in every race would reject the valid assignment-then-completion history. A test that accepts any status without checking the final row would be too weak.

## Recognize the unsafe schedule

In an unsafe design, assignment reads S as ACTIVE, completion changes S to COMPLETED and moves the currently visible issues, then assignment writes I.sprintId = S. Both methods may appear locally sensible, and both may return success. The final state violates the invariant because the assignment's validation was detached from its write with respect to the competing transaction.

The current service runs both commands through its serializable helper. That choice is intended to make conflicting operations behave like an acceptable serial order or fail and retry under recognized database conflicts. Do not reduce this to “transactions prevent races.” Isolation level, read/write sets, database behavior and all participating writers matter. A separate unprotected writer could still undermine the model.

## Controlled concurrency tests

The existing test starts requests together and checks final state. That is useful, but a scheduler may not hit the dangerous overlap on every run. For a deeper lab, introduce barriers in a disposable test copy or an injectable repository seam. Pause assignment after reading S, allow completion to reach its relevant write, then release assignment. Record transaction attempts and final rows.

The barrier must not become a production behavior change. Keep it in a test harness or disposable exercise branch. Use a timeout to fail a deadlock cleanly, not a sleep to hope the operations overlap. Run the opposite schedule as well. Your evidence should show the intended interleaving actually occurred, rather than merely that two promises were launched near each other.

## Extend the schedule set

Try two completions of the same source, completions to different destinations, assignment while the destination starts, and assignment with a stale expectedUpdatedAt. For each, list acceptable serial results before writing test assertions. A completion destination must be planned at validation; if another command changes it concurrently, explain which transaction should retry or reject and why.

Do not assume every conflict should be hidden by unlimited retries. A stale user's intent can become invalid after a fresh read. Retrying the transaction should re-evaluate business rules, and the final response may properly be a conflict. The client then needs a refreshed explanation rather than a fabricated success.

## Assessment artifact

Submit a schedule table with operations as columns and database events as rows. Include both acceptable serial orders, the unsafe nonserial schedule, and a controlled test design. State final issue location and source lifecycle for every case. Reviewers should reward explicit final-state assertions and reject conclusions based only on request ordering in application logs.

[Index](README.md) · [Answers](answers/02-transactions.md)
