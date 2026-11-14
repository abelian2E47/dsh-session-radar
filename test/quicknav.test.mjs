import test from 'node:test';
import assert from 'node:assert/strict';
import { QUICK_NAV_DEFAULTS, normalizeQuickNavPref, quickNavIdentity, quickNavSessions, quickNavGroups, quickNavShortcutMatches } from '../src/quicknav.mjs';

test('old installations retain the mini bar; malformed navigation settings recover safely', () => {
  assert.equal(QUICK_NAV_DEFAULTS.quickNavMode, 'mini');
  assert.equal(normalizeQuickNavPref('quickNavMode', 'missing'), 'mini');
  assert.equal(normalizeQuickNavPref('quickNavIconLimit', 500), 20);
  assert.equal(normalizeQuickNavPref('quickNavIconLimit', 0), 1);
  assert.equal(normalizeQuickNavPref('quickNavIconLimit', NaN), 6);
  assert.deepEqual(normalizeQuickNavPref('quickNavLabels', { a: ' 登录页 ', b: '', c: 42 }), { a: '登录' });
  assert.deepEqual(normalizeQuickNavPref('quickNavCollapsed', JSON.parse('{"__proto__":true,"w:dev":true,"w:study":false}')), { 'w:dev': true });
});
test('session identity stays stable when its runtime state changes', () => {
  const idle = { id: 'abc', title: '登录页改造', status: 'idle' };
  assert.equal(quickNavIdentity(idle).short, '登录');
  assert.deepEqual(quickNavIdentity(idle), quickNavIdentity({ ...idle, status: 'running' }));
  assert.equal(quickNavIdentity({ id: 'latin', title: 'Payment retries' }).short, 'PR');
  assert.equal(quickNavIdentity(idle, { abc: '前端' }).short, '前端');
});
test('only active pins enter new surfaces and distinct workspaces with equal titles stay separate', () => {
  const items = quickNavSessions([
    { id: 'b', pinned: true, workspace: 'repo', workspaceId: 'path-1', status: 'idle' },
    { id: 'a', pinned: true, workspace: 'repo', workspaceId: 'path-1', status: 'running' },
    { id: 'c', pinned: true, workspace: 'repo', workspaceId: 'path-2' },
    { id: 'x', pinned: true, archived: true }, { id: 'y', pinned: false },
    { id: 'a', pinned: true },
  ]);
  assert.deepEqual(items.map(item => item.id), ['a', 'b', 'c']);
  const groups = quickNavGroups(items);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].entries.map(item => item.id), ['a', 'b']);
  assert.notEqual(groups[0].key, groups[1].key);
});
test('configured shortcuts reject additional modifiers, composition and key repeats', () => {
  const event = { code: 'KeyQ', altKey: true, ctrlKey: false, shiftKey: false, metaKey: false };
  assert.equal(quickNavShortcutMatches(event, 'Alt+Q'), true);
  for (const patch of [{ repeat: true }, { isComposing: true }, { shiftKey: true }, { metaKey: true }]) assert.equal(quickNavShortcutMatches({ ...event, ...patch }, 'Alt+Q'), false);
  assert.equal(quickNavShortcutMatches({ ...event, code: 'Space', altKey: false, ctrlKey: true, shiftKey: true }, 'Control+Shift+Space'), true);
});
