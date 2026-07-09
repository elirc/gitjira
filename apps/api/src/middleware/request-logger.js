import { pino } from 'pino';
import { pinoHttp } from 'pino-http';

// LEARN: structured logging means every log line is a JSON object, not a
// sentence. You don't grep prose at 3am - you query fields. The pretty
// printing is for dev eyes only; production consumers get raw JSON.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
});

export const requestLogger = pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === '/api/health' },
});
