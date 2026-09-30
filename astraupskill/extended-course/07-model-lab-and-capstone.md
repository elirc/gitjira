# 7. Build evidence for a concurrency claim

The [schedule model](labs/sprint_model.py) is a small, dependency-free Python program. It models issue version advancement, conditional assignment, completion and accepted serial schedules. It does not execute Prisma, PostgreSQL, HTTP authentication or the application's JavaScript. Its role is to make expected states explicit before designing integration tests.

## Predict before running

Run `python labs/sprint_model.py` from this course directory after filling a table for the two serial orders. Assignment before completion should briefly put the unfinished issue in the active sprint and then move it to backlog. Completion before assignment should reject the assignment. Both orders should end with no unfinished issue in the completed sprint. The model also checks stale versions and a future stored timestamp.

The arithmetic function is deliberately visible. For a stored token 20 and clock 10 it returns 21. Change it to return the clock directly in a disposable copy, rerun the monotonicity assertion and explain the failure. Then change conditional assignment to ignore expected version. A stale request should overwrite another assignment in the faulty model. Use this mutation to explain why a read-only comparison before an unconditional write is insufficient.

## What the model cannot prove

The model executes commands sequentially in explicit orders. It does not explore database isolation anomalies or show that every concurrent history is serializable. Its successful checks establish that the desired serial outcomes are internally coherent. A database-backed test must still show that the application either reaches one of those outcomes or rejects a conflicting operation safely.

Similarly, the model uses integer tokens. It cannot establish timestamp precision across JavaScript Date, JSON and the database column. It omits role checks and membership caching. A report saying “all sprint concurrency tests passed” would therefore overstate the evidence if only this model ran. Name the layer and its limits in your lab report.

## Design a real integration campaign

Use a disposable database owned by the test harness. Verify its connection points to the disposable instance before running migrations or cleanup. Seed one project, two users with known roles, two sprints and several issues. Record exact initial identifiers so assertions do not accidentally inspect leftover rows from another test.

Add controlled barriers around the relevant read/write boundary in a test-only seam. Run assignment versus completion, two completions, two starts, and stale assignment. Capture outward responses, transaction attempt counts and final durable rows. Restore injected faults in a finally block. A passing response assertion without state inspection is not enough for any of these races.

Test error translation separately by injecting recognized P2034 failures. Do not depend on a busy machine to generate exactly two serialization conflicts. Test actual database conflict behavior in another focused case and record the database version and isolation settings used. Combining deterministic policy tests with bounded integration evidence is more informative than one large flaky scenario.

## Independent capstone: a sprint completion redesign

Propose adding an immutable completion record containing source sprint, destination, actor, completion time, moved issue identifiers and a command identifier. Explain whether repeated command identifiers return the original result or conflict on changed intent. Define a transaction that records the completion and moves issues atomically. Do not send notifications directly inside a callback that may retry.

Now add a stale browser and concurrent membership removal. State the desired authority timing policy, the expected conflict behavior and how the UI preserves the user's requested destination. Include a read model that distinguishes historical completion evidence from current issue associations. Your design should be reviewable without implementing a new product feature in the real repository.

## Scoring

Award four points each for invariants, schedule coverage, test isolation, client recovery and explicit limitations. A submission cannot pass merely by reaching a word count. It must include an unsafe schedule that the design prevents, a rejected alternative with a concrete reason and a test that would fail under a plausible mutation. The strongest capstones explain what their evidence leaves unproved and propose the next narrow test to close that gap.

[Index](README.md) · [Answers](answers/04-lab-and-capstone.md)
