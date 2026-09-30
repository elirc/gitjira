# 8. Similar version checks can have different strength

Read [issue.service.js](../../apps/api/src/services/issue.service.js) beside the sprint assignment method. Both discuss optimistic concurrency, but their inspected write predicates differ. The general updateIssue path compares expectedUpdatedAt against a previously loaded issue before entering a later transaction. Its final issue.update uses the issue identifier. Sprint assignment includes the expected timestamp in the conditional updateMany predicate. This is a valuable source-review contrast.

## State the observation carefully

The general update path checks the loaded timestamp and can reject an already stale request. That is useful. However, another writer can potentially change the row after this comparison and before the final update. The source-level gap motivates a controlled race test. It is not necessary to claim that every concurrent update is lost or that a production incident has already occurred.

Construct two callers A and B with the same loaded issue version. Pause both after the comparison passes. Let A update the title, then let B update the same title. If the final writes are unconditional by version, both can succeed and B can overwrite A. The transaction around activity records does not automatically turn the earlier timestamp comparison into an atomic predicate on the issue write.

## Compare with sprint assignment

Sprint assignment computes a new timestamp and uses updateMany with the expected token when supplied. A stale token produces count zero. The predicate is evaluated at mutation time. Its serializable callback also rereads the destination and issue on retry. These differences are more informative than saying both methods “use optimistic concurrency.”

Build a comparison table with read location, expected-token validation, final write predicate, isolation level, version advancement, side effects and error mapping. Include the optional-token case in both paths. If route validation imposes additional requirements, record those separately. A service function's direct-call contract can be wider than the HTTP route's accepted input.

## Activity history can also become misleading

The general update path uses the earlier issue object to decide whether priority or assignee changed and to populate from values. If another writer changes those fields before the transaction, the recorded from value may describe the earlier read rather than the state immediately before this update. The local activity row can still commit atomically with the update while its semantic before-value is stale.

This distinction is subtle: atomic recording means the activity row and mutation succeed together. It does not automatically mean every field in the activity payload was derived from the correct version. A proposed repair should obtain the before-state within the same concurrency contract as the write, or reject stale commands conditionally before recording history.

## Design a consistent update protocol

One proposal uses a required version token for editable issue fields and a conditional update inside a transaction that records activity. Another uses a transaction with a fresh read and an isolation strategy that prevents the unwanted overwrite. Either way, define how a conflict is returned and how the client preserves attempted changes. The solution should cover all issue writers, not only the one method used in a demonstration.

List move, assignment, general update, bulk changes, imports and background jobs as investigation targets if they exist. Do not assume they all participate. A shared helper can reduce drift, but it must still expose operation-specific authorization and lifecycle checks. Abstraction should make the invariant easier to audit, not hide every mutation in a generic function with unclear semantics.

## Exercise

Prepare one characterization schedule for the general update and one desired-contract test for a proposed fix. Use barriers rather than sleeps. Assert final title, timestamp, activity from/to values and outward responses. Include a case in which two users edit different fields so you can decide whether the product wants conflict rejection or field-level merging. Those are different policies and should not be chosen accidentally by partial update mechanics.

The reviewer should see both the strength and limit of each current path. Full credit requires distinguishing atomic activity persistence from correct historical meaning and identifying the exact predicate that rejects a stale write. The lesson is to inspect the mutation, not trust a comment or familiar pattern name.

[Index](README.md) · [Review notes](answers/05-issue-and-cache.md)
