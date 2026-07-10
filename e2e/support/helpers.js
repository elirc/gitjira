import { expect } from '@playwright/test';

// LEARN (sprint 11): tiny page helpers so each journey reads as intent, not
// clicks. The same idea as the API test helpers — a spec should describe the
// user's story, and the plumbing (which input, which button) lives here where
// one selector change fixes every journey.

let keySeq = 0;
// Unique project key per call (max 10 chars, uppercase) so parallel-ish runs
// and reruns never collide on the unique key constraint.
export function uniqueKey(prefix = 'E2E') {
  keySeq += 1;
  return `${prefix}${(Date.now() % 100000).toString(36).toUpperCase()}${keySeq}`.slice(0, 10);
}

export async function createProject(page, { key, name }) {
  await page.goto('/projects');
  await page.getByRole('button', { name: /new project/i }).click();
  await page.getByPlaceholder('GJ').fill(key);
  await page.getByPlaceholder('My project').fill(name);
  await page.getByRole('button', { name: /create/i }).click();
  // The new project appears in the list.
  await expect(page.getByText(key, { exact: false })).toBeVisible();
}

export async function createIssue(page, { projectKey, title }) {
  await page.goto(`/projects/${projectKey}`);
  await page.getByRole('button', { name: /new issue/i }).click();
  // The title is the first textbox in the create-issue form.
  await page.getByRole('dialog').getByRole('textbox').first().fill(title);
  await page.getByRole('button', { name: /create/i }).click();
  // The card shows on the board.
  await expect(page.getByText(title, { exact: false })).toBeVisible();
}
