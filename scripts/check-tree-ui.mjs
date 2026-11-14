import assert from 'node:assert/strict';
import './build-tree-harness.mjs';
import './build-harness.mjs';
import { withFixtureBrowser, settle } from './browser-fixtures.mjs';

await withFixtureBrowser(async function ({ context }) {
  const page = context.pages()[0];
  const errors = [];
  page.on('pageerror', function (error) { errors.push(error.message); });
  page.setDefaultTimeout(4000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const base = new URL('../test/tree-harness.html', import.meta.url).href;
  const goto = async function (query) {
    await page.goto(base + '?' + query);
    await page.locator('#root > *').first().waitFor();
    await settle(page);
  };
  await goto('mode=tree');
  await page.evaluate(function () { localStorage.removeItem('dsr-tree-demo-prefs'); });
  const reads = await page.evaluate(function () { return Array.from(window.__treeRefreshedSessions); });
  assert.ok(reads.includes('s1'), 'the expanded ancestor must request its full history');
  assert.ok(reads.includes(await page.evaluate(function () { return window.__treeState.currentId; })), 'the current branch must request its full history');
  const initialRounds = await page.locator('.dsr-cv__round').count();
  assert.equal(await page.locator('.dsr-cv__say.is-user').count(), initialRounds);
  assert.equal(await page.locator('.dsr-cv__say.is-agent').count(), initialRounds);
  await page.locator('.dsr-cv__roundmain').first().click();
  assert.match(await page.locator('.dsr-cv__rounddetail').first().innerText(), /用户指令/);
  assert.match(await page.locator('.dsr-cv__rounddetail').first().innerText(), /AI 回复/);
  await page.locator('.dsr-cv__forkbtn').nth(1).click();
  assert.equal(await page.locator('.dsr-cv__node').count(), 5);
  const child = await page.evaluate(function () { return window.__treeState.fork.childId; });
  await page.getByRole('button', { name: '进去看看' }).click();
  assert.equal(await page.evaluate(function () { return window.__treeState.currentId; }), child);
  await page.locator('.dsr-cv__crumb').first().click();
  assert.equal(await page.evaluate(function () { return window.__treeState.currentId; }), 's1');
  console.log('PASS: round previews, full text, fork attachment and return to parent');

  await goto('mode=tree');
  const count = await page.evaluate(function () { return window.__treeState.entries.length; });
  await page.locator('.dsr-cv__nodeact').first().click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await page.evaluate(function () { return window.__treeState.entries.length; }), count);
  await page.locator('.dsr-cv__nodeact').first().click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  assert.equal(await page.evaluate(function () { return window.__treeState.entries.length; }), count - 2);
  assert.equal(await page.locator('.dsr-cv__confirm').count(), 0);
  console.log('PASS: cancel deletion and remove a complete subtree in the fixture');

  for (const [mode, fab, composer] of [['float', 1, 0], ['composer', 0, 1], ['both', 1, 1], ['none', 0, 0]]) {
    await goto('mode=tree-fab&entry=' + mode);
    assert.equal(await page.locator('.dsr-treefab').count(), fab);
    assert.equal(await page.locator('.dsr-treetoggle').count(), composer);
  }
  await goto('mode=tree-fab&entry=both');
  const button = page.locator('.dsr-treefab');
  await button.hover();
  await page.mouse.move(20, 20);
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(220, 220, { steps: 12 });
  await page.mouse.up();
  await settle(page);
  const position = await page.evaluate(function () { return window.__treeState.prefs.treeFabPos; });
  assert.ok(position && position.x < 300 && position.y < 300);
  assert.notEqual(await page.evaluate(function () { return window.__treeState.tree.open; }), true);
  await page.reload();
  await settle(page);
  const restored = await button.boundingBox();
  assert.ok(Math.abs(restored.x - position.x) <= 2);
  await page.locator('.dsr-treetoggle').click();
  await page.waitForFunction(function () { return !document.querySelector('.dsr-treefab'); });
  assert.equal(await page.locator('.dsr-cv').count(), 1);
  await page.locator('.dsr-treetoggle').click();
  await button.waitFor();
  console.log('PASS: four entry modes, drag persistence, click suppression and sidebar yield');

  await goto('mode=prefs');
  await page.getByRole('tab', { name: '会话树', exact: true }).click();
  await page.getByRole('button', { name: '输入栏', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: '输入栏', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: '恢复默认位置', exact: true }).click();
  assert.equal(await page.evaluate(function () { return window.__treeState.prefs.treeFabPos; }), null);
  await goto('mode=tree-fab');
  assert.equal(await page.locator('.dsr-treefab').count(), 0);
  assert.equal(await page.locator('.dsr-treetoggle').count(), 1);
  console.log('PASS: settings switches entries and resets the saved position');

  for (const theme of ['', '&theme=dark']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await goto('mode=tree' + theme);
    assert.equal(await page.evaluate(function () { return document.documentElement.scrollWidth > innerWidth; }), false);
    assert.equal(await page.locator('.dsr-cv__roundmain').first().evaluate(function (el) { return getComputedStyle(el).display; }), 'flex');
  }
  await page.setViewportSize({ width: 1600, height: 1180 });
  await page.goto(new URL('../test/visual-harness.html?mode=page', import.meta.url).href);
  await page.locator('.dsr-card').first().click();
  const main = page.locator('.dsr-cv__roundmain').first();
  assert.equal(await main.evaluate(function (el) { return getComputedStyle(el).display; }), 'flex');
  await main.click();
  assert.equal(await page.locator('.dsr-cv__rounddetail').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS: light/dark narrow sidebar and styled card tree; zero page errors');
});
