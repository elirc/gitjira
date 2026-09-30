# Interviewer notes: GitJira / Junior system-design and data-model interview

Keep this file closed during a first attempt. Accept behaviorally correct alternatives that satisfy the declared contract. Source-grounded explanations and honest limitations matter more than matching these words. Return to the [candidate round](../../rounds/06-design.md) to run a new attempt.

## How to evaluate this round

For a junior interview, a clear single-service design can be stronger than a large distributed diagram. The candidate should connect every component to a requirement and show where the authoritative decision occurs. Ask which part is needed now and which is a future response to measured pressure.

Evaluate the data model through the fixture. Can the proposed identity distinguish scopes, retries, and revisions where required? Does a uniqueness constraint or conditional update enforce the invariant at the actual write boundary? A sequence of independent reads and writes does not become atomic because it appears in one function. Conversely, do not require distributed coordination when one existing transaction is sufficient.

Walk the failure window explicitly. If an external effect can occur before local confirmation, ask how an unknown result is reconciled. If a derived read model is temporarily stale, ask what the UI communicates and how it eventually learns the authoritative result. A queue can decouple work but adds delivery, retry, and ownership questions; naming it does not answer them.

For scale, require arithmetic with labeled assumptions and units. A candidate may estimate requests per second or retained records, but should not present invented numbers as observed project performance. Observability should include the signal's writer and the action it confirms. Junior success is a coherent small design, an explicit tradeoff, and a failure story that preserves the case invariant.

## 04.6.1 — Omitted and cleared fields collapse

### Expected project reasoning

**Invariant:** Omitted, null, and zero are distinct contract cases.

Clear the assignee and set points to zero; preserve fields absent from the patch. Check own-property presence rather than truthiness. Compare the teaching fixture with the actual shared update schema.

**Plausible wrong approach:** Use value || oldValue for every field.

Use the exact starting fixture from [the candidate round](../../rounds/06-design.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.6.2 — One refresh request serves several callers

### Expected project reasoning

**Invariant:** In-flight sharing must settle every waiter and release its state on failure.

Use one pending operation for the relevant session identity, propagate its outcome, and clear the gate in both success and failure paths. A rejected promise retained forever prevents a later legitimate attempt.

**Plausible wrong approach:** Reset the shared promise only in the success branch.

Use the exact starting fixture from [the candidate round](../../rounds/06-design.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.6.3 — Logout occurs during refresh

### Expected project reasoning

**Invariant:** A response must still belong to the active session generation when applied.

Ignore obsolete session results and keep logout authoritative. This is a separate concern from reducing duplicate refresh calls; demonstrate the timeline before proposing a combined helper.

**Plausible wrong approach:** Treat every successful refresh response as permission to save a token.

Use the exact starting fixture from [the candidate round](../../rounds/06-design.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.6.4 — Board and detail disagree after a save

### Expected project reasoning

**Invariant:** Every affected cached projection needs an explicit update or invalidation policy.

Trace the query keys and mutation ownership. Verify the previous filtered list loses I1 and the target list gains it when appropriate. A single broad invalidate may work but needs a scope and cost explanation.

**Plausible wrong approach:** Refresh only the currently visible detail query.

Use the exact starting fixture from [the candidate round](../../rounds/06-design.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.6.5 — Dependencies contain a cycle

### Expected project reasoning

**Invariant:** A successful plan must include every issue once and respect every prerequisite.

Use a graph algorithm with cycle detection; report the unresolved cycle condition rather than silently returning I3 as a complete plan. Distinguish missing dependency IDs from cycles.

**Plausible wrong approach:** Stop when no node is available and label the partial output successful.

Use the exact starting fixture from [the candidate round](../../rounds/06-design.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.6.6 — A stale closure saves an old title

### Expected project reasoning

**Invariant:** Captured submission data and current draft data have different ownership.

For a submission snapshot, A may be correct; for an autosave of the latest draft it may be wrong. State the product rule before choosing a ref, effect, or cancellation strategy.

**Plausible wrong approach:** Always read the latest value, even when confirming an earlier explicit submission.

Use the exact starting fixture from [the candidate round](../../rounds/06-design.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.
