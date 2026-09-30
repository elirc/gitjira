# Interviewer notes: GitJira / Project explanation and behavioral interview

Keep this file closed during a first attempt. Accept behaviorally correct alternatives that satisfy the declared contract. Source-grounded explanations and honest limitations matter more than matching these words. Return to the [candidate round](../../rounds/08-behavioral.md) to run a new attempt.

## How to evaluate this round

Evaluate ownership and reasoning, not polish alone. The candidate should distinguish reading existing code, completing a teaching lab, writing a proposed test, and verifying an application change. Those are all useful activities, but they support different claims. Ask which exact artifact demonstrates the candidate's own work.

A good explanation connects the technical choice to a user consequence. It names one invariant, one rejected alternative, and one observation that supports the decision. It does not spend most of the time listing libraries. When discussing a mistake, the candidate can describe an incorrect prediction from a real practice exercise and how a counterexample changed it; an invented production incident is unnecessary.

For disagreement, ask how the candidate would separate a product-policy question from a code-correctness question. The response should invite a concrete example or acceptance criterion rather than appeal to seniority or a tool's output. For uncertainty, a bounded verification plan is better than pretending an unrun integration check passed.

Score the answer on specificity, ownership accuracy, tradeoff reasoning, evidence, and reflection. Do not award a strong score merely for using a familiar story framework. Junior success is an honest, understandable explanation that survives two follow-up questions. End by asking what assumption would make the chosen approach wrong; the candidate should be able to revise the plan without abandoning the invariant or inflating the evidence.

## 04.8.1 — Omitted and cleared fields collapse

### Expected project reasoning

**Invariant:** Omitted, null, and zero are distinct contract cases.

Clear the assignee and set points to zero; preserve fields absent from the patch. Check own-property presence rather than truthiness. Compare the teaching fixture with the actual shared update schema.

**Plausible wrong approach:** Use value || oldValue for every field.

Use the exact starting fixture from [the candidate round](../../rounds/08-behavioral.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.8.2 — One refresh request serves several callers

### Expected project reasoning

**Invariant:** In-flight sharing must settle every waiter and release its state on failure.

Use one pending operation for the relevant session identity, propagate its outcome, and clear the gate in both success and failure paths. A rejected promise retained forever prevents a later legitimate attempt.

**Plausible wrong approach:** Reset the shared promise only in the success branch.

Use the exact starting fixture from [the candidate round](../../rounds/08-behavioral.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.8.3 — Logout occurs during refresh

### Expected project reasoning

**Invariant:** A response must still belong to the active session generation when applied.

Ignore obsolete session results and keep logout authoritative. This is a separate concern from reducing duplicate refresh calls; demonstrate the timeline before proposing a combined helper.

**Plausible wrong approach:** Treat every successful refresh response as permission to save a token.

Use the exact starting fixture from [the candidate round](../../rounds/08-behavioral.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.8.4 — Board and detail disagree after a save

### Expected project reasoning

**Invariant:** Every affected cached projection needs an explicit update or invalidation policy.

Trace the query keys and mutation ownership. Verify the previous filtered list loses I1 and the target list gains it when appropriate. A single broad invalidate may work but needs a scope and cost explanation.

**Plausible wrong approach:** Refresh only the currently visible detail query.

Use the exact starting fixture from [the candidate round](../../rounds/08-behavioral.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.8.5 — Dependencies contain a cycle

### Expected project reasoning

**Invariant:** A successful plan must include every issue once and respect every prerequisite.

Use a graph algorithm with cycle detection; report the unresolved cycle condition rather than silently returning I3 as a complete plan. Distinguish missing dependency IDs from cycles.

**Plausible wrong approach:** Stop when no node is available and label the partial output successful.

Use the exact starting fixture from [the candidate round](../../rounds/08-behavioral.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.8.6 — A stale closure saves an old title

### Expected project reasoning

**Invariant:** Captured submission data and current draft data have different ownership.

For a submission snapshot, A may be correct; for an autosave of the latest draft it may be wrong. State the product rule before choosing a ref, effect, or cancellation strategy.

**Plausible wrong approach:** Always read the latest value, even when confirming an earlier explicit submission.

Use the exact starting fixture from [the candidate round](../../rounds/08-behavioral.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.
