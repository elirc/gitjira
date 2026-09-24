# M1 reference: board at 2,000 issues

## The path from one event to pixels (today)

1. `activity` arrives, and `useLiveProject.js:20` invalidates `['projects']`. That marks **every** project-scoped query stale: the projects list, `['projects', key]`, the issues list, every search, sprints, the open issue detail, and the same keys for any other project visited this session. Active ones refetch immediately.
2. The `useIssues` refetch returns a new `issues` array. `ProjectBoardPage` re-renders, and so does `Board`.
3. `Board`: `useMemo(groupByColumn(issues, columns))` recomputes with an O(n log n) sort per column (`lib/board.js:8-17`). `activeIssue` does an `issues.find`, which is O(n).
4. Each `BoardColumn` re-renders and builds `issues.map(i => i.id)` for `SortableContext` (O(n)). **Every** `IssueCard` re-renders (not memoized, and `onSelectIssue` is a new closure from `ProjectBoardPage`), and each runs `useSortable`.
5. The `useProject` refetch also changes `project.columns` identity, which busts the `useMemo`.

## Correctness vs performance

Truncation to 50 (R7) is a **correctness** bug: cards are unreachable, and sprint totals are wrong. Fix it first, because the performance fix changes the data shape anyway. Optimizing a board that shows the wrong data just builds on a false baseline.

## A reasonable design

- **Data:** a dedicated board read, `GET /projects/:key/board`, that returns compact rows (`id, number, type, title, priority, columnId, position, assigneeId, sprintId, storyPoints`) for issues in non-DONE columns plus the newest N DONE ones. It's ordered by `(columnId, position)` and served by an index `(projectId, columnId, position)`. At 2k rows × about 120 B that's about 240 KB (about 40 KB gzipped), fetched once. Per-column pagination is the alternative: it's better at 20k+, but it complicates drops (true neighbors can be off-page).
- **Updates:** scope invalidation to `['projects', key, 'board']` and `['projects', key, 'issues']`. Better still, once events carry `issueId` (they do, `activity.service.js:26`), refetch **one** issue (`GET …/issues/:number`) and patch it into the cache with `setQueryData`. That's safe because it reads committed state _after_ the event (and only once M4 emits after commit).
- **Rendering:** `React.memo(IssueCard)`, a stable `onSelectIssue` (`useCallback`, or pass an id and let the card call a stable dispatcher), and structural sharing (the TanStack default) so unchanged issues keep their object identity across refetches. With that, one changed issue re-renders one card plus its column's `SortableContext`.
- **Positions:** with a full board load, `positionForDrop` has the true neighbors. If you paginate columns, send `afterId`/`beforeId` and let the server compute `keyBetween` inside a transaction with the neighbors' current positions. That removes client-side staleness, but two concurrent drops between the same neighbors can compute the **same key**. Resolve with a unique `(columnId, position)` constraint and retry, or with a random jitter suffix. See `apprenticeship/curriculum/03-concurrency-races.md`.
- **Virtualization:** only if the Profiler shows commit time dominated by card count _after_ memoization. dnd-kit plus virtualization is fiddly, and the budget (`bundle-budget.mjs`) applies to the initial chunk only. The board chunk is lazy (`App.jsx:24`).

## Evidence to include in the PR

Profiler "commits per remote create" and "render duration" before and after. Network: requests per event per viewer (today about 5–8, target 1). A render-count test: `<Profiler onRender>` around the board, or `vi.fn` inside a mocked `IssueCard`. Change one fixture issue and assert that exactly one card re-renders.

## Trap

`structuralSharing` only preserves identity for deep-equal data. If the server adds a volatile field (for example `updatedAt` on every row), every card changes identity again. Keep board rows free of volatile fields.
