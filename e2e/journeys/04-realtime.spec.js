import { test, expect } from '@playwright/test';
import { createProject, createIssue, uniqueKey } from '../support/helpers.js';

// Journey: real-time collaboration. Two browser contexts view the same board;
// a change in one should appear in the other via Socket.IO (sprint 08), with no
// reload. This is the ONE thing only E2E can prove — the socket wiring works end
// to end.
//
// LEARN (sprint 11 review): this spec used to `waitForTimeout(2000)` before each
// assertion. That's a flake time-bomb (taxonomy #3): too short and it fails on a
// slow runner, too long and it wastes seconds every run. The fix is to wait for
// STATE, not time — Playwright's web-first assertions poll until the condition
// holds or the timeout elapses. No fixed sleeps anywhere below.
test.describe('Journey: realtime multi-context', () => {
  test('a second viewer sees issues created by the first, live', async ({ browser }) => {
    const key = uniqueKey();

    // Two independent contexts = two "people". Both reuse the saved session.
    const alice = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const bob = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const alicePage = await alice.newPage();
    const bobPage = await bob.newPage();

    await createProject(alicePage, { key, name: 'Realtime' });

    // Both open the same board. No sleep to "let the socket connect" — the
    // assertions below wait for state, which implicitly waits for the socket.
    await alicePage.goto(`/projects/${key}`);
    await bobPage.goto(`/projects/${key}`);
    await expect(bobPage.getByText('To Do', { exact: false })).toBeVisible();

    // Alice creates an issue; bob should see it WITHOUT reloading. toBeVisible()
    // polls until the realtime push lands (or the assertion times out).
    await createIssue(alicePage, { projectKey: key, title: 'Seen by both' });
    await expect(bobPage.getByText('Seen by both')).toBeVisible();

    // A second change propagates too — proves it wasn't a one-off first paint.
    await createIssue(alicePage, { projectKey: key, title: 'And this one' });
    await expect(bobPage.getByText('And this one')).toBeVisible();

    await alice.close();
    await bob.close();
  });
});
