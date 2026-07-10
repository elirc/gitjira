import { createServer } from 'node:http';
import { createApp } from './app.js';
import { initSocketServer } from './realtime/socket-server.js';
import { logger } from './middleware/request-logger.js';
import { loadEnv } from './lib/env.js';

// LEARN (sprint 15): validate the environment BEFORE anything else. If a secret
// is missing or malformed, we crash here with a precise list — not at 2am on the
// first request that happens to read it. Fail fast, fail loud.
const env = loadEnv();

// LEARN: we build an explicit http.Server (instead of app.listen) because
// Socket.IO needs to attach to the SAME server the REST API runs on — one port,
// two protocols (HTTP requests + WebSocket upgrades).
const port = env.PORT;
const httpServer = createServer(createApp());
initSocketServer(httpServer);

httpServer.listen(port, () => {
  logger.info({ port }, 'gitjira api + realtime listening');
});
