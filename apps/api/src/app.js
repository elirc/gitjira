import express from 'express';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { routes } from './routes/index.js';
import { API_PREFIX } from '@gitjira/shared';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(API_PREFIX, routes);

  // LEARN: the error handler is registered LAST. Express identifies it by its
  // 4-argument signature and only invokes it when something upstream throws
  // or calls next(err). Order of registration is order of execution.
  app.use(errorHandler);

  return app;
}
