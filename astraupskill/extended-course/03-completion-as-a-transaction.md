# 3. Completing a sprint changes a collection

Sprint completion is more than a state label. It validates the destination, changes the source lifecycle and moves unfinished issues. Those writes must be interpreted as one operation. If the source became COMPLETED while unfinished issues remained stranded because a later write failed, the durable state would violate the workflow's intended meaning.

## Follow the current transaction

The service loads the project and authorizes sprint management before entering the serializable helper. Inside the transaction it reads the source sprint scoped to that project and applies the complete transition. It validates a non-null destination: the destination cannot be the source, must belong to the same project and must be PLANNED. It then finds the project's DONE column identifiers.

The source update is conditional on the source still being ACTIVE. A zero update count becomes a conflict. The issue update selects rows assigned to the source whose column is not one of the DONE columns. Those unfinished issues move to the chosen destination or to backlog, represented by null. The transaction returns the persisted source and the count of moved rows.

Each detail has a purpose. Project scoping prevents a valid identifier in another project from becoming an authorized destination. Checking the destination inside the transaction connects the decision to the transaction's consistency model. The conditional source update gives an explicit winner check. The set-based issue update avoids splitting a collection move into a series of independent commits.

## Construct a fixture with different issue categories

Use source S with three issues: I1 in TODO, I2 in IN_PROGRESS and I3 in DONE. Complete S to backlog. Predict S's state, each issue's sprint and movedCount. I3 remains associated with the completed sprint, while I1 and I2 move. Therefore the invariant is not “a completed sprint contains no issues.” It is about unfinished issues and assignment rules. This distinction matters when writing a database assertion or a support query.

Now complete to planned destination D. The unfinished issues move to D, while the done issue remains with S. Then try D equal to S, D in another project and D already ACTIVE. Describe which validation rejects each case and verify that S and every issue remain unchanged. A response-only assertion is insufficient for a multirow operation.

## Failure between local statements

Inject a failure after changing S but before moving issues. In a correctly executed transaction, the source change rolls back. Use a disposable database to observe the durable state after the failed request. A fake repository that simply calls functions sequentially without transaction semantics cannot establish this rollback property, even if its method is named transaction.

A different test can mock a transaction exception to examine outward error behavior. Keep those tests separate. One asks whether the service maps an exception appropriately; the other asks whether the storage adapter actually preserves atomicity. A useful test report states which question each test answers.

## Reporting follows the stored model

The sprintReport method sums story points for issues currently associated with the sprint, using current DONE column membership. It does not, in the inspected code, read an immutable commitment snapshot captured at sprint start. That means the word “committed” in the returned object should be interpreted carefully. Moving unfinished issues out can change which rows remain available to sum.

Design a proposed historical report that stores a start-of-sprint snapshot if the product needs stable committed scope. Explain when the snapshot is captured, how later scope changes are recorded and how current progress differs from historical commitment. This is an extension exercise, not a claim that the snapshot exists today.

## Submission

Provide before/after tables for the three-issue fixture, rejection cases, a rollback test plan and a report-semantics note. A reviewer should see the difference between current associations and historical scope. Full credit requires preserving done issues in the expected result and checking that rejected completion leaves all affected records unchanged.

[Index](README.md) · [Answers](answers/02-transactions.md)
