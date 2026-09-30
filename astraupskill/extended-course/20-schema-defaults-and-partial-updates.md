# 20. Defaults belong to creation, not every patch

[The shared issue schemas](../../packages/shared/src/issue-schemas.js) define field shapes once, then add defaults for createIssue and make fields optional for updateIssue. The source explicitly warns that defaults on a PATCH can reset omitted values. This is a practical contract lesson: absence is data about intent, and validation transformations can change that intent before the service sees it.

## A concrete priority example

An existing issue has HIGHEST priority. The user patches only its title. If the patch schema applied a MEDIUM default to omitted priority, the parsed request would contain priority MEDIUM and the service could reset it. The current schema avoids that by applying defaults only in the create shape. A test should inspect parsed output, not merely whether parsing succeeds.

Create three fixtures: creation without type or priority, title-only patch and explicit priority patch. Predict resulting parsed objects. The creation receives its defaults; the title-only patch should not invent priority; the explicit patch carries the requested value. A service test can then verify unchanged fields remain unchanged after title-only mutation.

## Omitted, null and empty

assigneeId is nullish in the shared field shape, and the service checks property presence to decide whether to clear or set it. Omission means no change; null can mean unassign. storyPoints also permits null within its numeric constraints. An empty string is not automatically equivalent to either omission or null unless the schema transforms it.

Build a request table for assigneeId omitted, null, a valid-looking string and an empty string. Trace schema acceptance and service behavior separately. Ownership validation of the referenced user is another question. A value can satisfy a string schema without being a permitted assignee in the project. Keep shape, intent and authority as distinct validation layers.

## Sprint destinations

completeSprintSchema allows a nullish string for moveUnfinishedTo. The service interprets backlog as null and also treats omitted or null destination as backlog. Other strings are treated as sprint identifiers when truthy. A schema that accepts an empty string can interact with truthiness in a way that differs from an explicit identifier. Characterize the complete route from parsed request to service decision rather than assuming every string is a real sprint ID.

assignSprintSchema makes expectedUpdatedAt optional and validates it as a datetime string when supplied. The browser backlog sends issue.updatedAt, but direct callers can omit it under this schema. That confirms the earlier lesson that optimistic comparison is not mandatory for every accepted assignment request. A proposal to require it needs client compatibility and error messaging.

## Position validation is only a start

moveIssueSchema requires nonempty columnId and position strings. It does not encode the fractional-key algorithm's full domain or verify that position lies between the client's claimed neighbors. The service checks column ownership separately. A stronger ordering protocol would need additional data and validation, not merely a longer string schema.

Design a validation matrix for malformed shape, missing resource, foreign resource, stale version and illegal lifecycle. Map each to the appropriate layer and user explanation. A schema error should not be used to disguise an authorization failure, and a database foreign-key error should not be the only planned explanation for a foreign-project reference.

## Exercise

Write parser tests with exact expected output objects and service tests that verify omitted fields remain unchanged. Add one proposed compatibility migration making expectedUpdatedAt required for assignment. Explain how older clients discover the new requirement and preserve their unsaved intent. A strong answer treats validation as a transformation contract, not merely a pass/fail gate.

[Index](README.md) · [Review notes](answers/10-browser-and-schema.md)
