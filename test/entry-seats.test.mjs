import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

/* The plugin's browser half only ever reaches the app through apply(): the
   tree's panel tab and both of its entry buttons are slot registrations, and a
   registration that silently stops happening looks exactly like a missing
   button. These tests boot the built bundle against a stub host and assert on
   what apply() actually registered. */

const bundlePath = new URL('../lib/client.js', import.meta.url);
const built = fs.existsSync(bundlePath);

const noop = function () {};
const observable = function (value) {
  return { getSnapshot: function () { return value; }, subscribe: function () { return noop; } };
};

/** Boot one fresh copy of the bundle and return its module face. */
function boot() {
  const source = fs.readFileSync(bundlePath, 'utf8');
  let factory = null;
  const store = new Map();
  const storage = {
    getItem: function (key) { return store.has(key) ? store.get(key) : null; },
    setItem: function (key, value) { store.set(key, String(value)); },
    removeItem: function (key) { store.delete(key); },
  };
  const element = function () {
    return { setAttribute: noop, appendChild: noop, style: {}, dataset: {}, classList: { add: noop, remove: noop }, sheet: { insertRule: noop } };
  };
  globalThis.window = {
    __ModuleLoader__: { load: function (spec) { factory = spec.factory; } },
    localStorage: storage,
    addEventListener: noop,
    removeEventListener: noop,
    matchMedia: function () { return { matches: false, addEventListener: noop, removeEventListener: noop }; },
  };
  globalThis.localStorage = storage;
  globalThis.document = {
    head: { appendChild: noop },
    body: { appendChild: noop, classList: { add: noop, remove: noop, toggle: noop }, dataset: {} },
    documentElement: { dataset: {} },
    createElement: element,
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: noop,
    removeEventListener: noop,
  };
  globalThis.__DSR_TEST__ = true;
  new Function(source)();
  if (factory === null) throw new Error('bundle did not register a factory');
  const React = {
    createElement: function (type, props) { return { type: type, props: props }; },
    Fragment: 'Fragment',
    useState: function (value) { return [value, noop]; },
    useEffect: noop,
    useLayoutEffect: noop,
    useMemo: function (fn) { return fn(); },
    useCallback: function (fn) { return fn; },
    useRef: function (value) { return { current: value }; },
    useSyncExternalStore: function (subscribe, get) { return get(); },
    createContext: function (value) { return { value: value }; },
    useContext: function (context) { return context && context.value; },
    memo: function (fn) { return fn; },
    Children: { map: function (children) { return children; }, toArray: function (children) { return [children]; } },
  };
  return factory(function (name) {
    if (name === 'react') return React;
    if (name === 'react-dom') return { createPortal: function (element) { return element; } };
    throw new Error('unexpected module ' + name);
  });
}

/** A stub host context that records every slot registration. */
function host(options = {}) {
  const registrations = [];
  const cleanups = [];
  const services = options.services || {};
  const slots = {
    inject: function (name, callback) { return callback(); },
    register: function (registration, component) {
      registrations.push({ name: registration.name, key: registration.id || registration.key, component: component });
      return noop;
    },
  };
  const ctx = {
    slots: slots,
    sessions: {
      list: observable({ phase: 'ready', ids: [], byId: {} }),
      onScreen: observable(undefined),
      currentMainId: function () { return null; },
      refresh: function () { return Promise.resolve(); },
      events: function () { return Promise.resolve({ events: [], hasMore: false }); },
      fork: function () { return Promise.resolve({ id: 'x' }); },
      delete: function () { return Promise.resolve(); },
    },
    workspaces: { list: observable({ ids: [], byId: {} }), refresh: function () { return Promise.resolve(); } },
    remote: undefined,
    effect: function (callback) { const cleanup = callback(); if (typeof cleanup === 'function') cleanups.push(cleanup); return cleanup || noop; },
    get: function (name) { return services[name]; },
    inject: function (names, callback) { if (names.every(function (name) { return services[name] !== undefined; })) callback({ ...ctx, ...services }); },
    on: noop,
    logger: { warn: noop, error: noop, info: noop },
    reflect: { provide: function () { return noop; }, get: function () { return undefined; } },
  };
  return { ctx: ctx, registrations: registrations, slots: slots, dispose: function () { cleanups.reverse().forEach(function (cleanup) { cleanup(); }); } };
}

const seats = function (registrations) {
  return registrations.map(function (item) { return item.name + '#' + item.key; }).sort();
};

