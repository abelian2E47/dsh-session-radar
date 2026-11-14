import assert from 'node:assert/strict';
import './build-harness.mjs';
import { runShots } from './browser-fixtures.mjs';

const select = async function (page) { await page.locator('.dsr-card').first().click(); };
const tree = async function (page) { await select(page); await page.locator('.dsr-cv-section').scrollIntoViewIfNeeded(); };
const checkTree = async function (page) {
  const rounds = page.locator('.dsr-cv__round');
  assert.ok(await rounds.count() > 0);
  assert.equal(await page.locator('.dsr-cv__said').count(), await rounds.count());
  assert.equal(await page.locator('.dsr-cv__roundmain').first().evaluate(function (el) { return getComputedStyle(el).display; }), 'flex');
};
await runShots('test/visual-harness.html', [
  { name: 'overview', query: 'mode=page', width: 1440, height: 980 },
  { name: 'radar', query: 'mode=dock', width: 1280, height: 900 },
  { name: 'conversation-tree', query: 'mode=page', width: 1600, height: 1240, act: tree, check: checkTree },
  { name: 'conversation-fullscreen', query: 'mode=page', width: 1600, height: 1000,
    act: async function (page) {
      await select(page);
      await page.getByRole('button', { name: /全屏/ }).first().click();
      await page.locator('.dsr-detail.is-fullscreen .dsr-cv-section').scrollIntoViewIfNeeded();
    }, check: checkTree },
  { name: 'conversation-round', query: 'mode=page', width: 1600, height: 1180,
    act: async function (page) {
      await tree(page);
      await page.locator('.dsr-cv__roundmain').first().click();
      await page.locator('.dsr-cv__rounddetail').first().scrollIntoViewIfNeeded();
    }, check: async function (page) { await checkTree(page); assert.equal(await page.locator('.dsr-cv__rounddetail').count(), 1); } },
  { name: 'statistics', query: 'mode=activity', width: 1320, height: 2100 },
  { name: 'statistics-scope', query: 'mode=activity', width: 1320, height: 1200,
    act: async function (page) {
      await page.locator('.dsr-scope__chip').nth(1).click();
      await page.locator('.dsr-scope-panel').getByRole('button', { name: /选择会话/ }).click();
    } },
  { name: 'workspaces', query: 'mode=workspaces', width: 1440, height: 940 },
]);
