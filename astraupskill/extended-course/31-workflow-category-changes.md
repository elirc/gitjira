# 31. Completion depends on workflow metadata too

Sprint completion determines unfinished issues by querying workflow columns whose category is DONE. That means the operation depends on both issue assignments and workflow metadata. A concurrency review focused only on Sprint and Issue can miss another writer that changes a column's category while completion is deciding which issues to move.

## Derive the dependency

Suppose issue I belongs to source sprint S and column C. If C is DONE when completion evaluates its category set, I remains associated with S. If C is IN_PROGRESS, I moves to the chosen destination. The same issue row can therefore receive a different outcome because a related column changed. This is not necessarily a bug; it is a dependency that needs a clear policy.

Create a hypothetical workflow-category edit command in a disposable design model. This course does not assume such a writer exists without source inspection. First inventory actual workflow mutation paths. If category editing is currently unavailable, record the scenario as a future-feature review requirement. If it exists, examine its transaction and authorization boundaries before writing a concurrency claim.

## Choose a policy

One policy uses the category state observed by completion's serializable transaction. Another freezes workflow semantics for an active sprint. A third prohibits category changes that would affect active work without explicit migration. Each has product consequences. Freezing categories may require historical metadata; prohibiting edits can constrain administrators; live interpretation can make reports change when workflow definitions change.

State the desired behavior for an issue moving from a DONE category to an unfinished category after its sprint has completed. Does it remain in the completed sprint, move to backlog, or require a separate reopening command? The original completion invariant cannot answer every future state transition unless the system defines all relevant writers. This is why “no unfinished issues in completed sprints” needs a scope and lifecycle policy.

## Controlled schedules

If category editing is supported, design two serial orders: category change before completion and completion before category change. Then design an overlapping schedule and list acceptable results under the chosen policy. Check final issue association, column category, sprint state and any history event. A test that only checks movedCount can miss a later metadata change that alters the meaning of the result.

For a frozen-history proposal, capture the category interpretation in the completion record. That record explains why an issue remained even if the current workflow later differs. Current-state UI can show the new category while historical reporting uses the recorded completion semantics. Label both views so the user does not see contradictory totals without explanation.

## Review exercise

Write a dependency graph from completion to source state, destination state, issue assignment, issue column and workflow category. Annotate each edge with its writer and enforcement mechanism. Unknown writers should be marked unverified rather than omitted. This graph is a practical tool for reviewing future features that touch related data.

Submit one policy choice, two serial histories, a concurrency test plan and a historical-report explanation. The reviewer should see that invariants are maintained across a network of writers, not only inside the method whose name matches the feature. This final extension deepens the earlier assignment race without simply repeating it.

[Index](README.md)
