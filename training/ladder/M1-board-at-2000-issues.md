# M1: The board at 2,000 issues

**Context.** Acme's GJ project has 2,140 open issues and 30 people on the board at standup. Two complaints:

- "The board is missing cards." The board and the backlog render `useIssues(key, {})`, which is the first 50 issues by `createdAt desc` (`hooks.js:25-34`, `ProjectBoardPage.jsx`, `BacklogPage.jsx:18`). Sprint totals and "Start sprint" are computed on that truncated list.
- "Dragging is laggy, and every time someone creates an issue my board stutters." Every `activity` event calls `invalidateQueries({ queryKey: ['projects'] })` (`useLiveProject.js:20`), which refetches every project-scoped query in the cache. `Board` regroups on every new `issues` array (`Board.jsx`, `useMemo([issues, columns])`), `IssueCard` isn't memoized, and `onSelectIssue` is a new closure on every render of `ProjectBoardPage`.

**Ticket (lead).** "Make the board correct and smooth at 2k issues and 30 viewers. Correct first: every card must be reachable. Measure before and after with the React Profiler and the network panel, and put the numbers in the PR."

**Constraints.**

- No 2k-row payload on every event. Today's list payload is about 0.2 KB/issue (`issue.service.js:119-123`), so 2k issues is about 400 KB. Decide what the board loads and what an event refetches.
- Keep fractional ordering intact (`lib/board.js`, `positionForDrop`). Whatever you paginate, a drop must compute its position from **true** neighbors, not from a partial column.
- The optimistic move (`useMoveIssue`) must still roll back correctly (`apps/web/test/move-optimistic.test.jsx`).
- The bundle budget (`scripts/bundle-budget.mjs`, 85 kB gzip initial) still passes. If you reach for virtualization, justify the kilobytes.

**Definition of done.**

- Board and backlog show all issues. Pick one data shape and defend it: per-column queries, a board endpoint returning compact rows for open issues, or paging until done.
- Socket events invalidate **only** the affected project's board and list keys (and ideally only when relevant).
- Profiler evidence: one remote create at 2k cards used to re-render N cards and now re-renders about 1 card plus 1 column.
- A test: render `Board` with 2k fixture issues, change one issue, and assert that only that card's render counter increments (a render-count probe via `React.Profiler` `onRender`, or a mocked child).

**Explain before touching.**

1. Draw the path from one socket `activity` to pixels: which queries refetch, which components re-render, and which work is O(n) per render. Name the files.
2. Which of these are _correctness_ bugs and which are _performance_ bugs? Why fix correctness first?
3. `React.memo(IssueCard)` does nothing unless its props are stable. List every prop and whether it's referentially stable today.
4. Positions: if the board shows only part of a column, what breaks in `positionForDrop`? Could you ask the server to compute the position instead (`PATCH …/move` with `afterId` or `beforeId`)? What's the concurrency trade-off? See `apprenticeship/curriculum/03-concurrency-races.md`.
5. What does TanStack do with `structuralSharing` when a refetch returns identical data? Could that make memoization "free"?

<details><summary>Hints</summary>

- `select` in `useQuery` plus structural sharing keeps unchanged issue objects identical across refetches. Stable identities make `memo` effective.
- `invalidateQueries({ queryKey: queryKeys.issues(key) })` scopes to the project. `refetchType: 'active'` avoids refetching hidden tabs' data.
- Virtualization (`@tanstack/react-virtual`) matters when there are hundreds of cards per column, not before. Measure first.

</details>

Answer: `training/_answers/ladder-M1.md`
