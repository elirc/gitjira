import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: true,
    // LEARN (sprint 11): the UI floor is deliberately LOW (ADR 0023). Much of
    // the web layer is DOM plumbing whose unit coverage is low-value — we cover
    // those paths via E2E (the pyramid: push tests to the lowest USEFUL layer),
    // not by chasing a high unit number here. Excludes cover entry/wiring files
    // that would only be exercised by booting the whole app.
    coverage: {
      provider: 'v8',
      // all:false — report coverage for the modules our tests exercise. We
      // deliberately do NOT set a hard threshold here (ADR 0023): the web
      // number is dominated by which component tests happened to run, and this
      // sprint's whole thesis is that you don't gate on a signal you can't
      // trust. Web coverage is REPORTED (visible in CI logs); the enforced
      // gates live where the number is stable — the domain (90%) and API (75%).
      all: false,
    },
  },
});
