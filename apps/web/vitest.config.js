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
      // all:false — gate only the modules our unit/component tests actually
      // exercise, not every UI file. Full-UI coverage is an E2E concern (ADR
      // 0023); forcing `all` here would just measure how much of the untested
      // page/modal tree exists, which isn't what this gate is for.
      all: false,
      thresholds: {
        statements: 44,
        branches: 54,
        functions: 25,
        lines: 44,
      },
    },
  },
});
