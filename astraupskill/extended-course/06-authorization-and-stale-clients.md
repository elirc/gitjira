# 6. Fresh data and current authority are different

The sprint service calls loadProject, which loads the project and invokes authorize for the requested action. [The project service](../../apps/api/src/services/project.service.js) separates membership from role permission. A nonmember receives a not-found result by policy, while a member lacking the action permission receives forbidden. This distinction limits disclosure and gives legitimate members a useful explanation.

## Follow the membership cache

The member map is read through a cache. Membership mutations invalidate that cache. The source comments explain why invalidation is relevant to authorization: a removed member should not continue receiving permission from a stale entry merely because it has not expired. A cache can improve a hot read path while also becoming part of the security decision path.

Create an exercise sequence: warm the membership cache for user U, remove U through the supported service, then attempt sprint management as U. Observe the invalidation call and the resulting authorization behavior. This tests more than checking an uncached database row. In a real distributed deployment, cache topology and invalidation delivery need their own evidence; a single-process fake cannot establish every instance sees the change immediately.

## Authorization before the transaction

In the inspected sprint service, project authorization occurs before entering the transaction helper. Consider a membership change after authorization but before the sprint mutation commits. The current code's exact behavior depends on those boundaries. Do not claim that serializable isolation of sprint rows automatically includes a membership decision made outside that transaction.

This is a policy-design exercise: should authority be checked at request admission, at commit, or against a revocable capability with defined lifetime? Each choice has costs. Rechecking inside every retry can improve freshness but couples authorization reads to transaction behavior. A short-lived capability can make the contract explicit but adds issuance and revocation complexity. State the desired rule before proposing a code change.

## Stale screens need careful recovery

A browser can hold stale issue data while still having current authority, or current issue data after losing authority. The UI should not treat every rejected assignment as the same refreshable conflict. A stale expectedUpdatedAt suggests comparing intent with current state. A forbidden response suggests explaining permissions. A not-found response may intentionally conceal whether the project or issue exists.

For optimistic UI, keep a request identity and a rollback snapshot or a reconciliation strategy. If request A finishes after a newer request B, an old response should not blindly overwrite the latest visible intent. Yet canceling a browser request does not prove the server did not commit it. The next durable read remains essential when the network outcome is uncertain.

## Client design workshop

Design a sprint assignment component with four explicit states: viewing, saving, conflict review and unavailable. Include the loaded issue token, desired destination and request identity. Define how a new selection while saving behaves. You may serialize commands, supersede local intent, or queue an explicit next command, but explain how each server response is associated with the request that produced it.

Add a cross-tab case. Tab A changes the assignment, and tab B later submits its old token. The conflict panel must preserve B's attempted destination without presenting it as stored truth. Add a permission-removal case during a save. The UI should recover without leaking project details through cached error text or assuming permission can be restored by changing the timestamp.

## Review standard

Submit a request-state diagram, a membership-cache test plan and an authority-timing policy note. The best answers distinguish database freshness, user intent and actor authority. Avoid vague advice to “refresh everything” without specifying what happens to the user's pending selection. The exercise is complete when another developer can implement the client behavior and know which uncertainty remains after a lost response.

[Index](README.md) · [Answers](answers/03-policy-and-client.md)
