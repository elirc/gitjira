# GitJira: JavaScript reasoning and live coding

Work one case at a time in approximately 30 minutes. These are six distinct scenarios viewed through this interview round. Select a case you have not recently rehearsed. The [source map](../README.md), [scorecard](../SCORECARD.md), and [project defense](../PROJECT-DEFENSE.md) support your attempt. Afterward use the [separate interviewer notes](../_interviewer/rounds/01-javascript.md).

## How to run this round

You are pairing on a small helper around this case. First restate the input/output contract, including whether inputs are already validated. Turn the fixture into a literal JavaScript value. Write the smallest function signature that represents one decision; keep I/O outside it. Explain the baseline approach before optimizing.

Use the first five minutes to clarify identity, ordering, mutation, and the result for an empty input. Spend fifteen minutes implementing or writing executable pseudocode, then reserve ten minutes for examples and follow-up questions. Speak when you make a decision or encounter uncertainty; narrating every keystroke obscures the reasoning.

The interviewer will change one assumption: duplicate identity, a missing field, a reordered input, or a shared nested reference. Predict the result before editing your code. Explain whether the change violates a precondition or reveals an unhandled valid case. Compare a linear scan with an indexed approach and count the index's space cost. Do not claim constant-time end-to-end behavior merely because one Map lookup is efficient.

Submit your function, two worked traces, three assertions, and a complexity explanation. If the domain needs persistence, identify the boundary your pure function leaves unproved.

## 04.1.1 — Omitted and cleared fields collapse

**Scenario.** An issue patch should preserve an omitted assignee but clear an explicitly null assignee. A truthiness shortcut also loses a legitimate zero estimate.

**Starting fixture.** Old assignee=U1, points=3; patch {assigneeId:null,points:0}.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.1.2 — One refresh request serves several callers

**Scenario.** Two requests encounter an expired session at nearly the same time. A shared refresh is meant to prevent duplicate refresh work.

**Starting fixture.** CallerA and B wait on refresh R; R rejects; callerC retries later.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.1.3 — Logout occurs during refresh

**Scenario.** A refresh starts, the user logs out, and an old refresh response later returns. A successful response must not silently resurrect the earlier session.

**Starting fixture.** Session generation7 starts R; logout advances8; R for7 resolves.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.1.4 — Board and detail disagree after a save

**Scenario.** The detail view displays a new issue status while the board remains stale. A candidate must identify which data sets contain the changed entity.

**Starting fixture.** Issue I1 moves open to done; detail refreshed; board=open filter unchanged.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.1.5 — Dependencies contain a cycle

**Scenario.** A synthetic issue planner orders prerequisites before dependents. A cycle should be reported rather than returning an incomplete plan as success.

**Starting fixture.** I1 depends on I2; I2 depends on I1; I3 independent.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.1.6 — A stale closure saves an old title

**Scenario.** An editor schedules work that captures the title at the time of an event. The user changes the title before the work finishes. Clarify whether the operation belongs to the original submission or the current draft.

**Starting fixture.** Submitted title=A; draft becomes B; scheduled save uses A.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.
