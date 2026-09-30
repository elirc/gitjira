# 15. A detail screen can be bounded in one relation and unbounded in another

getIssueDetail loads project and membership context, project columns and one issue with related data. It bounds activityEvents to the latest twenty, while including children, comments and attachments under their current query shapes. The method's comments describe earlier performance work, but those historical measurements are not current benchmarks. Review the present query and measure a representative fixture before repeating performance claims.

## Identify each collection

List the relations returned by the detail endpoint: assignee, children, comments, activity events and attachment metadata. For each, record selected fields, ordering and limit. The activity tail is explicitly bounded. Comments are ordered by creation time in the inspected query but have no shown take limit. Children and attachment metadata have their own shapes. “The detail endpoint is bounded” would therefore be too broad a statement.

Create a fixture with many activity events but few comments, then one with many comments but few events. Compare payload size and query behavior. The first should benefit from the activity limit; the second can expose a different scaling path. A single seeded fixture may hide the latter. Use synthetic text and a disposable database so the experiment is reproducible.

## Recent history is not complete history

The latest twenty events can support a useful detail panel, but a user investigating an older change needs another route. A count or “load earlier” affordance can communicate truncation. Without that signal, the screen may appear to show the entire audit trail and mislead an investigation.

Design a paginated history contract with deterministic ordering and an explicit cursor. Timestamp ties need a secondary key. Decide whether newly arriving events appear above the current page or trigger a refresh notice. An export of complete history has a different consistency requirement from a recent-tail UI. Do not reuse one endpoint for both without stating the limitations.

## Progress derives from current columns

The method counts child issues whose current column category is DONE. The resulting progress is current-state progress, not a historical completion ledger. If a workflow column's category changes, the same child assignments can produce a different done count. This may be intended, but the product should understand the dependency.

Create a parent with three children in different categories, then change a column category in a disposable fixture. Predict progress before and after. The exercise demonstrates that derived values depend on both issue rows and workflow metadata. A cache invalidation map should include changes to either source if the UI caches the derived result.

## Query count versus data volume

Reducing duplicate issue fetches can improve performance, but one query returning a large relation can still be expensive. Query count, payload bytes, row counts, execution time and memory measure different costs. A report that celebrates fewer queries while ignoring a huge comments collection is incomplete.

Define a benchmark table with small, medium and large synthetic relation sizes. Record database timing separately from JSON serialization and client rendering where the harness permits. Keep the measurements local and describe the environment. Do not extrapolate one machine's result into a universal latency promise.

## Exercise and review

Submit the relation-bound table, truncation UI design, progress dependency graph and benchmark plan. Propose one focused improvement, such as paginating comments or adding a history cursor, and state its compatibility cost. A strong answer preserves the useful existing activity bound while identifying the next actual bottleneck from evidence.

[Index](README.md) · [Review notes](answers/08-detail-and-reporting.md)
