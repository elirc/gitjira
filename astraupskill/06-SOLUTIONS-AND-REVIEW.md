# Review the transition contract

For the shared-version race, one assignment succeeds and one returns a conflict. The final sprint belongs to the winner, and the timestamp advances. The version belongs in the update predicate because a prior read can become stale before the write. Serializable retry may rerun the transaction, but the unchanged expected version must still lose against the winner's update.

With a future stored timestamp, the next value is precisely the previous value plus one millisecond. This retains a strictly advancing version without assuming a monotonic wall clock. The test compares the exact difference, so replacing the expression with Date.now would be detected.

In the assignment-versus-completion race, assignment can succeed before completion moves it or can lose with a conflict. In either accepted ordering, the final issue cannot remain assigned to the completed sprint. Checking only the assignment response would miss that essential final-state property.

A foreign destination is not found within the authorized project. Self-reference and nonplanned completion destinations are conflicts. The source remains active and its issue remains assigned after rejection. A nonmember receives the established project-concealing 404, with no mutation.

The retry helper permits three attempts only for P2034. After exhaustion it reports a conflict; unrelated errors propagate. Reviewers should check the scope of the entire retry, the state-qualified writes, destination ownership, and the browser's version handling. Passing isolated API tests does not establish the user's browser recovery experience, which requires its own workflow verification.

## Source excerpt

From [apps/api/src/services/sprint.service.js](../apps/api/src/services/sprint.service.js), lines 14–28: the retry helper the last paragraph reviews.

```js
async function serializable(work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (retryable && attempt < 2) continue;
      if (retryable) throw conflict('Sprint changed during this request; refresh and try again');
      throw error;
    }
  }
}
```

## Verify the solutions against source (read-only)

- **Goal:** confirm "three attempts, P2034 only, then a conflict".
  **Check:** the loop bound is `attempt < 3` (line 15). Retry happens only when `retryable && attempt < 2` (line 23). `retryable` requires both `PrismaClientKnownRequestError` and `code === 'P2034'` (lines 21–22). On the third failure line 24 throws the domain `conflict`, and any other error is rethrown unchanged (line 25).
- **Goal:** confirm the future-clock answer is exact, not approximate.
  **Check:** `apps/api/test/sprint.test.js:111` uses `toBe(captured.getTime() + 1)`, an exact equality. A version of line 152 that used plain `Date.now()` would fail it by about 60,000 ms.
- **Goal:** confirm the assignment-versus-completion answer is checked on final state, not on the response.
  **Check:** `apps/api/test/sprint.test.js` lines 268–274 accept either 200 or 409 for the assignment. They then read the issue's detail and require `sprintId` to be `null`.

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
