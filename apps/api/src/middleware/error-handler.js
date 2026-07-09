import { logger } from './request-logger.js';
import { ApiError } from '../lib/errors.js';

// LEARN: one error handler for the whole API means: errors are logged once
// (with stack), clients always get JSON (never an HTML stack trace), and
// nothing sensitive leaks in production. Individual routes should throw,
// not res.status(500) themselves - centralize the policy.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError || err.statusCode) {
    // Expected domain errors: client-caused, logged at info, full shape out.
    logger.info({ code: err.code, url: req.url }, err.message);
    return res.status(err.statusCode).json({
      error: {
        code: err.code ?? 'INTERNAL',
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Unexpected errors: our bug. Log loudly, tell the client nothing useful.
  logger.error({ err, url: req.url }, 'unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
}
