import { test, expect } from '@playwright/test';
import { createProject, createIssue, uniqueKey } from '../support/helpers.js';

// Inherits the signed-in session from the setup project (storageState).
test.describe('Journey: project setup and issue creation', () => {
  test('create a project, then an issue that appears on its board', async ({ page }) => {
    const key = uniqueKey();
    await createProject(page, { key, name: 'Rocket' });

    // Opening the project shows its empty board with the default columns.
    await page.goto(`/projects/${key}`);
    await expect(page.getByText('To Do', { exact: false })).toBeVisible();

    await createIssue(page, { projectKey: key, title: 'Land the booster' });
    // The issue key (e.g. E2E…-1) and title are both on the board.
    await expect(page.getByText('Land the booster')).toBeVisible();
  });
});
