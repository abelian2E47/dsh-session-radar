const params = new URLSearchParams(location.search);
if (params.get('theme') === 'dark') document.body.dataset.dsDarkTheme = '';
const base = {
  prefs: { showQuickBar: true, showRail: true, quickNavMode: params.get('mode') || 'mini', quickNavTrigger: 'both', quickNavLabels: {}, quickNavCollapsed: {}, ...JSON.parse(localStorage.getItem('quicknav.fixture.prefs') || '{}') },
  currentId: 'a1', counts: { active: 2, waiting: 1, unread: 1 }, streaming: 'live', workspaces: [],
  ui: { open: false, prefsOpen: false }, entries: [
    { id: 'a1', title: '登录页视觉回归', workspace: 'dsh-dev', workspaceId: 'dev', pinned: true, status: 'running', statusLabel: '思考中' },
    { id: 'a2', title: '登录页交互改造', workspace: 'dsh-dev', workspaceId: 'dev', pinned: true, status: 'approval', statusLabel: '等待批准' },
    { id: 'a3', title: '会话树侧边栏', workspace: 'dsh-dev', workspaceId: 'dev', pinned: true, status: 'done', unread: true },
    { id: 'b1', title: 'Blender 线粒体模型建模', workspace: 'AI4Blender', workspaceId: 'blender', pinned: true, status: 'tool', statusLabel: '运行工具' },
    { id: 'c1', title: '本地模型翻译数学教材', workspace: 'Study', workspaceId: 'study', pinned: true, status: 'idle' },
    { id: 'd1', title: '支付回调重试策略', workspace: 'billing', workspaceId: 'billing', pinned: true, status: 'idle' },
    { id: 'e1', title: '光学系统模拟器', workspace: 'optics', workspaceId: 'optics', pinned: true, status: 'idle' },
    { id: 'z1', title: '不固定的后台会话', workspace: 'extra', pinned: false, status: 'running' },
  ],
};
const listeners = new Set();
let snapshot = base;
const notify = function () { snapshot = { ...base }; listeners.forEach(fn => fn()); };
const controller = {
  hasShortcut: true,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, getSnapshot() { return snapshot; },
  setPref(key, value) { base.prefs = { ...base.prefs, [key]: value }; localStorage.setItem('quicknav.fixture.prefs', JSON.stringify(base.prefs)); notify(); },
  openSession(id) { base.currentId = id; window.__openedSession = id; notify(); },
  togglePin(id) { base.entries = base.entries.map(entry => entry.id === id ? { ...entry, pinned: !entry.pinned } : entry); notify(); },
  togglePinnedCurrent() { this.togglePin(base.currentId); }, open() { window.__radarOpened = true; },
};
window.__quicknav = { state: base, controller, notify };
const mod = window.__dshDef.factory(name => name === 'react' ? React : { createPortal: ReactDOM.createPortal });
const parts = mod.__components;
document.body.insertAdjacentHTML('beforeend', '<aside class="fixture-regionArea"></aside><main class="demo-copy"><h1>会话快捷导航</h1><p>固定的会话随手可达。小快捷栏保持原样；会话卡片按需唤起；图标用短名辨识，状态独立显示。</p><input id="composer" placeholder="继续当前会话…" /></main>');
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(function App() {
  const state = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return React.createElement(React.Fragment, null,
    React.createElement(parts.QuickNavigation, { controller }),
    React.createElement(parts.QuickBar, { controller, state, onOpenSession: id => controller.openSession(id), onTogglePin: id => controller.togglePin(id), onMore: () => controller.open() }));
}));
