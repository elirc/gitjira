# 22. Define commitment before calculating it

The current sprintReport sums storyPoints for issues presently associated with the sprint and separately sums those in current DONE columns. It returns a field named committed. If the product needs a historical measure of what was committed at sprint start, current associations alone may not supply that history. This chapter develops a proposed reporting model while preserving the description of current behavior.

## Work a changing-scope example

Sprint S starts with issues A and B worth three and five points. Midway through, C worth two points is added. Before completion, B is re-estimated to eight points. At completion, unfinished B moves to backlog while A and C remain done in S. A current-association sum after completion can differ from the original eight-point commitment and from the later thirteen-point scope.

Calculate each quantity explicitly: initial estimated commitment, latest scope before completion, completed current points and moved unfinished points. Do not label all four as velocity. The product must choose definitions and show them clearly. A report can be arithmetically correct while answering a different question from the one a manager thinks they asked.

## Snapshot versus event history

A start snapshot can record issue IDs, estimates and relevant workflow state at the start command. A scope-change event log can record additions, removals and estimate changes during the sprint. A completion snapshot can capture the final accounting. These mechanisms answer related but distinct questions and have different storage costs.

If only a start snapshot is stored, later scope changes need another source to explain differences. If only current rows are stored, deleted or moved issues can erase historical context. If an event log is used, event ordering and schema evolution become important. Choose the minimal model that supports the intended reports and audit questions.

## Transaction boundaries

The start snapshot should be captured consistently with the transition to ACTIVE. Otherwise a concurrent assignment can fall between the snapshot query and state change, leaving unclear whether it counts as initial scope. Define the boundary: issues assigned before the successful start transaction's chosen observation belong to initial commitment; later changes are scope events under the proposed policy.

The implementation needs compatible behavior from assignment and start writers. A snapshot inside one transaction is not sufficient if another uncoordinated writer can change membership outside the intended isolation contract. Use the same schedule-based method from completion to test the start boundary.

## Null estimates and deleted issues

An unestimated issue is not the same as a zero-point issue. Store and report null distinctly if the product wants to measure estimation completeness. A historical snapshot should retain enough identifying information to explain a deleted issue without exposing data the viewer is no longer authorized to see. Identity retention and access control can pull in different directions, so define the report's audience.

If an issue's title changes, a report can show the current title, historical title or both. Each is defensible if labeled. Do not silently substitute current values into a report presented as an immutable historical record. The same applies to workflow column names and categories.

## Evaluation exercise

Create a synthetic event sequence for the changing-scope example. Produce a report with initial scope, added scope, removed scope, estimate changes and completed work. Write formulas using the chosen definitions and calculate the values by hand. Then design tests that would fail if a moved issue disappeared from historical commitment.

Add an authorization case in which a viewer loses project membership before requesting the report. Historical data does not bypass current access policy. The server should enforce the intended project read permission even if the report is cached or precomputed.

## Review standard

Submit a metric glossary, snapshot/event schema, transaction schedule and worked report. Full credit requires separating current-state queries from historical facts and making null estimates visible. The proposal should be implementable as a focused extension rather than a wholesale analytics platform.

[Index](README.md) · [Review notes](answers/11-storage-and-history.md)
