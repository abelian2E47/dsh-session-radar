import assert from 'node:assert/strict';
import './build-tree-harness.mjs';
import { runShots } from './browser-fixtures.mjs';

const side = '.tree-demo__side';
const checkTree = async function (page) {
  assert.ok(await page.locator('.dsr-cv__round').count() > 0);
  assert.equal(await page.locator('.dsr-cv__roundmain').first().evaluate(function (el) { return getComputedStyle(el).display; }), 'flex');
};
await runShots('test/tree-harness.html', [
  { name: 'session-tree', query: 'mode=tree', width: 1280, height: 900, check: checkTree },
  { name: 'session-tree-rounds', query: 'mode=tree', width: 1280, height: 900, clip: side,
    act: async function (page) { await page.locator('.dsr-cv__roundmain').first().click(); }, check: checkTree },
  { name: 'session-tree-branch', query: 'mode=tree', width: 1280, height: 900, clip: side,
    act: async function (page) { await page.locator('.dsr-cv__forkbtn').nth(1).click(); },
    check: async function (page) { assert.equal(await page.locator('.dsr-cv__node').count(), 5); } },
  { name: 'session-tree-delete', query: 'mode=tree', width: 1280, height: 900, clip: side,
    act: async function (page) { await page.locator('.dsr-cv__nodeact').first().click(); },
    check: async function (page) { assert.equal(await page.locator('.dsr-cv__confirm').count(), 1); } },
  { name: 'session-tree-button', query: 'mode=tree-fab&entry=float', width: 900, height: 640 },
  { name: 'session-tree-composer', query: 'mode=tree-fab&entry=both', width: 900, height: 640 },
  { name: 'session-tree-settings', query: 'mode=prefs', width: 1280, height: 900, clip: side,
    act: async function (page) { await page.getByRole('tab', { name: '会话树', exact: true }).click(); } },
  { name: 'session-tree-dark', query: 'mode=tree&theme=dark', width: 1280, height: 900, clip: side, check: checkTree },
]);
