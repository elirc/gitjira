# Interviewer notes: GitJira / TypeScript, schemas, and public contracts

Keep this file closed during a first attempt. Accept behaviorally correct alternatives that satisfy the declared contract. Source-grounded explanations and honest limitations matter more than matching these words. Return to the [candidate round](../../rounds/03-typescript.md) to run a new attempt.

## How to evaluate this round

Look for a clear distinction between compile-time reasoning and runtime trust. A cast changes what the checker assumes; it does not inspect a payload. The candidate should name the validator or construction boundary and explain why downstream functions may rely on its output. Not every internal helper needs to validate the same data again if the ownership and preconditions are explicit.

Ask the candidate to enumerate the legal outcome combinations. A discriminant should let the consumer handle the variant's required data without a chain of unrelated optional checks. In a TypeScript sketch, an exhaustive branch can expose a newly added variant during compilation; the candidate should still explain how an older deployed client handles an unfamiliar server value at runtime.

For optional values, insist on concrete examples rather than slogans. A missing patch field can mean preserve, null can mean clear, and zero can be a valid number, but the actual endpoint decides those meanings. Reject accidental policies introduced by truthiness or a generic object spread. Ask whether validation should reject unknown keys or strip them, and require that choice to be visible in tests.

Finish with a migration question: can a stored record or an older client still cross this boundary? Accept a narrowly scoped fallback with an old fixture. Do not reward a schema rewrite that silently changes behavior for existing callers. Junior success is an explainable contract with representative runtime examples, not the most elaborate generic type.

## 04.3.1 — Omitted and cleared fields collapse

### Expected project reasoning

**Invariant:** Omitted, null, and zero are distinct contract cases.

Clear the assignee and set points to zero; preserve fields absent from the patch. Check own-property presence rather than truthiness. Compare the teaching fixture with the actual shared update schema.

**Plausible wrong approach:** Use value || oldValue for every field.

Use the exact starting fixture from [the candidate round](../../rounds/03-typescript.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.3.2 — One refresh request serves several callers

### Expected project reasoning

**Invariant:** In-flight sharing must settle every waiter and release its state on failure.

Use one pending operation for the relevant session identity, propagate its outcome, and clear the gate in both success and failure paths. A rejected promise retained forever prevents a later legitimate attempt.

**Plausible wrong approach:** Reset the shared promise only in the success branch.

Use the exact starting fixture from [the candidate round](../../rounds/03-typescript.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.3.3 — Logout occurs during refresh

### Expected project reasoning

**Invariant:** A response must still belong to the active session generation when applied.

Ignore obsolete session results and keep logout authoritative. This is a separate concern from reducing duplicate refresh calls; demonstrate the timeline before proposing a combined helper.

**Plausible wrong approach:** Treat every successful refresh response as permission to save a token.

Use the exact starting fixture from [the candidate round](../../rounds/03-typescript.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.3.4 — Board and detail disagree after a save

### Expected project reasoning

**Invariant:** Every affected cached projection needs an explicit update or invalidation policy.

Trace the query keys and mutation ownership. Verify the previous filtered list loses I1 and the target list gains it when appropriate. A single broad invalidate may work but needs a scope and cost explanation.

**Plausible wrong approach:** Refresh only the currently visible detail query.

Use the exact starting fixture from [the candidate round](../../rounds/03-typescript.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.3.5 — Dependencies contain a cycle

### Expected project reasoning

**Invariant:** A successful plan must include every issue once and respect every prerequisite.

Use a graph algorithm with cycle detection; report the unresolved cycle condition rather than silently returning I3 as a complete plan. Distinguish missing dependency IDs from cycles.

**Plausible wrong approach:** Stop when no node is available and label the partial output successful.

Use the exact starting fixture from [the candidate round](../../rounds/03-typescript.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.

---

## 04.3.6 — A stale closure saves an old title

### Expected project reasoning

**Invariant:** Captured submission data and current draft data have different ownership.

For a submission snapshot, A may be correct; for an autosave of the latest draft it may be wrong. State the product rule before choosing a ref, effect, or cancellation strategy.

**Plausible wrong approach:** Always read the latest value, even when confirming an earlier explicit submission.

Use the exact starting fixture from [the candidate round](../../rounds/03-typescript.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to shared schemas, API session handling, and cache/query ownership and which belongs to the issue board and detail editor. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.
