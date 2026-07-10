import { defineConfig, devices } from '@playwright/test';

// LEARN (sprint 11): the E2E config boots the WHOLE stack — a real API on :3000
// and the web app on :5173 (its dev proxy forwards /api and /socket.io to the
// API) — and drives a real browser against it. This is the top of the pyramid:
// few, slow, high-confidence. We keep it OFF the per-PR critical path (it runs
// nightly + on-demand, see .github/workflows/e2e.yml and ADR 0024) because a
// 2-minute browser suite shouldn't gate a one-line docs PR, and browser flake
// shouldn't block unrelated work. The fast layers (unit/integration) gate PRs.

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  // Fail the build if someone left test.only in a spec (CI only).
  forbidOnly: CI,
  // Retries paper over flake; we allow ONE on CI to absorb infra hiccups, and
  // zero locally so a flake is loud while you're writing it.
  retries: CI ? 1 : 0,
  // One worker on CI: the journeys share one database, and parallel workers
  // would step on each other's data (same reason the API suite is serial).
  workers: 1,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Trace on the FIRST retry — a zip you can open in `playwright show-trace` and
  // step through the failure frame by frame. The junior's first debugging trace.
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // A setup project logs in ONCE and saves the session; the journey projects
    // reuse it via storageState so they don't each re-authenticate.
    { name: 'setup', testMatch: /support\/auth\.setup\.js/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'npm run start -w @gitjira/api',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !CI,
      timeout: 60_000,
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgresql://gitjira:gitjira_dev@localhost:5432/gitjira_test',
        JWT_SECRET: process.env.JWT_SECRET ?? 'e2e-secret',
        DISABLE_QUEUE: '1',
        BCRYPT_COST: '4',
        PORT: '3000',
      },
    },
    {
      command: 'npm run dev -w @gitjira/web -- --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
  ],
});
