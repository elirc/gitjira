# Transfer the idea into GitJira

## One mutation, two views

Choose a status-changing mutation in `hooks.js`. Build a test that observes both open and closed lists for one project and a list for a different project. Perform the mutation and assert the relevant view contents after the server acknowledges it. Include a revisit to the previously inactive view.

Do not assert only that `invalidateQueries` was called once; that assertion can pass with the wrong key. A lower-level key-selection test is useful, but it must be paired with an observable data check. Preserve the repository's existing shared key helpers.

For a failure case, let the server write succeed and a follow-up read fail. Specify the UI message and retry action: it must not invite an unnecessary duplicate write by pretending the original write failed. Use the project's existing refresh/error behavior rather than changing auth flow for this ticket.

Deliver a before/after cache diagram, one two-view regression, a wrong-project negative case, and a small JSDoc addition if it clarifies the boundary.

## Review a proposed change

An agent proposes invalidating every query after every mutation “for correctness,” while another invalidates only `queryKeys.issue(project, number)`. Explain the cost of the first and the stale-list gap in the second. Ask for the narrowest scope supported by the actual data dependencies, including any counts the app exposes.

## Evidence boundary

Work in your own practice branch or isolated workspace and inspect existing changes first. Do not switch or reset the owner's working tree. Describe any uncommitted source your exercise depends on; a worktree from HEAD does not include it. Use the existing package scripts after reading their targets. Run one repository at a time, with disposable fixtures for data tests. The authoring pass supplied exercises, not these application changes.

For a TS repository, sketch the input/output types and one discriminated union before implementation. Name which invalid input still needs runtime validation. For GitJira's JS code, use its existing JSDoc/shared-schema conventions instead of converting the app to TypeScript.
