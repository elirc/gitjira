# 16. A role is meaningful only inside an object scope

[The shared policy module](../../packages/shared/src/policy.js) lists ADMIN, MEMBER and VIEWER roles and maps named actions to allowed roles. The server uses this matrix through authorization helpers, while the client can mirror it to hide or disable unavailable controls. The matrix answers whether a role permits an action; it does not establish that the actor belongs to the project containing a particular object.

## Combine two predicates

For sprint management, an actor must have membership in the target project and a role that permits sprint:manage. A MEMBER in project A does not gain authority over project B merely because MEMBER appears in the allowed list. The object lookup and membership scope must agree. This is why target sprint and column checks include project identity.

Construct four fixtures: an ADMIN in the target project, a MEMBER in the target project, a VIEWER in the target project and a MEMBER only in another project. Predict read and management outcomes. The first two can manage under the current matrix; the viewer can read but not manage; the foreign member lacks object-level membership. Preserve the distinction between forbidden and concealed not-found responses according to the service policy.

## Unknown actions are programming errors

The can function returns false for a missing role, but throws for an unknown action when a role is present. This makes a misspelled policy action visible rather than silently allowing it. The exact order matters: a missing role can return false before the unknown-action check. Tests should reflect the current behavior and decide whether that distinction is intended.

Build a table for every declared action and role. Then test an unknown action, null role and an unexpected role string in a direct JavaScript call. Type annotations and JSDoc help development tooling but do not stop arbitrary runtime values by themselves. Route authentication and role persistence provide other boundaries that should be inspected if the exercise becomes an implementation task.

## Documentation synchronization

The source comments describe a test that keeps a security document aligned with the matrix. Treat that as a historical or inspected claim until the test is located and run. A synchronization test can prevent a table from drifting, but it does not prove every route invokes the correct action. You need both policy-table tests and route/service coverage.

Create an action inventory from service entry points. For each mutation, record the action name passed to authorize and the object scope used. New writers such as moveIssue deserve their own row. A route that authenticates a user but omits project authorization can bypass a perfect central matrix. Centralization helps auditing only when callers actually use it correctly.

## Client policy is a courtesy

The UI can avoid offering controls a viewer cannot use, which reduces confusing errors. It cannot replace server enforcement. A stale browser can retain an enabled control after role removal, and a caller can send an HTTP request directly. Server tests should exercise those requests regardless of whether the UI normally exposes them.

Design a permission-change experience: a user opens a sprint dialog as MEMBER and becomes VIEWER before submitting. The server's authority timing policy determines the outcome, while the client should preserve enough intent to explain the rejection without falsely showing success. A refresh of role information may hide the control, but it should not erase the reason the command failed.

## Exercise and rubric

Submit the role/action matrix, an entry-point inventory and three negative tests involving foreign objects. Include a test where an identifier is valid but belongs to another project. A strong answer distinguishes schema shape, object membership and action permission. The reviewer should be able to locate both predicates and see that client presentation is not being mistaken for enforcement.

[Index](README.md) · [Review notes](answers/09-policy-and-tests.md)
