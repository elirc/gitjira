# J2 reference: Load more in Table view

## Placement

- **No API change is required.** `{ issues, nextCursor }` already exists (`issue.service.js:140-146`), and `limit` is honored up to 100 (`issue.controller.js:36-40`).
- For the total, the cheap answer is `project._count.issues`, which the projects list already returns (`project.service.js:87-92`). Or add an optional `total` field computed **only on the first page** (no cursor). An added field isn't a breaking change, but update `response-schemas.js` and the contract test (`test/contract.test.js`) with it. `count(*) WHERE projectId = $1` is an index-only-ish scan on `Issue_projectId_createdAt_id_idx`: tens of ms at 400k rows, and too much to pay on every page.
- Web: add `useIssuesInfinite` in `hooks.js`. Keep the key under the same prefix, for example `['projects', key, 'issues', 'infinite', filters]`, so prefix invalidation from mutations and sockets still hits it. An infinite query stores `{ pages, pageParams }`, so it **must not** share the exact key with `useIssues`: a shared key between a normal and an infinite query corrupts the cache shape.
- `ProjectBoardPage.jsx`: table view uses the infinite hook with `pages.flatMap(p => p.issues)`, a counter, and a button with `disabled={isFetchingNextPage}`.

## Key answers

- **Created between pages:** new issues sort to the top (`createdAt desc`), so page 2 is unaffected. The new issue simply isn't on screen until a refetch. **Deleted between pages:** if the _cursor_ row is deleted, Prisma's cursor can't find it, and the result is an **empty page** (or wrong results). The client stops early and silently. A keyset `WHERE (createdAt, id) < ($c, $id)` cursor that encodes the values instead of an id survives deletion. That's the senior follow-up, and it's worth noting in the PR.
- **Invalidation cost:** TanStack refetches **every loaded page sequentially** for an infinite query. After 8 pages, one socket event means 8 requests per viewer. Mitigate with `maxPages`, or by only refetching page 1 and merging.
- **Board regression test:** the Board still uses `useIssues`. The existing `move-optimistic.test.jsx` must stay green, and the key separation above must not break its `setQueryData` on `queryKeys.issues(key, {})`.
- **Search:** the same pattern works, but R14 caps full-text results at 200 ids. "Load more" would stop at 200 without saying so. Surface "showing the first 200 matches" or fix the service.

## Tests

- MSW handler: `?cursor` absent returns 50 rows with `nextCursor: 'c50'`. `?cursor=c50` returns 10 rows with `nextCursor: null`. Click Load more, then assert 60 rows and that the button is gone.
- API: `limit=100` returns ≤ 100, and following `nextCursor` until null yields `total` distinct ids with no duplicates. Seed 120 issues via `@gitjira/test-factories`.
