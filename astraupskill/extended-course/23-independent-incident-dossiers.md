# 23. Diagnose four inconsistent-looking sprint incidents

These synthetic dossiers combine multiple layers of the project. They are independent assessments rather than worked changes. For each, list observations, plausible histories, the next useful check and a safe recovery proposal. Do not change real project data while investigating; reproduce with disposable fixtures.

## Dossier A: assignment succeeded, but the issue is in backlog

A user assigns unfinished issue I to active sprint S and receives success. Seconds later, another user completes S to backlog. The first user refreshes and sees I unassigned. They report that the assignment was lost. The API logs show both commands succeeded, and the database shows S COMPLETED with I.sprintId null.

Explain the acceptable serial history. Assignment can commit first, then completion legitimately moves I. A successful response describes the command's result at its commit, not a promise that no later command can change the row. The user needs an activity explanation that connects the later completion to the move, rather than a generic claim that the assignment failed.

Propose a completion history record that identifies moved issues and the actor. Define how the UI can show the later change without presenting it as a stale-write conflict. Then reverse the order: completion commits before assignment validation. Predict the rejection and explain why the same final row can arise through a different history.

## Dossier B: a removed member briefly manages a sprint

An administrator removes a member. A supported invalidation call deletes the cached membership key. A membership load that began earlier completes afterward with the old map and stores it. A subsequent request uses that map. The report says “invalidation ran, so authorization must be current.”

Construct the stale-resurrection schedule and identify which observation contradicts that conclusion. Invalidation execution is a fact, but it does not prove no older loader can repopulate the key. Propose a generation-based repair and define its scope across processes. If the real deployment uses Redis, identify the additional shared coordination evidence needed.

Now add an already-authorized request that began before removal and commits afterward. Even a perfect cache invalidation protocol does not answer whether that request should be allowed under the product's authority timing policy. Separate the cache race from the admission-versus-commit policy. A strong investigation does not mix two different causes simply because both involve removed members.

## Dossier C: the board shows the wrong card after rollback

Card A moves optimistically, then card B moves. A's request fails and restores an earlier whole-list snapshot. B disappears from its optimistic destination while its request is still pending. Later a refetch repairs the board. The database never contained the briefly displayed combination.

Explain how immutable snapshots can still conflict when restored out of order. Immutability protects snapshot contents; it does not establish mutation ordering. Draw cache states after each hook callback. Propose per-item serialization, conditional rollback or a pending-intent ledger, and state what happens when both moves concern the same card.

The user may describe this as data loss even if the server is correct. Write a product response that acknowledges the confusing display without asserting durable loss. Then design a regression test with two controlled promises and visible-state assertions at intermediate points, not only after the final refetch.

## Dossier D: the issue exists but creation returned an error

An issue creation transaction commits with its project number and activity row. Postcommit notification enqueue fails. The browser receives an error and retries creation. A second issue appears with a different number and the same title. The project counter is still internally consistent: both rows have unique numbers.

Explain why the numbering invariant did not prevent duplicate user intent. The operation lacks a stable creation-command receipt in this scenario. Propose an idempotency contract scoped to actor and project, including changed-payload behavior and retention. Alternatively, define a recovery read that lets the client confirm the first creation before repeating it, while acknowledging that title alone is weak identity evidence.

Design an outbox for notification intent so delivery failure does not need to make issue creation appear absent. Decide whether the API returns the committed issue with a separate delivery-pending state or uses another contract. Avoid claiming the outbox guarantees exactly-once notifications; recipient delivery still needs its own recovery policy.

## Cross-case evidence table

For all four dossiers, separate durable state, transient client state, actor authority and notification state. The same outward word “failed” can refer to a rejected command, a postcommit handoff error, a stale screen or an invalidated permission. A useful incident report names the layer and the last confirmed boundary.

Choose one dossier and write a minimal reproduction plan with a gate, a fixture and a decisive assertion. Then write a second assertion that prevents an unsafe repair. For example, recovering creation should not create another issue, and fixing board rollback should not suppress a real server conflict.

## Assessment

Give full credit only when the learner proposes different repairs for the different causes. Resetting caches everywhere is not a universal solution. Retrying every request can repeat durable commands. A good report identifies the missing contract, uses evidence to narrow the cause and preserves user intent while restoring a truthful view.

[Index](README.md) · [Review notes](answers/12-incidents-and-capstone.md)
