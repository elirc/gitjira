# Transfer workbook: GitJira

Complete one variation per short session. Write your first answer without an agent or answer key, then revise it after checking source or running a small experiment. For each variation, supply a concrete input, predicted result, invariant, and test boundary. A paragraph repeating a general principle does not complete the exercise.

## Variation 1: Zero is a value

Set storyPoints from 8 to 0. Compare own-property checks, nullish coalescing, and logical OR. Show exactly which expression incorrectly retains 8 and write a test for it.

## Variation 2: Undefined disappears

Build a JavaScript object with assigneeId undefined, then describe its JSON representation. Explain why an in-memory parser test may not represent a browser request and which layer must own the contract.

## Variation 3: Clear versus unchanged

An old mobile client never sends assigneeId. A new client can clear it with null. Design compatibility fixtures that distinguish the two without adding a create-time default to PATCH.

## Variation 4: Synchronous loader failure

The loader throws before returning a promise. Explain why a gate should still return a rejecting promise under its documented API, and how cleanup is tested.

## Variation 5: Identity changes during refresh

A user signs out and another signs in while refresh is pending. Identify the generation or cancellation decision the real client needs. The teaching key alone does not authorize applying the response.

## Variation 6: A counter says one

A test proves one refresh call but never inspects original requests after it. List two remaining bugs that could still pass: wrong token used on retry, or unbounded repeated 401 handling. Design a check for one.

## Review without an answer key

Choose two variations and exchange them with a reviewer, or ask an agent to challenge only your assumptions. Require a counterexample, not a rewritten solution. Record the strongest objection, whether you accepted it, and the evidence that settled it. Keep disagreements about product policy separate from disagreements about code behavior.

## Retrieval schedule and score

Tomorrow, reproduce one transition or boundary table from memory. In seven days, write an edge test without reading the reference. In three weeks, transfer the idea to a different project and identify the assumption that changes.

Score 0–2 each for source tracing, lab A, lab B, application evidence, and explanation. A 2 requires your own counterexample and supporting observation; a 1 means a correct explanation without independent evidence; a 0 means missing or incorrect. Target 8/10, but leave application work pending if you did not run it. Scores describe this exercise, not a professional seniority level.

Record: date; commit/worktree context; original prediction; observation; revised rule; verification still pending; next repetition date. Human mastery is **not assessed** until you provide this evidence.
