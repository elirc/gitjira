# 30. Conduct a paired review of one command

Choose sprint completion, issue creation or board movement. One learner acts as implementer and the other as reviewer. The goal is a reviewable design and evidence package, not a broad rewrite. Use the actual source to establish current behavior, then propose one focused improvement.

## Establish the command contract

The implementer states actor, project, resource identity, expected version or command key, requested change and returned result. The reviewer asks which values are user intent and which are current observations. For completion, destination is intent while source state is observed. For movement, neighbor positions may be stale observations. For creation, a command key can identify intent independently of the newly allocated issue number.

Draw the durable writes and external effects. Put activity rows inside their actual transaction and queue submission or realtime emission at their actual positions. If a comment describes a different placement, follow the executable code and record the discrepancy. This diagram is the foundation for every later claim.

## Challenge with concurrent actors

The reviewer introduces a second user at the weakest boundary. They may complete the destination sprint, update the issue, remove membership or move a neighboring card. The implementer lists acceptable final states before proposing a lock or retry. If the design cannot say what should happen, implementation details are premature.

Add a lost response after commit. Ask how the browser discovers whether its command happened and whether repeating it is safe. A current read may reveal state but not the exact command history. A proposed receipt can help, but its scope and payload equivalence need definition. The reviewer should challenge any use of title or display key as a substitute for a stable command identity.

## Challenge the evidence

The implementer presents one test and the reviewer proposes a mutation. Removing a predicate, changing a category filter or restoring a stale snapshot should cause a relevant assertion to fail. If it does not, improve the test or narrow the claim. A test that passes because an unrelated authorization check rejects the fixture is not evidence for transaction correctness.

Inspect environment assumptions. Is the database real and disposable? Is Redis bypassed? Is queue delivery faked? Does the browser test load only one page? State these limits in the report. Honest scope makes the result more useful because another developer can identify the next missing layer.

## Explain the result to two audiences

Write a user-facing explanation of the new behavior without internal implementation jargon. Then write a reviewer-facing paragraph naming the invariant, enforcement point and test. The two explanations should agree. If the user is told that stale edits cannot overwrite changes, the technical evidence must support that claim across the relevant write path.

For a rejected alternative, give a concrete reason. “Too complex” is less useful than “holding a transaction across queue submission adds a remote wait without making Redis rollback with the database.” “Use caching” is less useful than a generation protocol that prevents a stale membership load from surviving invalidation.

## Final artifact

Submit a one-page contract, one schedule, one independent oracle, one mutation result and a concise change description. Add a remaining-question section naming a narrow follow-up. The workshop passes when both learners can explain the command's successful, rejected and uncertain outcomes using the same identities and boundaries.

The broader lesson is transferable: data shape, actor authority, lifecycle legality, concurrent version and durable side effects are separate dimensions. Reliable engineering composes them explicitly and tests the places where they meet. GitJira provides concrete examples of each, making this portfolio useful beyond a single sprint feature.

[Index](README.md) · [Review notes](answers/13-final-workshop.md)
