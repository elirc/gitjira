import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { asyncHandler } from '../src/middleware/async-handler.js';
import { errorHandler } from '../src/middleware/error-handler.js';

// LEARN: this is the regression test promised in PR #8's review. It pins
// the exact failure mode the review caught: without asyncHandler, a
// rejected promise in a route bypasses the error middleware entirely.
describe('asyncHandler', () => {
  it('routes a rejecting async handler into the JSON error handler', async () => {
    const app = express();
    app.get(
      '/boom',
      asyncHandler(async () => {
        throw new Error('kaboom');
      })
    );
    app.use(errorHandler);

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('kaboom');
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
