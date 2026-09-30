# Review notes: policy and controlled testing

The policy matrix permits ADMIN and MEMBER to manage sprints while VIEWER can read. Object membership remains separate. A member of another project fails object scope even if their role permits the action in their own project. A valid identifier or successful authentication does not establish access to the referenced sprint or column.

can returns false for a missing role before checking the action, and throws for an unknown action when it reaches that lookup with a role. A policy-table test does not prove every route passes the right action. The entry-point inventory must connect authentication, project membership, action permission and target ownership.

The concurrency harness should use entered and release signals with bounded failure timeouts. It must assert the intended event order and inspect final durable rows. Promise.all alone does not prove a particular interleaving. A fake transaction that cannot roll back cannot establish database atomicity.

Test isolation includes a disposable verified database target, synthetic records, scoped cache or queue state and finally-based restoration of faults. Mutations should break named invariants. The report should say whether the harness is proposed, model-executed or application-executed, and it should avoid broad claims about deployment behavior from a single-process test.

[Index](../README.md)
