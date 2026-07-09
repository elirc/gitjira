# Sprint 05 — Issue Detail, Comments & MVP · Learning brief

**Levels:** L1, L3, L4 · **PR:** #49 · **Release:** v0.1.0

## What this sprint teaches

1. **URL as a state container**: `?selected=` deep-links, back button, shareable. → `ProjectBoardPage`
2. **Event sourcing lite at the service layer**: history that carries intent, in-transaction. → `activity.service.js`, ADR 0011
3. **Layered authorization**: membership to _see_, authorship to _edit_. → `comment.service.js`
4. **Production feel**: skeletons, empty states, error boundary, 404 — the last 20%.
5. **Release engineering**: what v0.1.0 actually involves.

## Read the PR in this order

migration → `activity.service.js` (the seam) → issue-service changes (events recorded in-transaction) → comment/attachment services → `IssueDetailPanel` (URL state, inline edit) → **the review threads** (the dirty-guard and the divide-by-zero) → release commits.

## Exercises

1. Add an emoji reaction to comments, end to end.
2. Find the seeded deep-link edge: open a card, edit the description, click the backdrop — what happens to your edit? Fix it.
3. Write the v0.1.0 release notes yourself from the commit log, then diff against the generated CHANGELOG.

<details><summary>Hints</summary>

1. New table or a JSON column on Comment; a reactions endpoint; optimistic toggle in the panel.
2. The panel's onClose doesn't check whether you're mid-edit. (This is the review finding — try before reading it.)
3. `git log v0.0.4..HEAD --oneline` is your source.

</details>
