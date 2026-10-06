# Predict winners and unchanged rows

Each exercise has the same shape. **Write your prediction first**, then do the **Check**, which points to the regression test (and its assertions) that settles it. Every check is read-only. You only need the source and `apps/api/test/sprint.test.js`, with no install or database. To run the tests for real, see [VERIFICATION](VERIFICATION.md).

**Exercise one: shared stale token.** Two browser tabs load issue version T. Tab A assigns sprint S1 and tab B assigns S2 using the same version. Predict the two statuses and final assignment. State why simply reading T before an unconditional update would leave a race even inside otherwise well-structured service code.
**Check:** `allows exactly one assignment with a shared stale-write token` (lines 114–136): statuses sort to `[200, 409]`, the winner's `updatedAt` changed, and its `sprintId` is S1 or S2. For the "why", compare the pre-change `assignIssueToSprint` in `astraupskill/snapshots/apps__api__src__services__sprint.service.js.original.txt`, which ends in an unconditional `prisma.issue.update`.

**Exercise two: a clock that is behind.** Place the issue timestamp one minute ahead of the wall clock. Assign it with that exact expected timestamp. Calculate the next stored value and explain how a subsequent stale request is rejected. Contrast this with assigning Date.now without comparing the previous value.
**Check:** `strictly advances the assignment token…` (lines 96–112) expects exactly `captured.getTime() + 1` (line 111). A later request that still carries `captured` matches zero rows in the `updateMany` (`sprint.service.js:153–159`) and gets the 409 at line 161.

**Exercise three: assignment racing completion.** Complete an active sprint while another request assigns a previously unassigned issue to it. Enumerate the acceptable assignment outcomes and the final issue location. Identify why both paths need compatible transactional behavior; protecting completion alone cannot control an unrelated writer.
**Check:** `never strands a concurrent assignment in a sprint being completed` (lines 244–275) allows the assignment to return 200 or 409 but always requires the issue to end in the backlog (`sprintId` null, line 274). Both writers enter `serializable()` (`sprint.service.js` lines 81 and 137).

**Exercise four: three bad destinations.** Use a destination sprint in another project, then the source itself, then a completed destination. Predict which validation rejects each request and which durable rows remain unchanged. Separate project concealment from lifecycle conflict.
**Check:** in `completeSprint`, a foreign sprint is not found within the project, which gives a 404 (`sprint.service.js:95`). The source itself is a 409 (line 89). A non-`PLANNED` destination is a 409 (line 97). Only the foreign case has a regression (lines 181–217). It shows the source still `ACTIVE` and the issue still assigned. Sketch the two missing tests by copying its shape.

**Exercise five: retry exhaustion.** Force repeated recognized serialization conflicts. Count the maximum transaction attempts and identify the final outward error. Then consider an unrelated programming exception: explain why retrying it under the same policy would hide defects or repeat work unnecessarily. Locate the exact error-code check before proposing a change.
**Check:** `sprint.service.js` lines 14–28 allow three attempts. The third `P2034` becomes `conflict('Sprint changed during this request; refresh and try again')`, and anything else is rethrown on line 25. No test forces `P2034` deterministically, because the race tests only make it possible. Write down how you would force it. Extended lesson [17](extended-course/17-build-a-concurrency-test-harness.md) covers this.

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
