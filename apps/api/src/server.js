import { createApp } from './app.js';
import { logger } from './middleware/request-logger.js';

// LEARN: app.js builds the app; server.js starts it. The split looks
// pedantic until sprint 02, when tests import createApp() and drive it
// with fake requests — no port, no network, no flakiness.
const port = process.env.PORT ?? 3000;

createApp().listen(port, () => {
  logger.info({ port }, 'gitjira api listening');
});
