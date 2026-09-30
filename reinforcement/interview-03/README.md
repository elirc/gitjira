# 04. GitJira: interview preparation

An issue tracker combines shared request schemas, board/detail views, and session-aware API calls. Explain PATCH semantics, query identity, asynchronous refresh ownership, and how a user learns that a save failed.

This is an additive third block. Keep the [original foundations](../README.md) and [second practice block](../expansion-02/README.md). This block focuses on explaining, implementing, testing, and defending decisions under interview conditions. The scenarios are synthetic practice cases anchored to the source map, not claims of newly discovered application bugs.

## Start with one interview round

| Round | Practice                                                                | Timebox         |
| ----- | ----------------------------------------------------------------------- | --------------- |
| 1     | [JavaScript reasoning and live coding](rounds/01-javascript.md)         | 30 min per case |
| 2     | [React component and interaction interview](rounds/02-react.md)         | 35 min per case |
| 3     | [TypeScript, schemas, and public contracts](rounds/03-typescript.md)    | 25 min per case |
| 4     | [Asynchronous JavaScript and API boundaries](rounds/04-async-api.md)    | 30 min per case |
| 5     | [Debugging and test-design interview](rounds/05-debugging.md)           | 35 min per case |
| 6     | [Junior system-design and data-model interview](rounds/06-design.md)    | 40 min per case |
| 7     | [Code-review and take-home defense](rounds/07-review.md)                | 30 min per case |
| 8     | [Project explanation and behavioral interview](rounds/08-behavioral.md) | 25 min per case |

Each round has six project scenarios. That makes **48 scenario/round combinations**, not 48 unrelated production incidents. Revisit the same situation from different engineering roles: an algorithm can be correct while its UI ownership, API scope, or verification claim is wrong. Interviewer guidance is kept in a separate folder; close it until after your attempt.

Use the [coding challenge](coding/README.md), [study plan](STUDY-PLAN.md), [project defense](PROJECT-DEFENSE.md), and [scorecard](SCORECARD.md). The three complete mocks are [frontend](mocks/frontend.md), [full stack](mocks/full-stack.md), and [project defense](mocks/project-defense.md). The [all-project interview route](../../../opusorganize/junior-reinforcement/interview-03/README.md) explains how to choose projects without trying to finish everything in one sitting.

## Six scenarios

1. **Omitted and cleared fields collapse:** An issue patch should preserve an omitted assignee but clear an explicitly null assignee. A truthiness shortcut also loses a legitimate zero estimate.
2. **One refresh request serves several callers:** Two requests encounter an expired session at nearly the same time. A shared refresh is meant to prevent duplicate refresh work.
3. **Logout occurs during refresh:** A refresh starts, the user logs out, and an old refresh response later returns. A successful response must not silently resurrect the earlier session.
4. **Board and detail disagree after a save:** The detail view displays a new issue status while the board remains stale. A candidate must identify which data sets contain the changed entity.
5. **Dependencies contain a cycle:** A synthetic issue planner orders prerequisites before dependents. A cycle should be reported rather than returning an incomplete plan as success.
6. **A stale closure saves an old title:** An editor schedules work that captures the title at the time of an event. The user changes the title before the work finishes. Clarify whether the operation belongs to the original submission or the current draft.

## Actual source to inspect

- [packages/shared/src/query-keys.js](../../packages/shared/src/query-keys.js)
- [apps/web/src/lib/hooks.js](../../apps/web/src/lib/hooks.js)
- [apps/web/src/lib/api.js](../../apps/web/src/lib/api.js)
- [packages/shared/src/issue-schemas.js](../../packages/shared/src/issue-schemas.js)
- [learn/00-onramp.md](../../learn/00-onramp.md)

Read current symbols and callers before attributing a guarantee to the application. A lab fixture may introduce an explicit version, policy, or field that the app does not have. The local Node challenge verifies its written teaching contract only. React sketches, TypeScript/JSDoc sketches, database plans, and browser claims require their own checks.

The intended audience is a junior software engineer practicing fundamentals and project explanations. Scoring is educational and is not an employer's hiring rubric or a guarantee of interview outcomes. Personal mastery starts **not assessed**.
