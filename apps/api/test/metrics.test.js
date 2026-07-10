globalThis.__NO_ROLLBACK__ = true; // no DB needed

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './helpers.js';

// LEARN (sprint 15): /metrics is testable like any endpoint — hit it and assert
// the Prometheus format + that our RED series show up after some traffic.
describe('/metrics (RED observability)', () => {
  it('exposes prometheus metrics including our RED series', async () => {
    // generate a little traffic so the counters have something to report
    await request(app).get('/api/health');
    await request(app).get('/api/health');

    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    // Rate/Errors counter and Duration histogram are present.
    expect(res.text).toMatch(/http_requests_total/);
    expect(res.text).toMatch(/http_request_duration_seconds/);
    // default node metrics too (event-loop lag, heap)
    expect(res.text).toMatch(/nodejs_/);
  });
});