test('the built bundle exposes the tree components', { skip: !built && 'lib/client.js is not built' }, function () {
  const components = boot().__components;
  for (const name of ['SessionTree', 'SessionTreeSection', 'TreePanel', 'TreeFab', 'TreeComposerButton', 'PrefsSidebar']) {
    assert.equal(typeof components[name], 'function', name + ' should be exported for the tests');
  }
});

test('apply() seats both tree entries without the right Sidebar', { skip: !built && 'lib/client.js is not built' }, function () {
  const mod = boot();
  const scope = host();
  try { mod.apply(scope.ctx); } finally { scope.dispose(); }
  assert.deepEqual(seats(scope.registrations), [
    'conversation.input.right#session-manager.tree',
    'main#session-manager',
    'shell.overlay#session-manager.dock',
    'shell.overlay#session-manager.quicknav',
    'shell.overlay#session-manager.tree',
    'sidebar.panellist#session-manager',
  ]);
});

test('apply() adds the tree tab to the right Sidebar when it is already there', { skip: !built && 'lib/client.js is not built' }, function () {
  const mod = boot();
  const tabTypes = [];
  const scope = host({
    services: {
      sidebarRight: { hide: noop, focus: noop, tabsIn: function () { return []; } },
      sidebarRightTabs: { register: function (definition) { tabTypes.push(definition); return noop; } },
    },
  });
  try { mod.apply(scope.ctx); } finally { scope.dispose(); }
  assert.deepEqual(seats(scope.registrations).filter(function (name) { return name.startsWith('sidebar.right.pane.tab'); }), ['sidebar.right.pane.tab#dsh-session-manager.tree']);
  assert.equal(tabTypes.length, 1);
  assert.equal(tabTypes[0].kind, 'session-tree');
  assert.equal(tabTypes[0].multiple, false);
  assert.equal(typeof tabTypes[0].title, 'function');
});


test('full history reads every page and preserves old rounds and long text', async function () {
  const Controller = boot().__components.RadarController;
  const scope = host();
  const controller = new Controller(scope.ctx);
  const prompt = '完整用户指令'.repeat(1200);
  const reply = '完整 agent 回复'.repeat(1200);
  const records = [];
  for (let turn = 1; turn <= 240; turn += 1) {
    const at = (turn - 1) * 4;
    records.push(
      { type: 'turn/start', seq: at + 1, time: 1000 + at, data: { turn } },
      { type: 'user/message', seq: at + 2, time: 1001 + at, data: { source: { kind: 'user' }, content: [{ type: 'text', text: prompt }] } },
      { type: 'assistant/message', seq: at + 3, time: 1002 + at, data: { message: { content: [{ type: 'text', text: reply }] } } },
      { type: 'turn/end', seq: at + 4, time: 1003 + at, data: {} },
    );
  }
  const cursors = [];
  controller.rows.set('history', { id: 'history', running: false });
  controller.remote = { session: { events: async function (request) {
    cursors.push(request.beforeSeq);
    const available = records.filter(function (record) { return request.beforeSeq === undefined || record.seq < request.beforeSeq; });
    return { ok: true, value: { records: available.slice(-80), hasMore: available.length > 80 } };
  } } };
  try {
    const view = await controller.ensureRounds('history');
    assert.equal(cursors.length, 12);
    assert.equal(view.turns.length, 240);
    assert.equal(view.turns[0].index, 1);
    assert.equal(view.turns[0].prompt, prompt);
    assert.equal(view.turns[0].text, reply);
    assert.equal(view.truncated, false);
    assert.equal(view.turns[239].index, 240);
  } finally { controller.dispose(); }
});

test('a repeated history cursor fails instead of looping', async function () {
  const Controller = boot().__components.RadarController;
  const controller = new Controller(host().ctx);
  controller.rows.set('s1', { id: 's1' });
  controller.remote = { session: { events: async function () { return { ok: true, value: { records: [{ type: 'turn/start', seq: 10, data: { turn: 1 } }], hasMore: true } }; } } };
  try {
    const view = await controller.ensureRounds('s1');
    assert.equal(view.status, 'error');
    assert.match(view.error, /分页没有前进/);
  } finally { controller.dispose(); }
});

test('failed branch deletions retain their recorded parent relationship', async function () {
  const Controller = boot().__components.RadarController;
  const scope = host();
  const controller = new Controller(scope.ctx);
  controller.branches = { branch: { parentId: 'root', turnIndex: 1, atSeq: 4 } };
  controller.getSnapshot = function () { return { entries: [{ id: 'root' }, { id: 'branch' }], archivedEntries: [] }; };
  controller.workspaces.archiveSession = async function () {};
  controller.requestDelete = async function () { return { deleted: [], failed: [{ id: 'branch', error: 'permission denied' }] }; };
  try {
    assert.equal(await controller.deleteBranch('branch'), false);
    assert.equal(controller.branches.branch.parentId, 'root');
    assert.equal(controller.treeNotice.text, 'permission denied');
    assert.equal(await controller.deleteBranch('root'), false);
  } finally { controller.dispose(); }
});

