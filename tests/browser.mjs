import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'test-results');
await mkdir(output, { recursive: true });
const temp = await mkdtemp(join(tmpdir(), 'gitjira-browser-'));
const { app, close } = createApp({ dbPath: join(temp, 'browser.sqlite') });
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
const runtimeErrors = [];
let page;
async function scenario(name, run) {
  const start = Date.now();
  try {
    await run();
    results.push({ name, status: 'passed', durationMs: Date.now() - start });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'failed', error: error.message });
    throw error;
  }
}
async function login(target, userId) {
  await target.goto(base);
  await target.locator(`[data-login="${userId}"]`).click();
  await target.locator('.project-header h1').waitFor();
}
async function waitClosed(target, selector) {
  await target.waitForFunction((s) => !document.querySelector(s).open, selector);
}
async function api(target, path, method = 'GET', body) {
  return target.evaluate(async ({ path, method, body }) => {
    const res = await fetch('/api' + path, { method, headers: {
      'Content-Type': 'application/json', 'X-GitJira-Request': '1',
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  }, { path, method, body });
}
async function switchUser(target, userId) {
  await target.locator('details.user-menu summary').click();
  await target.locator(`[data-switch="${userId}"]`).click();
  await target.waitForFunction((name) => document.querySelector('.user-name')?.textContent === name,
    ({ 1: 'Avery Chen', 2: 'Sam Rivera', 3: 'Jordan Ellis', 4: 'Taylor Brooks' })[userId]);
  await target.locator('.project-header h1').waitFor();
}
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  let createdId;
  await scenario('login, seeded board, accessible columns and desktop layout', async () => {
    await login(page, 1);
    assert.equal(await page.locator('.project-header h1').textContent(), 'Product launch');
    assert.equal(await page.locator('.column').count(), 4);
    assert.equal(await page.locator('.issue-card').count(), 9);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(output, 'desktop-board.png'), fullPage: true });
  });
  await scenario('create issue, assign, reload and preserve literal user text', async () => {
    await page.locator('[data-action="new-issue"]').click();
    await page.locator('#issue-title').fill('Ship the review journal');
    await page.locator('#issue-description').fill('<img src=x onerror="window.injected=true">\nKeep the evidence with the decisions.');
    await page.locator('#issue-priority').selectOption('high');
    await page.locator('#issue-assignee').selectOption('2');
    await page.locator('#issue-save').click();
    await waitClosed(page, '#issue-dialog');
    await page.getByRole('button', { name: /LAUNCH-10: Ship the review journal/ }).waitFor();
    createdId = Number(await page.getByRole('button', { name: /LAUNCH-10: Ship the review journal/ }).getAttribute('data-issue'));
    await page.reload();
    await page.locator(`[data-issue="${createdId}"]`).click();
    assert.equal(await page.locator('#issue-title').inputValue(), 'Ship the review journal');
    assert.match(await page.locator('#issue-description').inputValue(), /<img src=x/);
    assert.equal(await page.evaluate(() => window.injected), undefined);
  });
  await scenario('edit status and comment without losing the edit draft', async () => {
    await page.locator('#issue-status').selectOption('in_progress');
    await page.locator('#comment-body').fill('Reviewed the transaction boundary.');
    await page.locator('[data-action="post-comment"]').click();
    await page.getByText('Reviewed the transaction boundary.', { exact: true }).waitFor();
    assert.equal(await page.locator('#issue-status').inputValue(), 'in_progress');
    await page.locator('#issue-save').click();
    await waitClosed(page, '#issue-dialog');
    await page.locator(`.column[aria-label="In progress"] [data-issue="${createdId}"]`).waitFor();
  });
  await scenario('combined search filters, list view and activity view', async () => {
    await page.locator('#search').fill('review journal');
    await page.locator('#filter-priority').selectOption('high');
    await page.locator('#filter-status').selectOption('in_progress');
    await page.locator('#filter-assignee').selectOption('2');
    await page.waitForFunction(() => document.querySelectorAll('.issue-card').length === 1);
    assert.match(await page.locator('.issue-card').textContent(), /Ship the review journal/);
    await page.locator('.view-tabs [data-view="list"]').click();
    assert.equal(await page.locator('tbody tr').count(), 1);
    await page.locator('.view-tabs [data-view="activity"]').click();
    await page.locator('.activity-item').first().waitFor();
    assert.match(await page.locator('.activity-list').textContent(), /commented/);
    await page.locator('.view-tabs [data-view="board"]').click();
    await page.locator('[data-action="clear-filters"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.issue-card').length === 10);
  });
  await scenario('two browser contexts conflict, preserve draft, then explicitly reload winner', async () => {
    const other = await browser.newContext();
    const editor = await other.newPage();
    editor.on('pageerror', (error) => runtimeErrors.push(error.message));
    try {
      await login(editor, 2);
      await page.locator(`[data-issue="${createdId}"]`).click();
      await editor.locator(`[data-issue="${createdId}"]`).click();
      await page.locator('#issue-title').fill('My unsaved draft must remain');
      await editor.locator('#issue-title').fill('Sam saved the reviewed journal');
      await editor.locator('#issue-save').click();
      await waitClosed(editor, '#issue-dialog');
      await page.locator('#issue-save').click();
      await page.locator('.conflict-box').waitFor();
      assert.equal(await page.locator('#issue-title').inputValue(), 'My unsaved draft must remain');
      assert.equal(await page.locator('#issue-save').isDisabled(), true);
      assert.equal((await api(page, `/issues/${createdId}`)).body.issue.title, 'Sam saved the reviewed journal');
      await page.screenshot({ path: join(output, 'conflict-recovery.png'), fullPage: true });
      await page.locator('[data-action="reload-issue"]').click();
      await page.waitForFunction(() => document.querySelector('#issue-title')?.value === 'Sam saved the reviewed journal');
      assert.equal(await page.locator('#issue-save').isEnabled(), true);
      await page.locator('[aria-label="Close issue"]').click();
    } finally { await other.close(); }
  });
  await scenario('owner team management and visible last-owner rejection', async () => {
    await page.locator('[data-action="members"]').click();
    await page.locator('[data-role-for="1"]').selectOption('viewer');
    await page.locator('[data-save-member="1"]').click();
    await page.getByText('Keep at least one project owner.', { exact: true }).waitFor();
    await page.locator('[data-role-for="1"]').selectOption('owner');
    await page.locator('#member-form [name="userId"]').selectOption('4');
    await page.locator('#member-form [name="role"]').selectOption('viewer');
    await page.locator('#member-form [type="submit"]').click();
    await page.locator('[data-role-for="4"]').waitFor();
    await page.locator('[data-remove-member="4"]').click();
    await page.locator('[data-role-for="4"]').waitFor({ state: 'detached' });
    await page.locator('[aria-label="Close team"]').click();
  });
  await scenario('viewer sees read-only UI and cannot forge a write', async () => {
    await switchUser(page, 3);
    await page.getByText('Viewer access', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-action="new-issue"]').count(), 0);
    await page.locator(`[data-issue="${createdId}"]`).click();
    assert.equal(await page.locator('#issue-title').isDisabled(), true);
    assert.equal(await page.locator('#issue-save').count(), 0);
    const attempt = await api(page, `/issues/${createdId}`, 'PATCH', { version: 3, title: 'Forged viewer write' });
    assert.equal(attempt.status, 403);
    await page.locator('[aria-label="Close issue"]').click();
  });
  await scenario('new project workflow, empty state and outsider isolation', async () => {
    await switchUser(page, 1);
    await page.locator('[data-action="new-project"]').click();
    await page.locator('#project-name').fill('Design experiments');
    await page.locator('#project-key').fill('design');
    await page.locator('#project-description').fill('A place to test the next architecture choice.');
    await page.locator('#project-form [type="submit"]').click();
    await waitClosed(page, '#project-dialog');
    await page.waitForFunction(() => document.querySelector('.project-header h1')?.textContent === 'Design experiments');
    assert.equal(await page.locator('.issue-card').count(), 0);
    await switchUser(page, 4);
    assert.equal(await page.locator('.project-header h1').textContent(), 'Research lab');
    assert.equal(await page.locator('#project-nav [data-project="1"]').count(), 0);
    assert.equal((await api(page, `/issues/${createdId}`)).status, 404);
  });
  await scenario('archive, mobile layout, keyboard dialog close, and logout', async () => {
    await switchUser(page, 1);
    if (await page.locator('.project-header h1').textContent() !== 'Product launch') await page.locator('[data-project="1"]').click();
    await page.locator(`[data-issue="${createdId}"]`).click();
    await page.locator('[data-action="archive-issue"]').click();
    await waitClosed(page, '#issue-dialog');
    await page.locator(`[data-issue="${createdId}"]`).waitFor({ state: 'detached' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(output, 'mobile-board.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile document must not overflow horizontally');
    await page.locator('[data-action="new-issue"]').click();
    await page.locator('#issue-title').waitFor();
    await page.keyboard.press('Escape');
    await waitClosed(page, '#issue-dialog');
    await page.locator('details.user-menu summary').click();
    await page.locator('[data-action="logout"]').click();
    await page.locator('[data-login="1"]').waitFor();
    assert.equal((await api(page, '/projects')).status, 401);
  });
  assert.deepEqual(runtimeErrors, [], 'no uncaught browser errors');
  console.log(`${results.length}/${results.length} browser scenarios passed; no uncaught browser errors.`);
} catch (error) {
  if (page) await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(output, 'browser-results.json'), JSON.stringify({ timestamp: new Date().toISOString(), results, runtimeErrors }, null, 2));
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  close();
  await rm(temp, { recursive: true, force: true });
}
