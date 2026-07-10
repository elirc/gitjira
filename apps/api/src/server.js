import { createServer } from 'node:http';
import { createApp } from './app.js';
import { initSocketServer } from './realtime/socket-server.js';
import { logger } from './middleware/request-logger.js';

// LEARN: we build an explicit http.Server (instead of app.listen) because
// Socket.IO needs to attach to the SAME server the REST API runs on — one port,
// two protocols (HTTP requests + WebSocket upgrades).
const port = process.env.PORT ?? 3000;
const httpServer = createServer(createApp());
initSocketServer(httpServer);

httpServer.listen(port, () => {
  logger.info({ port }, 'gitjira api + realtime listening');
});
