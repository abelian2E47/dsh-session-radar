/**
 * Browser-side data controller for the session radar.
 *
 * It owns no transport of its own: catalog rows come from ctx.sessions, while
 * token/context/plan values and the event tail come from the public session
 * Remote namespace. Running sessions get one live event stream; every visible
 * session gets a cheap projection/state refresh on a bounded cadence.
 */

const STORAGE_KEYS = {
  pins: 'dsh.sessionRadar.v1.pins',
  workspacePins: 'dsh.sessionRadar.v1.workspacePins',
  unread: 'dsh.sessionRadar.v1.unread',
  prefs: 'dsh.sessionRadar.v1.prefs',
  activity: 'dsh.sessionRadar.v1.activity',
  branches: 'dsh.sessionRadar.v1.branches',
};

const CARD_TEXTURE_VALUES = new Set(['none', 'paper', 'dots', 'glass']);
/** Where the tree's entry button lives: floating, beside the composer, both, or nowhere. */
const TREE_ENTRY_VALUES = new Set(['float', 'composer', 'both', 'none']);
const ACTIVITY_MODE_VALUES = new Set(['today', 'day', 'week', 'month', 'custom']);
const ACTIVITY_GRAIN_VALUES = new Set(['hour', 'day', 'week', 'month']);
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The right-Sidebar tab type the conversation tree opens as. */
const TREE_TAB_KIND = 'session-tree';
/** Implementation id the tab body and its chip title register under. */
const TREE_TAB_ID = 'dsh-session-manager.tree';
/** Message budget per history page; the tree reads until history is exhausted. */
const ROUND_PAGE_SIZE = 400;

const DEFAULT_PREFS = {
  ...QUICK_NAV_DEFAULTS,
  showRail: true,
  includeSubagents: true,
  compact: false,
  completionBadge: true,
  stallMinutes: 5,
  defaultRange: '7d',
  cardTint: 'sand',
  cardTexture: 'paper',
  showQuickBar: true,
  showSidebarPins: true,
  sidebarPinsOpen: true,
  quickBarPos: null,
  railPos: null,
  treeEntry: 'float',
  treeFabYield: true,
  treeFabPos: null,
  activityRange: { mode: 'today', from: '', to: '', grain: 'day', timeMode: 'busy' },
  activityScope: { workspaces: [], sessions: [] },
};

/** Statistics can be narrowed to picked workspaces and/or sessions. */
function normalizeScopeList(value, limit) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const name = item.trim();
    if (name === '' || out.includes(name)) continue;
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeActivityScope(value) {
  const source = isRecord(value) ? value : {};
  return {
    workspaces: normalizeScopeList(source.workspaces, 60),
    sessions: normalizeScopeList(source.sessions, 400),
  };
}

/**
 * The statistics page keeps its own window: a preset (today / day / week /
 * month) or a custom day range with a chosen granularity.
 */
function normalizeActivityRange(value) {
  const source = isRecord(value) ? value : {};
  const mode = ACTIVITY_MODE_VALUES.has(String(source.mode)) ? String(source.mode) : 'today';
  const grain = ACTIVITY_GRAIN_VALUES.has(String(source.grain)) ? String(source.grain) : 'day';
  let from = typeof source.from === 'string' && DAY_KEY_PATTERN.test(source.from) ? source.from : '';
  let to = typeof source.to === 'string' && DAY_KEY_PATTERN.test(source.to) ? source.to : '';
  if (from !== '' && to !== '' && to < from) {
    const swap = from;
    from = to;
    to = swap;
  }
  const timeMode = source.timeMode === 'sum' ? 'sum' : 'busy';
  return { mode, from, to, grain, timeMode };
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || new Error('aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason || new Error('aborted'));
    }, { once: true });
  });
}

function loadSet(key) {
  const value = readStoredJson(globalThis.localStorage, key, []);
  return new Set(Array.isArray(value) ? value.filter(item => typeof item === 'string') : []);
}

function loadPrefs() {
  const value = readStoredJson(globalThis.localStorage, STORAGE_KEYS.prefs, {});
  const prefs = { ...DEFAULT_PREFS, ...(isRecord(value) ? value : {}) };
  if (!CARD_TEXTURE_VALUES.has(prefs.cardTexture)) prefs.cardTexture = DEFAULT_PREFS.cardTexture;
  if (!TREE_ENTRY_VALUES.has(prefs.treeEntry)) prefs.treeEntry = DEFAULT_PREFS.treeEntry;
  for (const key of Object.keys(QUICK_NAV_DEFAULTS)) prefs[key] = normalizeQuickNavPref(key, prefs[key]);
  prefs.activityRange = normalizeActivityRange(prefs.activityRange);
  prefs.activityScope = normalizeActivityScope(prefs.activityScope);
  prefs.stallMinutes = normalizeStallMinutes(prefs.stallMinutes);
  return prefs;
}

function loadUnread() {
  const value = readStoredJson(globalThis.localStorage, STORAGE_KEYS.unread, {});
  if (!isRecord(value)) return {};
  const out = {};
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [id, at] of Object.entries(value)) {
    if (typeof id === 'string' && Number(at) > cutoff) out[id] = Number(at);
  }
  return out;
}


/**
 * The branch records this plugin keeps for the forks it cut.
 *
 * DSH's own session summary carries no source for an ordinary fork — the child
 * only inherits an event prefix — so the link from a branch back to the round it
 * was cut from is kept here, browser-side, and read back by the session tree.
 */
function loadBranches() {
  const value = readStoredJson(globalThis.localStorage, STORAGE_KEYS.branches, {});
  if (!isRecord(value)) return {};
  const out = {};
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  for (const [id, record] of Object.entries(value)) {
    if (typeof id !== 'string' || id === '' || !isRecord(record)) continue;
    const parentId = typeof record.parentId === 'string' ? record.parentId : '';
    if (parentId === '' || parentId === id) continue;
    const at = Number(record.at) || 0;
    if (at > 0 && at < cutoff) continue;
    out[id] = {
      parentId,
      atSeq: Math.max(0, Number(record.atSeq) || 0),
      turnIndex: Math.max(0, Number(record.turnIndex) || 0),
      at,
      title: typeof record.title === 'string' ? record.title.slice(0, 200) : '',
    };
  }
  return out;
}

function loadActivity() {
  const value = readStoredJson(globalThis.localStorage, STORAGE_KEYS.activity, null);
  if (isRecord(value) && value.version === 1 && isRecord(value.days) && isRecord(value.turns)) return value;
  return { version: 1, days: {}, turns: {} };
}

function emptyActivityCounter() {
  return { tokens: 0, durationMs: 0, turns: 0, calls: 0, models: {}, modelTokens: {}, spans: [] };
}

function ensureActivityCounter(value) {
  const counter = isRecord(value) ? value : emptyActivityCounter();
  counter.tokens = Math.max(0, Number(counter.tokens) || 0);
  counter.durationMs = Math.max(0, Number(counter.durationMs) || 0);
  counter.turns = Math.max(0, Number(counter.turns) || 0);
  counter.calls = Math.max(0, Number(counter.calls) || 0);
  if (!isRecord(counter.models)) counter.models = {};
  if (!isRecord(counter.modelTokens)) counter.modelTokens = {};
  if (!Array.isArray(counter.spans)) counter.spans = [];
  return counter;
}

function ensureActivityDay(activity, day) {
  const bucket = ensureActivityCounter(activity.days[day]);
  if (!isRecord(bucket.sessions)) bucket.sessions = {};
  if (!isRecord(bucket.hours)) bucket.hours = {};
  activity.days[day] = bucket;
  return bucket;
}

function ensureActivityHour(day, hour) {
  const bucket = ensureActivityCounter(day.hours[hour]);
  if (!isRecord(bucket.sessions)) bucket.sessions = {};
  day.hours[hour] = bucket;
  return bucket;
}

function ensureActivitySession(container, id, title) {
  const session = ensureActivityCounter(container.sessions[id]);
  session.title = title || session.title || id;
  if (!isRecord(session.hours)) session.hours = {};
  if (!Array.isArray(session.spans)) session.spans = [];
  container.sessions[id] = session;
  return session;
}

