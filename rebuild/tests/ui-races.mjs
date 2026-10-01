import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'test-results');
await mkdir(output, { recursive: true });
const { app, close } = createApp();
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const base = `http://127.0.0.1:${server.address().port}`;
const results = [], runtimeErrors = [];
let browser, page;
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
async function scenario(name, work) {
  try { await work(); results.push({ name, status: 'passed' }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, status: 'failed', error: error.message }); throw error; }
}
async function closed(selector) { await page.waitForFunction((s) => !document.querySelector(s).open, selector); }
async function renderedProject(name) { await page.waitForFunction((n) => document.querySelector('.project-header h1')?.textContent === n, name); }
// Forward the actual request, then hold only its response. This tests response ordering,
// not an invented server. The returned release must always run even after an assertion fails.
async function holdResponse(pattern, method = 'GET') {
  const entered = deferred(), released = deferred(), delivered = deferred();
  let consumed = false;
  const handler = async (route) => {
    if (consumed || route.request().method() !== method) return route.continue();
    consumed = true;
    const response = await route.fetch();
    entered.resolve();
    await released.promise;
    await route.fulfill({ response });
    delivered.resolve();
  };
  await page.route(pattern, handler);
  return {
    entered: entered.promise,
    release: async () => { released.resolve(); if (consumed) await delivered.promise; await page.unroute(pattern, handler); },
  };
}
async function settleBrowser() {
  // Two render frames let the delivered response's microtasks and DOM work complete.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto(base);
  await page.locator('[data-login="1"]').click();
  await renderedProject('Product launch');
  const next = await page.evaluate(async () => {
    const result = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GitJira-Request': '1' }, body: JSON.stringify({ key: 'RACE', name: 'Timing laboratory' }) });
    return (await result.json()).project;
  });
  await page.reload();
  await renderedProject('Product launch');
  await scenario('delayed old issue response cannot replace a newly opened issue', async () => {
    const held = await holdResponse('**/api/issues/1');
    try {
      await page.locator('[data-issue="1"]').click();
      await held.entered;
      await page.locator('[aria-label="Close issue"]').click();
      await closed('#issue-dialog');
      await page.locator('[data-issue="2"]').click();
      await page.locator('#issue-title').waitFor();
      assert.equal(await page.locator('#issue-title').inputValue(), 'Explore keyboard-first navigation');
      await held.release();
      await settleBrowser();
      assert.equal(await page.locator('#issue-title').inputValue(), 'Explore keyboard-first navigation');
      await page.locator('[aria-label="Close issue"]').click();
    } finally { await held.release(); }
  });
  await scenario('queued search cannot invalidate a project load', async () => {
    const held = await holdResponse(`**/api/projects/${next.id}/issues`);
    try {
      // Both events occur in the same browser task, before the debounce can fire.
      await page.evaluate((projectId) => {
        const search = document.querySelector('#search');
        search.value = 'pending old search'; search.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector(`[data-project="${projectId}"]`).click();
      }, next.id);
      await held.entered;
      // Wait beyond the application's actual debounce deadline while keeping its project GET held.
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 350)));
      await held.release();
      await renderedProject('Timing laboratory');
      assert.equal(await page.locator('.issue-card').count(), 0);
      await page.locator('[data-action="members"]').click();
      await page.locator('.member-row').waitFor();
      assert.equal(await page.locator('.member-row').count(), 1);
      await page.locator('[aria-label="Close team"]').click();
    } finally { await held.release(); }
  });
  await scenario('delayed team response cannot populate a different project dialog', async () => {
    await page.locator('[data-project="1"]').click();
    await renderedProject('Product launch');
    const held = await holdResponse('**/api/projects/1/members');
    try {
      await page.locator('[data-action="members"]').click();
      await held.entered;
      await page.locator('[aria-label="Close team"]').click();
      await page.locator(`[data-project="${next.id}"]`).click();
      await renderedProject('Timing laboratory');
      await page.locator('[data-action="members"]').click();
      await page.locator('.member-row').waitFor();
      await held.release();
      await settleBrowser();
      assert.equal(await page.locator('.member-row').count(), 1);
      assert.match(await page.locator('.member-person').textContent(), /Avery Chen/);
      await page.locator('[aria-label="Close team"]').click();
    } finally { await held.release(); }
  });
  await scenario('pending issue write blocks close and duplicate submit until acknowledged', async () => {
    await page.locator('[data-project="1"]').click();
    await renderedProject('Product launch');
    await page.locator('[data-issue="1"]').click();
    await page.locator('#issue-title').fill('A single acknowledged update');
    const held = await holdResponse('**/api/issues/1', 'PATCH');
    try {
      await page.locator('#issue-save').click();
      await held.entered;
      assert.equal(await page.locator('#issue-save').isDisabled(), true);
      assert.equal(await page.locator('[aria-label="Close issue"]').isDisabled(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#issue-dialog').evaluate((node) => node.open), true);
      await held.release();
      await closed('#issue-dialog');
      await page.locator('[data-issue="1"]').click();
      await page.locator('#issue-title').waitFor();
      assert.equal(await page.locator('#issue-title').inputValue(), 'A single acknowledged update');
      assert.match(await page.locator('.issue-meta').textContent(), /Version 2/);
      await page.locator('[aria-label="Close issue"]').click();
    } finally { await held.release(); }
  });
  await scenario('pending membership change blocks dialog dismissal until role is refreshed', async () => {
    await page.locator('[data-action="members"]').click();
    await page.locator('[data-role-for="2"]').selectOption('viewer');
    const held = await holdResponse('**/api/projects/1/members/2', 'PUT');
    try {
      await page.locator('[data-save-member="2"]').click();
      await held.entered;
      assert.equal(await page.locator('[aria-label="Close team"]').isDisabled(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#members-dialog').evaluate((node) => node.open), true);
      await held.release();
      await page.waitForFunction(() => document.querySelector('[data-role-for="2"]')?.value === 'viewer' && !document.querySelector('[data-save-member="2"]')?.disabled);
      await page.locator('[aria-label="Close team"]').click();
    } finally { await held.release(); }
  });
  await scenario('pending project creation cannot close a later draft', async () => {
    await page.locator('[data-action="new-project"]').click();
    await page.locator('#project-name').fill('Acknowledged project');
    await page.locator('#project-key').fill('ACK');
    const held = await holdResponse('**/api/projects', 'POST');
    try {
      await page.locator('#project-form [type="submit"]').click();
      await held.entered;
      assert.equal(await page.locator('[aria-label="Close project dialog"]').isDisabled(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#project-dialog').evaluate((node) => node.open), true);
      await held.release();
      await closed('#project-dialog');
      await renderedProject('Acknowledged project');
    } finally { await held.release(); }
  });
  await scenario('failed workspace load after switching accounts removes the previous workspace', async () => {
    let failed = false;
    const intercept = async (route) => {
      if (!failed && route.request().method() === 'GET') {
        failed = true;
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Injected workspace failure', code: 'BUSY' }) });
      }
      return route.continue();
    };
    await page.route('**/api/projects', intercept);
    try {
      await page.locator('details.user-menu summary').click();
      await page.locator('[data-switch="4"]').click();
      await page.locator('[data-action="retry-workspace"]').waitFor();
      assert.equal(await page.locator('.project-header').count(), 0);
      assert.match(await page.locator('.boot').textContent(), /Signed in as Taylor Brooks/);
      await page.locator('[data-action="retry-workspace"]').click();
      await renderedProject('Research lab');
      assert.equal(await page.locator('#project-nav [data-project="1"]').count(), 0);
    } finally { await page.unroute('**/api/projects', intercept); }
  });
  assert.deepEqual(runtimeErrors, []);
  console.log(`${results.length}/${results.length} delayed-response scenarios passed; no uncaught browser errors.`);
} catch (error) {
  if (page) await page.screenshot({ path: join(output, 'race-failure.png'), fullPage: true }).catch(() => {});
  console.error(error); process.exitCode = 1;
} finally {
  await writeFile(join(output, 'ui-race-results.json'), JSON.stringify({ timestamp: new Date().toISOString(), results, runtimeErrors }, null, 2));
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  close();
}
