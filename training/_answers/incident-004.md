# INC-004 answer: unbounded label cardinality, and monitoring that fails silent

## The original bug was real

At HEAD, `metricsMiddleware` labels with `req.route?.path` (`apps/api/src/lib/metrics.js:41`), and that path is **relative to the router that matched**. `GET /api/projects` (`project.routes.js:14`), `GET /api/projects/:key/issues` (`issue.routes.js:23`) and `GET /api/projects/:key/sprints` (`sprint.routes.js:12`) are all `GET "/"`. Two more merges:

- `POST /api/projects` (create project), `POST /api/projects/:key/issues` (create issue) and `POST /api/projects/:key/sprints` (create sprint) are all `POST "/"`.
- `GET /api/health` (`health.routes.js:7`, mounted at `/health`) is also `GET "/"`, so the health-check traffic (every 15 s per machine from Fly, plus the Docker HEALTHCHECK) is blended into the "list endpoints" latency.

The labels only stay distinct where the template text happens to differ (`/:number/detail`, `/:id/start`). Without the mount path, the label is ambiguous and the dashboard lies.

## Root cause of the incident

The PR replaced an ambiguous label with an **unbounded** one. `req.originalUrl` contains issue numbers, CUIDs (attachments, notifications, members) and anything a scanner requests. prom-client creates a new time series for every distinct label set, and keeps it **forever** in process memory. Each new URL adds 1 counter series plus, for the histogram, 8 buckets + `+Inf` + `_sum` + `_count` = **12 series per (route, method, status)**.

**Verified with the branch's `metrics.js`**, by driving the middleware with synthetic requests (scratch script, not committed):

| distinct paths recorded | series in `/metrics` | body size | `registry.metrics()` time |
| ----------------------- | -------------------- | --------- | ------------------------- |
| HEAD, 42k requests      | 36                   | 10 KB     | 23 ms                     |
| branch, ~2.1k paths     | 25,200               | 2.7 MB    | 433 ms                    |
| branch, ~42k paths      | 504,000              | 55 MB     | 5.6 s                     |

One mechanism explains all three symptoms:

- **Memory** grows with every never-seen URL. That's a leak with a slope set by traffic diversity, not by traffic volume.
- **Scrape size and time** grow with the series count. `registry.metrics()` serializes every series **on the event loop**.
- **p99 spikes every 15 s** because each Prometheus scrape blocks the Node event loop for seconds while it serializes, stalling every in-flight request on that machine. The monitoring made production slower.

When the scrape exceeded the 10 s `scrape_timeout`, Prometheus recorded `up == 0` and **no samples**. Every alert built on `rate(http_requests_total…)` evaluates over _absent_ data. An absent series doesn't compare `> 0.02`, so the alert is silent. "No data" is worse than red because red pages someone and absent data doesn't.

## Fix

Use the route template plus its mount path, and fall back to a **constant** for anything unmatched:

```js
const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
```

`req.baseUrl` here is the _actual_ mount path, for example `/api/projects/GJ/issues`, which still contains the project key. That's a bounded but tenant-sized cardinality, so it's still wrong for a SaaS. The robust version records the template during routing: wrap the routers, or use `req.route.path` joined with the templates of the parent routers (Express doesn't expose parent templates directly). A common, simple approach is an explicit `res.locals.routeTemplate = '/api/projects/:key/issues'` set by a tiny middleware on each router mount, or a route table built at startup. Unmatched and 404 requests **must** map to one constant label.

## Guards

- **Code:** a unit test that fires 1,000 requests with random ids and scanner paths through the app, then asserts that the number of distinct `route` label values is below 50. Optionally, a wrapper that refuses a new label value after N distinct ones and increments `metrics_label_overflow_total`.
- **Monitoring:**
  - `up{job="gitjira-api"} == 0 for 2m` → page.
  - `absent(rate(http_requests_total[5m]))` → page.
  - `scrape_series_added` / `scrape_samples_scraped` above a budget → warn.
  - Alert on `process_resident_memory_bytes` slope.

  The team had no alert on the monitoring itself. That's the real lesson.

## Why review missed it

The PR fixed a real, well-explained bug, and the test proved the new label _existed_, not that it was _bounded_. The reviewer knew the cardinality rule (the old comment even said "instead of exploding cardinality"), but the PR deleted that comment along with the reasoning. When a PR removes a comment that states an invariant, ask why.

## Postmortem (short)

Impact: 4 days of rising memory, one OOM restart, degraded p99 from scrape stalls, and about 54 h with no metrics or alerts. Action items: template labels plus the unmatched constant; a cardinality test; alerts on up, absent and scrape duration; a runbook entry for "dashboards empty"; and an SLO burn-rate alert built on load-balancer metrics as a second, independent signal (ladder M2).
