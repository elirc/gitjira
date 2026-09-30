# 19. Whole-cache rollback can erase a newer optimistic change

useMoveIssue snapshots the cached issue list, creates a new object for the moved issue, restores the previous snapshot on error and refetches on settlement. The immutable update is important because the snapshot shares references with prior cached objects. The next challenge is overlapping mutations: two valid snapshots can still interfere when restored out of order.

## One move is easy to reason about

For a single move A, the hook cancels matching queries, captures previous data, updates the moved issue in a new array and sends the request. If the request fails, restoring previous returns the UI to its earlier state. If it succeeds, a refetch reconciles with the server. The current code's immutable mapping prevents the snapshot itself from being mutated accidentally.

Write a component or hook test with one issue and a rejected fake request. Assert that the visible column changes immediately and then returns. Also assert that the original cached issue object was not mutated in place. This establishes the basic rollback contract but not concurrent behavior.

## Two different cards

Now move card A, then move card B before A settles. B's snapshot may include A's optimistic move. If A fails and restores its older whole-list snapshot, B's optimistic move can disappear temporarily even if B later succeeds. If B then fails and restores its snapshot, it can reintroduce A's failed optimistic state. Subsequent refetch may repair the screen, but the intermediate behavior can be confusing and depends on timing.

Build the schedule with controlled promises. Record cache contents after each onMutate, onError and onSettled. Use distinct card identifiers so the test exposes cross-card interference. A test with only one moving card cannot reveal a whole-cache rollback overwriting unrelated optimistic work.

## Two moves of the same card

The same card moved twice creates another problem. The second action may represent the user's latest intent, while the first response arrives later. A stale success or failure should not blindly decide the final visible position. The server's current move API does not include the sprint assignment version predicate, so client sequencing and server conflict policy deserve separate design.

Possible client strategies include serializing moves per issue, keeping a mutation ledger and replaying pending intents over confirmed state, or using request generations to ignore stale local rollback. Each has tradeoffs. Ignoring an old response locally does not undo a server commit, so eventual reconciliation must still read durable state or use a stronger command/version contract.

## Patch rollback versus snapshot rollback

A narrow rollback can restore only the fields and item changed by a failed mutation, but even that can overwrite a newer mutation of the same fields. An inverse operation needs a version or generation condition. A mutation ledger can recompute visible state from a confirmed base plus still-pending actions, making overlapping intent explicit at the cost of more state management.

Design the simplest strategy that meets the product's needs. A small board may reasonably disable another move of the same card until the first settles while allowing other cards to move. That reduces one race without solving every multi-user conflict. State the remaining server-side behavior so the UI policy is not mistaken for global serialization.

## Filtered caches

The hook uses a query key derived from project and filters. A card can appear in several cached lists. Updating one key may leave another filtered view stale until invalidation or refetch. The onSettled behavior should be inspected to see which key family it refreshes. A test should include a board view and a filtered list if both can coexist.

Do not mutate every cache indiscriminately. Define which queries contain the affected entity and whether an optimistic move changes filter membership. Moving a card out of a selected column may remove it from one list and add it to another. Counts and pagination make this more complex than changing one object's columnId.

## Deliverable

Submit traces for two cards and one card moved twice, then propose a rollback protocol with explicit request identity. Include a lost-response case and explain how durable state is recovered. A strong answer preserves the useful immutable update while identifying the separate ordering problem of overlapping snapshots.

[Index](README.md) · [Review notes](answers/10-browser-and-schema.md)
