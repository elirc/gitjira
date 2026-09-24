# INC-001: Board page burns CPU, and Postgres follows

**Severity:** SEV-2 (core board degraded for the largest customer)
**Branch:** `training/incidents/001-board-cpu-storm`
**Alerts:**

- `PostgresCPUHigh` fired Tue 10:07 (> 80 % for 5 min).
- `ApiEventLoopLagP99 > 250ms` fired Tue 10:09 on both API machines.

Web release `v1.1.2` went out Mon 17:30. It was a static-bundle change only, and the API image is unchanged since last week.

## What users report (support queue, Tue 10:00–10:30)

- "The board is janky when our standup starts. My laptop fan spins up as soon as I open GJ."
- "The presence avatars flicker. Sometimes a teammate's new card only shows up after I refresh."
- "Quiet projects are fine. Only our team board is bad, and there are about 30 of us on it at 10:00."
- Nobody reports errors, and the new "A teammate created an issue" toast works.

## Metrics

| Metric                                                      | Mon 10:00 (before release)                       | Tue 10:05                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Postgres CPU                                                | 14 %                                             | 91 %                                                                            |
| Top statement by calls (`pg_stat_statements`)               | `SELECT … FROM "Issue" WHERE "projectId" = $1 …` | `SELECT … FROM "ProjectMember" WHERE ("projectId","userId") = ($1,$2) LIMIT $3` |
| Calls/hour of that `ProjectMember` statement                | 3.1 k                                            | 1.9 M                                                                           |
| `http_requests_total` rate, all routes                      | 42 req/s                                         | 118 req/s                                                                       |
| Socket.IO messages in (API, from Node `--inspect` sampling) | ~2/s                                             | ~6,400/s                                                                        |
| API event-loop lag p99                                      | 4 ms                                             | 380 ms                                                                          |
| Board viewers in project GJ (Presence)                      | 28                                               | 28                                                                              |
| Chrome Performance tab on a GJ viewer's laptop              | idle                                             | "Scripting" 70 % of main thread, continuous                                     |

The HTTP rate roughly tripled. Most of the extra traffic is `GET /api/projects/GJ/issues` and `GET /api/projects/GJ`, which clients keep refetching.

## Logs (API, pino, trimmed)

```
10:05:11.402 INFO  socket connected           userId=u_ana  socketId=Xk2…
10:05:11.950 WARN  prisma:pool                 "Timed out fetching a new connection from the connection pool" (connection_limit=9)
10:05:12.013 ERROR unhandled error             url=/api/projects/GJ/issues  err="Timed out fetching a new connection from the connection pool"
10:05:12.300 INFO  request completed           GET /api/projects/GJ 200 1840ms
```

There are no errors in the browser console. With React DevTools "Highlight updates" turned on, the whole board page flashes continuously, even when nobody touches anything.

## The suspect PR (#152, merged Mon 16:50, CI green, 1 approval)

`git show training/incidents/001-board-cpu-storm` shows the full diff. The core of it:

```diff
--- a/apps/web/src/lib/useLiveProject.js
+++ b/apps/web/src/lib/useLiveProject.js
-export function useLiveProject(projectId) {
+export function useLiveProject(projectId, options = {}) {
 ...
-    const onActivity = () => {
+    const onActivity = (event) => {
       qc.invalidateQueries({ queryKey: ['projects'] });
+      options.onActivity?.(event);
     };
 ...
-  }, [projectId, qc]);
+  }, [projectId, qc, options]);
--- a/apps/web/src/pages/ProjectBoardPage.jsx
+++ b/apps/web/src/pages/ProjectBoardPage.jsx
-  const { viewers } = useLiveProject(project?.id);
+  const { user } = useAuth();
+  const [toast, setToast] = useState(null);
+  const { viewers } = useLiveProject(project?.id, {
+    onActivity: (event) => {
+      if (event.actorId !== user?.id) setToast(TOAST_TEXT[event.kind] ?? 'A teammate updated the board');
+    },
+  });
```

Review thread: "Nice, and thanks for listing every value the effect reads in the deps. The exhaustive-deps rule would have flagged `options` otherwise."

## Your tasks

1. The web release changed no server code, yet Postgres is at 91 %. Draw the loop that connects a browser render to a `ProjectMember` query. Name every file:line it passes through, on both the client and the server.
2. Why does it get much worse with 28 viewers than with 1? Estimate how the message rate scales with N viewers.
3. Why does "a teammate's card only shows up after I refresh" belong to the same bug?
4. What's the fastest safe mitigation at 10:10? Note that the API is unchanged.
5. Fix it two ways. First, the minimal fix in the hook. Second, the server-side guard that stops any client from doing this to Postgres again. Then write the regression test. You can test this without a real socket.
6. Why did the author's local testing not catch it?
