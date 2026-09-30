# 26. A conflict response should preserve the user's next decision

Several GitJira operations can return a conflict: stale issue version, illegal sprint transition, another active sprint, invalid completion destination or exhausted serialization retries. A client that displays the same “try again” message for all of them loses information the user needs. This workshop connects error categories to safe recovery actions.

## Classify by changed premise

A stale-version conflict means the issue no longer matches the version the user edited. Recovery should compare current state with attempted intent. An illegal lifecycle transition means the requested action does not apply to the current sprint state. Recovery may require choosing another action, not repeating the same request. An exhausted serialization conflict indicates the bounded internal policy could not complete under contention and asks for a fresh attempt.

An active-sprint uniqueness conflict concerns another row in the project. The UI can show the active sprint if the actor is authorized to read it. A foreign destination may intentionally appear not found rather than conflict, preserving object concealment. Error presentation should respect that policy and avoid revealing the foreign project's identity through a helpful-looking message.

## Preserve intent explicitly

For assignment, retain the requested destination separately from the current issue.sprintId. For a title edit, retain the typed title. For sprint completion, retain the chosen destination and show how source or destination state changed. A refresh that replaces form state can erase the very information the user needs to decide whether to reapply.

Design a conflict panel with current value, attempted value and available actions. Reapply should issue a new deliberate command with the current version after user review. It should not be an automatic loop that keeps replacing expectedUpdatedAt until the server accepts. Cancel should abandon unsaved local intent without implying a previously committed command was undone.

## Unknown network outcomes

A network timeout differs from a server conflict. The command may have committed. The client should use a durable read or a proposed command receipt to recover status before repeating a non-idempotent operation. For issue creation, searching by title is weak association because duplicate titles are legitimate. For completion, current COMPLETED state proves lifecycle state but may not reveal the original destination or movedCount without history.

Write separate messages for known rejection and unknown outcome. The latter should say that status is being checked or that the user should inspect the current resource. Avoid implying absence from a missing response. This is a direct consequence of the postcommit enqueue and response-loss cases in earlier chapters.

## Accessibility and asynchronous feedback

The current backlog displays assignment errors with role alert. Review the full flow for start, completion and creation errors, pending states and focus behavior. A message should be announced at the right time without repeatedly interrupting the user on every refetch. A disabled control needs an understandable reason when the user cannot act.

For a keyboard user, preserve focus on a meaningful control after a conflict. If the selected sprint disappears because it completed, explain that change and offer available destinations. For a screen-reader user, distinguish saved state from pending intent in labels. These are proposed review cases; they require rendered UI evidence before claiming conformance.

## Exercise

Create a recovery table for six failures and write one concise user message for each. Include stale version, completed destination, foreign destination, another active sprint, retry exhaustion and lost response after commit. Then pair each message with a testable UI state transition. The copy and behavior should agree: a button labeled retry must not silently perform a different command.

Submit the table, conflict panel sketch and a two-tab scenario. A strong answer makes the next decision easier without exposing unnecessary internal details. It also preserves the difference between a rejected command and an uncertain result.

[Index](README.md) · [Review notes](answers/12-incidents-and-capstone.md)
