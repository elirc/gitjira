# GitJira: Debugging and test-design interview

Work one case at a time in approximately 35 minutes. These are six distinct scenarios viewed through this interview round. Select a case you have not recently rehearsed. The [source map](../README.md), [scorecard](../SCORECARD.md), and [project defense](../PROJECT-DEFENSE.md) support your attempt. Afterward use the [separate interviewer notes](../_interviewer/rounds/05-debugging.md).

## How to run this round

Treat this case as a bug report whose mechanism has not yet been confirmed. Write two competing hypotheses and one observation that distinguishes them. Identify the first boundary you would inspect in the supplied source map. Avoid beginning with a broad rewrite or assuming the case describes a current production defect.

Build a minimal reproduction from the fixture. Preserve the exact input and the ordering of events. Record expected and observed behavior separately. If a necessary dependency is unavailable, specify the smallest integration setup and mark its runtime result pending; a proposed test is not a completed investigation.

The interviewer will offer a patch that makes the visible symptom disappear while leaving the invariant broken. Explain which assertion would reject that patch. Choose between a pure test, adapter test, component test, or database test based on the boundary under investigation, and identify one mock that would make the test uninformative.

Deliver a concise incident note: symptom, hypotheses, distinguishing observation, confirmed or unconfirmed cause, focused change, tests, and remaining risk. Include a before/after example and avoid claiming all adjacent behavior was verified by one focused check.

## 04.5.1 — Omitted and cleared fields collapse

**Scenario.** An issue patch should preserve an omitted assignee but clear an explicitly null assignee. A truthiness shortcut also loses a legitimate zero estimate.

**Starting fixture.** Old assignee=U1, points=3; patch {assigneeId:null,points:0}.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.5.2 — One refresh request serves several callers

**Scenario.** Two requests encounter an expired session at nearly the same time. A shared refresh is meant to prevent duplicate refresh work.

**Starting fixture.** CallerA and B wait on refresh R; R rejects; callerC retries later.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.5.3 — Logout occurs during refresh

**Scenario.** A refresh starts, the user logs out, and an old refresh response later returns. A successful response must not silently resurrect the earlier session.

**Starting fixture.** Session generation7 starts R; logout advances8; R for7 resolves.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.5.4 — Board and detail disagree after a save

**Scenario.** The detail view displays a new issue status while the board remains stale. A candidate must identify which data sets contain the changed entity.

**Starting fixture.** Issue I1 moves open to done; detail refreshed; board=open filter unchanged.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.5.5 — Dependencies contain a cycle

**Scenario.** A synthetic issue planner orders prerequisites before dependents. A cycle should be reported rather than returning an incomplete plan as success.

**Starting fixture.** I1 depends on I2; I2 depends on I1; I3 independent.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.5.6 — A stale closure saves an old title

**Scenario.** An editor schedules work that captures the title at the time of an event. The user changes the title before the work finishes. Clarify whether the operation belongs to the original submission or the current draft.

**Starting fixture.** Submitted title=A; draft becomes B; scheduled save uses A.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.
