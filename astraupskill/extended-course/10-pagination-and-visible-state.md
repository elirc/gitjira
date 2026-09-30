# 10. A stable cursor needs a stable ordering contract

listIssues scopes rows to a project, applies selected filters, requests limit plus one rows and orders by descending createdAt followed by descending identifier. When a cursor is supplied, it skips the cursor row and asks for the following page. The extra row determines whether another page exists. This is a concrete query pattern, not a universal guarantee that a scrolling client sees one immutable snapshot.

## Work the page boundary

Use five synthetic issues with ordered pairs of creation time and identifier. Set limit to two. The query fetches three rows, returns the first two and uses the second returned row's ID as nextCursor. The extra third row is evidence of more data, not a row to return twice. On the next page, the cursor row is skipped.

Create a tie in createdAt and verify the identifier tie-break. A sort only by a nonunique timestamp can make page boundaries unstable. The explicit second key gives a total order for the fixture, assuming identifiers are unique and the database ordering contract is understood. Tests should compare the exact sequence of IDs across pages.

## Inserts and updates between pages

If a new issue is inserted ahead of the current cursor, it may not appear in the continuation page. That can be acceptable for a scrolling session but differs from a live synchronized board. If a filtered field changes between requests, an issue can enter or leave the result set. A cursor does not freeze filter membership or create a historical snapshot by itself.

Design a user policy: should the client show a “new issues available” notice, restart pagination on refresh, or maintain a live subscription? Each choice has complexity. The API should not promise a complete immutable export if it only offers ordinary cursor pagination over changing rows. A separate export snapshot may be needed for that use case.

## Cursor identity and filter scope

Investigate how the ORM handles a cursor ID that belongs to another project or no longer matches the active filters. Do not infer the behavior from the method name. Build relational tests with two projects and changed filters. The outer where clause scopes returned rows, but the cursor's role in locating the boundary deserves explicit evidence.

A proposed opaque cursor can encode ordering values and filter identity rather than exposing only a row ID. It should be validated and, if tamper resistance is part of the design, use an appropriate verified mechanism. This course does not implement such a cursor. The exercise is to state which semantics the current ID cursor lacks and whether the product needs them.

## Projection is part of the client contract

The list query selects fields used by tables and boards, including columnId, position, sprintId, updatedAt and storyPoints, while omitting large descriptions. The updatedAt token is particularly important because the backlog assignment client can submit it for stale-write protection. A performance optimization that removes it may accidentally weaken client concurrency behavior.

Write a field-purpose table. Identify display fields, grouping fields, ordering fields, command tokens and derived issue keys. Avoid treating all omitted fields as accidental; projection can reduce payload and clarify the list contract. Conversely, a client that needs detail should fetch the detail endpoint rather than assume the list includes every field.

## Exercise

Build a pagination fixture with timestamp ties, a new leading insert, a deleted cursor row and a filter change. Record current behavior in a disposable relational test and compare it with the desired product policy. Include a client merge strategy that prevents duplicate IDs when refreshed pages overlap. A strong answer states the difference between stable ordering and snapshot completeness, and it preserves the version token needed by later commands.

[Index](README.md) · [Review notes](answers/06-creation-and-pagination.md)
