# Review notes: creation and pagination

The project counter increment, issue insert and creation activity share a transaction. A failure after allocation should roll back that increment under the configured database semantics. This does not prove lifetime gaplessness after deletions or other workflows. Concurrent position calculation remains a separate concern because it occurs before the transaction and can produce equal keys.

Parent depth, column ownership and notification handoff need their own evidence. A caller-supplied foreign key can be well-formed but belong to another project. A postcommit enqueue failure can leave the issue durable while the service returns an error. A proposed command receipt or outbox should preserve that distinction rather than repeating issue creation to recover notification delivery.

For pagination, limit plus one supplies a has-more signal; only limit rows are returned, and the last returned row becomes the next cursor. The ordering uses createdAt and ID, so fixtures with tied timestamps should still have a deterministic sequence. New leading inserts and changing filters do not become part of an immutable snapshot merely because cursor pagination is used.

Cursor behavior for deleted or foreign rows should be established with the actual relational adapter. A proposed opaque cursor can encode ordering and filter context, but it needs validation and compatibility design. The current list projection includes updatedAt so later assignment commands can use a stale-write token. Removing it for a smaller payload could weaken the client contract.

Full credit requires separating stable ordering, changing membership and complete export semantics. A scrolling UI can reasonably refresh to discover new leading rows; a historical export needs a stronger snapshot contract. The endpoint should communicate the behavior it actually supports.

[Index](../README.md)
