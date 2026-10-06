# Complete the sprint and move work together

Completion first resolves the authorized project, then enters a serializable transaction. It loads the source sprint within that project and asks the state machine for the completion transition. A supplied destination is checked for self-reference, project ownership, and PLANNED state. The backlog is represented by a null destination.

The handler identifies DONE workflow columns and claims the source transition with updateMany restricted to ACTIVE. If another request already completed the sprint, the conditional update changes zero rows and the service rejects the request. Unfinished issues then move in one bulk update within the same transaction. The response returns the persisted sprint, including its completion timestamp, and the actual moved count.

This sequence prevents a partial success in which the sprint becomes completed but unfinished issues remain stranded because a later write failed. It also ensures destination rejection occurs before mutation. Concurrent assignment uses the same serializable boundary so it cannot commit an incompatible assignment after completion's view of unfinished work.

Read the excerpt and mark every database statement. Identify which predicates scope data to the project, which express lifecycle state, and which select unfinished work. Do not describe the transaction as an external side-effect guarantee: this path coordinates local database changes, while other infrastructure has separate delivery semantics.

## Source excerpt

From [apps/api/src/services/sprint.service.js](../apps/api/src/services/sprint.service.js), lines 77–128.

```js
export async function completeSprint(projectKey, actorId, sprintId, { moveUnfinishedTo }) {
  const project = await loadProject(projectKey, actorId, 'sprint:manage');
  const destination = moveUnfinishedTo === 'backlog' ? null : (moveUnfinishedTo ?? null);

  return serializable(async (tx) => {
    const sprint = await tx.sprint.findFirst({ where: { id: sprintId, projectId: project.id } });
    if (!sprint) throw notFound('Sprint');

    const nextState = assertTransition('complete', sprint.state);

    if (destination) {
      if (destination === sprint.id) {
        throw conflict('Unfinished issues cannot stay in the completed sprint');
      }
      const target = await tx.sprint.findFirst({
        where: { id: destination, projectId: project.id },
        select: { state: true },
      });
      if (!target) throw notFound('Destination sprint');
      if (target.state !== 'PLANNED') {
        throw conflict('Unfinished issues can only move to a planned sprint');
      }
    }

    // Find unfinished issues (not in a DONE column).
    const doneColumnIds = (
      await tx.workflowColumn.findMany({
        where: { projectId: project.id, category: 'DONE' },
        select: { id: true },
      })
    ).map((c) => c.id);
    // LEARN: complete + move in ONE transaction (review finding). Either the
    // sprint completes AND every unfinished issue moves, or nothing changes — a
    // crash mid-way can no longer leave a COMPLETED sprint with issues stranded
    // in it. The N-update loop also collapses into one `updateMany`, which is
    // faster too. Atomicity is a transaction's entire reason for existing; ask
    // it of every operation that writes more than once.
    const completed = await tx.sprint.updateMany({
      where: { id: sprint.id, projectId: project.id, state: 'ACTIVE' },
      data: { state: nextState, endAt: new Date() },
    });
    if (completed.count === 0) throw conflict('Sprint was already completed');

    const moved = await tx.issue.updateMany({
      where: { sprintId: sprint.id, columnId: { notIn: doneColumnIds } },
      data: { sprintId: destination },
    });
    const persisted = await tx.sprint.findUnique({ where: { id: sprint.id } });

    return { sprint: persisted, movedCount: moved.count };
  });
}
```

## Worked-change exercises (read-only)

1. **Goal:** classify every predicate in the excerpt.
   **Check:** project scope is `projectId: project.id` on lines 82, 92, 104 and 115. Lifecycle is `assertTransition` (85), `target.state !== 'PLANNED'` (96) and `state: 'ACTIVE'` (115). Unfinished work is `columnId: { notIn: doneColumnIds }` (121). The bulk move (line 121) has no project filter of its own. Explain why `sprintId: sprint.id` already scopes it.
2. **Goal:** show that every rejection happens before the first write.
   **Check:** every `throw` before line 114 (lines 83, 85, 89, 95, 97) runs before `tx.sprint.updateMany`. The regression `rejects cross-project completion destinations without changing source state` (`apps/api/test/sprint.test.js` lines 181–217) proves it from the outside: after the 404, the source sprint is still `ACTIVE` and the issue is still assigned to it.
3. **Goal:** list what the pre-change version got wrong.
   **Check:** run `diff astraupskill/snapshots/apps__api__src__services__sprint.service.js.original.txt apps/api/src/services/sprint.service.js` and read the old `completeSprint`. You should find four gaps. (a) The sprint state and unfinished count were read *outside* the transaction. (b) `sprint.update` had no `state: 'ACTIVE'` guard, so two completions could both succeed. (c) `moveUnfinishedTo` was never checked, so a foreign or completed sprint id was accepted. (d) `movedCount` came from a `count()` taken before the move, not from the move's own result.

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
