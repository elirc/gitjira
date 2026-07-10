import { test, expect } from '@playwright/test';

// LEARN (sprint 11): the auth journey tests SIGN-UP itself, so it must start
// logged OUT — it overrides the shared storageState with an empty one. Every
// other journey inherits the signed-in session; this one deliberately doesn't.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Journey: authentication', () => {
  test('a new user can register and land in the app', async ({ page }) => {
    const email = `new-${Date.now()}@example.test`;

    await page.goto('/register');
    await page.locator('input[autocomplete="name"]').fill('New Person');
    await page.locator('input[type=email]').fill(email);
    await page.locator('input[type=password]').fill('correct-horse-battery');
    await page.getByRole('button', { name: /register|sign ?up|create/i }).click();

    // Registration auto-logs-in; a protected view should now be reachable.
    await page.goto('/projects');
    await expect(page.getByRole('button', { name: /new project/i })).toBeVisible();
  });

  test('a protected route bounces an anonymous visitor to /login', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
  });
});
