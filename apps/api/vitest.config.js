import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.js'],
    globalSetup: ['./test/global-setup.js'],
    // LEARN: integration tests share one database — parallel files would
    // deadlock on TRUNCATE. Sequential is slower and correct; we buy speed
    // back properly in sprint 11 (transaction-rollback isolation).
    fileParallelism: false,
    coverage: { include: ['src/**'] },
  },
});
