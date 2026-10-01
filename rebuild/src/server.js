import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4317);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer between 0 and 65535.');
const dbPath = process.env.DB_PATH ? resolve(process.env.DB_PATH) : fileURLToPath(new URL('../data/gitjira.sqlite', import.meta.url));
const { app, close } = createApp({ dbPath });
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`GitJira ready http://127.0.0.1:${server.address().port}`);
  console.log('Local demo accounts only. Data: ' + dbPath);
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set PORT to a different value.` : error.message);
  close();
  process.exitCode = 1;
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => { close(); });
  server.closeIdleConnections();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
