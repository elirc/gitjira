# M2 reference: SLOs and labels

## The label

Express exposes `req.route.path` (relative to the router) and `req.baseUrl` (the **actual** mount path, including the real project key). Neither is the template. Options:

- **Record the template while routing.** Mount each router through a helper that sets `req.routeTemplate = parent + mountTemplate`, and at `finish` use `req.routeTemplate + req.route.path`. For this repo the mount points are few: `/api`, `/api/projects`, `/api/projects/:key/issues`, `/api/projects/:key/sprints`, `/api/health`.
- **Or** normalize `req.baseUrl` with a small, closed table of regexes (for example, replace the segment after `/projects/` with `:key`). This works, but it's fragile when routes are added.

Unmatched requests (`!req.route`) → `route="unmatched"`. Test for cardinality, not just presence (INC-004).

## SLIs (PromQL ratios over 5 m; exclude `/api/health` and `/metrics`)

- **Board load latency:** the fraction of `GET /api/projects/:key/issues` (and the M1 board endpoint) with 2xx and duration ≤ 300 ms. `…_bucket{le="0.3",route=~"…",status=~"2.."}` / `…_count{route=~"…"}`. **SLO 99 %.**
- **Save success:** the fraction of `PATCH /api/projects/:key/issues/:number`, `PATCH …/move` and `POST …/comments` that aren't 5xx. **SLO 99.9 %.** Count 409 (stale write, ADR 0017) and 400 as _good_: they're correct behavior.
- **Realtime delivered:** not measurable today. Nothing measures commit-to-client lag, and moves aren't even emitted (R4). Write this honestly. The fix is a server-side emit timestamp plus a client beacon, or synthetic probes: a bot on each instance that moves a card and times the event arrival on another connection.

Buckets: make sure `0.3` and `1` are edges (they are: `[0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]`).

## Budget and alerts

At 99.9 % over 30 days, the budget is 43.2 minutes of "bad." A 14.4× burn consumes 2 % of the monthly budget per hour, so it page-alerts when both `1h` and `5m` burn exceed 14.4. The ticket alert fires when both `6h` and `30m` exceed 6. Multi-window means fast detection without flapping.

**Monitor the monitor:** `up{job="gitjira-api"} == 0 for 2m`, plus `absent(rate(http_requests_total[10m]))`.

## Key answers

- `histogram_quantile` over sparse series is noisy, and you can't sum quantiles across instances. Ratios of bucket counters aggregate correctly and map directly to "good events / total events."
- **App vs load-balancer SLI:** an OOM-killed or wedged process emits no metrics, so the app-side ratio _improves_ while users fail. Load-balancer metrics (Fly proxy, or ALB `HTTPCode_ELB_5XX` in S1) see it. Use both.
- **Blind spot:** a 200 that shows 50 of 400 issues (R7) is "good" by every SLI. SLIs measure the contract you encode, and correctness needs tests, not SLOs.

## Error budget policy (one page, summary)

Burn more than 50 % in 7 days → freeze feature deploys except reliability fixes, run a postmortem on the top burner, and review again the next week. The budget exhausted → a change freeze until the 7-day burn is under 1×.
