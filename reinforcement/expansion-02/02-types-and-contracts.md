# Types, runtime values, and compatibility

Write a JSDoc UpdateIssueInput distinguishing optional properties from nullable values. Show a consumer that checks own-property presence before applying a clear. List which accepted values come from runtime schemas and which only appear in editor hints.

For shared work, describe a mapping from a stable in-memory key to Promise<Result>. Errors are promise rejections, not successful Result objects with an undocumented error field. The map's lifecycle must be explicit after resolution and rejection.

Construct compatibility fixtures from an old client sending only title, a client clearing assigneeId, and a client setting storyPoints to zero. Confirm that adding a default on the update schema would change at least one fixture. If an API intentionally permits unknown fields, test and document that policy rather than importing the lab's stricter choice without review.

## Contract worksheet

Write five concrete examples before coding: valid input, missing input, explicitly empty input, wrong primitive type, and a value valid yesterday but stale now. Record whether each is rejected, normalized, ignored, or accepted with a distinct outcome. “TypeScript catches it” is insufficient for JSON, browser storage, events, or a database row returned through an unchecked cast.

Use a discriminated union for outcomes that require different UI behavior. In a TypeScript practice file, make a consumer switch exhaustive and demonstrate which new variant should force a review. In GitJira, use its JSDoc and schema conventions rather than converting the project. Keep proposed type snippets in your practice work until you have verified the actual application contract.

Choose one backwards-compatibility risk: an old caller omits a new field, a saved object has an older shape, or an older client interprets a new outcome as success. Describe a migration or fallback and a test using an old fixture. A renamed property is a contract change even when all currently compiled callers are updated.
