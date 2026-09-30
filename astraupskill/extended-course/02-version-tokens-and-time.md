# 2. A timestamp can be a version token

Issue assignment accepts expectedUpdatedAt. The service uses that value in a conditional update when the caller supplies it. This is optimistic concurrency: the command says “apply my change only if the issue is still the version I observed.” The timestamp is serving as a comparison token, not merely as a display of when something happened.

## Two browser tabs

Tabs A and B load issue 17 with timestamp T and no sprint. A assigns S1 using T. B assigns S2 using T. Once A's update commits with a newer timestamp, B's predicate no longer matches. B receives a conflict instead of silently replacing A's assignment. The final result depends on which command wins, but a stale expected token should not overwrite the winner.

Notice the optional nature of the token in the current code. If expectedUpdatedAt is absent or otherwise falsy at this service boundary, the timestamp condition is omitted. That means the service supports a less protective request shape. Inspect route validation and clients to learn which callers normally send the field. Do not claim that every assignment is protected by optimistic comparison merely because the conditional code exists.

## Why use the maximum?

The next timestamp is calculated as the maximum of current wall-clock milliseconds and the prior stored timestamp plus one millisecond. Suppose the stored time is 10,000 and the clock says 9,500. A plain clock assignment would move the token backward to 9,500. The current calculation produces 10,001, ensuring a successful assignment advances relative to the observed stored value.

Suppose two successful changes happen in the same clock millisecond. The second still needs a distinct token. Advancing from the previous value prevents identical timestamps from making a stale command look current. The important property is monotonic change for this issue under the supported transaction behavior, not accurate elapsed duration inferred from subtracting the tokens.

This design depends on storage precision preserving the intended distinction. A teaching model using integer milliseconds does not prove the configured database column and serialization path retain that precision. A database-backed contract test should save, read, serialize, submit and compare representative values. Include a stored future timestamp and two rapid updates. Keep timezone parsing and precision questions separate from the monotonic arithmetic itself.

## Stale intent is still valuable

A conflict response does not mean the user's desired assignment is meaningless. The client should preserve what the user tried to do, fetch the current issue, and explain the difference. Blindly replacing the expected timestamp with the latest value and resubmitting would defeat the purpose of the comparison by turning a stale action into an unreviewed overwrite.

Design a conflict panel showing the user's requested sprint, the current sprint and the current version. Offer an explicit reapply action after the user reviews the change. If the destination has become completed, a fresh timestamp alone cannot make the assignment legal. The service must revalidate the destination lifecycle on the new command.

## Worksheet

Calculate nextUpdatedAt for stored/clock pairs 1000/1200, 1000/1000, 1000/900 and 9999/10000. Then trace two requests with the same expected value. Add a third request with no expected value and explain how its predicate differs. Finally, change the clock while keeping the stored token fixed and identify which behaviors are about concurrency and which are about time representation.

Submit the calculations, a client conflict design and a database precision test plan. The strongest answers state what is currently optional, what is guaranteed by the arithmetic, and what still requires integration evidence. Avoid calling a timestamp a globally ordered event sequence: it is scoped to the update logic and data model being examined.

[Index](README.md) · [Answers](answers/01-state-and-time.md)
