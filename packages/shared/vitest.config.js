import { defineConfig } from 'vitest/config';

// LEARN (sprint 11): the domain package gets the STRICTEST coverage floor (90%)
// because it's pure logic — a missed branch here is a real bug, and it's cheap
// to cover fully. Contrast apps/web (45%): mostly DOM plumbing better covered by
// E2E. Unequal floors on purpose (ADR 0023). Floors are a ratchet against
// regression, not a number to chase — they only move up.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // all:false — gate the domain-logic modules the tests exercise
      // (fractional-index, jql, activity, …), not the pure schema-declaration
      // files that only get imported on the server. Those are validated by the
      // API contract tests, not here.
      all: false,
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
      },
    },
  },
});
