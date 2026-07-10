// LEARN (sprint 15): the RED method — for every request stream, track Rate
// (how many), Errors (how many failed), Duration (how long). Those three answer
// "is the service healthy?" better than CPU/memory ever will, because they're
// what the USER experiences. prom-client exposes them in the Prometheus text
// format at /metrics for a scraper (and a Grafana dashboard) to read.

import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

export const registry = new Registry();
// Node process metrics (event-loop lag, heap, GC) — free, and the first thing
// you want when the API gets slow.
collectDefaultMetrics({ register: registry });

// R + E: a counter of requests, labelled so you can slice by route/method/status
// and compute both rate and error-rate from the same series.
const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

// D: a histogram of request durations — histograms let the scraper compute
// percentiles (p95/p99), which averages hide.
const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

/**
 * Express middleware: time each request and record R/E/D on finish. Uses the
 * ROUTE PATTERN (req.route?.path), not the raw URL, so /projects/GJ and
 * /projects/OPS collapse to one series instead of exploding cardinality.
 */
export function metricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path ?? (req.baseUrl || 'unmatched');
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequests.inc(labels);
    end(labels);
  });
  next();
}
