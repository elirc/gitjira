# 24. Use mutations to test the strength of your reasoning

This workshop asks you to pair each important property with a plausible implementation mistake. The goal is not a large mutation score for its own sake. It is to learn whether a test would detect the exact defect the test name claims to prevent. Perform mutations only in disposable copies or isolated teaching models.

## Version mutation

Remove the expectedUpdatedAt predicate from the proposed atomic assignment or update contract while leaving an earlier read comparison in place. A sequential stale-request test may still pass because it loads the already-updated row before comparing. The controlled two-reader schedule should fail. This contrast reveals why the concurrency test adds evidence beyond an ordinary stale fixture.

The decisive assertion checks that one stale command cannot overwrite a winner after both read the same version. It should also inspect the activity payload if history is part of the mutation. A test that only expects some 409 under arbitrary scheduling may miss a path that occasionally allows both writes.

## Completion mutation

Move the unfinished-issue update outside the transaction or omit it entirely. A test that checks only S.state COMPLETED will pass. A correct test includes TODO and DONE issues and asserts the exact final assignments and movedCount. Another test injects a failure between source update and issue movement to establish rollback.

Do not mutate the test's oracle at the same time as the implementation. Keep the expected state table independent. If the test setup uses the same helper to classify DONE issues as the production code, consider whether a shared helper bug could affect both sides. An independently specified fixture with known categories is more robust.

## Cache mutation

For a proposed generation repair, remove the generation comparison before storing a loaded value. The stale-resurrection schedule should fail. For identity-aware cleanup, make an old promise delete the current in-flight entry unconditionally. A test with overlapping old and new loads should detect the problem.

These tests require explicit promise control. A loop that calls invalidate repeatedly under load may reveal a race but cannot guarantee the critical ordering on every run. Use stress testing as supplementary evidence after deterministic schedules establish the mechanism.

## UI mutation

Change the optimistic update to mutate a cached issue object in place. The rollback snapshot can then contain the modified object. A test should assert both visible recovery and preservation of the original object data. Next keep immutability but restore a whole snapshot during overlapping moves; the two-card schedule should expose the separate ordering defect.

This pair teaches that one fix does not prove every related behavior. Immutability is necessary for the simple snapshot pattern, but it does not solve concurrent rollback. Test names should reflect the narrower property they establish.

## Schema and policy mutations

Apply creation defaults to the patch schema. A title-only patch should reveal an unintended priority or type reset. Remove a target project's ownership predicate while keeping identifier validation. A two-project fixture should expose the foreign-object acceptance. Remove a role check while retaining authentication. A VIEWER mutation test should fail even though the user is logged in.

Each mutation targets a different validation layer. A broad test that merely expects an error can pass because some unrelated earlier check rejects the request. Ensure the fixture satisfies all other preconditions so the targeted guard is the one under test. Record the actual error category and unchanged state.

## Property generation

For fractional ordering, generate keys by repeated valid insertions and assert every new key lies between its chosen bounds under the intended comparator. For pagination, generate tied timestamps and compare the complete expected ID order across pages. For state transitions, enumerate action/state/context combinations and compare with an independent small table.

Generated tests need a reproducible seed or captured counterexample. A failing random run without its input is hard to debug. Keep the generated domain aligned with the contract; arbitrary malformed keys belong in boundary validation tests, not silently in a generated-key closure property.

## Deliverable

Submit six mutations, the property each threatens and the test that detects it. Include one surviving mutation and explain whether it is equivalent, outside scope or evidence of a gap. A thoughtful explanation of a survivor is more valuable than hiding it. The workshop passes when the learner can connect tests to causal mechanisms rather than counts.

[Index](README.md) · [Review notes](answers/12-incidents-and-capstone.md)
