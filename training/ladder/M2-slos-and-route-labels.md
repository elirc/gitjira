# M2: SLOs you can actually alert on

**Context.** Leadership wants a promise for the enterprise contract: "the board loads fast and changes save." The only signals are `http_requests_total` and `http_request_duration_seconds` (`apps/api/src/lib/metrics.js`). But the `route` label is router-relative (`metrics.js:41`), so `GET /api/projects`, `GET /api/projects/:key/issues`, `GET /api/projects/:key/sprints` and `GET /api/health` share `route="/"`. Health checks (every 15 s from Fly plus the Docker HEALTHCHECK) sit inside that same series. Buckets are `[0.01 … 5]`. There are no alerts in the repo at all.

**Ticket (SRE lead).** "Define 3 SLIs and SLOs that match what users feel, fix the labels so we can measure them, and write multi-window burn-rate alerts. Deliver as code: metric changes, recording rules, alert rules, and a dashboard JSON or a sketch."

**Constraints.**

- Labels stay **bounded** (no ids, keys or raw paths). Unmatched routes map to one constant.
- The SLIs are "board load", "save a change" (PATCH issue, PATCH move, POST comment) and "realtime delivered". Say how you'd measure the third, or say honestly why you can't yet (see M4 and S3).
- Health checks and `/metrics` scrapes are excluded from user-facing SLIs.
- The error budget policy fits on one page: what happens when 50 % of the monthly budget is burned in a week.

**Definition of done.**

- `metrics.js` labels with the full route **template** (mount path plus route path), plus a cardinality unit test: 1,000 requests with random ids and scanner paths produce fewer than 50 distinct `route` values.
- Histogram buckets chosen for your SLO thresholds (if the SLO is "95 % < 300 ms", 0.3 must be a bucket edge).
- `training/ladder/notes/M2-slo.md` with the SLI definitions as PromQL ratios, SLO targets, a 30-day budget, and fast and slow burn alerts (for example 14.4× over 1 h with 5 m, and 6× over 6 h with 30 m).
- A "monitor the monitor" rule: `up == 0` or `absent(...)` pages.

**Explain before touching.**

1. Where in Express is the route _template_ with its mount path available? Why is neither `req.originalUrl` nor `req.route.path` alone correct?
2. Latency SLI as a ratio: write it with `_bucket` series. Why is `histogram_quantile(0.95, …)` a poor thing to alert on directly?
3. What's the difference between an availability SLI measured at the app and one measured at the load balancer? Which one sees an OOM-killed process?
4. What's the monthly error budget, in minutes, at 99.9 %? How fast does a 14.4× burn rate consume it?
5. What can't these metrics tell you about the board (think R7: a 200 response that shows 50 of 400 issues)?

<details><summary>Hints</summary>

- `req.baseUrl` at `finish` time holds the _actual_ mount path (with the project key), not the template. You need to capture the template while routing, or build it from the router table.
- SLI: `sum(rate(http_request_duration_seconds_bucket{route="/api/projects/:key/issues",le="0.3"}[5m])) / sum(rate(http_request_duration_seconds_count{route="/api/projects/:key/issues"}[5m]))`.

</details>

Answer: `training/_answers/ladder-M2.md`