test('tree preferences persist, reject invalid modes and reset the position', function () {
  const Controller = boot().__components.RadarController;
  const controller = new Controller(host().ctx);
  try {
    controller.setPref('treeEntry', 'both');
    controller.setPref('treeEntry', 'invalid');
    controller.setPref('treeFabPos', { x: 120.2, y: 140.8 });
    const second = new Controller(host().ctx);
    try {
      assert.equal(second.prefs.treeEntry, 'both');
      assert.deepEqual(second.prefs.treeFabPos, { x: 120, y: 141 });
    } finally { second.dispose(); }
    controller.setPref('treeFabPos', null);
    assert.equal(controller.prefs.treeFabPos, null);
  } finally { controller.dispose(); }
});


test('an existing tab type from an earlier reload does not block the tree body', function () {
  const mod = boot();
  const scope = host({ services: {
    sidebarRight: {},
    sidebarRightTabs: {
      get: function () { return { id: 'dsh-session-manager.tree', kind: 'session-tree' }; },
      register: function () { throw new Error('duplicate tab type'); },
    },
  } });
  try { mod.apply(scope.ctx); } finally { scope.dispose(); }
  assert.ok(seats(scope.registrations).includes('sidebar.right.pane.tab#dsh-session-manager.tree'));
});


test('tail refresh fills a burst larger than its page instead of skipping rounds', async function () {
  const Controller = boot().__components.RadarController;
  const controller = new Controller(host().ctx);
  let log = [];
  const appendTurn = function (turn) {
    const seq = (turn - 1) * 4;
    log.push(
      { type: 'turn/start', seq: seq + 1, data: { turn } },
      { type: 'user/message', seq: seq + 2, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '问 ' + turn }] } },
      { type: 'assistant/message', seq: seq + 3, data: { message: { content: [{ type: 'text', text: '答 ' + turn }] } } },
      { type: 'turn/end', seq: seq + 4, data: {} },
    );
  };
  controller.rows.set('burst', { id: 'burst', running: true });
  controller.remote = { session: { events: async function (request) {
    const available = log.filter(function (record) { return request.beforeSeq === undefined || record.seq < request.beforeSeq; });
    return { ok: true, value: { records: available.slice(-80), hasMore: available.length > 80 } };
  } } };
  try {
    appendTurn(1);
    await controller.ensureRounds('burst');
    for (let turn = 2; turn <= 90; turn += 1) appendTurn(turn);
    const view = await controller.refreshRounds('burst');
    assert.equal(view.turns.length, 90);
    assert.equal(view.turns[1].index, 2);
    assert.equal(view.turns[1].prompt, '问 2');
    assert.equal(view.turns[89].text, '答 90');
  } finally { controller.dispose(); }
});


test('navigation preferences persist through the real controller and distinguish workspace paths', function () {
  const Controller = boot().__components.RadarController;
  const controller = new Controller(host().ctx);
  try {
    assert.equal(controller.prefs.quickNavMode, 'mini');
    controller.setPref('quickNavMode', 'icons');
    controller.setPref('quickNavIconLimit', 50);
    controller.setPref('quickNavIconPos', { x: 120.2, y: 140.8 });
    controller.setPref('quickNavLabels', { one: '前端界面' });
    controller.setPref('quickNavCollapsed', { 'w:E:/one/repo': true });
    const second = new Controller(host().ctx);
    try {
      assert.equal(second.prefs.quickNavMode, 'icons');
      assert.equal(second.prefs.quickNavIconLimit, 20);
      assert.deepEqual(second.prefs.quickNavIconPos, { x: 120, y: 141 });
      assert.equal(second.prefs.quickNavLabels.one, '前端');
      assert.equal(second.prefs.quickNavCollapsed['w:E:/one/repo'], true);
    } finally { second.dispose(); }
    assert.notEqual(controller.workspaceKeyFor({ id: 'a', cwd: 'E:/one/repo' }), controller.workspaceKeyFor({ id: 'b', cwd: 'E:/two/repo' }));
    controller.setPref('quickNavMode', 'invalid');
    assert.equal(controller.prefs.quickNavMode, 'mini');
  } finally { controller.dispose(); }
});
