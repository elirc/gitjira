# 5. A transaction callback may run more than once

The serializable helper permits at most three transaction attempts. It retries only a PrismaClientKnownRequestError with code P2034. After the final recognized conflict it throws a user-facing conflict. Other errors propagate. This bounded and typed policy is central to understanding what work is safe inside the callback.

## Count attempts precisely

The loop starts at attempt zero and continues while attempt is less than three. A conflict on attempts zero or one permits another iteration. A recognized conflict on attempt two becomes the outward conflict. Therefore there are at most three transaction executions, not three retries after an initial execution. Vocabulary matters when estimating load and writing tests.

Build four fixtures: success immediately; P2034 once then success; P2034 twice then success; P2034 three times. Record callback invocation count and outward result. Add an ordinary Error and a known Prisma error with another code. Those should not receive the same retry treatment. Tests should construct errors that satisfy the actual type check rather than merely assigning a code field to a plain object.

## Re-execute the decision

A transaction retry should rerun reads and business validation. Suppose assignment first sees an ACTIVE destination, encounters a serialization conflict, and then retries after another transaction completes that sprint. The second attempt should read COMPLETED and reject assignment. Reusing a value captured before the retry would defeat the purpose of obtaining a fresh consistent decision.

Likewise, completion may find a destination no longer PLANNED on a later attempt. That is a meaningful business conflict, not a transient database exception to suppress. The retry helper cannot promise that the original intent remains valid; it can only give the transaction another opportunity under the defined policy.

## Keep external effects out of retryable callbacks

Imagine adding an email notification inside the transaction callback after moving issues. If the database later aborts with P2034, the callback runs again and may send another email. Database rollback cannot retract the first email. The current inspected sprint method does not send such an email; this is a design exercise about a future extension.

A proposed outbox can record a notification intent in the same transaction as the sprint changes, then deliver it separately with its own deduplication and retry policy. The outbox solves a particular atomic recording problem, not every delivery problem. The delivery worker must still cope with “remote accepted, local acknowledgment failed.” Explain the second boundary rather than declaring the outbox exactly once.

## Retry budgets and user experience

The current loop has no backoff delay in the inspected helper. A proposal to add backoff should justify latency, contention behavior and testability. It should preserve the maximum attempt budget and avoid sleeping inside a test without a controlled clock. Jitter can reduce synchronized retries in some systems, but its benefit here needs measurement under a representative workload.

The final conflict asks the user to refresh and try again. A client should not silently layer an unbounded HTTP retry loop on top of the server's bounded transaction retry. Combining retry policies can multiply load and repeat commands whose state has changed. Document which layer owns which budget and how a user can cancel waiting without implying that a committed command was undone.

## Exercise

Write a retry decision table and a proposed notification design. Include the exact maximum attempts, the accepted error type and code, business revalidation on each attempt, and the location of external side effects. Then review a hypothetical patch that catches every exception and retries ten times. Identify at least four distinct problems: masking programming defects, increased load, repeated external effects and stale intent. Support each with a concrete sprint example.

[Index](README.md) · [Answers](answers/03-policy-and-client.md)
