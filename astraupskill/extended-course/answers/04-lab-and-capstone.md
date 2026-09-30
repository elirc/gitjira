# Answers: model interpretation and capstone

The sequential model shows that both acceptable serial orders end safely. It does not show that PostgreSQL will serialize every actual concurrent history in the intended way. A correct lab report names this limit and proposes a controlled database schedule. The timestamp mutation should break monotonic advancement; the ignored-token mutation should permit a stale overwrite.

For the completion-record proposal, the command identity should be scoped to the relevant project or actor contract, with explicit changed-payload behavior. Reusing an identity for a different destination should not silently return an unrelated result. The completion record, source state and moved rows belong in one transaction. Notifications belong in a separately delivered intent or another explicitly justified boundary.

The historical record should retain which issues moved at completion even if those issues later move again. Current associations answer “where are they now?” The completion record answers “what did this command do?” Both views are useful and should not be conflated in reporting or support tools.

A strong capstone includes a controlled race, a stale version, repeated transaction conflicts, a changed permission and a lost response. It explains accepted outcomes before proposing implementation. Reviewers should reject solutions that pass only because every error becomes a generic conflict or because the test never checks final durable rows.

[Index](../README.md)
