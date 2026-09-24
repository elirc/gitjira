# INC-004: Dashboards say "No data", and API memory keeps climbing

**Severity:** SEV-3, trending toward SEV-2 (we're flying blind, and the API is degrading)
**Branch:** `training/incidents/004-dashboards-flatline`
**What happened:** there was no page. On Saturday 03:10 every panel on the "GitJira API (RED)" dashboard turned to "No data". The on-call noticed on Monday at 09:00. API release `v1.4.0` (containing PR #166) shipped Tuesday.

## Observations

| Signal                                                    | Tue (before v1.4.0) | Fri 18:00                     | Sat 03:10 onward                                |
| --------------------------------------------------------- | ------------------- | ----------------------------- | ----------------------------------------------- |
| API machine RSS                                           | 180 MB, flat        | 610 MB, rising ~6 MB/h        | 790 MB (restarted by OOM on machine 2 at 05:42) |
| `/metrics` response size                                  | 11 KB               | 31 MB                         | not measured (scrape fails)                     |
| Prometheus `scrape_duration_seconds{job="gitjira-api"}`   | 0.02 s              | 6.8 s                         | timeout (10 s)                                  |
| Prometheus `up{job="gitjira-api"}`                        | 1                   | 1                             | 0                                               |
| API p99 latency (from the load balancer, not app metrics) | 240 ms              | 1.1 s, with spikes every 15 s | 2.9 s, with spikes every 15 s                   |
| Alert `ApiErrorRate5xx` (built on `http_requests_total`)  | quiet               | quiet                         | **quiet**                                       |

The p99 spikes line up with Prometheus's 15-second scrape interval.

## A slice of `/metrics` on Friday (trimmed)

```
http_requests_total{method="GET",route="/api/projects/GJ/issues/4127/detail",status="200"} 3
http_requests_total{method="GET",route="/api/projects/GJ/issues/4128/detail",status="200"} 1
http_requests_total{method="POST",route="/api/me/notifications/ckz9x0d5k0001ab12cd34ef56/read",status="204"} 1
http_requests_total{method="GET",route="/api/attachments/ckz8m2r4q0003xy98lk76ji54",status="200"} 1
http_requests_total{method="GET",route="/wp-login.php",status="404"} 1
http_requests_total{method="GET",route="/.env",status="404"} 1
http_request_duration_seconds_bucket{le="0.01",method="GET",route="/api/projects/GJ/issues/4127/detail",status="200"} 0
… (≈ 480,000 more lines)
```

## The suspect PR (#166, merged Mon, CI green)

> **fix(metrics): label requests by full path so dashboards can split endpoints.** `req.route.path` is relative to the router that matched, so `GET /api/projects`, `GET /api/projects/:key/issues` and `GET /api/projects/:key/sprints` were all recorded as `route="/"`. The "Board load p95" panel was the p95 of every list endpoint blended together. Record the request path (query string stripped) instead.

```diff
--- a/apps/api/src/lib/metrics.js
+++ b/apps/api/src/lib/metrics.js
   res.on('finish', () => {
-    const route = req.route?.path ?? (req.baseUrl || 'unmatched');
+    const route = (req.originalUrl ?? req.url).split('?')[0] || 'unmatched';
     const labels = { method: req.method, route, status: String(res.statusCode) };
```

It also adds a test asserting `route="/api/health"` appears and that query strings never leak into labels.

## Your tasks

1. The PR's bug report is true. Verify it against HEAD's `metrics.js` and the router nesting (`routes/index.js`, `project.routes.js`, `issue.routes.js`), and name two more endpoint pairs that HEAD merges into one series.
2. Explain the memory growth, the 31 MB scrape, and the p99 spikes every 15 seconds, as one mechanism. Why does the latency spike line up with the scrape?
3. Why did the 5xx alert stay quiet while the API degraded, and why is "No data" worse than a red graph? Write the alert that would have paged on Saturday at 03:10.
4. Write the correct fix for the original bug. Which Express property gives you the route _template_ with its mount path?
5. Add a guard so that no future label change can do this again. Give one guard in code and one in monitoring.
6. Estimate the series count. With `route × method × status`, and a histogram with 8 buckets, how many series does one new URL add?
