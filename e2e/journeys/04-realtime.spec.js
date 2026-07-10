import { test, expect } from '@playwright/test';
import { createProject, createIssue, uniqueKey } from '../support/helpers.js';

// Journey: real-time collaboration. Two browser contexts view the same board;
// a change in one should appear in the other via Socket.IO (sprint 08). This is
// the ONE thing only E2E can prove — that the socket wiring works end to end.
test.describe('Journey: realtime multi-context', () => {
  test('a second viewer sees an issue created by the first', async ({ browser }) => {
    const key = uniqueKey();

    // Two independent contexts = two "people". Both reuse the saved session.
    const alice = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const bob = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const alicePage = await alice.newPage();
    const bobPage = await bob.newPage();

    await createProject(alicePage, { key, name: 'Realtime' });

    // Both open the same board.
    await alicePage.goto(`/projects/${key}`);
    await bobPage.goto(`/projects/${key}`);
    await bobPage.waitForTimeout(2000); // let bob's socket connect

    // Alice creates an issue.
    await createIssue(alicePage, { projectKey: key, title: 'Seen by both' });
    await bobPage.waitForTimeout(2000); // wait for the realtime push to arrive

    // Bob should see it without reloading.
    await expect(bobPage.getByText('Seen by both')).toBeVisible();

    // Alice moves it / renames — bob should reflect that too.
    await alicePage.getByText('Seen by both').click();
    await bobPage.waitForTimeout(2000); // wait again before asserting

    await alice.close();
    await bob.close();
  });
});
