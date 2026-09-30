# Coding reasoning: Order issues by prerequisites

Attempt the [candidate challenge](../coding/README.md) first. The [reference implementation](reference.mjs) is one valid solution to the written contract, not a recommended production replacement.

This deliberately simple Kahn-style implementation repeatedly selects a currently dependency-free node and removes it from remaining dependency sets. If no node is ready while nodes remain, there is a cycle. It favors clarity over optimal runtime: repeated scans/deletions and ready-list sorts give a conservative O(V squared log V + E) bound with O(V+E) working space. An adjacency list, indegrees, and a min-heap can improve the selection strategy; preserve the specified tie behavior when comparing alternatives.

## Review the mechanism

Have the candidate annotate the branch that enforces each relevant rule: identity, ordering, rejection, preservation, and output construction. Then change one input while keeping the contract valid. They should predict the result before executing the code. If two implementations differ only in style while producing the same required behavior, discuss readability rather than inventing a correctness defect.

## Strengthen the test evidence

The seven supplied cases check representative positive, boundary, and preservation behavior. Ask for an additional case and the wrong implementation it would detect. Avoid a test that simply copies the implementation's intermediate variables into an assertion. Prefer a public input/output example or an unchanged-input observation.

## Connect to this project

The actual boundary is shared schemas, API session handling, and cache/query ownership. The model omits infrastructure and may choose fields or policy that differ from the application. Ask the candidate to locate the real caller and explain which validation, authorization, transaction, or UI behavior remains outside this helper. A useful answer can conclude that the application already has the behavior and only characterization evidence is needed.

The reference passing is author verification. The learner must still demonstrate an independent solution, a counterexample, and an explanation of the evidence limits. Mark a copied implementation as studied rather than independently solved.
