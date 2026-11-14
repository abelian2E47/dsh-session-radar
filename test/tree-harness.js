/* Visual harness for the conversation tree: mounts the right-Sidebar panel (and
   the floating button) against a hand-made snapshot, so the panel can be looked
   at without a live host. Modes: ?mode=tree | tree-fab. */
const state = __STATE__;

const params = new URLSearchParams(location.search);
const mode = params.get('mode') || 'tree';
state.tree.open = mode !== 'tree-fab';
if (params.get('theme') === 'dark') document.body.dataset.dsDarkTheme = '';
const savedPrefs = JSON.parse(localStorage.getItem('dsr-tree-demo-prefs') || 'null');
if (savedPrefs) state.prefs = { ...state.prefs, ...savedPrefs };
const entryMode = params.get('entry');
if (entryMode) state.prefs.treeEntry = entryMode;

const clone = value => JSON.parse(JSON.stringify(value));
const listeners = new Set();
let snapshot = state;
const notify = function () {
  snapshot = { ...state };
  listeners.forEach(function (fn) { fn(); });
};

const entryOf = id => (state.entries || []).concat(state.archivedEntries || []).find(function (entry) { return entry.id === id; }) || null;
const roundsOf = id => (state.tree.rounds || {})[id] || null;
const refreshedSessions = new Set();
window.__treeRefreshedSessions = refreshedSessions;

const controller = {
  getSnapshot: () => snapshot,
  subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
  refresh: function () { notify(); },
  setPref: function (key, value) {
    state.prefs = { ...state.prefs, [key]: value };
    localStorage.setItem('dsr-tree-demo-prefs', JSON.stringify(state.prefs));
    notify();
  },
  ensureRounds: function (id) { return roundsOf(id); },
  refreshRounds: function (id) { refreshedSessions.add(id); return roundsOf(id); },
  openTreeIn: function (id) { state.currentId = id; notify(); },
  treePanelOpen: function () { return state.tree.open === true; },
  treeSidebar: function () { return { isExpanded: function () { return state.tree.open === true; } }; },
  previewFile: function () {},
  toggleTreeSidebar: function () {
    state.tree.open = state.tree.open !== true;
    state.tree.notice = null;
    notify();
  },
  clearTreeNotice: function () { state.tree.notice = null; notify(); },
  openSession: function (id) { state.currentId = id; notify(); },
  deleteBranch: async function (id) {
    const node = (state.entries || []).find(function (entry) { return entry.id === id; });
    const gone = [id];
    for (let guard = 0; guard < 8; guard += 1) {
      for (const entry of state.entries) {
        if (entry.parentId && gone.indexOf(entry.parentId) >= 0 && gone.indexOf(entry.id) < 0) gone.push(entry.id);
      }
      for (const key of Object.keys(state.branches || {})) {
        const record = state.branches[key];
        if (record && gone.indexOf(record.parentId) >= 0 && gone.indexOf(key) < 0) gone.push(key);
      }
    }
    state.entries = state.entries.filter(function (entry) { return gone.indexOf(entry.id) < 0; });
    state.archivedEntries = (state.archivedEntries || []).filter(function (entry) { return gone.indexOf(entry.id) < 0; });
    for (const key of gone) { delete (state.branches || {})[key]; delete (state.tree.rounds || {})[key]; }
    state.branches = Object.assign({}, state.branches);
    state.tree = Object.assign({}, state.tree, { rounds: Object.assign({}, state.tree.rounds) });
    if (state.currentId !== null && gone.indexOf(state.currentId) >= 0) state.currentId = state.currentParentFallback || 's1';
    state.tree.notice = { kind: 'done', text: '已删除「' + (node ? node.title : id) + '」这一支', at: Date.now() };
    state.counts.total = state.entries.length;
    notify();
    return true;
  },
  forkFromTurn: async function (sessionId, atSeq, turnIndex) {
    const parent = entryOf(sessionId);
    if (parent === null) return null;
    state.fork = { status: 'running', sessionId: sessionId, atSeq: atSeq, turn: turnIndex, childId: '', error: '' };
    notify();
    const child = clone(parent);
    const id = 'f' + ((state.entries.length || 0) + 1) + '-' + String(turnIndex);
    child.id = id;
    child.parentId = sessionId;
    child.origin = 'fork';
    child.title = (parent.title || '会话') + ' · 第 ' + turnIndex + ' 轮之后';
    child.turns = clone((parent.turns || []).slice(0, Math.max(1, turnIndex)));
    child.turn = child.turns.length;
    child.pinned = false;
    child.unread = false;
    child.updatedAt = Date.now();
    state.entries = state.entries.concat([child]);
    state.branches = Object.assign({}, state.branches, { [id]: { parentId: sessionId, atSeq: atSeq, turnIndex: turnIndex, at: Date.now() } });
    state.tree = Object.assign({}, state.tree, { rounds: Object.assign({}, state.tree.rounds, { [id]: { status: 'ready', turns: clone(child.turns), error: '', truncated: false, at: Date.now() } }) });
    state.fork = { status: 'done', sessionId: sessionId, atSeq: atSeq, turn: turnIndex, childId: id, error: '' };
    state.counts.total = state.entries.length;
    notify();
    return id;
  },
  canFork: () => true,
};

