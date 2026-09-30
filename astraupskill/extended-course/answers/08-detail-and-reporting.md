# Review notes: detail views and historical meaning

The current detail query bounds activityEvents to twenty, but other included collections have their own limits or lack of explicit limits. A useful review lists each relation separately. A large-comments fixture can reveal costs hidden by an activity-only benchmark. Query count, row count, payload bytes and rendering cost should not be collapsed into one performance claim.

The activity tail is recent history, not complete history. A screen should communicate truncation and provide an appropriate route to older events if needed. A deterministic history cursor needs a tie-break beyond a potentially nonunique timestamp. Complete exports and live detail panels have different consistency requirements.

Child progress depends on current workflow column categories. Changing a column category can alter the derived done count without moving a child. Cache invalidation must account for both issue and workflow metadata changes if the result is cached. The same principle applies to sprint reports based on current associations rather than immutable commitment snapshots.

A proposed historical report should define the event at which scope is captured and how later changes are represented. It should not reconstruct a supposedly immutable past from mutable current rows without labeling the inference. Full credit requires distinguishing “what is true now” from “what this command or sprint contained then.”

[Index](../README.md)
