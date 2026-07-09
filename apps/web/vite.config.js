import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // LEARN: in dev, web runs on :5173 and the API on :3000 — different
    // origins, so the browser would block fetches (CORS). The dev proxy
    // makes /api requests same-origin by forwarding them server-side.
    // Production gets the same effect from a reverse proxy.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
