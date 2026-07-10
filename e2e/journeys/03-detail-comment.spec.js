import { test, expect } from '@playwright/test';
import { createProject, createIssue, uniqueKey } from '../support/helpers.js';

test.describe('Journey: issue detail and comments', () => {
  test('open an issue and post a comment', async ({ page }) => {
    const key = uniqueKey();
    await createProject(page, { key, name: 'Comms' });
    await createIssue(page, { projectKey: key, title: 'Write the runbook' });

    // Click the card to open the detail panel (deep-links via the URL).
    await page.getByText('Write the runbook').click();
    await expect(
      page.getByRole('textbox', { name: /comment/i }).or(page.locator('textarea'))
    ).toBeVisible();

    const body = 'First! Looks good to me.';
    await page.locator('textarea').first().fill(body);
    await page.getByRole('button', { name: /comment|add|post|send/i }).click();

    await expect(page.getByText(body)).toBeVisible();
  });
});