/** Local-day bounds used when clipping turn spans into a day bucket. */
function activityDayBounds(day) {
  const start = new Date(String(day) + 'T00:00:00').getTime();
  if (!Number.isFinite(start)) return { start: 0, end: Infinity };
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

function normalizeModelCalls(value) {
  const models = {};
  if (!isRecord(value)) return models;
  for (const [rawName, rawCount] of Object.entries(value)) {
    const name = String(rawName || '').trim() || '未标注模型';
    const count = Math.max(0, Number(rawCount) || 0);
    if (count > 0) models[name] = (Number(models[name]) || 0) + count;
  }
  return models;
}

function sumModelCalls(models) {
  return Object.values(models).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

function normalizeModelTokens(value) {
  return normalizeModelCalls(value);
}

function addActivityCounter(target, delta) {
  target.tokens += Math.max(0, Number(delta.tokens) || 0);
  target.durationMs += Math.max(0, Number(delta.durationMs) || 0);
  target.turns += Math.max(0, Number(delta.turns) || 0);
  target.calls += Math.max(0, Number(delta.calls) || 0);
  if (!isRecord(target.models)) target.models = {};
  for (const [name, count] of Object.entries(delta.models || {})) {
    const amount = Math.max(0, Number(count) || 0);
    if (amount > 0) target.models[name] = (Number(target.models[name]) || 0) + amount;
  }
  if (!isRecord(target.modelTokens)) target.modelTokens = {};
  for (const [name, count] of Object.entries(delta.modelTokens || {})) {
    const amount = Math.max(0, Number(count) || 0);
    if (amount > 0) target.modelTokens[name] = (Number(target.modelTokens[name]) || 0) + amount;
  }
}

function subtractActivityCounter(target, amount) {
  target.tokens = Math.max(0, (Number(target.tokens) || 0) - Math.max(0, Number(amount.tokens) || 0));
  target.durationMs = Math.max(0, (Number(target.durationMs) || 0) - Math.max(0, Number(amount.durationMs) || 0));
  target.turns = Math.max(0, (Number(target.turns) || 0) - Math.max(0, Number(amount.turns) || 0));
  target.calls = Math.max(0, (Number(target.calls) || 0) - Math.max(0, Number(amount.calls) || 0));
  if (!isRecord(target.models)) target.models = {};
  for (const [name, count] of Object.entries(amount.models || {})) {
    const next = (Number(target.models[name]) || 0) - Math.max(0, Number(count) || 0);
    if (next > 0) target.models[name] = next;
    else delete target.models[name];
  }
  if (!isRecord(target.modelTokens)) target.modelTokens = {};
  for (const [name, count] of Object.entries(amount.modelTokens || {})) {
    const next = (Number(target.modelTokens[name]) || 0) - Math.max(0, Number(count) || 0);
    if (next > 0) target.modelTokens[name] = next;
    else delete target.modelTokens[name];
  }
}

export class RadarController {
  constructor(ctx) {
    this.ctx = ctx;
    this.sessions = ctx.sessions;
    this.workspaces = ctx.workspaces;
    this.remote = ctx.remote;
    this.listeners = new Set();
    this.rows = new Map();
    this.telemetry = new Map();
    this.watches = new Map();
    this.workspaceItems = [];
    this.workspaceArchived = new Set();
    this.pins = loadSet(STORAGE_KEYS.pins);
    this.workspacePins = loadSet(STORAGE_KEYS.workspacePins);
    this.unread = loadUnread();
    this.prefs = loadPrefs();
    this.activity = loadActivity();
    this.branches = loadBranches();
    this.treeRounds = new Map();
    this.treeLoading = new Map();
    this.treeBusy = false;
    this.treeNotice = null;
    this.activityLastPersist = 0;
    this.activityDirty = false;
    this.historyLoaded = new Set();
    this.historyLoading = new Map();
    this.historyQueue = [];
    this.historyActive = 0;
    this.activityScanAt = 0;
    this.ui = {
      open: false,
      tab: 'live',
      selectedId: null,
      query: '',
      filters: { range: this.prefs.defaultRange || '7d', workspace: 'all', model: 'all', status: 'all' },
      searchStatus: 'idle',
      searchResults: [],
      searchQuery: '',
      searchHasMore: false,
      usageRange: this.prefs.defaultRange || '7d',
      workspaceRange: this.prefs.defaultRange || '7d',
      workspaceFocus: null,
      workspaceFocusAt: 0,
      statisticsFocus: null,
      statisticsFocusAt: 0,
      prefsOpen: false,
      detailFull: false,
      fork: { status: 'idle', sessionId: '', atSeq: 0, childId: '', error: '' },
      tree: { sessionId: '', waiting: [] },
      bulk: { status: 'idle', action: null, message: '', error: '', ids: [] },
    };
    this.lastRunning = new Map();
    this.metaAt = new Map();
    this.metaInFlight = new Map();
    this.preloadQueue = [];
    this.preloadActive = 0;
    this.searchToken = 0;
    this.searchAbort = null;
    this.lifetime = new AbortController();
    this.disposed = false;
    this.error = null;
    this.rosterPhase = 'pending';
    this.lastSyncAt = 0;
    this.publishQueued = false;
    this.publishTimer = null;
    this.snapshot = null;
    this.hasShortcut = false;

    this.syncWorkspaces();
    if (typeof this.sessions.list.subscribe === 'function') {
      this.unsubscribeSessions = this.sessions.list.subscribe(() => this.syncRoster());
    }
    if (typeof this.workspaces?.list?.subscribe === 'function') {
      this.unsubscribeWorkspaces = this.workspaces.list.subscribe(() => {
        this.syncWorkspaces();
        this.publishSoon();
      });
    }
    this.syncRoster();
    this.snapshot = this.buildSnapshot();
    this.pollTimer = setInterval(() => this.poll(), 3000);
    this.pruneTimer = setInterval(() => this.pruneUnread(), 60 * 60 * 1000);
    if (this.sessions.list.getSnapshot().phase === 'pending') {
      Promise.resolve(this.sessions.refresh()).catch(error => {
        this.error = '会话目录加载失败：' + (error instanceof Error ? error.message : String(error));
        this.publishSoon();
      });
    }
  }

  getSnapshot() {
    return this.snapshot || this.buildSnapshot();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.lifetime.abort();
    clearInterval(this.pollTimer);
    clearInterval(this.pruneTimer);
    clearTimeout(this.publishTimer);
    this.unsubscribeSessions?.();
    this.unsubscribeWorkspaces?.();
    for (const id of [...this.watches.keys()]) this.stopWatch(id);
    this.searchAbort?.abort();
    this.listeners.clear();
  }

  publishSoon() {
    if (this.disposed) return;
    if (this.publishQueued) return;
    this.publishQueued = true;
    this.publishTimer = setTimeout(() => {
      this.publishQueued = false;
      this.publish();
    }, 64);
  }

  publish() {
    if (this.disposed) return;
    this.snapshot = this.buildSnapshot();
    for (const listener of [...this.listeners]) {
      try { listener(); } catch { /* a surface listener must not break the controller */ }
    }
  }

  syncWorkspaces() {
    const snapshot = this.workspaces?.list?.getSnapshot?.();
    this.workspaceItems = Array.isArray(snapshot?.items) ? snapshot.items : [];
    this.workspaceArchived = new Set(Array.isArray(snapshot?.archivedSessionIds) ? snapshot.archivedSessionIds : []);
  }

  workspaceFor(row) {
    if (!row) return '';
    const item = this.workspaceItems.find(workspace => Array.isArray(workspace.sessionIds) && workspace.sessionIds.includes(row.id));
    if (item) return item.title || basename(item.path) || '工作区';
    if (typeof row.cwd === 'string' && row.cwd !== '') return basename(row.cwd) || row.cwd;
    if (row.parentId !== undefined) {
      const parent = this.rows.get(row.parentId);
      if (parent !== undefined && parent.id !== row.id) return this.workspaceFor(parent);
    }
    return '未分组';
  }

  workspaceKeyFor(row) {
    const seen = new Set();
    while (row && !seen.has(row.id)) {
      seen.add(row.id);
      const workspace = this.workspaceItems.find(item => Array.isArray(item.sessionIds) && item.sessionIds.includes(row.id));
      if (workspace) return workspace.id || workspace.path || this.workspaceFor(row);
      if (row.cwd) return row.cwd;
      row = this.rows.get(row.parentId);
    }
    return 'ungrouped';
  }

  currentMainId() {
    for (const row of this.rows.values()) {
      if ((row.retainedBy?.mainView ?? 0) > 0) return row.id;
    }
    return undefined;
  }

  ensureTelemetry(row) {
    let telemetry = this.telemetry.get(row.id);
    if (telemetry === undefined) {
      telemetry = createTelemetry(row);
      telemetry.unread = Boolean(this.unread[row.id]);
      this.telemetry.set(row.id, telemetry);
    }
    telemetry.running = row.running === true;
    telemetry.cwd = typeof row.cwd === 'string' ? row.cwd : telemetry.cwd;
    telemetry.origin = row.origin || telemetry.origin;
    telemetry.parentId = row.parentId || telemetry.parentId;
    telemetry.blank = row.blank === true;
    telemetry.updatedAt = Number(row.updatedAt) || telemetry.updatedAt;
    if (typeof row.title === 'string' && row.title !== '') telemetry.title = row.title;
    else if ((telemetry.title === '' || telemetry.title === telemetry.id) && row.displayTitle) telemetry.title = row.displayTitle;
    if (row.running === true && telemetry.unread) {
      telemetry.unread = false;
      delete this.unread[row.id];
      this.persistUnread();
    }
    return telemetry;
  }

  syncRoster() {
    if (this.disposed) return;
    const snapshot = this.sessions.list.getSnapshot();
    this.rosterPhase = snapshot.phase;
    if (snapshot.phase === 'ready') this.error = null;
    const nextRows = new Map();
    const rosterIds = snapshot.ids.concat(Object.keys(snapshot.byId).filter(id => !snapshot.ids.includes(id)));
    for (const id of rosterIds) {
      const row = snapshot.byId[id];
      if (row === undefined) continue;
      nextRows.set(id, row);
      this.ensureTelemetry(row);
    }
    for (const id of [...this.telemetry.keys()]) {
      if (!nextRows.has(id)) {
        this.stopWatch(id);
        this.telemetry.delete(id);
        this.metaAt.delete(id);
        this.pins.delete(id);
        delete this.unread[id];
      }
    }
    this.rows = nextRows;
    for (const [id, row] of nextRows) {
      const telemetry = this.ensureTelemetry(row);
      const wasRunning = this.lastRunning.get(id) === true;
      if (wasRunning && row.running !== true) this.finishSession(id, telemetry);
      if (row.running === true) {
        telemetry.completedAt = 0;
        this.ensureWatch(id);
      } else if (this.watches.has(id)) {
        this.stopWatch(id);
        telemetry.stream = 'idle';
        this.queueMeta(id);
      }
      this.lastRunning.set(id, row.running === true);
    }
    this.ensureRecentMetadata();
    this.pruneBranches();
    this.publishSoon();
  }

  finishSession(id, telemetry) {
    telemetry.completedAt = Date.now();
    telemetry.phase = 'done';
    telemetry.pendingCalls = {};
    telemetry.pendingInput = [];
    if (this.prefs.completionBadge && this.currentMainId() !== id) {
      telemetry.unread = true;
      this.unread[id] = Date.now();
      this.persistUnread();
    }
    this.queueMeta(id);
  }

  persistUnread() {
    writeStoredJson(globalThis.localStorage, STORAGE_KEYS.unread, this.unread);
  }

  persistPins() {
    writeStoredJson(globalThis.localStorage, STORAGE_KEYS.pins, [...this.pins]);
  }

  persistWorkspacePins() {
    writeStoredJson(globalThis.localStorage, STORAGE_KEYS.workspacePins, [...this.workspacePins]);
  }

  persistPrefs() {
    writeStoredJson(globalThis.localStorage, STORAGE_KEYS.prefs, this.prefs);
  }

  pruneUnread() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let changed = false;
    for (const [id, at] of Object.entries(this.unread)) {
      if (!(Number(at) > cutoff)) {
        delete this.unread[id];
        changed = true;
      }
    }
    if (changed) this.persistUnread();
  }

  ensureRecentMetadata() {
    const rows = [...this.rows.values()]
      .filter(row => row.blank !== true)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 16);
    for (const row of rows) {
      if (!this.telemetry.has(row.id)) this.ensureTelemetry(row);
      if (!this.metaAt.has(row.id) && !this.metaInFlight.has(row.id)) this.queueMeta(row.id);
    }
  }

  queueMeta(id) {
    if (this.disposed || this.metaInFlight.has(id)) return;
    if (this.preloadQueue.includes(id)) return;
    this.preloadQueue.push(id);
    this.pumpPreload();
  }

  pumpPreload() {
    if (this.disposed) return;
    while (this.preloadActive < 3 && this.preloadQueue.length > 0) {
      const id = this.preloadQueue.shift();
      if (this.metaInFlight.has(id)) continue;
      this.preloadActive += 1;
      Promise.resolve(this.refreshMeta(id)).finally(() => {
        this.preloadActive -= 1;
        this.pumpPreload();
      });
    }
  }

  addressFor(id) {
    const child = this.sessions.subagentAddress?.(id);
    return child || { kind: 'session', sessionId: id };
  }

  async refreshMeta(id) {
    if (this.disposed) return;
    const existing = this.metaInFlight.get(id);
    if (existing !== undefined) return existing;
    const row = this.rows.get(id);
    const telemetry = row ? this.ensureTelemetry(row) : this.telemetry.get(id);
    if (telemetry === undefined) return;
    const job = (async () => {
      const signal = this.lifetime.signal;
      const [projection, state] = await Promise.allSettled([
        this.remote.session.projections({ sessionId: id }, signal),
        this.remote.session.state({ sessionId: id }, signal),
      ]);
      if (this.disposed) return;
      if (projection.status === 'fulfilled' && projection.value?.ok) {
        const value = projection.value.value;
        if (value && (value.kind === 'sequenced' || value.kind === 'migration-required')) {
          applyProjectionValues(telemetry, value.values);
        }
      }
      if (state.status === 'fulfilled' && state.value?.ok) applyState(telemetry, state.value.value);
      this.metaAt.set(id, Date.now());
      this.lastSyncAt = Date.now();
      this.publishSoon();
    })();
    this.metaInFlight.set(id, job);
    try { await job; } finally { this.metaInFlight.delete(id); }
  }

  ensureWatch(id) {
    if (this.disposed) return;
    const existing = this.watches.get(id);
    if (existing !== undefined) return;
    const row = this.rows.get(id);
    if (!row) return;
    const watch = {
      abort: new AbortController(),
      ready: false,
      snapshotLoaded: false,
      buffer: [],
      stream: 'connecting',
      retry: null,
    };
    this.watches.set(id, watch);
    const telemetry = this.ensureTelemetry(row);
    telemetry.stream = 'connecting';
    void this.loadInitial(id, watch);
    void this.runEventStream(id, watch);
    this.publishSoon();
  }

  stopWatch(id) {
    const watch = this.watches.get(id);
    if (watch === undefined) return;
    this.watches.delete(id);
    watch.abort.abort();
    clearTimeout(watch.retry);
  }

  async loadInitial(id, watch) {
    const telemetry = this.telemetry.get(id);
    if (telemetry === undefined) return;
    const signal = watch.abort.signal;
    try {
      const result = await this.remote.session.events({
        address: this.addressFor(id),
        maxMessages: 120,
      }, signal);
      if (signal.aborted || this.disposed) return;
      if (result?.ok) {
        telemetry.error = null;
        reduceEvents(telemetry, result.value?.records || []);
        watch.snapshotLoaded = true;
        const buffered = watch.buffer.splice(0).sort((a, b) => Number(a.seq) - Number(b.seq));
        for (const event of buffered) reduceEvent(telemetry, event);
        this.lastSyncAt = Date.now();
      } else {
        telemetry.error = result?.error?.message || '读取会话事件失败';
      }
    } catch (error) {
      if (!signal.aborted) telemetry.error = error instanceof Error ? error.message : String(error);
    }
    watch.snapshotLoaded = true;
    void this.refreshMeta(id);
    this.publishSoon();
  }

  async runEventStream(id, watch) {
    const signal = watch.abort.signal;
    while (!signal.aborted && !this.disposed) {
      try {
        const stream = this.remote.session.observeEvent({ address: this.addressFor(id) }, signal);
        for await (const frame of stream) {
          if (signal.aborted || this.disposed) return;
          if (frame?.type === 'ready') {
            watch.ready = true;
            watch.stream = 'live';
            const telemetry = this.telemetry.get(id);
            if (telemetry) telemetry.stream = 'live';
            this.publishSoon();
            continue;
          }
          if (frame?.type !== 'event' || !isRecord(frame.event)) continue;
          const telemetry = this.telemetry.get(id);
          if (telemetry === undefined) continue;
          if (!watch.snapshotLoaded) {
            watch.buffer.push(frame.event);
            continue;
          }
          if (reduceEvent(telemetry, frame.event)) this.lastSyncAt = Date.now();
          this.publishSoon();
        }
        if (signal.aborted || this.disposed) return;
        throw new Error('event stream ended');
      } catch (error) {
        if (signal.aborted || this.disposed) return;
        watch.stream = 'reconnecting';
        watch.ready = false;
        const telemetry = this.telemetry.get(id);
        if (telemetry) {
          telemetry.stream = 'reconnecting';
          telemetry.error = error instanceof Error ? error.message : String(error);
        }
        this.publishSoon();
        try { await this.loadInitial(id, watch); } catch { /* the tail read is best-effort too */ }
        try { await sleep(2500, signal); } catch { return; }
        watch.stream = 'connecting';
      }
    }
  }

  poll() {
    if (this.disposed) return;
    const ids = new Set();
    for (const id of this.watches.keys()) ids.add(id);
    if (this.ui.selectedId !== null) ids.add(this.ui.selectedId);
    for (const id of this.pins) ids.add(id);
    for (const id of ids) {
      const row = this.rows.get(id);
      if (row === undefined) continue;
      const telemetry = this.telemetry.get(id);
      const should = row.running === true || this.ui.selectedId === id || this.pins.has(id);
      if (should && telemetry !== undefined) {
        const age = Date.now() - (this.metaAt.get(id) || 0);
        const cadence = row.running === true || this.ui.selectedId === id ? 3000 : 15000;
        if (age >= cadence) this.queueMeta(id);
      }
    }
  }

  toggle() {
    this.ui.open = !this.ui.open;
    if (this.ui.open) {
      const firstActive = this.snapshot?.entries?.find(entry => entry.status === 'running' || entry.status === 'tool' || entry.status === 'approval' || entry.status === 'question');
      if (this.ui.selectedId === null && firstActive) {
        // Leave selection empty for the overview list; the header already exposes the count.
      }
    }
    this.publish();
  }

  open() {
    this.ui.open = true;
    this.publish();
  }

  close() {
    this.ui.open = false;
    this.ui.detailFull = false;
    this.publish();
  }

  setTab(tab) {
    if (tab !== 'live' && tab !== 'recent' && tab !== 'pinned') return;
    this.ui.tab = tab;
    this.ui.selectedId = null;
    this.publish();
  }

  setQuery(query) {
    const next = String(query || '');
    if (next !== this.ui.searchQuery && this.ui.searchStatus !== 'idle') {
      this.ui.searchStatus = 'idle';
      this.ui.searchResults = [];
      this.ui.searchHasMore = false;
    }
    this.ui.query = next;
    this.publishSoon();
  }

  setFilter(key, value) {
    if (key !== 'range' && key !== 'workspace' && key !== 'model' && key !== 'status') return;
    const next = String(value || 'all');
    if (this.ui.filters[key] === next) return;
    this.ui.filters = { ...this.ui.filters, [key]: next };
    this.publishSoon();
  }

  clearFilters() {
    this.ui.filters = { range: this.prefs.defaultRange || '7d', workspace: 'all', model: 'all', status: 'all' };
    this.publishSoon();
  }

  setUsageRange(range) {
    const next = String(range || '7d');
    if (this.ui.usageRange === next) return;
    this.ui.usageRange = next;
    this.publishSoon();
  }

  setWorkspaceRange(range) {
    const next = String(range || '7d');
    if (this.ui.workspaceRange === next) return;
    this.ui.workspaceRange = next;
    this.publishSoon();
  }

  /** One click: bring the session up in the side panel. */
  openDetail(id) {
    if (this.ui.prefsOpen) this.ui.prefsOpen = false;
    this.ui.open = true;
    this.ui.detailFull = false;
    this.select(id);
  }

  /** Two clicks: the same detail, blown up to a full-screen dialog. */
  openFullDetail(id) {
    if (this.ui.prefsOpen) this.ui.prefsOpen = false;
    this.ui.open = true;
    this.select(id);
    this.ui.detailFull = true;
    this.publish();
  }

  setDetailFull(value) {
    const next = value === true;
    if (this.ui.detailFull === next) return;
    this.ui.detailFull = next;
    this.publish();
  }

  toggleDetailFull() {
    this.setDetailFull(!this.ui.detailFull);
  }

  select(id) {
    this.ui.selectedId = id;
    this.ui.detailFull = false;
    this.markRead(id);
    const row = this.rows.get(id);
    if (row?.running === true) this.ensureWatch(id);
    else {
      this.queueMeta(id);
      this.queueHistory(id);
    }
    this.publish();
  }

  back() {
    this.ui.selectedId = null;
    this.publish();
  }

  markRead(id) {
    const telemetry = this.telemetry.get(id);
    if (telemetry?.unread) {
      telemetry.unread = false;
      delete this.unread[id];
      this.persistUnread();
      this.publishSoon();
    }
  }

  clearUnread() {
    for (const telemetry of this.telemetry.values()) telemetry.unread = false;
    this.unread = {};
    this.persistUnread();
    this.publish();
  }

  togglePin(id) {
    if (typeof id !== 'string' || id === '') return;
    if (this.pins.has(id)) this.pins.delete(id);
    else this.pins.add(id);
    this.persistPins();
    if (this.pins.has(id)) this.queueMeta(id);
    this.publish();
  }

  cyclePinned(direction) {
    const snapshot = this.snapshot || this.getSnapshot();
    const ordered = (Array.isArray(snapshot.entries) ? snapshot.entries : [])
      .filter(entry => entry.pinned === true && entry.archived !== true)
      .slice()
      .sort((a, b) => {
        const rank = { tool: 0, running: 0, approval: 1, question: 1, done: 2, migration: 2, idle: 3 };
        return ((rank[a.status] ?? 9) - (rank[b.status] ?? 9)) || ((b.updatedAt || 0) - (a.updatedAt || 0));
      });
    if (ordered.length === 0) return false;
    const currentId = this.currentMainId();
    const currentIndex = ordered.findIndex(entry => entry.id === currentId);
    const step = Number(direction) < 0 ? -1 : 1;
    const nextIndex = currentIndex < 0 ? (step < 0 ? ordered.length - 1 : 0) : (currentIndex + step + ordered.length) % ordered.length;
    const nextId = ordered[nextIndex].id;
    if (nextId === currentId) return false;
    this.openSession(nextId);
    return true;
  }

  togglePinnedCurrent() {
    const id = this.currentMainId();
    if (!id) return false;
    this.togglePin(id);
    return true;
  }

  toggleWorkspacePin(id) {
    if (typeof id !== 'string' || id === '') return;
    if (this.workspacePins.has(id)) this.workspacePins.delete(id);
    else this.workspacePins.add(id);
    this.persistWorkspacePins();
    this.publish();
  }

  focusWorkspace(id) {
    if (typeof id !== 'string' || id === '') return;
    this.ui.workspaceFocus = id;
    this.ui.workspaceFocusAt = Date.now();
    this.ui.query = '';
    this.ui.prefsOpen = false;
    this.ui.open = false;
    this.publish();
    try { this.ctx.layout.selectPanel('session-manager'); } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.publish();
    }
  }

  /** Narrow the statistics page to picked workspaces and/or sessions. */
  setActivityScope(scope) {
    this.setPref('activityScope', normalizeActivityScope(scope));
  }

  clearActivityScope() {
    this.setActivityScope({ workspaces: [], sessions: [] });
  }

  /**
   * Jump to the statistics page showing only one workspace. Used by the
   * workspace board so a card can hand its sessions over to the stats.
   */
  showStatisticsFor(scope) {
    this.setActivityScope(scope);
    this.ui.statisticsFocus = isRecord(scope) ? normalizeActivityScope(scope) : null;
    this.ui.statisticsFocusAt = Date.now();
    this.ui.prefsOpen = false;
    this.publish();
  }

  async archiveSessions(ids, options = {}) {
    const unique = [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && id !== ''))];
    if (unique.length === 0) return false;
    if (typeof this.workspaces?.archiveSession !== 'function') {
      this.ui.bulk = { status: 'error', action: 'archive', message: '', error: '当前 DSH 部署没有提供会话归档接口。', ids: unique };
      this.publish();
      return false;
    }
    this.ui.bulk = { status: 'busy', action: 'archive', message: '正在归档 ' + unique.length + ' 个会话…', error: '', ids: unique };
    this.publishSoon();
    let done = 0;
    const failures = [];
    for (const id of unique) {
      try {
        await this.workspaces.archiveSession(id, { stopActivity: options.stopActivity === true });
        done += 1;
        this.pins.delete(id);
        const telemetry = this.telemetry.get(id);
        if (telemetry) telemetry.unread = false;
        delete this.unread[id];
        this.stopWatch(id);
      } catch (error) {
        failures.push((error instanceof Error ? error.message : String(error)));
      }
    }
    this.persistPins();
    this.persistUnread();
    this.syncWorkspaces();
    this.ui.bulk = {
      status: failures.length === 0 ? 'done' : done > 0 ? 'partial' : 'error',
      action: 'archive',
      message: done > 0 ? '已归档 ' + done + ' 个会话' + (failures.length > 0 ? '，' + failures.length + ' 个失败' : '') : '',
      error: failures.length > 0 ? failures[0] : '',
      ids: unique,
    };
    this.publish();
    Promise.resolve(this.sessions.refresh?.()).catch(() => {});
    return failures.length === 0;
  }

  async unarchiveSessions(ids) {
    const unique = [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && id !== ''))];
    if (unique.length === 0) return false;
    if (typeof this.workspaces?.unarchiveSession !== 'function') {
      this.ui.bulk = { status: 'error', action: 'restore', message: '', error: '当前 DSH 部署没有提供会话恢复接口。', ids: unique };
      this.publish();
      return false;
    }
    this.ui.bulk = { status: 'busy', action: 'restore', message: '正在恢复 ' + unique.length + ' 个会话…', error: '', ids: unique };
    this.publishSoon();
    let done = 0;
    const failures = [];
    for (const id of unique) {
      try {
        await this.workspaces.unarchiveSession(id);
        done += 1;
      } catch (error) {
        failures.push((error instanceof Error ? error.message : String(error)));
      }
    }
    this.syncWorkspaces();
    this.ui.bulk = {
      status: failures.length === 0 ? 'done' : done > 0 ? 'partial' : 'error',
      action: 'restore',
      message: done > 0 ? '已恢复 ' + done + ' 个会话' + (failures.length > 0 ? '，' + failures.length + ' 个失败' : '') : '',
      error: failures.length > 0 ? failures[0] : '',
      ids: unique,
    };
    this.publish();
    Promise.resolve(this.sessions.refresh?.()).catch(() => {});
    return failures.length === 0;
  }

  persistActivity() {
    this.activityLastPersist = Date.now();
    this.activityDirty = false;
    const cutoff = Date.now() - 400 * 24 * 60 * 60 * 1000;
    const days = {};
    for (const [key, bucket] of Object.entries(this.activity.days)) {
      const time = new Date(key + 'T00:00:00').getTime();
      if (!Number.isFinite(time) || time < cutoff) continue;
      if (!isRecord(bucket) || !isRecord(bucket.sessions)) continue;
      days[key] = bucket;
    }
    this.activity.days = days;
    const turnEntries = Object.entries(this.activity.turns);
    if (turnEntries.length > 6000) {
      this.activity.turns = Object.fromEntries(turnEntries.slice(-6000));
    }
    writeStoredJson(globalThis.localStorage, STORAGE_KEYS.activity, this.activity);
  }

  recordActivity(entries) {
    if (!Array.isArray(entries) || entries.length === 0) return;
    const now = Date.now();
    const touchedDays = new Set();
    let changed = false;
    let completed = false;
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string' || !Array.isArray(entry.turns)) continue;
      for (const turn of entry.turns) {
        const startedAt = Number(turn && turn.startedAt) || 0;
        if (startedAt <= 0) continue;
        const index = Number(turn.index) || 0;
        const key = entry.id + ':' + index + ':' + startedAt;
        const previous = this.activity.turns[key];
        const tokens = Math.max(0, Number(turn.tokens) || 0);
        const durationMs = Math.max(0, Number(turn.durationMs) || 0);
        const ended = Number(turn.endedAt) > 0;
        const state = previous || {
          day: localDayKey(startedAt), sessionId: entry.id, title: entry.title || entry.id,
          startedAt, tokens: 0, durationMs: 0, calls: 0, models: {}, modelTokens: {}, ended: false,
        };
        if (!isRecord(state.models)) state.models = {};
        if (!isRecord(state.modelTokens)) state.modelTokens = {};
        const modelCalls = normalizeModelCalls(turn.models);
        const declaredCalls = Math.max(0, Number(turn.calls) || 0);
        if (declaredCalls > sumModelCalls(modelCalls)) {
          modelCalls['未标注模型'] = (Number(modelCalls['未标注模型']) || 0) + declaredCalls - sumModelCalls(modelCalls);
        }
        const modelDelta = {};
        let modelDeltaCalls = 0;
        for (const [model, count] of Object.entries(modelCalls)) {
          const previousCount = Math.max(0, Number(state.models[model]) || 0);
          if (count > previousCount) {
            modelDelta[model] = count - previousCount;
            modelDeltaCalls += count - previousCount;
          }
          state.models[model] = Math.max(previousCount, count);
        }
        const previousCalls = Math.max(0, Number(state.calls) || 0);
        const totalCalls = Math.max(previousCalls, declaredCalls, sumModelCalls(modelCalls));
        const callsDelta = Math.max(0, totalCalls - previousCalls);
        if (callsDelta > modelDeltaCalls) {
          const missing = callsDelta - modelDeltaCalls;
          modelDelta['未标注模型'] = (Number(modelDelta['未标注模型']) || 0) + missing;
        }
        state.calls = totalCalls;
        const modelTokens = normalizeModelTokens(turn.modelTokens);
        const modelTokenDelta = {};
        let modelTokenDeltaTotal = 0;
        for (const [model, count] of Object.entries(modelTokens)) {
          const previousCount = Math.max(0, Number(state.modelTokens[model]) || 0);
          if (count > previousCount) {
            modelTokenDelta[model] = count - previousCount;
            modelTokenDeltaTotal += count - previousCount;
          }
          state.modelTokens[model] = Math.max(previousCount, count);
        }
        const deltaTokens = Math.max(0, tokens - (Number(state.tokens) || 0));
        const deltaDuration = Math.max(0, durationMs - (Number(state.durationMs) || 0));
        const firstSeen = previous === undefined;
        if (!firstSeen && deltaTokens === 0 && deltaDuration === 0 && callsDelta === 0 && modelTokenDeltaTotal === 0 && Object.keys(modelDelta).length === 0 && state.ended === ended) continue;
        state.startedAt = startedAt;
        state.tokens = Math.max(Number(state.tokens) || 0, tokens);
        state.durationMs = Math.max(Number(state.durationMs) || 0, durationMs);
        state.ended = state.ended === true || ended;
        state.title = entry.title || state.title || entry.id;
        this.activity.turns[key] = state;

        const hour = localHourKey(startedAt);
        const bucket = ensureActivityDay(this.activity, state.day);
        const hourBucket = ensureActivityHour(bucket, hour);
        const session = ensureActivitySession(bucket, entry.id, state.title);
        const hourSession = ensureActivitySession(hourBucket, entry.id, state.title);
        const sessionHour = ensureActivityCounter(session.hours[hour]);
        session.hours[hour] = sessionHour;
        const delta = {
          tokens: deltaTokens,
          durationMs: deltaDuration,
          turns: firstSeen ? 1 : 0,
          calls: callsDelta,
          models: modelDelta,
          modelTokens: modelTokenDelta,
        };
        addActivityCounter(bucket, delta);
        addActivityCounter(session, delta);
        addActivityCounter(hourBucket, delta);
        addActivityCounter(hourSession, delta);
        addActivityCounter(sessionHour, delta);
        touchedDays.add(state.day);
        changed = true;
        if (ended) completed = true;
      }
    }
    if (!changed) return;
    this.rebuildActivitySpans(touchedDays);
    this.activityDirty = true;
    if (completed || now - this.activityLastPersist >= 15000) this.persistActivity();
  }

  /**
   * Re-derive the wall-clock spans of changed days from the turn ledger. Turns
   * of one session never overlap, so merging them answers "how long was
   * something actually running": two sessions 13:00–15:00 and 14:00–16:00
   * cover three hours, not four.
   */
  rebuildActivitySpans(days) {
    const wanted = new Set();
    for (const day of days || []) if (typeof day === 'string' && day !== '') wanted.add(day);
    if (wanted.size === 0) return;
    const byDay = new Map();
    for (const day of wanted) byDay.set(day, new Map());
    for (const state of Object.values(this.activity.turns)) {
      if (!isRecord(state)) continue;
      const sessions = byDay.get(state.day);
      if (sessions === undefined) continue;
      const start = Math.max(0, Number(state.startedAt) || 0);
      const length = Math.max(0, Number(state.durationMs) || 0);
      if (start <= 0 || length <= 0) continue;
      const id = String(state.sessionId || '');
      const list = sessions.get(id) || [];
      list.push([start, start + length]);
      sessions.set(id, list);
    }
    for (const [day, sessions] of byDay) {
      const bucket = this.activity.days[day];
      if (!isRecord(bucket)) continue;
      const bounds = activityDayBounds(day);
      const all = [];
      for (const list of sessions.values()) for (const span of list) all.push(span);
      bucket.spans = mergeSpans(all, bounds.start, bounds.end);
      if (!isRecord(bucket.sessions)) continue;
      for (const [id, session] of Object.entries(bucket.sessions)) {
        if (!isRecord(session)) continue;
        const list = sessions.get(id) || [];
        session.spans = list.length === 0 ? [] : mergeSpans(list, bounds.start, bounds.end);
      }
    }
  }

  removeActivityFor(ids) {
    const removed = new Set(Array.isArray(ids) ? ids : []);
    if (removed.size === 0) return;
    const affectedDays = new Set();
    for (const [key, bucket] of Object.entries(this.activity.days)) {
      if (!isRecord(bucket) || !isRecord(bucket.sessions)) continue;
      if (!isRecord(bucket.hours)) bucket.hours = {};
      for (const id of removed) {
        const session = bucket.sessions[id];
        if (!isRecord(session)) continue;
        affectedDays.add(key);
        subtractActivityCounter(bucket, session);
        for (const [hourKey, hourData] of Object.entries(isRecord(session.hours) ? session.hours : {})) {
          const hour = bucket.hours[hourKey];
          if (!isRecord(hour)) continue;
          subtractActivityCounter(hour, hourData);
          if (isRecord(hour.sessions)) delete hour.sessions[id];
          if (hour.tokens === 0 && hour.durationMs === 0 && hour.turns === 0 && hour.calls === 0 && Object.keys(hour.modelTokens || {}).length === 0 && Object.keys(hour.sessions || {}).length === 0) delete bucket.hours[hourKey];
        }
        delete bucket.sessions[id];
      }
      if (bucket.tokens === 0 && bucket.durationMs === 0 && bucket.turns === 0 && bucket.calls === 0 && Object.keys(bucket.modelTokens || {}).length === 0 && Object.keys(bucket.sessions).length === 0) delete this.activity.days[key];
    }
    for (const [key, state] of Object.entries(this.activity.turns)) {
      if (removed.has(state.sessionId)) delete this.activity.turns[key];
    }
    this.rebuildActivitySpans(affectedDays);
    this.persistActivity();
  }

  queueHistory(id) {
    if (this.disposed || typeof id !== 'string' || id === '') return;
    if (this.historyLoaded.has(id) || this.historyLoading.has(id) || this.historyQueue.includes(id)) return;
    this.historyQueue.push(id);
    this.pumpHistory();
  }

  pumpHistory() {
    if (this.disposed) return;
    while (this.historyActive < 3 && this.historyQueue.length > 0) {
      const id = this.historyQueue.shift();
      if (this.historyLoaded.has(id) || this.historyLoading.has(id)) continue;
      this.historyActive += 1;
      Promise.resolve(this.loadHistory(id)).finally(() => {
        this.historyActive -= 1;
        this.pumpHistory();
      });
    }
  }

  async loadHistory(id) {
    if (this.disposed || this.historyLoaded.has(id)) return;
    const row = this.rows.get(id);
    if (row === undefined) return;
    const telemetry = this.ensureTelemetry(row);
    const job = (async () => {
      try {
        const result = await this.remote.session.events({
          address: this.addressFor(id),
          maxMessages: 180,
        }, this.lifetime.signal);
        if (result?.ok) {
          reduceEvents(telemetry, result.value?.records || []);
          this.lastSyncAt = Date.now();
        }
      } catch (error) {
        if (!this.lifetime.signal.aborted) telemetry.error = telemetry.error || (error instanceof Error ? error.message : String(error));
      } finally {
        this.historyLoading.delete(id);
        this.historyLoaded.add(id);
        this.publishSoon();
      }
    })();
    this.historyLoading.set(id, job);
    return job;
  }

  /** Re-read one session's history when the panel came up empty. */
  reloadHistory(id) {
    if (this.disposed) return;
    const key = typeof id === 'string' ? id : '';
    if (key === '') return;
    this.historyLoaded.delete(key);
    this.historyLoading.delete(key);
    this.queueHistory(key);
    this.publishSoon();
  }

  ensureActivityHistory() {
    const now = Date.now();
    if (now - this.activityScanAt < 60000) return;
    this.activityScanAt = now;
    const rows = [...this.rows.values()]
      .filter(row => row.blank !== true)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 80);
    for (const row of rows) {
      if (this.watches.has(row.id)) continue;
      if (!this.historyLoaded.has(row.id)) this.queueHistory(row.id);
    }
  }

  async deleteArchivedSessions(ids) {
    const unique = [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && id !== ''))];
    if (unique.length === 0) return false;
    const archived = new Set(this.workspaceArchived);
    const targets = unique.filter(id => archived.has(id));
    if (targets.length === 0) {
      this.ui.bulk = { status: 'error', action: 'delete', message: '', error: '只能删除已归档的会话。', ids: unique };
      this.publish();
      return false;
    }
    if (typeof globalThis.fetch !== 'function') {
      this.ui.bulk = { status: 'error', action: 'delete', message: '', error: '当前环境没有可用的网络接口。', ids: targets };
      this.publish();
      return false;
    }
    this.ui.bulk = { status: 'busy', action: 'delete', message: '正在永久删除 ' + targets.length + ' 个归档会话…', error: '', ids: targets };
    this.publishSoon();
    try {
      const { deleted, failed } = await this.requestDelete(targets);
      for (const id of deleted) {
        this.workspaceArchived.delete(id);
        this.pins.delete(id);
        delete this.unread[id];
        this.stopWatch(id);
        this.telemetry.delete(id);
        this.metaAt.delete(id);
        this.metaInFlight.delete(id);
        if (this.ui.selectedId === id) this.ui.selectedId = null;
      }
      this.persistPins();
      this.persistUnread();
      this.removeActivityFor(deleted);
      this.syncWorkspaces();
      await Promise.resolve(this.sessions.refresh?.()).catch(() => {});
      const failureText = failed.length > 0 ? failed.map(item => item && item.error ? item.error : '未知错误').slice(0, 2).join('；') : '';
      this.ui.bulk = {
        status: failed.length === 0 ? 'done' : deleted.length > 0 ? 'partial' : 'error',
        action: 'delete',
        message: deleted.length > 0 ? '已永久删除 ' + deleted.length + ' 个归档会话' + (failed.length > 0 ? '，' + failed.length + ' 个失败' : '') : '',
        error: failureText,
        ids: deleted,
      };
      this.publish();
      return failed.length === 0 && deleted.length === targets.length;
    } catch (error) {
      this.ui.bulk = {
        status: 'error', action: 'delete', message: '', ids: targets,
        error: error instanceof Error ? error.message : String(error),
      };
      this.publish();
      return false;
    }
  }

  clearBulk() {
    this.ui.bulk = { status: 'idle', action: null, message: '', error: '', ids: [] };
    this.publish();
  }

  /** The user-chosen safety window in milliseconds, clamped to the supported range. */
  stallAfterMs() {
    return normalizeStallMinutes(this.prefs.stallMinutes) * 60000;
  }

  setPref(key, value) {
    if (!Object.hasOwn(DEFAULT_PREFS, key)) return;
    if (key === 'defaultRange' && !['today', '7d', '30d', 'all'].includes(String(value))) return;
    if (key === 'cardTexture' && !CARD_TEXTURE_VALUES.has(String(value))) return;
    if (key === 'treeEntry' && !TREE_ENTRY_VALUES.has(String(value))) return;
    if (Object.hasOwn(QUICK_NAV_DEFAULTS, key)) value = normalizeQuickNavPref(key, value);
    if (key === 'stallMinutes') value = normalizeStallMinutes(value);
    if (key === 'activityRange') value = normalizeActivityRange(value);
    if (key === 'activityScope') value = normalizeActivityScope(value);
    if (key === 'quickBarPos' || key === 'railPos' || key === 'treeFabPos' || key === 'quickNavIconPos') {
      const pos = isRecord(value) ? value : null;
      value = pos && Number.isFinite(Number(pos.x)) && Number.isFinite(Number(pos.y))
        ? { x: Math.round(Number(pos.x)), y: Math.round(Number(pos.y)) }
        : null;
    }
    this.prefs = { ...this.prefs, [key]: value };
    if (key === 'defaultRange') {
      const range = String(value);
      this.ui.filters = { ...this.ui.filters, range };
      this.ui.usageRange = range;
      this.ui.workspaceRange = range;
    }
    this.persistPrefs();
    this.publish();
  }

  togglePrefs() {
    this.ui.prefsOpen = !this.ui.prefsOpen;
    this.publish();
  }

  async refresh() {
    try {
      await this.sessions.refresh();
      this.error = null;
    } catch (error) {
      this.error = '刷新失败：' + (error instanceof Error ? error.message : String(error));
    }
    for (const id of [...this.watches.keys()]) this.queueMeta(id);
    this.ensureRecentMetadata();
    this.publish();
  }

  openSession(id) {
    this.markRead(id);
    this.ui.open = false;
    this.publish();
    try {
      this.ctx.uiWorkspace.openSession(id);
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.publish();
    }
  }

  startSession() {
    this.ui.open = false;
    this.publish();
    try { this.ctx.uiWorkspace.startSession?.(); } catch { /* the current host may not expose creation */ }
  }

  openOverview() {
    this.ui.open = false;
    this.publish();
    try { this.ctx.layout.selectPanel('session-manager'); } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.publish();
    }
  }

  /** Whether the host exposes the fork primitive at all. */
  canFork() {
    return this.sessions !== undefined && this.sessions !== null && typeof this.sessions.fork === 'function';
  }

  /**
   * Fork the session at the end of one round. The host slices the log at that
   * exact event seq, closes the inherited tail with synthetic closers, names the
   * child after the source and returns its id; the new branch is then selected
   * here so the panel shows where it landed.
   */
  async forkFromTurn(sessionId, atSeq, turnIndex) {
    const seq = Number(atSeq) || 0;
    const id = String(sessionId || '');
    if (id === '' || !this.canFork()) {
      this.ui.fork = { status: 'error', sessionId: id, atSeq: seq, childId: '', error: '当前宿主没有提供分叉能力' };
      this.publish();
      return null;
    }
    if (!(seq > 0)) {
      this.ui.fork = { status: 'error', sessionId: id, atSeq: 0, childId: '', error: '这一轮还没有可用的日志位置，等它结束后再分叉' };
      this.publish();
      return null;
    }
    if (this.forkBusy === true) return null;
    this.forkBusy = true;
    this.ui.fork = { status: 'running', sessionId: id, atSeq: seq, childId: '', error: '', turn: Number(turnIndex) || 0 };
    this.publish();
    try {
      const childId = await this.sessions.fork({ sessionId: id, atSeq: seq, increaseTitle: true });
      const child = String(childId || '');
      // DSH records no source for an ordinary fork, so the round it was cut from
      // only survives if it is kept here; that is what the tree hangs it on.
      this.noteBranch(child, id, seq, Number(turnIndex) || 0);
      this.ui.fork = { status: 'done', sessionId: id, atSeq: seq, childId: child, error: '', turn: Number(turnIndex) || 0 };
      // Stay on the source session: the new branch shows up in its tree, and the
      // notice offers the jump, so the reader keeps the context they forked from.
      await this.refresh();
      return child;
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const unavailable = error instanceof Error && error.name === 'SessionForkError' && error.rpcError && error.rpcError.code === 'session/fork-unavailable';
      this.ui.fork = {
        status: 'error',
        sessionId: id,
        atSeq: seq,
        childId: '',
        error: unavailable ? '这一轮还不能分叉（宿主没有可继承的对话前缀）' : '分叉失败：' + raw,
        turn: Number(turnIndex) || 0,
      };
      return null;
    } finally {
      this.forkBusy = false;
      this.publish();
    }
  }

  clearForkNotice() {
    this.ui.fork = { status: 'idle', sessionId: '', atSeq: 0, childId: '', error: '' };
    this.publish();
  }

  // ---- conversation tree -------------------------------------------------
  // One right-Sidebar surface per session: every round of the session on
  // screen, the branch each fork was cut from, and the actions that create or
  // remove a branch. Forks are cut with the same host primitive the radar's own
  // round action uses; what is added here is the tree that makes them visible
  // and navigable from inside the conversation itself.

  /** The on-screen session the tree should speak for. */
  treeFocusedSession() {
    const sidebar = this.treeSidebar();
    const mounted = sidebar && sidebar.mounted !== undefined ? sidebar.mounted.getSnapshot?.() : undefined;
    if (typeof mounted === 'string' && mounted !== '') return mounted;
    const main = this.currentMainId();
    return typeof main === 'string' ? main : '';
  }

  treeSidebar() {
    return typeof this.ctx.get === 'function' ? this.ctx.get('sidebarRight') : undefined;
  }

  /** The tree tab open in one session, if any. */
  treeTab(sessionId) {
    const sidebar = this.treeSidebar();
    if (sidebar === undefined || typeof sidebar.tabsIn !== 'function') return undefined;
    let tabs = [];
    try { tabs = sidebar.tabsIn(sessionId) || []; } catch { tabs = []; }
    return tabs.find(tab => tab !== undefined && tab !== null && tab.kind === TREE_TAB_KIND);
  }

  /** Whether this session is showing the tree right now. */
  treePanelOpen(sessionId) {
    const sidebar = this.treeSidebar();
    if (sidebar === undefined) return false;
    const tab = this.treeTab(sessionId);
    if (tab === undefined) return false;
    if (typeof sidebar.isExpanded === 'function' && sidebar.isExpanded() !== true) return false;
    const active = typeof sidebar.active === 'function' ? sidebar.active() : undefined;
    return active === undefined || active.id === tab.id;
  }

  /**
   * Open the tree in a session, or hide it when it is already in front. The tab
   * type is registered by the browser half; a host without the right Sidebar
   * simply reports that nothing happened.
   */
  toggleTreeSidebar(sessionId) {
    const id = typeof sessionId === 'string' && sessionId !== '' ? sessionId : this.treeFocusedSession();
    const sidebar = this.treeSidebar();
    if (sidebar === undefined) {
      // Without the right Sidebar there is no seat for the panel; say so where
      // the radar can be read instead of failing silently.
      this.error = '当前宿主没有右侧栏服务，会话树面板打不开';
      this.setTreeNotice('error', this.error);
      return false;
    }
    if (id === '') {
      this.setTreeNotice('error', '还没有选中的会话，先打开一个会话再开会话树');
      return false;
    }
    try {
      const tab = this.treeTab(id);
      if (tab !== undefined) {
        if (this.treePanelOpen(id)) { sidebar.hide(tab.id); return false; }
        sidebar.focus(tab.id);
        if (typeof sidebar.isExpanded === 'function' && sidebar.isExpanded() !== true) sidebar.toggleExpanded();
        return true;
      }
      sidebar.openTabIn(id, TREE_TAB_KIND);
      return true;
    } catch (error) {
      this.error = '打开会话树失败：' + (error instanceof Error ? error.message : String(error));
      this.publish();
      return false;
    }
  }

  /**
   * Follow a branch: switch the app to that session and put the tree in front
   * there too, so walking the tree does not keep costing a second click. The
   * new session's tab layout is adopted once it is on screen, so the open is
   * retried briefly instead of racing that adoption.
   */
  openTreeIn(sessionId) {
    const target = typeof sessionId === 'string' ? sessionId : '';
    if (target === '') return false;
    const sidebar = this.treeSidebar();
    this.openSession(target);
    if (sidebar === undefined) return false;
    let tries = 0;
    const attempt = () => {
      if (this.disposed || tries >= 8) return;
      tries += 1;
      try {
        const tab = this.treeTab(target);
        if (tab !== undefined) {
          sidebar.focus(tab.id);
          if (typeof sidebar.isExpanded === 'function' && sidebar.isExpanded() !== true) sidebar.toggleExpanded();
          return;
        }
        if (this.treeFocusedSession() === target) sidebar.openTabIn(target, TREE_TAB_KIND);
      } catch { /* adoption may still be in flight */ }
      setTimeout(attempt, 180);
    };
    setTimeout(attempt, 120);
    return true;
  }

  /** Remember which session and round a branch was cut from. */
  noteBranch(childId, parentId, atSeq, turnIndex) {
    const child = typeof childId === 'string' ? childId : '';
    const parent = typeof parentId === 'string' ? parentId : '';
    if (child === '' || parent === '' || child === parent) return;
    const parentEntry = this.telemetry.get(parent);
    this.branches[child] = {
      parentId: parent,
      atSeq: Math.max(0, Number(atSeq) || 0),
      turnIndex: Math.max(0, Number(turnIndex) || 0),
      at: Date.now(),
      title: parentEntry !== undefined && typeof parentEntry.title === 'string' ? parentEntry.title.slice(0, 200) : '',
    };
    this.persistBranches();
    this.publishSoon();
  }

  persistBranches() {
    writeStoredJson(globalThis.localStorage, STORAGE_KEYS.branches, this.branches);
  }

  /** Drop records whose sessions the catalog no longer lists, once they are stale. */
  pruneBranches() {
    const live = new Set(this.rows.keys());
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let changed = false;
    for (const [childId, record] of Object.entries(this.branches)) {
      if (live.has(childId)) continue;
      if (live.has(record.parentId)) continue;
      if ((Number(record.at) || 0) >= cutoff) continue;
      delete this.branches[childId];
      changed = true;
    }
    if (changed) this.persistBranches();
  }

  forgetBranches(ids) {
    let changed = false;
    for (const id of Array.isArray(ids) ? ids : []) {
      if (Object.hasOwn(this.branches, id)) { delete this.branches[id]; changed = true; }
    }
    if (changed) this.persistBranches();
  }

  setTreeNotice(kind, text) {
    this.treeNotice = kind === null ? null : { kind, text: String(text || ''), at: Date.now() };
    this.publish();
  }

  clearTreeNotice() {
    if (this.treeNotice === null) return;
    this.treeNotice = null;
    this.publish();
  }

  /** Rounds read for the tree, one entry per session, status included. */
  treeRoundsFor(id) {
    return this.treeRounds.get(id) || null;
  }

  /**
   * Make sure the tree has this session's rounds. A ready read is reused unless
   * `force` asks for a fresh one; concurrent asks share one read.
   */
  ensureRounds(id, options = {}) {
    if (this.disposed || typeof id !== 'string' || id === '') return null;
    const existing = this.treeRounds.get(id);
    if (existing !== undefined && existing.status === 'ready' && options.force !== true) return existing;
    const inFlight = this.treeLoading.get(id);
    if (inFlight !== undefined) return inFlight;
    this.treeRounds.set(id, {
      status: 'loading',
      turns: existing !== undefined && Array.isArray(existing.turns) ? existing.turns : [],
      error: '',
      telemetry: existing !== undefined ? existing.telemetry || null : null,
      at: Date.now(),
    });
    this.publishSoon();
    const job = this.readRounds(id).catch(error => {
      const failed = {
        status: 'error',
        turns: [],
        error: error instanceof Error ? error.message : String(error),
        telemetry: null,
        at: Date.now(),
      };
      this.treeRounds.set(id, failed);
      return failed;
    }).then(result => {
      this.treeLoading.delete(id);
      this.publishSoon();
      return result;
    });
    this.treeLoading.set(id, job);
    return job;
  }

  /**
   * Read one session's rounds from the oldest page forward.
   *
   * Session history is paged backwards from the newest message, so a single
   * request only ever carries the tail of a long session. The tree needs every
   * round the user might branch from, so it walks the pages until the log runs
   * out, then reduces the merged log in one pass into a telemetry of
   * its own — the live telemetry of a watched session only accepts increasing
   * seqs and could never take an older page.
   */
  async readRounds(id) {
    const row = this.rows.get(id);
    if (row === undefined) throw new Error('这个会话不在当前列表里');
    const records = [];
    let beforeSeq;
    while (!this.disposed) {
      const request = { address: this.addressFor(id), maxMessages: ROUND_PAGE_SIZE };
      if (beforeSeq !== undefined) request.beforeSeq = beforeSeq;
      const result = await this.remote.session.events(request, this.lifetime.signal);
      if (result?.ok !== true) throw new Error(result?.error?.message || '读取轮次失败');
      const pageRecords = Array.isArray(result.value?.records) ? result.value.records : [];
      records.push(...pageRecords);
      let oldest = 0;
      for (const record of pageRecords) {
        const event = isRecord(record) && isRecord(record.event) ? record.event : record;
        const seq = isRecord(event) ? Number(event.seq) : NaN;
        if (Number.isFinite(seq) && (oldest === 0 || seq < oldest)) oldest = seq;
      }
      if (result.value?.hasMore !== true || pageRecords.length === 0 || !(oldest > 0)) break;
      if (beforeSeq !== undefined && oldest >= beforeSeq) throw new Error('历史分页没有前进，请重新读取');
      beforeSeq = oldest;
    }
    if (this.disposed) throw new Error('插件已卸载');
    const seqOf = record => {
      const event = isRecord(record) && isRecord(record.event) ? record.event : record;
      const seq = isRecord(event) ? Number(event.seq) : NaN;
      return Number.isFinite(seq) ? seq : 0;
    };
    records.sort((left, right) => seqOf(left) - seqOf(right));
    const telemetry = createTelemetry(row);
    telemetry.fullHistory = true;
    reduceEvents(telemetry, records);
    const view = {
      status: 'ready',
      turns: buildTurnViews(telemetry, Date.now()),
      error: '',
      telemetry,
      at: Date.now(),
      truncated: false,
    };
    this.treeRounds.set(id, view);
    return view;
  }

  /**
   * Cheap tail refresh for a session that is still running: the newest page is
   * merged into the rounds already read instead of re-reading the whole log.
   */
  async refreshRounds(id) {
    if (this.disposed) return null;
    const cached = this.treeRounds.get(id);
    if (cached === undefined || cached.status !== 'ready' || cached.telemetry === null || cached.telemetry === undefined) {
      return this.ensureRounds(id, { force: true });
    }
    try {
      const result = await this.remote.session.events({ address: this.addressFor(id), maxMessages: 200 }, this.lifetime.signal);
      if (result?.ok !== true || result.value === undefined) return cached;
      const records = Array.isArray(result.value.records) ? result.value.records.slice() : [];
      const seqOf = record => {
        const event = isRecord(record) && isRecord(record.event) ? record.event : record;
        const seq = isRecord(event) ? Number(event.seq) : NaN;
        return Number.isFinite(seq) ? seq : 0;
      };
      records.sort((left, right) => seqOf(left) - seqOf(right));
      // A busy session can add more than one tail page between refreshes.
      // Re-read the complete log if this page no longer reaches the last read.
      if (result.value.hasMore === true && records.length > 0 && seqOf(records[0]) > cached.telemetry.lastSeq) {
        return this.ensureRounds(id, { force: true });
      }
      cached.telemetry.running = this.rows.get(id)?.running === true;
      reduceEvents(cached.telemetry, records);
      const next = {
        status: 'ready',
        turns: buildTurnViews(cached.telemetry, Date.now()),
        error: '',
        telemetry: cached.telemetry,
        at: Date.now(),
        truncated: cached.truncated === true,
      };
      this.treeRounds.set(id, next);
      this.publishSoon();
      return next;
    } catch {
      return cached;
    }
  }

  /**
   * Delete one branch and everything under it.
   *
   * DSH's persistence seam has no delete of its own, so a branch is archived
   * first (which also stops whatever is still running in it) and then removed
   * through the maintenance route the host half exposes. The session the app is
   * sitting on is left before its log goes away, and the root is never a target.
   */
  async deleteBranch(id) {
    const target = typeof id === 'string' ? id : '';
    if (target === '' || this.treeBusy) return false;
    const snapshot = this.getSnapshot();
    const entries = snapshot.entries.concat(snapshot.archivedEntries || []);
    const forest = branchForest(entries, this.branches, target);
    const node = branchFindNode(forest.root, target);
    if (node === null) {
      this.setTreeNotice('error', '这一支已经不在会话列表里了');
      return false;
    }
    if (node.kind === 'root') {
      this.setTreeNotice('error', '根会话不能从这里删除：只能删它下面的分支');
      return false;
    }
    const ids = branchSubtreeIds(node);
    const size = branchSubtreeSize(node, key => {
      const rounds = this.treeRounds.get(key);
      return rounds !== undefined && Array.isArray(rounds.turns) ? rounds.turns : null;
    });
    if (size.running > 0) {
      this.setTreeNotice('error', '这一支里还有正在运行的会话，先停掉它再删除');
      return false;
    }
    this.treeBusy = true;
    this.setTreeNotice('busy', '正在删除 ' + ids.length + ' 个会话…');
    try {
      const current = this.currentMainId();
      if (typeof current === 'string' && ids.includes(current)) {
        const parent = node.record !== null && typeof node.record.parentId === 'string' ? node.record.parentId : forest.rootId;
        if (parent !== '' && !ids.includes(parent)) this.openSession(parent);
      }
      for (const key of ids) {
        try { await this.workspaces.archiveSession(key, { stopActivity: true }); } catch { /* already archived, or gone */ }
      }
      this.syncWorkspaces();
      const result = await this.requestDelete(ids);
      for (const key of result.deleted) {
        this.stopWatch(key);
        this.telemetry.delete(key);
        this.metaAt.delete(key);
        this.metaInFlight.delete(key);
        this.treeRounds.delete(key);
        this.treeLoading.delete(key);
        this.pins.delete(key);
        delete this.unread[key];
        if (this.ui.selectedId === key) this.ui.selectedId = null;
      }
      this.forgetBranches(result.deleted);
      this.persistPins();
      this.persistUnread();
      this.removeActivityFor(result.deleted);
      this.syncWorkspaces();
      await Promise.resolve(this.sessions.refresh?.()).catch(() => {});
      this.treeBusy = false;
      if (result.failed.length > 0 && result.deleted.length === 0) {
        const first = result.failed[0];
        this.setTreeNotice('error', first && first.error ? String(first.error) : '删除失败');
        return false;
      }
      this.setTreeNotice('done', '已删除 ' + result.deleted.length + ' 个会话' + (result.failed.length > 0 ? '，' + result.failed.length + ' 个失败' : ''));
      return result.failed.length === 0;
    } catch (error) {
      this.treeBusy = false;
      this.setTreeNotice('error', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** Ask the host half to remove archived session logs for good. */
  async requestDelete(ids) {
    if (typeof globalThis.fetch !== 'function') throw new Error('当前环境没有可用的网络接口');
    const targets = (Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && id !== '');
    if (targets.length === 0) return { deleted: [], failed: [] };
    const response = await globalThis.fetch('/api/session-manager.delete', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: targets }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload && typeof payload.error === 'string' ? payload.error : '删除失败（HTTP ' + response.status + '）');
    return {
      deleted: Array.isArray(payload.deleted) ? payload.deleted.filter(id => typeof id === 'string') : [],
      failed: Array.isArray(payload.failed) ? payload.failed : [],
    };
  }

  async rename(id, title) {
    const clean = String(title || '').trim();
    if (clean === '') throw new Error('名称不能为空');
    const result = await this.remote.session.rename({ sessionId: id, title: clean });
    if (!result?.ok) throw new Error(result?.error?.message || '重命名失败');
    const telemetry = this.telemetry.get(id);
    if (telemetry) telemetry.title = result.value?.title || clean;
    this.publish();
  }

  async stop(id) {
    const result = await this.remote.session.cancel({ sessionId: id });
    if (!result?.ok) throw new Error(result?.error?.message || '停止失败');
    const telemetry = this.telemetry.get(id);
    if (telemetry) telemetry.phase = 'thinking';
    this.publish();
  }

  previewFile(sessionId, item) {
    this.openSession(sessionId);
    const sidebar = this.ctx.get?.('sidebarRight');
    if (sidebar?.openResourceIn === undefined || !item?.path) return;
    const address = fileAddress(sessionId, item.path);
    setTimeout(() => {
      try { sidebar.openResourceIn(sessionId, address); } catch { /* the sidebar may be disabled */ }
    }, 180);
  }

  async searchContent() {
    const query = String(this.ui.query || '').trim();
    if (query === '') {
      this.ui.searchStatus = 'idle';
      this.ui.searchResults = [];
      this.publish();
      return;
    }
    if (typeof this.sessions.search !== 'function') {
      this.ui.searchStatus = 'error';
      this.error = '当前 DSH 部署没有挂载会话内容搜索。';
      this.publish();
      return;
    }
    this.searchAbort?.abort();
    const gate = new AbortController();
    this.searchAbort = gate;
    const token = ++this.searchToken;
    this.ui.searchStatus = 'loading';
    this.ui.searchQuery = query;
    this.ui.searchResults = [];
    this.publish();
    try {
      const result = await this.sessions.search(query, gate.signal);
      if (token !== this.searchToken) return;
      if (!result?.ok) throw new Error(result?.error?.message || '搜索失败');
      const items = Array.isArray(result.value?.items) ? result.value.items : [];
      this.ui.searchResults = items.map(item => {
        const sessionId = item.sessionId || item.id;
        const row = this.rows.get(sessionId);
        return {
          sessionId,
          snippet: String(item.snippet || ''),
          title: row?.title || row?.displayTitle || sessionId,
          workspace: this.workspaceFor(row),
        };
      });
      this.ui.searchHasMore = result.value?.hasMore === true;
      this.ui.searchStatus = 'ready';
    } catch (error) {
      if (token !== this.searchToken) return;
      this.ui.searchStatus = 'error';
      this.ui.searchResults = [];
      this.error = '内容搜索失败：' + (error instanceof Error ? error.message : String(error));
    }
    this.publish();
  }

  buildSnapshot() {
    const now = Date.now();
    const allEntries = [];
    const entries = [];
    for (const row of this.rows.values()) {
      if (row.blank === true) continue;
      const telemetry = this.telemetry.get(row.id);
      if (telemetry === undefined) continue;
      const entry = deriveEntry(row, telemetry, { now, workspace: this.workspaceFor(row), stallAfterMs: this.stallAfterMs() });
      entry.workspaceId = this.workspaceKeyFor(row);
      entry.pinned = this.pins.has(row.id);
      entry.unread = telemetry.unread === true;
      entry.archived = this.workspaceArchived.has(row.id);
      allEntries.push(entry);
      if (entry.archived === true) continue;
      if (row.origin === 'subagent' && !this.prefs.includeSubagents && entry.status !== 'running' && entry.status !== 'tool') continue;
      entries.push(entry);
    }
    allEntries.sort((a, b) => b.updatedAt - a.updatedAt);
    entries.sort((a, b) => b.updatedAt - a.updatedAt);
    const byId = new Map(allEntries.map(entry => [entry.id, entry]));
    const liveStatus = entry => entry.status === 'running' || entry.status === 'tool' || entry.status === 'approval' || entry.status === 'question';
    let workspaceGroups = this.workspaceItems.map(item => {
      const sessionIds = Array.isArray(item.sessionIds) ? item.sessionIds.slice() : [];
      const sessions = sessionIds.map(id => byId.get(id)).filter(entry => entry !== undefined && entry.archived !== true);
      return {
        id: item.workspaceId,
        title: item.title || basename(item.path) || '未命名工作区',
        path: item.path || '',
        sessionIds,
        sessions: sessions.sort((a, b) => b.updatedAt - a.updatedAt),
        count: sessions.length,
        activeCount: sessions.filter(liveStatus).length,
        archivedCount: sessionIds.filter(id => this.workspaceArchived.has(id)).length,
        updatedAt: sessions.reduce((latest, entry) => Math.max(latest, entry.updatedAt || 0), 0),
        pinned: this.workspacePins.has(item.workspaceId),
      };
    });
    if (workspaceGroups.length === 0) {
      const groups = new Map();
      for (const entry of allEntries) {
        const key = entry.cwd || '未分组';
        if (!groups.has(key)) groups.set(key, {
          id: 'cwd:' + key,
          title: basename(key) || key,
          path: key,
          sessionIds: [],
          sessions: [],
          count: 0,
          activeCount: 0,
          archivedCount: 0,
          updatedAt: 0,
          pinned: this.workspacePins.has('cwd:' + key),
        });
        const group = groups.get(key);
        if (entry.archived !== true) {
          group.sessionIds.push(entry.id);
          group.sessions.push(entry);
          group.count += 1;
          if (liveStatus(entry)) group.activeCount += 1;
          group.updatedAt = Math.max(group.updatedAt, entry.updatedAt || 0);
        }
      }
      workspaceGroups = [...groups.values()];
    }
    workspaceGroups.sort((a, b) => b.activeCount - a.activeCount || b.updatedAt - a.updatedAt || a.title.localeCompare(b.title, 'zh-CN'));
    const archivedEntries = [...this.workspaceArchived].map(id => byId.get(id) || {
      id,
      title: '已归档会话',
      workspace: '已归档',
      cwd: '',
      updatedAt: 0,
      status: 'idle',
      statusLabel: '已归档',
      archived: true,
      pinned: false,
      unread: false,
      tokenTotal: 0,
      contextPercent: null,
      stats: null,
      deliverables: [],
      deliverableCount: 0,
      actions: [],
      todos: null,
      progress: null,
      currentTool: null,
      lastAction: null,
      lastText: '',
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const treeRounds = {};
    for (const [id, rounds] of this.treeRounds) {
      treeRounds[id] = {
        status: rounds.status,
        turns: Array.isArray(rounds.turns) ? rounds.turns : [],
        error: rounds.error || '',
        truncated: rounds.truncated === true,
        at: Number(rounds.at) || 0,
      };
    }
    const counts = computeCounts(entries);
    counts.workspaces = workspaceGroups.length;
    counts.workspacePinned = workspaceGroups.filter(workspace => workspace.pinned === true).length;
    counts.archived = archivedEntries.length;
    this.recordActivity(allEntries);
    return {
      entries,
      workspaces: workspaceGroups,
      archivedEntries,
      counts,
      activity: this.activity.days,
      activityTurns: this.activity.turns,
      ui: { ...this.ui, filters: { ...this.ui.filters }, searchResults: this.ui.searchResults.slice(), bulk: { ...this.ui.bulk } },
      currentId: this.currentMainId() || null,
      prefs: { ...this.prefs },
      fork: { ...this.ui.fork },
      branches: { ...this.branches },
      tree: {
        sessionId: this.ui.tree.sessionId,
        busy: this.treeBusy === true,
        notice: this.treeNotice === null || this.treeNotice === undefined ? null : { ...this.treeNotice },
        rounds: treeRounds,
      },
      detailFull: this.ui.detailFull === true,
      canFork: this.canFork(),
      stallAfterMs: this.stallAfterMs(),
      phase: this.rosterPhase,
      streaming: [...this.watches.values()].some(watch => watch.stream === 'reconnecting') ? 'reconnecting' : [...this.watches.values()].some(watch => watch.stream === 'live') ? 'live' : 'idle',
      error: this.error,
      lastSyncAt: this.lastSyncAt,
      now,
    };
  }
}
