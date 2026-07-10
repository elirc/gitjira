import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { routes } from './routes/index.js';
import { API_PREFIX } from '@gitjira/shared';
import { registry, metricsMiddleware } from './lib/metrics.js';

export function createApp() {
  const app = express();

  // LEARN (sprint 13): helmet sets a bundle of defensive HTTP headers with sane
  // defaults — X-Content-Type-Options: nosniff (don't let the browser guess a
  // response's type and run it as script), Cross-Origin-Resource-Policy,
  // Referrer-Policy, X-Frame-Options: DENY (no clickjacking via <iframe>), and
  // HSTS in production. The API serves JSON, not HTML, so a full script-src CSP
  // lives on the WEB app; here we harden the API surface. One line, many headers.
  app.use(helmet());

  // Trust the proxy so req.ip is the real client IP behind a load balancer —
  // rate limiting keys on it, so getting it wrong means limiting the proxy.
  app.set('trust proxy', 1);

  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(metricsMiddleware);

  // Prometheus scrape endpoint. Outside API_PREFIX and unauthenticated so a
  // scraper (or a sidecar) can read it without a token; it exposes only
  // aggregate counters, never request bodies or user data.
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  app.use(API_PREFIX, routes);

  // LEARN: the error handler is registered LAST. Express identifies it by its
  // 4-argument signature and only invokes it when something upstream throws
  // or calls next(err). Order of registration is order of execution.
  app.use(errorHandler);

  return app;
}
