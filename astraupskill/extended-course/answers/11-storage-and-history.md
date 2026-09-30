# Review notes: storage and historical reports

The partial unique index permits many planned or completed sprints but at most one active sprint per project. A database-only test should exercise the constraint, while a service test checks translation to a useful conflict. The migration file does not prove an arbitrary database has applied it. Verify the chosen disposable environment before drawing that conclusion.

ON DELETE SET NULL affects every issue referencing the deleted sprint through that foreign key, while completion moves only unfinished issues under the service workflow. These operations are not interchangeable repairs. A migration that resolves duplicate active sprints must respect domain meaning rather than silently completing rows to satisfy an index.

In the reporting example, initial estimates total eight, adding C raises scope to ten, and re-estimating B raises the latest scope to thirteen. After B moves out, current associations of done A and C sum to five. Those numbers answer different questions. A historical commitment report needs retained start scope and explicit treatment of later changes.

Snapshots and events should capture identity and values at a defined boundary. Current titles, estimates and column categories may differ later. Null estimates should remain distinguishable from zero if the report measures estimation completeness. Historical data still requires current authorization under the chosen access policy.

The proposed version-column rollout must handle old timestamp clients and new version clients without an accidental bypass. A schema rollback cannot undo every semantic consequence of commands issued during deployment. A good plan states compatibility assumptions, data preservation and the point at which the stronger contract becomes mandatory.

[Index](../README.md)
