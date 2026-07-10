import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';

// LEARN (sprint 11): the STORAGE-STATE pattern. Logging in is slow and we don't
// want every journey to repeat it. This "setup" project authenticates ONCE and
// saves the browser's cookies to disk; the journey projects load that state and
// start already-signed-in (see playwright.config.js `dependencies` +
// `storageState`). The session survives because the app resurrects it from the
// httpOnly refresh cookie on load — which is exactly what storageState captures.

export const E2E_USER = {
  name: 'E2E Bot',
  email: 'e2e-bot@example.test',
  password: 'correct-horse-battery',
};

const authFile = 'e2e/.auth/user.json';

setup('authenticate once and persist the session', async ({ page, request }) => {
  // Create the user via the API. A previous run may have made them already, so
  // a 409 is fine — we only need them to exist.
  await request.post('http://localhost:3000/api/auth/register', { data: E2E_USER }).catch(() => {});

  // Log in THROUGH THE UI so the browser holds the refresh cookie the app needs.
  await page.goto('/login');
  await page.locator('input[type=email]').fill(E2E_USER.email);
  await page.locator('input[type=password]').fill(E2E_USER.password);
  await page.getByRole('button', { name: /log ?in/i }).click();

  // Prove we're authenticated: a protected route renders instead of bouncing to
  // /login. The "New project" button only exists for a signed-in user.
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: /new project/i })).toBeVisible();

  fs.mkdirSync('e2e/.auth', { recursive: true });
  await page.context().storageState({ path: authFile });
});
