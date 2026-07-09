import { logger } from './request-logger.js';

// LEARN: one error handler for the whole API means: errors are logged once
// (with stack), clients always get JSON (never an HTML stack trace), and
// nothing sensitive leaks in production. Individual routes should throw,
// not res.status(500) themselves - centralize the policy.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error({ err, url: req.url }, 'unhandled error');

  res.status(err.statusCode ?? 500).json({
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
}
