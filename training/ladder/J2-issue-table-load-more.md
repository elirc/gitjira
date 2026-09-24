# J2: The issue table stops at 50

**Context.** Support ticket: "Project SCL3 has 412 issues according to the project list (`_count.issues`), but Table view shows 50 and there's no way to see the rest." `useIssues` (`apps/web/src/lib/hooks.js:25-34`) calls `GET /api/projects/:key/issues` with no `limit`. The controller defaults to 50 (`issue.controller.js:28-40`), and the service returns `{ issues, nextCursor }` (`issue.service.js:140-146`). Nobody reads `nextCursor`. The same list feeds the Board and the Backlog. Those are M1's problem, so this ticket is **Table view only**.

**Ticket (PM).** "Table view: show the first page fast, then a 'Load more' button (or infinite scroll, your call) until everything is loaded. Show '50 of 412' so people know there's more."

**Constraints.**

- No API breaking change. The response shape `{ issues, nextCursor }` is shared with other callers and with `packages/shared/src/response-schemas.js`. Adding a field is fine. Changing or removing one isn't.
- A total count must not make every page request slow. Know what `count(*)` over `Issue WHERE projectId = $1` costs at 400k rows, and decide when it runs.
- Keep `queryKeys.issues(projectKey, filters)` as the cache address, or explain why an infinite query needs a different key. `useLiveProject` and the mutations invalidate by prefix.
- JQL search results (`useSearch`) use the same table. Say whether they get "Load more" too, and what R14's 200-id cap means for that.

**Definition of done.**

- `useIssuesInfinite(projectKey, filters)` built on TanStack `useInfiniteQuery` with `getNextPageParam: (last) => last.nextCursor ?? undefined`.
- Table view renders all loaded pages, shows "N of total" and a Load more button, and disables the button while fetching.
- An RTL + MSW test (`apps/web/test/projects-msw.test.jsx` shows the pattern). MSW serves page 1 with a cursor and page 2 without one. Click Load more, and assert 51+ rows and no button.
- An API test: `limit=100` returns ≤ 100 items, and `nextCursor` round-trips (`test/issue-list-limit.test.js` exists; extend it).

**Explain before touching.**

1. Which files change on the web side and which on the API side? Is any API change actually needed?
2. Cursor pagination here is `cursor: { id }, skip: 1` ordered by `createdAt desc, id desc` (`issue.service.js:114-118`). What happens to page 2 if an issue is **created** or **deleted** between page 1 and page 2? What if the cursor issue itself was deleted?
3. Where does the total count come from, and at what cost? Would `project._count.issues` (already on the projects list) do?
4. When a socket `activity` event invalidates `['projects', key, 'issues', {}]`, what does an infinite query refetch: page 1, or all loaded pages? What does that cost with 8 pages loaded?
5. Which test proves "no regression for the Board", which still uses `useIssues`?

<details><summary>Hints</summary>

- `useInfiniteQuery` refetches **every loaded page sequentially** on invalidation. That's fine for 3 pages and costly for 40, so consider `maxPages`.
- Prisma's `cursor` needs the cursor row to exist. Check what happens when it doesn't (try it).

</details>

Answer: `training/_answers/ladder-J2.md`
