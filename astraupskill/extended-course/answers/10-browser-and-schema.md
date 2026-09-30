# Review notes: browser state and schemas

The backlog component groups the issues returned by one useIssues query. The inspected hook does not follow nextCursor automatically. A fixture with a sprint's only issue beyond the first page can make the local nonempty guard disagree with the server's actual count. The proposed repair can use aggregate capabilities or explicit pagination, but it must label partial counts honestly.

Null story points and zero estimates are not identical meanings. The current arithmetic treats null as zero for summing; a richer UI can also show unestimated count. Loading, failed query, empty result and partial data are distinct states. Review surrounding handlers before declaring missing error presentation from the component alone.

Immutable optimistic updates preserve a snapshot's contents, but whole-cache rollback can overwrite newer optimistic work. The two-card and same-card schedules need controlled promises and intermediate cache assertions. A request-generation or pending-intent design must still reconcile with durable server state after lost responses.

Creation defaults belong on create schemas. A title-only patch should not synthesize priority or type. Omission means leave unchanged, while explicit null can clear a nullish field. Shape validation does not establish project ownership of referenced IDs. The assignment schema confirms expectedUpdatedAt is optional, so a proposal to require it needs compatibility planning.

The move schema requires a nonempty position string but does not express the entire fractional-key or neighbor contract. A stronger move protocol needs more than a string-length check. Full credit requires tracing parsed output through the service rather than assuming a schema's acceptance means the command is authorized and semantically valid.

[Index](../README.md)