window.__treeState = state;
window.__treeController = controller;
const mod = window.__dshDef.factory(function (name) {
  if (name === 'react') return React;
  if (name === 'react-dom') return { createPortal: function (element, node) { return ReactDOM.createPortal(element, node); } };
  throw new Error('unknown module ' + name);
});
const parts = mod.__components;

const shell = document.createElement('div');
shell.className = 'tree-demo';
document.getElementById('root').appendChild(shell);

const main = document.createElement('div');
main.className = 'tree-demo__main';
main.innerHTML = '<div class="tree-demo__brand">DeepSeek Harness</div>'
  + '<h1>会话树面板</h1>'
  + '<p class="tree-demo__note">右栏是这个插件注册的「会话树」：一个会话的全部轮次、从轮次上长出来的分支，以及在分支之间跳回。</p>'
  + '<div class="tree-demo__card"></div>'
  + '<div class="tree-demo__card"></div>';
shell.appendChild(main);

function mountPrefs() {
  const side = document.createElement('aside');
  side.className = 'tree-demo__side is-plain';
  side.innerHTML = '<div class="tree-demo__body" id="side-body"></div>';
  shell.appendChild(side);
  ReactDOM.createRoot(document.getElementById('side-body')).render(
    React.createElement(function Settings() {
      const value = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
      return React.createElement(parts.PrefsSidebar, { controller: controller, prefs: value.prefs, variant: 'sidebar' });
    })
  );
}

function mountSidebar() {
  const side = document.createElement('aside');
  side.className = 'tree-demo__side';
  side.innerHTML = '<div class="tree-demo__tabs"><span class="tree-demo__tab is-active">会话树</span><span class="tree-demo__tab">终端</span></div><div class="tree-demo__body" id="side-body"></div>';
  shell.appendChild(side);
  ReactDOM.createRoot(document.getElementById('side-body')).render(
    React.createElement(function Panel() {
      const value = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
      return value.tree.open === false ? null : React.createElement(parts.TreePanel, { controller: controller, sessionId: value.currentId });
    })
  );
}

function mountFab() {
  const host = document.createElement('div');
  shell.appendChild(host);
  ReactDOM.createRoot(host).render(
    React.createElement(parts.TreeFab, { controller: controller })
  );
  const composer = document.createElement('div');
  composer.className = 'tree-demo__composerbar';
  main.querySelector('.tree-demo__composer').appendChild(composer);
  const submit = document.createElement('button');
  submit.className = 'tree-demo__submit';
  submit.textContent = '发送';
  main.querySelector('.tree-demo__composer').appendChild(submit);
  ReactDOM.createRoot(composer).render(
    React.createElement(parts.TreeComposerButton, { controller: controller, sessionId: state.currentId })
  );
}

if (mode === 'prefs') {
  shell.classList.add('tree-demo--prefs');
  main.innerHTML = '<div class="tree-demo__brand">DeepSeek Harness</div>'
    + '<h1>会话记得住自己怎么长出来的</h1>'
    + '<p class="tree-demo__note">入口在哪、要不要让位、浮动按钮摆在哪儿，都在设置里挑；按钮按住就能拖，位置会记住。</p>'
    + '<div class="tree-demo__card"></div>'
    + '<div class="tree-demo__card"></div>';
  mountPrefs();
} else if (mode === 'tree-fab') {
  shell.classList.add('tree-demo--fab');
  main.innerHTML = '<div class="tree-demo__brand">DeepSeek Harness</div>'
    + '<h1>会话持续进行</h1>'
    + '<p class="tree-demo__note">会话右下角的小按钮是「会话树」的入口：点开就是右栏面板，面板在前时按钮让位。</p>'
    + '<div class="tree-demo__bubble">支付回调重试改造 · 第 3 轮进行中</div>'
    + '<div class="tree-demo__composer">问点什么…</div>';
  mountFab();
  mountSidebar();
} else mountSidebar();
