# GitJira: Asynchronous JavaScript and API boundaries

Work one case at a time in approximately 30 minutes. These are six distinct scenarios viewed through this interview round. Select a case you have not recently rehearsed. The [source map](../README.md), [scorecard](../SCORECARD.md), and [project defense](../PROJECT-DEFENSE.md) support your attempt. Afterward use the [separate interviewer notes](../_interviewer/rounds/04-async-api.md).

## How to run this round

Turn the case into a timeline with at least two callers or two overlapping operations. Label request launch, server observation, authoritative effect, response delivery, and client application separately. Then change completion order. Distinguish a rejected request from an operation whose final result is unknown because its response was lost.

Specify operation identity and scope. State whether repeating the operation is a new user intent or a retry of the same logical intent. If several callers share work, show how success, rejection, cancellation, and cleanup reach every waiter. If you use cancellation, explain what it can stop locally and which server effects may already have happened.

The interviewer will inject a synchronous throw before a promise exists, a later rejection, and a response after the user changes scope. Choose the relevant cases and explain why another case belongs outside your helper. Use controlled promises or an injected clock in the test plan rather than waiting for arbitrary durations.

Deliver a sequence diagram or numbered timeline, an API outcome table, and one deterministic race reproduction. State where process-local guarantees end and where durable or cross-process coordination begins.

## 04.4.1 — Omitted and cleared fields collapse

**Scenario.** An issue patch should preserve an omitted assignee but clear an explicitly null assignee. A truthiness shortcut also loses a legitimate zero estimate.

**Starting fixture.** Old assignee=U1, points=3; patch {assigneeId:null,points:0}.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.4.2 — One refresh request serves several callers

**Scenario.** Two requests encounter an expired session at nearly the same time. A shared refresh is meant to prevent duplicate refresh work.

**Starting fixture.** CallerA and B wait on refresh R; R rejects; callerC retries later.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.4.3 — Logout occurs during refresh

**Scenario.** A refresh starts, the user logs out, and an old refresh response later returns. A successful response must not silently resurrect the earlier session.

**Starting fixture.** Session generation7 starts R; logout advances8; R for7 resolves.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.4.4 — Board and detail disagree after a save

**Scenario.** The detail view displays a new issue status while the board remains stale. A candidate must identify which data sets contain the changed entity.

**Starting fixture.** Issue I1 moves open to done; detail refreshed; board=open filter unchanged.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.4.5 — Dependencies contain a cycle

**Scenario.** A synthetic issue planner orders prerequisites before dependents. A cycle should be reported rather than returning an incomplete plan as success.

**Starting fixture.** I1 depends on I2; I2 depends on I1; I3 independent.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.

---

## 04.4.6 — A stale closure saves an old title

**Scenario.** An editor schedules work that captures the title at the time of an event. The user changes the title before the work finishes. Clarify whether the operation belongs to the original submission or the current draft.

**Starting fixture.** Submitted title=A; draft becomes B; scheduled save uses A.

Your user is a project contributor; the affected surface is the issue board and detail editor. Keep workspace/project and authenticated session visible in the model. The user-facing operation is to update an issue and refresh its views.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace shared schemas, API session handling, and cache/query ownership. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.
