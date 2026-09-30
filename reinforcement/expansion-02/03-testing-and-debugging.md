# Tests that reject a plausible wrong implementation

## Scenario: renaming an issue unassigns it

An issue has title Old, assigneeId U7, and storyPoints 8. The browser sends only title New. A shared create/update parser inserts assigneeId null and storyPoints 0. The service merges the parsed object and returns success. The happy-path test checks only title, so the regression is invisible.

First assert every untouched field, then inspect the object after parsing and before persistence. This distinguishes parser-default insertion from a repository update bug. Add explicit clearing and zero cases so the fix does not prohibit legitimate edits.

## Scenario: one refresh failure breaks all later requests

Five requests receive 401. One refresh starts and fails. A minute later the network is healthy, but every new request immediately receives the old rejection. Hypothesis one is that the shared promise is never cleared on error; hypothesis two is that session loss correctly prevents future work but the UI never reauthenticates. Test the gate's cleanup separately, then inspect the real auth state transition.

Use controlled promises. Assert one underlying call for concurrent callers and a new call after failure. Do not use five arbitrary timers or assume a loader resolving immediately is enough to exercise overlap.

## Investigation method

Start with two competing hypotheses. For each, predict an observation that would be different if it were true. Inspect the smallest relevant boundary before editing. Preserve the original failing input and record whether you observed a symptom, reproduced a mechanism, or merely reasoned about it.

Build three layers of evidence: a pure contract case; the real module or adapter with controlled dependencies; and one user-visible or database-visible outcome. State explicitly which layers you ran. Avoid replacing the boundary under investigation with a mock that already assumes the desired answer.

For timing cases, control a clock or promise rather than sleeping. For data cases, include at least two organizations or two independent entities where relevant. For mutation cases, assert both the returned outcome and unchanged unrelated state. Include a negative test that would reject the tempting shortcut named in the scenario.

After the first passing fix, introduce one small wrong variation in your own lab solution, run the relevant check, and revert only that variation. Keep the failing assertion as evidence that the test can detect the mechanism. Do not seed defects in the application's main working tree.

Write a short handoff: symptom; reproduction input; confirmed cause or remaining hypotheses; smallest change; tests actually run; remaining integration risk. A reviewer should be able to resume without reading your entire chat history.
