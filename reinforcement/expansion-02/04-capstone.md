# A bounded application change

## Story: a precise partial-edit flow under an expired session

Choose a small issue-edit surface. Preserve existing shared schemas and query keys. Write a request table covering title-only, explicit unassign, zero points, cleared points, invalid title, and omitted fields. Ensure the UI submits only intended changes and the API preserves unrelated persisted values.

Then add an expired-session regression: concurrent reads should use one refresh operation; a failed refresh should not leave a permanently cached rejection; a later authenticated attempt should use the correct current context. Keep the number of original-request retries bounded and use the app's existing auth conventions.

Acceptance is observable state, not merely a parser return or a refresh spy count. For PATCH, inspect the stored issue and visible detail/list after success. For refresh, control overlap and error paths. If mutation replay is involved, explicitly document the existing endpoint's safety contract instead of assuming the gate supplies idempotency.

Exclude a new auth provider, a general client rewrite, and a TypeScript migration. Deliver a small shared-schema/client regression with JSDoc that explains missing versus null and the cleanup boundary.

## Delivery contract

Produce a one-page proposal, an acceptance table, a focused practice diff, and a verification note. If the relevant code already behaves correctly, deliver the missing regression or characterization evidence instead of rewriting it. If setup is blocked, deliver the proposed diff and precise reproduction plan with runtime status pending; do not mark the capstone implemented.

Before accepting an agent's patch, explain the smallest failing example yourself. Limit its allowed files, name an excluded adjacent feature, and ask it to list assumptions. Review the whole diff, including removed assertions and changed defaults. Your final explanation must distinguish the application's existing guarantees from the new teaching model's choices.

Completion requires a before/after example visible at the right boundary, one unrelated behavior preserved, and one limitation stated plainly. “All tests pass” is not sufficient if the relevant case was never in the suite. End with a 90-second explanation aimed at a teammate who did not see these exercises.
