# Boundary lessons: PATCH semantics and shared asynchronous work

## Missing is an instruction too

Read issueFields, createIssueSchema, and updateIssueSchema. The source deliberately puts defaults on creation rather than on shared field definitions. Explain the difference between a title-only PATCH leaving priority alone and resetting priority to MEDIUM. A convenient shared schema can introduce data loss when create and update semantics are collapsed.

Write three payloads for assigneeId: absent, null, and a nonempty ID. Define the user action represented by each. Repeat for storyPoints with absent, zero, and null. Truthiness cannot distinguish zero from missing, and a merge using `value || oldValue` cannot clear a field deliberately.

The new lab rejects unknown fields and treats present undefined as invalid. That is its explicit boundary contract; compare it with the application's actual Zod behavior before changing an endpoint. JSON serialization can drop undefined properties, so a JavaScript unit test and a wire-level request may present different objects.

## Sharing a promise changes ownership

Read refreshInFlight and refreshSession in api.js. Identify the first caller, concurrent callers, and the finally cleanup. A shared promise prevents a burst of independent refresh requests for one expired session. It also means several consumers depend on the same success or failure, so cleanup must not leave a rejected promise cached forever.

Draw three phases: create shared work, observe its result, release the slot. Explain why an async wrapper can return different outer Promise objects even when it awaits the same underlying work. The teaching gate deliberately returns the identical promise for the same key so identity is testable, but real callers usually care primarily about one underlying operation.

## A failed refresh is not permission to replay anything

Follow api's handling of auth routes, 401, the one retry, and 204. Determine which original request options are replayed. The gate lab proves only deduplication and cleanup; it does not prove a mutation can be retried safely, that cookies are scoped correctly, or that one user's refresh cannot be shared with another.

Session changes deserve an explicit lifetime boundary. A single-flight map keyed too broadly can share work across identities; a key containing a raw bearer token can create logging and retention hazards. Propose an in-memory session-generation key and explain its limits before adding it to production.

## Keep JavaScript idioms coherent

This repository uses JavaScript with shared schemas and JSDoc. Improving a partial-update boundary does not require a broad TypeScript conversion. Add types where they clarify the contract, then prove the runtime parser sees the values you think the browser sends.

## Make the boundary visible

For each source trace, record the caller, input representation, validation, state owner, returned value, and visible user consequence. Put a question mark beside every arrow you inferred rather than located. Resolve one question by reading its caller and one by proposing a focused test. A diagram full of accurate filenames can still miss an unhandled outcome.

End with three sentences: the invariant, the failure that would violate it, and the smallest observation that would detect the violation. Use [the source map](README.md) to keep this exercise attached to the actual repository.
