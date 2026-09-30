# Contracts, data ownership, and consistency

The tables are **proposed design contracts** for the worked case. They are not migration files, verified production schemas, or a claim that these exact endpoint paths exist. Compare them with the [source map](README.md) before any implementation.

## Data model

| Entity       | Identity / candidate key        | Important fields                                                | Owner or purpose                         |
| ------------ | ------------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Issue        | (workspace_id, issue_id)        | project_id, title, status, assignee, estimate, optional version | Authoritative issue state                |
| Session      | server-defined session identity | actor, expiry, revocation/rotation state                        | Authentication lifecycle; not query data |
| ChangeIntent | event_id                        | workspace_id, issue_id, changed_fields/version                  | Optional durable notification intent     |
| ClientQuery  | complete query key              | project/filter/page plus current account scope                  | Derived browser projection               |

Distinguish entity identity from operation identity. A record can receive many commands; a retry of one command should not automatically become a new intent. Include scope where it changes meaning. A globally unique-looking ID still needs authorization, and an opaque identifier should not be normalized as if it were human search text.

## Public API examples

| Illustrative endpoint     | Input boundary                                                        | Accepted outcome           | Other outcomes                                          |
| ------------------------- | --------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------- |
| PATCH /issues/{id}        | Allowed patch fields; optional expected version under proposed policy | 200 accepted current issue | 409 conflict if enabled; auth failure; field validation |
| POST /auth/refresh        | Existing session credential under server contract                     | 200 renewed session state  | Revoked/expired result; do not loop indefinitely        |
| GET /projects/{id}/issues | Authorized project, filter, complete cursor                           | 200 current projection     | Failure is not an empty board                           |

For one write, add literal examples of omitted, explicit null, zero, wrong-type, stale, and unauthorized input where meaningful. Do not collapse them with a truthiness default. Return an outcome that lets the UI distinguish rejection, accepted-but-not-yet-observed work, and an uncertain response. A timeout does not prove the effect rolled back.

## Query and constraint review

Choose issue-list indexes from actual workspace/project/filter/order combinations, not one index per UI control. If change delivery is added, give event identity a durable uniqueness boundary and a bounded retention/replay policy. Session secrets do not belong in notification payloads or cache keys exposed to other users.

Write the actual predicate and order before proposing an index. Compare the read improvement with write/storage cost and use representative data when examining a plan. A complete cursor must match the complete order; a cursor alone does not freeze a changing dataset across requests. An index improves access to data, while a constraint or conditional transition enforces a different kind of rule.

## Consistency worksheet

Fill four rows for the design: authoritative mutation, immediate read after that mutation, another user's projection, and asynchronous notification/progress. For each, state the source of truth, acceptable staleness, and recovery action. Do not label the entire system strongly or eventually consistent without naming which operation the statement concerns.

The invariant to protect is **An issue mutation changes only permitted fields in its scope, and each affected view eventually reflects the accepted result without an obsolete session or query response taking ownership.**. Identify the exact write predicate, transaction, or durable identity that enforces it. If the rule spans several records, explain why concurrent operations cannot each pass an earlier check and then commit an invalid combination. A transaction boundary and an isolation choice must be examined together.

## Compatibility, retention, and deletion

When adding a field or outcome, describe what an older client or stored object does. A safe proposal can expand readers first, backfill deliberately, and later require the new writer contract; the exact sequence depends on the repository. Do not call a schema sketch a completed migration.

Choose retention separately for authoritative records, command receipts, work intents, audit history, private source material, and cache entries. Expiring a receipt too early can change retry behavior. Keeping every private payload forever can create unnecessary exposure and operating cost. Record the product decision and recovery consequence rather than inventing a universal retention period.
