import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.js'],
    globalSetup: ['./test/global-setup.js'],
    // LEARN: integration tests share one database — parallel files would
    // deadlock on TRUNCATE. Sequential is slower and correct; we bought speed
    // back properly in sprint 11 (transaction-rollback isolation, ADR 0022).
    fileParallelism: false,
    // LEARN (sprint 11): 15s, not the 5s default. Under v8 coverage
    // instrumentation + a Dockerized Postgres, a legitimate socket/HTTP test
    // can exceed 5s and time out — a coverage-only flake that has nothing to do
    // with the code. A generous ceiling removes the flake without hiding a real
    // hang (a truly stuck test still fails, just at 15s).
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      include: ['src/**'],
      // Config/entrypoints that only run when the server actually boots aren't
      // exercised by tests and shouldn't drag the gate down.
      exclude: ['src/server.js', 'src/**/*.config.js'],
      thresholds: {
        // apps/api floors (ADR 0023), set just below current (81/67/80/85).
        // Integration tests hit most branches via real HTTP; the uncovered
        // remainder is error-plumbing edges. Branches sit lower than statements
        // — that's normal and honest, not a number to inflate.
        statements: 75,
        branches: 65,
        functions: 75,
        lines: 78,
      },
    },
  },
});
