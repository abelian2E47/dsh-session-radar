window.__ModuleLoader__.load({
  id: 'dsh-session-radar',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');
    const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React;
    const h = React.createElement;
    const Fragment = React.Fragment;
    // The left sidebar strip portals into the host workspace column; a host
    // without the react-dom seed simply keeps the strip unrendered.
    let ReactDOM = null;
    try { ReactDOM = require('react-dom'); } catch (error) { ReactDOM = null; }
    const createPortal = ReactDOM && typeof ReactDOM.createPortal === 'function' ? ReactDOM.createPortal : null;

    // ---- core -------------------------------------------------------------
/**
 * Pure telemetry and presentation helpers for dsh-session-radar.
 *
 * The module deliberately has no imports and no React: the browser entry is
 * produced by concatenating it into a single DSH client bundle, while the unit
 * tests import this file directly. Everything here is deterministic and
 * side-effect free except for the tiny JSON-storage helpers at the bottom.
 */

/** Tool names that mutate files and therefore produce a deliverable record. */
const MUTATING_TOOLS = new Set([
  'write',
  'edit',
  'apply_patch',
  'str_replace_editor',
]);

/** Chinese labels for the tools this UI is likely to see. */
const TOOL_LABELS = {
  run_code: '执行代码',
  bash: '运行命令',
  pwsh: '运行命令',
  terminal: '终端操作',
  read_file: '读取文件',
  write: '写入文件',
  edit: '编辑文件',
  apply_patch: '应用补丁',
  str_replace_editor: '编辑文件',
  web_search: '搜索网页',
  web_fetch: '读取网页',
  present: '交付文件',
  todo_write: '更新计划',
  job_list: '查看后台任务',
  job_output: '读取后台任务',
  job_kill: '停止后台任务',
  generate_image: '生成图片',
  generate_audio: '生成音频',
  generate_video: '生成视频',
  computer_use: '操作电脑',
  computer_use_reset: '重置电脑控制',
  ask_user: '询问用户',
  skill: '加载技能',
  task: '派发任务',
};

/** Short labels for status values. */
const STATUS_LABELS = {
  running: '运行中',
  tool: '调用工具',
  approval: '等待审批',
  question: '等待回答',
  done: '刚完成',
  idle: '空闲',
  migration: '待迁移',
};

/**
 * Safety window for a single tool call (or for a live session that stopped
 * emitting): a working session only looks stuck once it exceeds this, so long
 * builds and heavy edits do not raise a false alarm. Users pick their own
 * window in the settings; five minutes is the default.
 */
const STALL_AFTER_MS = 5 * 60 * 1000;
/** Bounds for the user-chosen safety window, in minutes. */
const STALL_MINUTES_MIN = 1;
const STALL_MINUTES_MAX = 120;
const STALL_MINUTES_DEFAULT = STALL_AFTER_MS / 60000;

/** Clamp a user-supplied safety window (milliseconds) into the supported range. */
function normalizeStallMs(value) {
  const ms = Number(value);
  const fallback = STALL_AFTER_MS;
  if (!Number.isFinite(ms) || ms <= 0) return fallback;
  return Math.min(STALL_MINUTES_MAX * 60000, Math.max(STALL_MINUTES_MIN * 60000, Math.round(ms)));
}

/** Clamp the settings value (minutes) into the supported range. */
function normalizeStallMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return STALL_MINUTES_DEFAULT;
  return Math.min(STALL_MINUTES_MAX, Math.max(STALL_MINUTES_MIN, Math.round(minutes * 10) / 10));
}

/** Status filter vocabulary shared by the filter bar and the core predicate. */
const STATUS_FILTERS = [
  { value: 'all', label: '全部状态' },
  { value: 'live', label: '运行中' },
  { value: 'waiting', label: '等你处理' },
  { value: 'stalled', label: '疑似卡住' },
  { value: 'finished', label: '已完成' },
  { value: 'idle', label: '空闲' },
];

/**
 * True when a live session has been working on one thing for longer than the
 * safety window: the clock runs from the start of the tool call that is still
 * running, or from the last event when nothing is executing. A derived entry
 * already carries the verdict, so its own flag wins.
 */
function isStalledEntry(entry, now = Date.now(), stallAfterMs = STALL_AFTER_MS) {
  if (!isRecord(entry)) return false;
  const window = normalizeStallMs(stallAfterMs);
  if (entry.stalled === true) return true;
  if (entry.stalled === false) return false;
  const status = entry.status;
  if (status !== 'running' && status !== 'tool' && status !== 'stalled') return false;
  const toolStart = Number(entry.currentTool && entry.currentTool.startedAt) || 0;
  const anchor = toolStart > 0
    ? toolStart
    : Math.max(Number(entry.lastEventAt) || 0, Number(entry.turnStartedAt) || 0);
  if (anchor <= 0) return false;
  return Math.max(0, Number(now) - anchor) >= window;
}

/** One icon category per tool family. */
function toolCategory(name) {
  const tool = String(name || '').toLowerCase();
  if (tool === 'run_code' || tool === 'bash' || tool === 'pwsh' || tool.includes('terminal')) return 'code';
  if (tool === 'present') return 'deliver';
  if (tool === 'todo_write') return 'plan';
  if (tool.startsWith('job_')) return 'job';
  if (tool.includes('search') || tool.includes('grep') || tool.includes('glob') || tool === 'web_fetch') return 'search';
  if (tool.startsWith('generate_') || tool.includes('image')) return 'image';
  if (tool.startsWith('computer_') || tool === 'computer_use') return 'computer';
  if (tool.includes('file') || MUTATING_TOOLS.has(tool)) return 'file';
  return 'tool';
}

/** Human label for a tool name. */
function toolLabel(name) {
  return TOOL_LABELS[name] || String(name || '工具');
}

/** Whether a value is a plain record. */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse JSON without throwing. */
function safeParseJson(value) {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** Collapse whitespace and cap a string for a single-line UI slot. */
function truncate(value, max = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** Basename accepting both Windows and POSIX separators. */
function basename(value) {
  const trimmed = String(value ?? '').replace(/[\\/]+$/, '');
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return at === -1 ? trimmed : trimmed.slice(at + 1);
}

/** Lowercase file extension without the dot, or an empty string. */
function fileExtension(name) {
  const base = basename(name);
  const at = base.lastIndexOf('.');
  return at <= 0 ? '' : base.slice(at + 1).toLowerCase();
}

/** Compact token count: 923, 12.4k, 3.08M, 1.2B. */
function formatTokens(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '0';
  if (number < 1000) return String(Math.round(number));
  if (number < 10000) return trimZeros((number / 1000).toFixed(1)) + 'k';
  if (number < 1000000) return Math.round(number / 1000) + 'k';
  if (number < 999500000) return number < 10000000 ? trimZeros((number / 1000000).toFixed(2)) + 'M' : Math.round(number / 1000000) + 'M';
  const billions = number / 1000000000;
  if (billions < 10) return trimZeros(billions.toFixed(2)) + 'B';
  if (billions < 100) return trimZeros(billions.toFixed(1)) + 'B';
  return Math.round(billions) + 'B';
}

function trimZeros(text) {
  return text.replace(/0+$/, '').replace(/\.$/, '');
}

/** Throughput label for a tokens-per-minute figure. */
function formatRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '—';
  return formatTokens(number) + '/min';
}

/** Exact token count with grouping separators. */
function formatTokensExact(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '0';
  return Math.round(number).toLocaleString('zh-CN');
}

/** Short elapsed duration. */
function formatDuration(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value <= 0) return '0s';
  if (value < 1000) return Math.round(value) + 'ms';
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return seconds + 's';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest === 0 ? minutes + 'm' : minutes + 'm ' + rest + 's';
  const hours = Math.floor(minutes / 60);
  const minuteRest = minutes % 60;
  return minuteRest === 0 ? hours + 'h' : hours + 'h ' + minuteRest + 'm';
}

/** Relative timestamp in the product's language. */
function formatRelative(timestamp, now = Date.now()) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '—';
  const delta = Math.max(0, now - value);
  if (delta < 45000) return '刚刚';
  if (delta < 3600000) return Math.max(1, Math.round(delta / 60000)) + ' 分钟前';
  if (delta < 86400000) return Math.max(1, Math.round(delta / 3600000)) + ' 小时前';
  if (delta < 172800000) return '昨天';
  if (delta < 604800000) return Math.round(delta / 86400000) + ' 天前';
  return new Date(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

/** Local wall-clock time. */
function formatClock(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '—';
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/** Sum every billable bucket reported by tokenUsage. */
function tokenTotal(tokens) {
  if (!isRecord(tokens)) return 0;
  return (
    (Number(tokens.uncachedInputTokens) || 0) +
    (Number(tokens.cacheReadTokens) || 0) +
    (Number(tokens.cacheWriteTokens) || 0) +
    (Number(tokens.outputTokens) || 0)
  );
}

/** Prompt-side token count from one provider usage sample. */
function promptTokens(usage) {
  if (!isRecord(usage)) return 0;
  return (
    (Number(usage.inputTokens ?? usage.uncachedInputTokens) || 0) +
    (Number(usage.cacheReadTokens) || 0) +
    (Number(usage.cacheWriteTokens) || 0)
  );
}

/** Context utilization as a 0..1 ratio, or null when not measurable. */
function contextRatio(pressure) {
  if (!isRecord(pressure)) return null;
  const used = Number(pressure.pressureTokens ?? pressure.projectedTokens);
  const capacity = Number(pressure.contextWindow);
  if (!Number.isFinite(used) || used <= 0 || !Number.isFinite(capacity) || capacity <= 0) return null;
  return Math.min(1, used / capacity);
}

/** Normalize the todo projection/event payload. */
function normalizeTodos(value) {
  if (!Array.isArray(value)) return null;
  const out = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.content !== 'string') continue;
    const content = item.content.trim();
    if (content === '') continue;
    const status = item.status === 'completed' || item.status === 'in_progress' ? item.status : 'pending';
    out.push({ content, status });
  }
  return out;
}

/** Todo completion summary. */
function todoProgress(todos) {
  if (!Array.isArray(todos) || todos.length === 0) return null;
  const done = todos.filter(item => item.status === 'completed').length;
  return { done, total: todos.length, percent: Math.round((done / todos.length) * 100) };
}

/** Create the mutable per-session telemetry accumulator. */
function createTelemetry(row) {
  return {
    id: String(row?.id || ''),
    title: row?.title || row?.displayTitle || String(row?.id || ''),
    cwd: typeof row?.cwd === 'string' ? row.cwd : '',
    origin: row?.origin,
    parentId: row?.parentId,
    blank: row?.blank === true,
    updatedAt: Number(row?.updatedAt) || 0,
    running: row?.running === true,
    active: false,
    lastSeq: -1,
    lastEventAt: 0,
    eventsSeen: 0,
    turn: 0,
    step: 0,
    turnStartedAt: 0,
    stepStartedAt: 0,
    completedAt: 0,
    phase: 'idle',
    model: '',
    provider: '',
    preset: '',
    contextWindow: 0,
    lastUsage: null,
    eventTokens: null,
    reasoning: '',
    lastText: '',
    lastPrompt: '',
    pendingCalls: {},
    pendingInput: [],
    pendingSince: 0,
    queueLength: 0,
    actions: [],
    deliverables: [],
    turns: [],
    toolsTotal: 0,
    todos: null,
    tokens: null,
    pressure: null,
    stats: null,
    stream: 'idle',
    error: null,
  };
}

/** Apply a complete projection snapshot/update to one accumulator. */
function applyProjectionValues(telemetry, values) {
  if (!isRecord(values)) return;
  if (typeof values.title === 'string' && values.title.trim() !== '') telemetry.title = values.title.trim();
  if (isRecord(values.tokenUsage)) {
    const usage = values.tokenUsage;
    const totals = isRecord(usage.totals) ? usage.totals : usage;
    const hasBuckets = ['uncachedInputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens'].some(key => totals[key] !== undefined);
    if (hasBuckets) {
      telemetry.tokens = {
        uncachedInputTokens: Number(totals.uncachedInputTokens) || 0,
        outputTokens: Number(totals.outputTokens) || 0,
        cacheReadTokens: Number(totals.cacheReadTokens) || 0,
        cacheWriteTokens: Number(totals.cacheWriteTokens) || 0,
      };
    }
    const buckets = isRecord(usage.last) && isRecord(usage.last.buckets) ? usage.last.buckets : undefined;
    if (buckets !== undefined) {
      telemetry.lastUsage = {
        inputTokens: Number(buckets.uncachedInputTokens) || 0,
        outputTokens: Number(buckets.outputTokens) || 0,
        cacheReadTokens: Number(buckets.cacheReadTokens) || 0,
        cacheWriteTokens: Number(buckets.cacheWriteTokens) || 0,
      };
    }
  }
  if (isRecord(values.contextPressure)) {
    telemetry.pressure = {};
    for (const key of ['pressureTokens', 'projectedTokens', 'contextWindow']) {
      const number = Number(values.contextPressure[key]);
      if (Number.isFinite(number) && number > 0) telemetry.pressure[key] = number;
    }
    if (telemetry.pressure.contextWindow) telemetry.contextWindow = telemetry.pressure.contextWindow;
  }
  if (isRecord(values.sessionStats)) telemetry.stats = { ...values.sessionStats };
  if (values.todos === null || Array.isArray(values.todos)) telemetry.todos = normalizeTodos(values.todos);
  if (typeof values.agentPreset === 'string' && values.agentPreset !== '') telemetry.preset = values.agentPreset;
  const lastUsed = isRecord(values.modelSelection) && isRecord(values.modelSelection.lastUsed) ? values.modelSelection.lastUsed : undefined;
  if (lastUsed !== undefined) {
    if (typeof lastUsed.provider === 'string') telemetry.provider = lastUsed.provider;
    if (typeof lastUsed.model === 'string') telemetry.model = lastUsed.model;
  }
  const outline = isRecord(values.turnOutline) && Array.isArray(values.turnOutline.turns) ? values.turnOutline.turns : undefined;
  if (outline !== undefined && outline.length > 0) {
    const last = outline[outline.length - 1];
    if (telemetry.lastText === '' && typeof last.response === 'string') telemetry.lastText = truncate(last.response, 500);
    if (telemetry.lastPrompt === '' && typeof last.prompt === 'string') telemetry.lastPrompt = truncate(last.prompt, 260);
  }
}

/** Apply the passive state read/stream value. */
function applyState(telemetry, state) {
  if (!isRecord(state)) return;
  if (typeof state.running === 'boolean') telemetry.running = state.running;
  if (typeof state.active === 'boolean') telemetry.active = state.active;
  if (Array.isArray(state.pendingInput)) {
    telemetry.pendingInput = state.pendingInput.map(String);
    syncPendingSince(telemetry, telemetry.lastEventAt);
  }
  if (state.queue === null) telemetry.queueLength = 0;
  else if (Array.isArray(state.queue)) telemetry.queueLength = state.queue.length;
}

/** Upsert one action by call id while preserving display order. */
function upsertAction(actions, action) {
  const index = actions.findIndex(item => item.id === action.id);
  if (index === -1) return [...actions, action].slice(-16);
  const next = actions.slice();
  next[index] = action;
  return next;
}

/** Turn records kept per session; older turns fall off the head. */
const MAX_TURNS = 60;

/** Tool calls kept per turn: enough to read one whole round of work. */
const MAX_TURN_CHAIN = 40;

/** Most recent turn record, or null when the log is empty. */
function currentTurn(telemetry) {
  return telemetry.turns.length > 0 ? telemetry.turns[telemetry.turns.length - 1] : null;
}

/** Append one turn record and keep the log bounded. */
function openTurn(telemetry, index, at) {
  const turn = {
    index: Number(index) || telemetry.turns.length + 1,
    startedAt: Number(at) || 0,
    endedAt: 0,
    steps: 0,
    tools: 0,
    errors: 0,
    tokens: 0,
    calls: 0,
    models: {},
    modelTokens: {},
    model: '',
    prompt: '',
    text: '',
    reasoning: '',
    chain: [],
  };
  telemetry.turns = [...telemetry.turns, turn].slice(-MAX_TURNS);
  return turn;
}

/** Turn an event belongs to; the tail read can start mid-turn, so create one. */
function ensureTurn(telemetry, at) {
  return currentTurn(telemetry) || openTurn(telemetry, telemetry.turn || 1, at);
}

/** Build the human description of one tool call. */
function describeToolCall(name, argumentsText) {
  const tool = String(name || 'tool');
  const args = typeof argumentsText === 'string' ? safeParseJson(argumentsText) : argumentsText;
  const record = isRecord(args) ? args : {};
  const label = toolLabel(tool);
  let detail = '';
  let path = '';
  if (tool === 'run_code') {
    detail = typeof record.description === 'string' ? record.description : '';
    if (detail === '' && typeof record.code === 'string') {
      const first = record.code.split('\n').find(line => line.trim() !== '') || '';
      detail = truncate(first, 110);
    }
  } else if (tool === 'bash' || tool === 'pwsh' || tool === 'terminal') {
    detail = truncate(record.command || record.cmd || record.input || '', 110);
  } else if (tool === 'read_file' || tool === 'write' || tool === 'edit' || tool === 'str_replace_editor') {
    path = String(record.path || record.file_path || record.filePath || '');
    detail = path;
  } else if (tool === 'apply_patch') {
    const patch = String(record.patch || record.diff || record.input || '');
    const match = /\*\*\* (?:Update|Add|Delete) File:\s*([^\n]+)/.exec(patch);
    path = match?.[1]?.trim() || String(record.path || '');
    detail = path || truncate(patch, 110);
  } else if (tool === 'present') {
    const files = Array.isArray(record.files) ? record.files : [];
    path = files.map(file => String(file?.path || '')).filter(Boolean)[0] || '';
    detail = files.length > 0 ? files.map(file => basename(file?.path)).join('、') : '';
  } else if (tool.includes('search')) {
    detail = truncate(record.query || record.q || record.pattern || '', 110);
  } else if (tool === 'todo_write') {
    const todos = Array.isArray(record.todos) ? record.todos : [];
    detail = todos.length + ' 项计划';
  } else if (tool.startsWith('job_')) {
    detail = truncate(record.job_id || record.jobId || record.id || '', 80);
  } else if (tool === 'ask_user') {
    detail = truncate(record.question || record.prompt || '', 110);
  } else if (tool === 'computer_use') {
    detail = truncate(record.title || record.description || record.code || '', 110);
  } else {
    const values = Object.values(record);
    const firstText = values.find(value => typeof value === 'string' && value.trim() !== '');
    detail = truncate(firstText || '', 110);
  }
  return { label, detail, path };
}

/** Add or refresh a deliverable on the telemetry record. */
function upsertDeliverable(telemetry, item) {
  const path = String(item?.path || '').trim();
  if (path === '') return;
  const next = {
    path,
    name: basename(path),
    extension: fileExtension(path),
    description: truncate(item.description || '', 160),
    kind: item.kind === 'presented' ? 'presented' : 'changed',
    tool: String(item.tool || ''),
    at: Number(item.at) || Date.now(),
    turn: Number(item.turn) || telemetry.turn || 0,
  };
  const index = telemetry.deliverables.findIndex(entry => entry.path === path);
  if (index === -1) telemetry.deliverables = [...telemetry.deliverables, next].slice(-40);
  else {
    const existing = telemetry.deliverables[index];
    const updated = {
      ...existing,
      ...next,
      kind: existing.kind === 'presented' || next.kind === 'presented' ? 'presented' : 'changed',
      description: next.description || existing.description,
    };
    const copy = telemetry.deliverables.slice();
    copy[index] = updated;
    telemetry.deliverables = copy;
  }
}

/** Whether a successfully completed tool call produced a changed file. */
function mutationPath(action) {
  if (!action || !MUTATING_TOOLS.has(action.name)) return '';
  if (action.name === 'str_replace_editor' && /"command"\s*:\s*"view"/.test(action.argsText || '')) return '';
  return action.path || '';
}

/** Consume one durable Session wire event. Returns false for a stale duplicate. */
function reduceEvent(telemetry, input) {
  const event = isRecord(input) && input.type === 'event' && isRecord(input.event) ? input.event : input;
  if (!isRecord(event) || typeof event.type !== 'string') return false;
  const seq = Number(event.seq);
  if (Number.isFinite(seq)) {
    if (seq <= telemetry.lastSeq) return false;
    telemetry.lastSeq = seq;
  }
  const time = Number(event.time) || Date.now();
  telemetry.lastEventAt = Math.max(telemetry.lastEventAt, time);
  telemetry.eventsSeen += 1;
  const data = isRecord(event.data) ? event.data : {};
  switch (event.type) {
    case 'turn/start': {
      const turnIndex = Number(data.turn) || telemetry.turn + 1;
      const previous = currentTurn(telemetry);
      if (previous !== null && previous.index === turnIndex && previous.endedAt === 0) {
        previous.startedAt = Math.min(previous.startedAt || time, time);
      } else {
        if (previous !== null && previous.endedAt === 0) previous.endedAt = time;
        openTurn(telemetry, turnIndex, time);
      }
      telemetry.turn = turnIndex;
      telemetry.step = 0;
      telemetry.turnStartedAt = time;
      telemetry.stepStartedAt = time;
      telemetry.completedAt = 0;
      telemetry.pendingCalls = {};
      telemetry.actions = [];
      telemetry.phase = 'thinking';
      telemetry.reasoning = '';
      telemetry.lastText = '';
      break;
    }
    case 'step/start': {
      telemetry.step = Number(data.step) || telemetry.step + 1;
      ensureTurn(telemetry, time).steps += 1;
      telemetry.stepStartedAt = time;
      telemetry.pendingCalls = {};
      telemetry.phase = 'thinking';
      telemetry.reasoning = '';
      break;
    }
    case 'step/end': {
      if (Object.keys(telemetry.pendingCalls).length === 0) telemetry.phase = 'thinking';
      break;
    }
    case 'assistant/message': {
      const message = isRecord(data.message) ? data.message : {};
      const source = isRecord(message.source) ? message.source : {};
      if (typeof source.provider === 'string') telemetry.provider = source.provider;
      if (typeof source.model === 'string') telemetry.model = source.model;
      if (isRecord(data.usage)) {
        telemetry.lastUsage = data.usage;
        const usage = data.usage;
        if (telemetry.eventTokens === null) telemetry.eventTokens = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
        telemetry.eventTokens.uncachedInputTokens += Number(usage.inputTokens ?? usage.uncachedInputTokens) || 0;
        telemetry.eventTokens.outputTokens += Number(usage.outputTokens) || 0;
        telemetry.eventTokens.cacheReadTokens += Number(usage.cacheReadTokens) || 0;
        telemetry.eventTokens.cacheWriteTokens += Number(usage.cacheWriteTokens) || 0;
      }
      let hasText = false;
      if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (!isRecord(block)) continue;
          if (block.type === 'reasoning' && typeof block.text === 'string') telemetry.reasoning = truncate(block.text, 220);
          if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
            telemetry.lastText = truncate(block.text, 500);
            hasText = true;
          }
        }
      }
      if (Object.keys(telemetry.pendingCalls).length > 0) telemetry.phase = 'tool';
      else telemetry.phase = hasText ? 'responding' : 'thinking';
      const messageTurn = ensureTurn(telemetry, time);
      const modelName = typeof source.model === 'string' && source.model.trim() !== '' ? source.model.trim() : (telemetry.model || '未标注模型');
      const messageTokens = isRecord(data.usage) ? promptTokens(data.usage) + (Number(data.usage.outputTokens) || 0) : 0;
      messageTurn.calls = (Number(messageTurn.calls) || 0) + 1;
      if (!isRecord(messageTurn.models)) messageTurn.models = {};
      messageTurn.models[modelName] = (Number(messageTurn.models[modelName]) || 0) + 1;
      if (!isRecord(messageTurn.modelTokens)) messageTurn.modelTokens = {};
      if (messageTokens > 0) messageTurn.modelTokens[modelName] = (Number(messageTurn.modelTokens[modelName]) || 0) + messageTokens;
      if (messageTurn.model === undefined || messageTurn.model === '') messageTurn.model = modelName;
      if (messageTokens > 0) messageTurn.tokens += messageTokens;
      if (hasText) messageTurn.text = telemetry.lastText;
      if (typeof telemetry.reasoning === 'string' && telemetry.reasoning !== '') messageTurn.reasoning = telemetry.reasoning;
      break;
    }
    case 'tool/call':
    case 'tool/ptc-dispatch-start': {
      const toolName = String(data.name || 'tool');
      const callId = String(data.callId || data.subCallId || ('call-' + String(seq)));
      const rawArguments = data.arguments || data.input || '';
      const description = describeToolCall(toolName, rawArguments);
      const action = {
        id: callId,
        name: toolName,
        label: description.label,
        detail: description.detail,
        path: description.path,
        status: 'running',
        startedAt: time,
        endedAt: 0,
        durationMs: 0,
        argsText: truncate(typeof rawArguments === 'string' ? rawArguments : JSON.stringify(rawArguments), 800),
        result: '',
        isError: false,
      };
      telemetry.pendingCalls[callId] = action;
      telemetry.actions = upsertAction(telemetry.actions, action);
      telemetry.toolsTotal += 1;
      const callTurn = ensureTurn(telemetry, time);
      callTurn.tools += 1;
      if (callTurn.chain.length < MAX_TURN_CHAIN && !callTurn.chain.some(item => item.id === callId)) {
        callTurn.chain.push({
          id: callId,
          name: toolName,
          label: description.label,
          detail: description.detail,
          path: description.path || '',
          category: toolCategory(toolName),
          status: 'running',
          durationMs: 0,
          at: time,
        });
      }
      telemetry.phase = 'tool';
      break;
    }
    case 'tool/result': {
      const message = isRecord(data.message) ? data.message : {};
      const source = isRecord(message.source) ? message.source : {};
      const callId = String(data.callId || message.toolCallId || source.callId || '');
      const action = telemetry.pendingCalls[callId] || telemetry.actions.find(item => item.id === callId);
      const isError = message.isError === true || data.error !== undefined;
      if (action) {
        const next = {
          ...action,
          status: isError ? 'error' : 'done',
          endedAt: time,
          durationMs: Math.max(0, time - action.startedAt),
          result: truncate(Array.isArray(message.content) ? message.content.map(part => part?.text || '').join(' ') : '', 220),
          isError,
        };
        telemetry.actions = upsertAction(telemetry.actions, next);
        delete telemetry.pendingCalls[callId];
        if (!isError) {
          const path = mutationPath(next);
          if (path) upsertDeliverable(telemetry, { path, tool: next.name, at: time, kind: 'changed' });
        }
        const resultTurn = currentTurn(telemetry);
        if (resultTurn !== null) {
          const chainItem = resultTurn.chain.find(item => item.id === callId);
          if (chainItem !== undefined) {
            chainItem.status = isError ? 'error' : 'done';
            chainItem.durationMs = next.durationMs;
            if (next.path) chainItem.path = next.path;
          }
          if (isError) resultTurn.errors += 1;
        }
      }
      if (Object.keys(telemetry.pendingCalls).length === 0) telemetry.phase = 'thinking';
      break;
    }
    case 'deliverables/presented': {
      if (Array.isArray(data.files)) {
        for (const file of data.files) upsertDeliverable(telemetry, {
          path: file?.path,
          description: file?.description,
          tool: 'present',
          at: time,
          kind: 'presented',
          turn: data.turn,
        });
      }
      break;
    }
    case 'todo/write': {
      telemetry.todos = normalizeTodos(data.todos);
      break;
    }
    case 'request/context': {
      const window = Number(data.contextWindow);
      if (Number.isFinite(window) && window > 0) telemetry.contextWindow = window;
      break;
    }
    case 'request/header': {
      const header = isRecord(data.header) ? data.header : {};
      const config = isRecord(header.config) ? header.config : {};
      if (typeof config.provider === 'string') telemetry.provider = config.provider;
      if (typeof config.model === 'string') telemetry.model = config.model;
      break;
    }
    case 'model/selection': {
      if (typeof data.provider === 'string') telemetry.provider = data.provider;
      if (typeof data.model === 'string') telemetry.model = data.model;
      break;
    }
    case 'session/title': {
      if (typeof data.title === 'string' && data.title.trim() !== '') telemetry.title = data.title.trim();
      break;
    }
    case 'agent-preset/selected': {
      if (typeof data.preset === 'string') telemetry.preset = data.preset;
      break;
    }
    case 'approval/asked': {
      if (!telemetry.pendingInput.includes('approval')) telemetry.pendingInput = [...telemetry.pendingInput, 'approval'];
      break;
    }
    case 'approval/decided': {
      telemetry.pendingInput = telemetry.pendingInput.filter(item => item !== 'approval');
      break;
    }
    case 'question/asked': {
      if (!telemetry.pendingInput.includes('question')) telemetry.pendingInput = [...telemetry.pendingInput, 'question'];
      break;
    }
    case 'question/answered': {
      telemetry.pendingInput = telemetry.pendingInput.filter(item => item !== 'question');
      break;
    }
    case 'compaction/start': {
      telemetry.phase = 'compacting';
      break;
    }
    case 'compaction/end': {
      telemetry.phase = 'thinking';
      break;
    }
    case 'turn/end': {
      const finishedTurn = currentTurn(telemetry);
      if (finishedTurn !== null && finishedTurn.endedAt === 0) finishedTurn.endedAt = time;
      telemetry.completedAt = time;
      telemetry.pendingCalls = {};
      telemetry.phase = 'done';
      telemetry.pendingInput = [];
      break;
    }
    case 'user/message': {
      if (data.source?.kind === 'user' && Array.isArray(data.content)) {
        const text = data.content.map(part => part?.text || '').join(' ').trim();
        if (text !== '') {
          telemetry.lastPrompt = truncate(text, 260);
          ensureTurn(telemetry, time).prompt = truncate(text, 200);
        }
      }
      break;
    }
    default: break;
  }
  syncPendingSince(telemetry, time);
  return true;
}

/**
 * Remember when the session started waiting for the user, so the UI can show
 * how long an approval or question has been sitting unanswered.
 */
function syncPendingSince(telemetry, time) {
  if (!isRecord(telemetry)) return;
  const pending = Array.isArray(telemetry.pendingInput) ? telemetry.pendingInput : [];
  if (pending.length === 0) {
    telemetry.pendingSince = 0;
    return;
  }
  if (!(Number(telemetry.pendingSince) > 0)) {
    telemetry.pendingSince = Number(time) || Number(telemetry.lastEventAt) || Date.now();
  }
  return;
}

/** Consume an ascending page of records. */
function reduceEvents(telemetry, records) {
  if (!Array.isArray(records)) return 0;
  let changed = 0;
  for (const record of records) if (reduceEvent(telemetry, record)) changed += 1;
  return changed;
}

/** Current status, combining roster, passive state, and telemetry. */
function deriveStatus(telemetry, row) {
  if (telemetry.pendingInput.includes('approval')) return 'approval';
  if (telemetry.pendingInput.includes('question')) return 'question';
  if (row?.formatStatus === 'migration-required') return 'migration';
  const isRunning = row === undefined || row === null ? telemetry.running === true : row.running === true;
  if (isRunning) {
    return Object.keys(telemetry.pendingCalls).length > 0 || telemetry.phase === 'tool' ? 'tool' : 'running';
  }
  if (telemetry.unread === true) return 'done';
  if (telemetry.completedAt > 0 && Date.now() - telemetry.completedAt < 10 * 60 * 1000) return 'done';
  return 'idle';
}

/** Human phase wording when no tool is active. */
function phaseLabel(telemetry) {
  switch (telemetry.phase) {
    case 'thinking': return '正在思考';
    case 'responding': return '正在生成回复';
    case 'tool': return '正在调用工具';
    case 'compacting': return '正在整理上下文';
    case 'done': return '本轮已完成';
    default: return '等待新指令';
  }
}

/** Latest pending tool call, if any. */
function activeTool(telemetry) {
  const calls = Object.values(telemetry.pendingCalls || {});
  if (calls.length === 0) return null;
  return calls.sort((a, b) => b.startedAt - a.startedAt)[0];
}

/**
 * Presentation rows for the session flow: one per turn, oldest first.
 * Every row carries the tool chain and the files that turn delivered.
 */
function buildTurnViews(telemetry, now = Date.now()) {
  const turns = Array.isArray(telemetry.turns) ? telemetry.turns : [];
  const deliverables = Array.isArray(telemetry.deliverables) ? telemetry.deliverables : [];
  return turns.map(turn => {
    const open = turn.endedAt === 0;
    const live = open && telemetry.running === true;
    const durationMs = open ? (live ? Math.max(0, now - turn.startedAt) : 0) : Math.max(0, turn.endedAt - turn.startedAt);
    return {
      index: turn.index,
      startedAt: turn.startedAt,
      endedAt: turn.endedAt,
      durationMs,
      state: turn.errors > 0 ? 'error' : live ? 'running' : open ? 'open' : 'done',
      prompt: turn.prompt,
      text: turn.text,
      steps: turn.steps,
      tools: turn.tools,
      errors: turn.errors,
      tokens: turn.tokens,
      calls: Number(turn.calls) || 0,
      models: isRecord(turn.models) ? { ...turn.models } : {},
      modelTokens: isRecord(turn.modelTokens) ? { ...turn.modelTokens } : {},
      model: turn.model || '',
      reasoning: turn.reasoning || '',
      chain: turn.chain.slice(0, MAX_TURN_CHAIN),
      chainTotal: turn.chain.length,
      deliverables: deliverables.filter(item => Number(item.turn) === turn.index).slice(0, 24),
    };
  });
}

/** Derive the full presentation record for one row. */
function deriveEntry(row, telemetry, options = {}) {
  const now = Number(options.now) || Date.now();
  const status = deriveStatus(telemetry, row);
  const pending = activeTool(telemetry);
  const progress = todoProgress(telemetry.todos);
  const currentTodo = Array.isArray(telemetry.todos)
    ? telemetry.todos.find(item => item.status === 'in_progress') || telemetry.todos.find(item => item.status === 'pending')
    : null;
  const lastAction = telemetry.actions.length > 0 ? telemetry.actions[telemetry.actions.length - 1] : null;
  const pressure = telemetry.pressure || null;
  const tokens = telemetry.tokens || telemetry.eventTokens || null;
  const prompt = pressure?.pressureTokens || promptTokens(telemetry.lastUsage) || promptTokens(telemetry.eventTokens) || 0;
  const capacity = Number(pressure?.contextWindow || telemetry.contextWindow) || 0;
  const ratio = contextRatio(pressure) ?? (capacity > 0 && prompt > 0 ? Math.min(1, prompt / capacity) : null);
  const startedAt = telemetry.stepStartedAt || telemetry.turnStartedAt || telemetry.updatedAt;
  const busy = status === 'running' || status === 'tool' || status === 'approval' || status === 'question';
  const turnAnchor = telemetry.turnStartedAt || startedAt;
  const turnTimeMs = busy
    ? Math.max(0, now - turnAnchor)
    : telemetry.completedAt > 0 && telemetry.turnStartedAt > 0
      ? Math.max(0, telemetry.completedAt - telemetry.turnStartedAt)
      : 0;
  const elapsedMs = busy
    ? Math.max(0, now - startedAt)
    : turnTimeMs;
  const workTimeMs = Math.max(0, Number(telemetry.stats?.llmMs) || 0) + Math.max(0, Number(telemetry.stats?.toolMs) || 0);
  const totalTimeMs = workTimeMs > 0 ? workTimeMs : turnTimeMs;
  const title = telemetry.title || row?.displayTitle || row?.id || '';
  const phaseText = telemetry.phase === 'idle' && (status === 'running' || status === 'tool') ? '正在启动' : phaseLabel(telemetry);
  const turns = buildTurnViews(telemetry, now);
  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
  const pendingSince = Number(telemetry.pendingSince) || 0;
  const waitingMs = pendingSince > 0 ? Math.max(0, now - pendingSince) : 0;
  // A running tool owns the clock: the window measures how long that one call
  // has been going, not how recently anything else touched the session.
  const toolAnchor = Number(pending?.startedAt) || 0;
  const activityAnchor = toolAnchor > 0 ? toolAnchor : Math.max(0, Number(telemetry.lastEventAt) || 0);
  const stalledMs = (status === 'running' || status === 'tool') && activityAnchor > 0 ? Math.max(0, now - activityAnchor) : 0;
  const stallAfterMs = normalizeStallMs(options.stallAfterMs);
  const tokensPerMinute = lastTurn !== null && lastTurn.durationMs > 0 && lastTurn.tokens > 0
    ? Math.round(lastTurn.tokens / (lastTurn.durationMs / 60000))
    : 0;
  return {
    id: String(row?.id || telemetry.id),
    title,
    cwd: telemetry.cwd || row?.cwd || '',
    workspace: options.workspace || '',
    origin: row?.origin || telemetry.origin,
    parentId: row?.parentId || telemetry.parentId,
    blank: row?.blank === true,
    running: row === undefined || row === null ? telemetry.running === true : row.running === true,
    current: (row?.retainedBy?.mainView ?? 0) > 0,
    status,
    statusLabel: STATUS_LABELS[status] || status,
    phase: telemetry.phase,
    phaseLabel: phaseText,
    model: telemetry.model,
    provider: telemetry.provider,
    preset: telemetry.preset,
    turn: telemetry.turn,
    step: telemetry.step,
    currentTool: pending ? {
      name: pending.name,
      label: pending.label,
      detail: pending.detail,
      startedAt: pending.startedAt,
      elapsedMs: Math.max(0, now - pending.startedAt),
      category: toolCategory(pending.name),
    } : null,
    lastAction,
    actions: telemetry.actions.slice().reverse().slice(0, 10),
    turns,
    toolCount: telemetry.toolsTotal,
    todos: telemetry.todos,
    currentTodo,
    progress,
    tokens,
    tokenTotal: tokenTotal(tokens),
    usagePromptTokens: prompt,
    contextWindow: capacity,
    contextRatio: ratio,
    contextPercent: ratio === null ? null : Math.round(ratio * 100),
    stats: telemetry.stats,
    pendingInput: telemetry.pendingInput.slice(),
    pendingSince,
    waitingMs,
    stalledMs,
    stallAfterMs,
    stalled: stalledMs >= stallAfterMs,
    tokensPerMinute,
    queueLength: telemetry.queueLength,
    deliverables: telemetry.deliverables.slice().sort((a, b) => b.at - a.at),
    deliverableCount: telemetry.deliverables.length,
    deliveryState: telemetry.deliverables.some(item => item.kind === 'presented') ? 'delivered' : telemetry.deliverables.length > 0 ? 'changed' : 'none',
    lastText: telemetry.lastText,
    lastPrompt: telemetry.lastPrompt,
    reasoning: telemetry.reasoning,
    elapsedMs,
    turnTimeMs,
    totalTimeMs,
    lastEventAt: telemetry.lastEventAt,
    lastEventAgo: telemetry.lastEventAt > 0 ? Math.max(0, now - telemetry.lastEventAt) : null,
    updatedAt: Number(row?.updatedAt) || telemetry.updatedAt || 0,
    unread: telemetry.unread === true,
    stream: telemetry.stream,
    error: telemetry.error,
    presetLabel: telemetry.preset || '默认预设',
    formatStatus: row?.formatStatus,
  };
}

/** Sort entries for the live rail, the recent board and the usage ranking. */
function sortEntries(entries, mode = 'live') {
  const rank = { tool: 0, running: 0, approval: 1, question: 1, done: 2, migration: 2, idle: 3 };
  return entries.slice().sort((a, b) => {
    if (mode === 'recent') {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    }
    if (mode === 'longest') {
      const delta = (Number(b.turnTimeMs) || 0) - (Number(a.turnTimeMs) || 0);
      return delta !== 0 ? delta : (Number(b.totalTimeMs) || 0) - (Number(a.totalTimeMs) || 0) || b.updatedAt - a.updatedAt;
    }
    if (mode === 'tokens') {
      const delta = (Number(b.tokenTotal) || 0) - (Number(a.tokenTotal) || 0);
      return delta !== 0 ? delta : b.updatedAt - a.updatedAt;
    }
    const ar = rank[a.status] ?? 9;
    const br = rank[b.status] ?? 9;
    if (ar !== br) return ar - br;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

/** How many sessions the left sidebar keeps pinned above the workspace tree. */
const SIDEBAR_PIN_MAX = 6;

/** Statuses that count as "still working" for the sidebar pin strip. */
const SIDEBAR_LIVE_STATUSES = new Set(['running', 'tool', 'approval', 'question']);

/**
 * The sessions the left sidebar lifts above the workspace tree: pinned
 * sessions first (ordered like the live rail), then the ones still working,
 * capped so the workspace list keeps most of the column. The session the user
 * currently has open keeps its slot even when it would fall past the cap — the
 * same courtesy the right-edge quick bar gives it.
 */
function sidebarPinSessions(entries, options = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const rawMax = Number(options.max);
  const cap = Number.isFinite(rawMax) && rawMax > 0 ? Math.floor(rawMax) : SIDEBAR_PIN_MAX;
  const currentId = typeof options.currentId === 'string' ? options.currentId : '';
  const known = list.filter(entry => isRecord(entry) && typeof entry.id === 'string' && entry.id !== '');
  const seen = new Set();
  const ordered = [];
  const take = entry => {
    if (seen.has(entry.id) || entry.archived === true) return;
    seen.add(entry.id);
    ordered.push(entry);
  };
  sortEntries(known.filter(entry => entry.pinned === true), 'live').forEach(take);
  const pinnedCount = ordered.length;
  sortEntries(known.filter(entry => entry.pinned !== true && SIDEBAR_LIVE_STATUSES.has(entry.status)), 'live').forEach(take);
  const liveCount = ordered.length - pinnedCount;
  // The session the user is reading stays in the strip even when it is idle and
  // unpinned; it drops out on its own as soon as they switch somewhere else.
  const current = known.find(entry => entry.id === currentId) || null;
  if (current !== null) take(current);
  const currentCount = ordered.length - pinnedCount - liveCount;
  let items = ordered.slice(0, cap);
  const currentIndex = ordered.findIndex(entry => entry.id === currentId);
  if (currentIndex >= cap) items = items.slice(0, Math.max(0, cap - 1)).concat(ordered[currentIndex]);
  return {
    items,
    total: ordered.length,
    hidden: Math.max(0, ordered.length - items.length),
    pinnedCount,
    liveCount,
    currentCount,
    hasCurrent: currentIndex >= 0,
  };
}

/** Local YYYY-MM-DD key for a timestamp; activity rolls up by the user's calendar. */
function localDayKey(value) {
  const date = new Date(Number(value) || Date.now());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

/** Local two-digit hour key (00–23) for intraday activity buckets. */
function localHourKey(value) {
  const date = new Date(Number(value) || Date.now());
  return String(date.getHours()).padStart(2, '0');
}

function dayKeyTime(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (match === null) return 0;
  const time = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
  return Number.isFinite(time) ? time : 0;
}

function startOfLocalDay(value) {
  const date = new Date(Number(value) || Date.now());
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function addLocalDays(value, count) {
  const date = new Date(value);
  date.setDate(date.getDate() + count);
  return date.getTime();
}

function startOfLocalWeek(value) {
  const start = new Date(startOfLocalDay(value));
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start.getTime();
}

function startOfLocalMonth(value) {
  const date = new Date(Number(value) || Date.now());
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function shortDayLabel(time) {
  const date = new Date(time);
  return (date.getMonth() + 1) + '/' + date.getDate();
}

/**
 * Normalise any list of intervals into sorted, non-overlapping spans. Two
 * sessions running 13:00–15:00 and 14:00–16:00 therefore cover three hours of
 * wall-clock time, not four: overlap is counted once.
 */
function mergeSpans(list, start = 0, end = Infinity) {
  const merged = [];
  if (!Array.isArray(list) || list.length === 0) return merged;
  const lower = Math.max(0, Number(start) || 0);
  const upper = Number(end) > lower ? Number(end) : Infinity;
  const spans = [];
  for (const raw of list) {
    const from = Array.isArray(raw) ? Number(raw[0]) : Number(raw && raw.start);
    const to = Array.isArray(raw) ? Number(raw[1]) : Number(raw && raw.end);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    const begin = Math.max(from, lower);
    const finish = Math.min(to, upper);
    if (finish > begin) spans.push([begin, finish]);
  }
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last !== undefined && span[0] <= last[1]) {
      if (span[1] > last[1]) last[1] = span[1];
    } else {
      merged.push([span[0], span[1]]);
    }
  }
  return merged;
}

/** Wall-clock coverage of already merged spans. */
function spanTotalMs(spans) {
  if (!Array.isArray(spans)) return 0;
  return spans.reduce((total, span) => total + Math.max(0, (Number(span && span[1]) || 0) - (Number(span && span[0]) || 0)), 0);
}

/**
 * Hour records keep their own counters but borrow the day's spans so an hourly
 * window still knows which session was running when. Clipping happens later,
 * when the spans are merged into the hour bucket.
 */
function withDaySpans(record, dayRaw) {
  if (!isRecord(record)) return {};
  if (!isRecord(dayRaw) || !Array.isArray(dayRaw.spans) || dayRaw.spans.length === 0) return record;
  const source = isRecord(record.sessions) ? record.sessions : null;
  if (source === null) return { ...record, spans: dayRaw.spans };
  const daySessions = isRecord(dayRaw.sessions) ? dayRaw.sessions : {};
  const sessions = {};
  for (const [id, session] of Object.entries(source)) {
    const own = isRecord(daySessions[id]) && Array.isArray(daySessions[id].spans) ? daySessions[id].spans : null;
    sessions[id] = own === null ? session : { ...session, spans: own };
  }
  return { ...record, sessions, spans: dayRaw.spans };
}

function emptyActivityBucket(key, label, start, end) {
  return {
    key,
    label,
    start,
    end,
    tokens: 0,
    durationMs: 0,
    busyMs: 0,
    turns: 0,
    calls: 0,
    models: {},
    modelTokens: {},
    sessions: {},
    sessionCount: 0,
    spans: [],
  };
}

function mergeModelCounts(target, source) {
  if (!isRecord(source)) return 0;
  let added = 0;
  for (const [rawName, rawCount] of Object.entries(source)) {
    const name = String(rawName || '').trim() || '未标注模型';
    const count = Math.max(0, Number(rawCount) || 0);
    if (count <= 0) continue;
    target[name] = (Number(target[name]) || 0) + count;
    added += count;
  }
  return added;
}

function sumModelCounts(models) {
  if (!isRecord(models)) return 0;
  return Object.values(models).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

/** Model token maps use the same additive merge as call maps. */
function mergeModelTokens(target, source) {
  return mergeModelCounts(target, source);
}

function sumModelTokens(models) {
  return sumModelCounts(models);
}

function emptySessionEntry() {
  return { title: '', tokens: 0, durationMs: 0, busyMs: 0, turns: 0, calls: 0, models: {}, modelTokens: {}, spans: [] };
}

/**
 * Fold one ledger record into a bucket. A scope (set of session ids) narrows
 * every counter to the picked sessions, so the page can answer "only these
 * sessions / this workspace" without a second aggregation path.
 */
function absorbActivityRecord(bucket, raw, scope = null) {
  if (!isRecord(raw)) return;
  const scoped = scope instanceof Set;
  const records = isRecord(raw.sessions) ? raw.sessions : {};
  if (!scoped) {
    bucket.tokens += Math.max(0, Number(raw.tokens) || 0);
    bucket.durationMs += Math.max(0, Number(raw.durationMs) || 0);
    // Spans are merged, never summed: the bucket reports wall-clock coverage.
    if (Array.isArray(raw.spans) && raw.spans.length > 0) {
      bucket.spans = mergeSpans(bucket.spans.concat(raw.spans), bucket.start, bucket.end);
    }
    bucket.turns += Math.max(0, Number(raw.turns) || 0);
    bucket.calls += Math.max(0, Number(raw.calls) || 0);
    mergeModelCounts(bucket.models, raw.models);
    mergeModelTokens(bucket.modelTokens, raw.modelTokens);
  }
  for (const [id, session] of Object.entries(records)) {
    if (!isRecord(session)) continue;
    if (scoped && !scope.has(id)) continue;
    const item = bucket.sessions[id] || emptySessionEntry();
    item.title = item.title || String(session.title || id);
    const tokens = Math.max(0, Number(session.tokens) || 0);
    const durationMs = Math.max(0, Number(session.durationMs) || 0);
    const turns = Math.max(0, Number(session.turns) || 0);
    const calls = Math.max(0, Number(session.calls) || 0);
    const spans = Array.isArray(session.spans) ? session.spans : [];
    item.tokens += tokens;
    item.durationMs += durationMs;
    if (spans.length > 0) {
      item.spans = mergeSpans(item.spans.concat(spans), bucket.start, bucket.end);
    }
    item.turns += turns;
    item.calls += calls;
    mergeModelCounts(item.models, session.models);
    mergeModelTokens(item.modelTokens, session.modelTokens);
    item.calls = Math.max(item.calls, sumModelCounts(item.models));
    bucket.sessions[id] = item;
    if (scoped) {
      // The record header mixes every session, so scoped totals come from the
      // session rows themselves.
      bucket.tokens += tokens;
      bucket.durationMs += durationMs;
      bucket.turns += turns;
      bucket.calls += calls;
      if (spans.length > 0) bucket.spans = mergeSpans(bucket.spans.concat(spans), bucket.start, bucket.end);
      mergeModelCounts(bucket.models, session.models);
      mergeModelTokens(bucket.modelTokens, session.modelTokens);
    }
  }
  if (Object.keys(bucket.models).length === 0) {
    for (const session of Object.values(bucket.sessions)) mergeModelCounts(bucket.models, session.models);
  }
  if (Object.keys(bucket.modelTokens).length === 0) {
    for (const session of Object.values(bucket.sessions)) mergeModelTokens(bucket.modelTokens, session.modelTokens);
  }
  bucket.calls = Math.max(bucket.calls, sumModelCounts(bucket.models));
  bucket.sessionCount = Object.keys(bucket.sessions).length;
}

/** Index of the bucket holding a timestamp, or -1 when it falls outside. */
function bucketIndexAt(buckets, time) {
  let low = 0;
  let high = buckets.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const bucket = buckets[mid];
    if (time < bucket.start) high = mid - 1;
    else if (time >= bucket.end) low = mid + 1;
    else return mid;
  }
  return -1;
}

function activityDeltaFor(map, index) {
  let entry = map.get(index);
  if (entry === undefined) {
    entry = { tokens: 0, sessions: new Map(), models: {}, modelTokens: {} };
    map.set(index, entry);
  }
  return entry;
}

function activitySessionDeltaFor(entry, id) {
  let session = entry.sessions.get(id);
  if (session === undefined) {
    session = { title: '', tokens: 0, models: {}, modelTokens: {} };
    entry.sessions.set(id, session);
  }
  return session;
}

/**
 * Turns are credited to the bucket their start fell in, which is wrong for a
 * turn that ran across midnight or past the edge of the picked window: the
 * whole spend shows up on one side. Here each turn's tokens are spread over
 * the buckets its wall-clock span covers, and the part that happened outside
 * the window is dropped, so the page reports "what was spent inside the range"
 * rather than "what the session spent in total".
 *
 * Returns true when at least one turn needed correction.
 */
function spreadTurnTokens(buckets, turns, scope = null) {
  if (buckets.length === 0 || !isRecord(turns)) return false;
  const delta = new Map();
  let touched = false;
  for (const state of Object.values(turns)) {
    if (!isRecord(state)) continue;
    const id = String(state.sessionId || '');
    if (id === '') continue;
    if (scope instanceof Set && !scope.has(id)) continue;
    const total = Math.max(0, Number(state.tokens) || 0);
    const modelTokens = isRecord(state.modelTokens) ? state.modelTokens : {};
    const modelTotal = sumModelTokens(modelTokens);
    if (total <= 0 && modelTotal <= 0) continue;
    const start = Math.max(0, Number(state.startedAt) || 0);
    if (start <= 0) continue;
    const length = Math.max(0, Number(state.durationMs) || 0);
    if (length <= 0) continue;
    const end = start + length;
    if (end <= buckets[0].start || start >= buckets[buckets.length - 1].end) continue;
    const startIndex = bucketIndexAt(buckets, start);
    // A turn that starts and ends inside one bucket is already where it belongs.
    if (startIndex >= 0 && end <= buckets[startIndex].end) continue;
    touched = true;
    const title = String(state.title || id);
    // Add the in-window portion to every bucket the turn covers.
    for (let index = Math.max(0, startIndex); index < buckets.length && buckets[index].start < end; index += 1) {
      const bucket = buckets[index];
      const overlap = Math.min(end, bucket.end) - Math.max(start, bucket.start);
      if (overlap <= 0) continue;
      const share = Math.min(1, overlap / length);
      const entry = activityDeltaFor(delta, index);
      entry.tokens += total * share;
      const session = activitySessionDeltaFor(entry, id);
      session.title = session.title || title;
      session.tokens += total * share;
      for (const [name, value] of Object.entries(modelTokens)) {
        const amount = Math.max(0, Number(value) || 0) * share;
        if (amount <= 0) continue;
        entry.modelTokens[name] = (entry.modelTokens[name] || 0) + amount;
        session.modelTokens[name] = (session.modelTokens[name] || 0) + amount;
      }
    }
    // Take back what the start bucket was credited with.
    if (startIndex < 0) continue;
    const origin = activityDeltaFor(delta, startIndex);
    origin.tokens -= total;
    const originSession = activitySessionDeltaFor(origin, id);
    originSession.title = originSession.title || title;
    originSession.tokens -= total;
    for (const [name, value] of Object.entries(modelTokens)) {
      const amount = Math.max(0, Number(value) || 0);
      if (amount <= 0) continue;
      origin.modelTokens[name] = (origin.modelTokens[name] || 0) - amount;
    }
  }
  if (!touched) return false;
  for (const [index, entry] of delta) {
    const bucket = buckets[index];
    if (bucket === undefined) continue;
    bucket.tokens = Math.max(0, Math.round(bucket.tokens + entry.tokens));
    for (const [id, session] of entry.sessions) {
      const item = bucket.sessions[id] || (bucket.sessions[id] = { ...emptySessionEntry(), title: session.title || id });
      if (!item.title) item.title = session.title || id;
      item.tokens = Math.max(0, Math.round(item.tokens + session.tokens));
      for (const [name, value] of Object.entries(session.modelTokens)) {
        item.modelTokens[name] = Math.max(0, Math.round((Number(item.modelTokens[name]) || 0) + value));
      }
    }
    for (const [name, value] of Object.entries(entry.modelTokens)) {
      bucket.modelTokens[name] = Math.max(0, Math.round((Number(bucket.modelTokens[name]) || 0) + value));
    }
    bucket.sessionCount = Object.keys(bucket.sessions).length;
  }
  return true;
}

/**
 * Shared tail of every activity aggregation: bucket totals, the per-session
 * roll-up and the per-model call/token mix. `todayRaw` only matters for the
 * hourly "today" shape, whose day record may predate the hourly breakdown.
 */
function assembleActivityView(shape, buckets, todayRaw) {
  const sessionTotals = new Map();
  for (const bucket of buckets) {
    bucket.sessionCount = Object.keys(bucket.sessions).length;
    bucket.spans = mergeSpans(bucket.spans, bucket.start, bucket.end);
    bucket.busyMs = spanTotalMs(bucket.spans);
    for (const [id, session] of Object.entries(bucket.sessions)) {
      const total = sessionTotals.get(id) || { id, title: session.title || id, tokens: 0, durationMs: 0, busyMs: 0, turns: 0, calls: 0, models: {}, modelTokens: {}, spans: [] };
      total.title = total.title || session.title || id;
      total.tokens += Math.max(0, Number(session.tokens) || 0);
      total.durationMs += Math.max(0, Number(session.durationMs) || 0);
      total.turns += Math.max(0, Number(session.turns) || 0);
      total.calls += Math.max(0, Number(session.calls) || 0);
      if (Array.isArray(session.spans) && session.spans.length > 0) {
        // Bucket spans are already clipped; clipping again here would drop the
        // earlier hours of a session that spans several buckets.
        total.spans = mergeSpans(total.spans.concat(session.spans));
      }
      mergeModelCounts(total.models, session.models);
      mergeModelTokens(total.modelTokens, session.modelTokens);
      sessionTotals.set(id, total);
    }
  }
  for (const total of sessionTotals.values()) {
    // A single session barely overlaps itself, so this is its own busy time.
    total.spans = mergeSpans(total.spans);
    total.busyMs = spanTotalMs(total.spans);
    total.first = total.spans.length > 0 ? total.spans[0][0] : 0;
    total.last = total.spans.length > 0 ? total.spans[total.spans.length - 1][1] : 0;
  }

  const modelCounts = {};
  const modelTokens = {};
  for (const bucket of buckets) {
    mergeModelCounts(modelCounts, bucket.models);
    mergeModelTokens(modelTokens, bucket.modelTokens);
  }
  if (shape === 'today' && Object.keys(modelCounts).length === 0 && isRecord(todayRaw.models)) mergeModelCounts(modelCounts, todayRaw.models);
  if (shape === 'today' && Object.keys(modelTokens).length === 0 && isRecord(todayRaw.modelTokens)) mergeModelTokens(modelTokens, todayRaw.modelTokens);
  const modelTotalCalls = sumModelCounts(modelCounts);
  const modelTokenTotal = sumModelTokens(modelTokens);
  const modelNames = new Set([...Object.keys(modelCounts), ...Object.keys(modelTokens)]);
  const modelTotals = [...modelNames]
    .map(name => {
      const calls = Math.max(0, Number(modelCounts[name]) || 0);
      const tokens = Math.max(0, Number(modelTokens[name]) || 0);
      return { name, calls, tokens, share: modelTotalCalls > 0 ? calls / modelTotalCalls : 0, tokenShare: modelTokenTotal > 0 ? tokens / modelTokenTotal : 0 };
    })
    .sort((a, b) => b.calls - a.calls || b.tokens - a.tokens || a.name.localeCompare(b.name, 'zh-CN'));

  const sum = key => buckets.reduce((total, bucket) => total + bucket[key], 0);
  // The hourly "today" shape tolerates a day record written before the hourly
  // split existed: the day total is used when it is larger than the hours.
  const whole = shape === 'today' ? todayRaw : null;
  const totalTokens = whole === null ? sum('tokens') : Math.max(sum('tokens'), Math.max(0, Number(whole.tokens) || 0));
  const totalDurationMs = whole === null ? sum('durationMs') : Math.max(sum('durationMs'), Math.max(0, Number(whole.durationMs) || 0));
  const totalTurns = whole === null ? sum('turns') : Math.max(sum('turns'), Math.max(0, Number(whole.turns) || 0));
  const totalCalls = whole === null ? sum('calls') : Math.max(sum('calls'), Math.max(0, Number(whole.calls) || 0));

  // Wall-clock coverage of the whole window: overlapping sessions count once.
  const windowSpans = mergeSpans(buckets.reduce((all, bucket) => all.concat(bucket.spans), []));
  const coveredMs = spanTotalMs(windowSpans);
  const busyEstimated = coveredMs <= 0 && totalDurationMs > 0;
  const totalBusyMs = coveredMs > 0 ? coveredMs : totalDurationMs;

  return {
    mode: shape,
    buckets,
    maxTokens: buckets.reduce((peak, bucket) => Math.max(peak, bucket.tokens), 0),
    maxDurationMs: buckets.reduce((peak, bucket) => Math.max(peak, bucket.durationMs), 0),
    busyBuckets: buckets.filter(bucket => bucket.busyMs > 0).length,
    maxCalls: buckets.reduce((peak, bucket) => Math.max(peak, bucket.calls), 0),
    totalTokens,
    totalDurationMs,
    totalBusyMs,
    busyEstimated,
    overlapMs: Math.max(0, totalDurationMs - totalBusyMs),
    spans: windowSpans,
    windowStart: buckets.length > 0 ? buckets[0].start : 0,
    windowEnd: buckets.length > 0 ? buckets[buckets.length - 1].end : 0,
    maxBusyMs: buckets.reduce((peak, bucket) => Math.max(peak, bucket.busyMs), 0),
    totalTurns,
    totalCalls,
    totalModelTokens: modelTokenTotal,
    modelTotals,
    activeDays: buckets.filter(bucket => bucket.tokens > 0 || bucket.durationMs > 0 || bucket.turns > 0 || bucket.calls > 0).length,
    sessionTotals: [...sessionTotals.values()].sort((a, b) => b.durationMs - a.durationMs || b.tokens - a.tokens || a.title.localeCompare(b.title, 'zh-CN')),
  };
}

/**
 * Aggregate the controller's daily activity ledger into today/hour, day, week,
 * or month buckets. The ledger stores local calendar days plus an optional
 * per-hour, per-model breakdown, so the UI can answer both "what happened
 * today" and "which model was called when".
 */
function activityBuckets(days, mode = 'day', now = Date.now(), options = {}) {
  const source = isRecord(days) ? days : {};
  const shape = mode === 'today' ? 'today' : mode === 'week' ? 'week' : mode === 'month' ? 'month' : 'day';
  const scope = isRecord(options) && options.scope instanceof Set ? options.scope : null;
  const turns = isRecord(options) && isRecord(options.turns) ? options.turns : null;
  const buckets = [];
  let todayRaw = {};
  if (shape === 'today') {
    const todayStart = startOfLocalDay(now);
    todayRaw = isRecord(source[localDayKey(now)]) ? source[localDayKey(now)] : {};
    const hourRecords = isRecord(todayRaw.hours) ? todayRaw.hours : {};
    for (let hour = 0; hour < 24; hour += 1) {
      const start = new Date(todayStart);
      start.setHours(hour, 0, 0, 0);
      const key = String(hour).padStart(2, '0');
      const bucket = emptyActivityBucket(key, key + ':00', start.getTime(), start.getTime() + 60 * 60 * 1000);
      const hourRecord = isRecord(hourRecords[key]) ? hourRecords[key] : {};
      absorbActivityRecord(bucket, withDaySpans(hourRecord, todayRaw), scope);
      buckets.push(bucket);
    }
  } else {
    const count = shape === 'day' ? 14 : 12;
    const current = shape === 'week' ? startOfLocalWeek(now) : shape === 'month' ? startOfLocalMonth(now) : startOfLocalDay(now);
    for (let index = count - 1; index >= 0; index -= 1) {
      let start;
      let end;
      if (shape === 'day') {
        start = addLocalDays(current, -index);
        end = addLocalDays(start, 1);
      } else if (shape === 'week') {
        start = addLocalDays(current, -index * 7);
        end = addLocalDays(start, 7);
      } else {
        const anchor = new Date(current);
        anchor.setMonth(anchor.getMonth() - index, 1);
        start = anchor.getTime();
        const next = new Date(start);
        next.setMonth(next.getMonth() + 1, 1);
        end = next.getTime();
      }
      buckets.push(emptyActivityBucket(
        shape === 'month' ? localDayKey(start).slice(0, 7) : localDayKey(start),
        shape === 'month' ? (new Date(start).getFullYear() + '.' + String(new Date(start).getMonth() + 1).padStart(2, '0')) : shortDayLabel(start),
        start,
        end,
      ));
    }
    for (const [key, raw] of Object.entries(source)) {
      if (!isRecord(raw)) continue;
      const time = dayKeyTime(key);
      if (time === 0) continue;
      const bucket = buckets.find(item => time >= item.start && time < item.end);
      if (bucket !== undefined) absorbActivityRecord(bucket, raw, scope);
    }
  }
  // Range-exact tokens: spread cross-bucket turns, then drop the day-record
  // fallback, which would put whole-session numbers back on the page.
  const spread = turns === null ? false : spreadTurnTokens(buckets, turns, scope);
  return assembleActivityView(shape, buckets, spread || scope !== null ? {} : todayRaw);
}

/** Granularities a custom window can be cut into. */
const ACTIVITY_GRAINS = ['hour', 'day', 'week', 'month'];

/** Bucket ceiling for one custom window; coarser grains keep the page fast. */
const MAX_RANGE_BUCKETS = 240;

/**
 * Inclusive local-day bounds for a custom window given two YYYY-MM-DD keys.
 * Missing or unusable keys fall back to today and reversed keys are swapped,
 * so the UI can hand over whatever the date inputs currently hold.
 */
function activityRangeBounds(from, to, now = Date.now()) {
  const fromTime = dayKeyTime(from);
  const toTime = dayKeyTime(to);
  const anchor = startOfLocalDay(now);
  let startDay = fromTime > 0 ? startOfLocalDay(fromTime) : anchor;
  let endDay = toTime > 0 ? startOfLocalDay(toTime) : anchor;
  if (endDay < startDay) {
    const swap = startDay;
    startDay = endDay;
    endDay = swap;
  }
  return { start: startDay, end: addLocalDays(endDay, 1) };
}

function stepActivityBucket(time, grain) {
  if (grain === 'hour') {
    const date = new Date(time);
    date.setHours(date.getHours() + 1);
    return date.getTime();
  }
  if (grain === 'month') {
    const date = new Date(time);
    date.setMonth(date.getMonth() + 1, 1);
    return date.getTime();
  }
  if (grain === 'week') return addLocalDays(time, 7);
  return addLocalDays(time, 1);
}

function activityBucketCount(start, end, grain) {
  if (grain === 'hour') return Math.ceil((end - start) / (60 * 60 * 1000));
  if (grain === 'week') return Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000));
  if (grain === 'month') {
    const from = new Date(start);
    const to = new Date(end);
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
  }
  return Math.ceil((end - start) / (24 * 60 * 60 * 1000));
}

/** Coarsen the requested granularity until the window fits the bucket ceiling. */
function activityRangeGrain(grain, start, end) {
  let index = Math.max(0, ACTIVITY_GRAINS.indexOf(String(grain)));
  while (index < ACTIVITY_GRAINS.length - 1 && activityBucketCount(start, end, ACTIVITY_GRAINS[index]) > MAX_RANGE_BUCKETS) index += 1;
  return ACTIVITY_GRAINS[index];
}

function bucketStartFor(start, grain) {
  if (grain === 'month') return startOfLocalMonth(start);
  if (grain === 'week') return startOfLocalWeek(start);
  return start;
}

function bucketKeyFor(time, grain) {
  if (grain === 'hour') return localDayKey(time) + 'T' + localHourKey(time);
  if (grain === 'month') return localDayKey(time).slice(0, 7);
  return localDayKey(time);
}

function bucketLabelFor(time, grain) {
  if (grain === 'hour') return localHourKey(time) + ':00';
  if (grain === 'month') return new Date(time).getFullYear() + '.' + String(new Date(time).getMonth() + 1).padStart(2, '0');
  return shortDayLabel(time);
}

/**
 * Any window the user picks: every metric in {@link activityBuckets} is
 * recomputed for [from, to] only, cut into hours, days, weeks or months.
 */
function activityRange(days, options = {}, now = Date.now()) {
  const source = isRecord(days) ? days : {};
  const scope = isRecord(options) && options.scope instanceof Set ? options.scope : null;
  const turns = isRecord(options) && isRecord(options.turns) ? options.turns : null;
  const bounds = activityRangeBounds(options.from, options.to, now);
  const requestedGrain = ACTIVITY_GRAINS.includes(String(options.grain)) ? String(options.grain) : 'day';
  const grain = activityRangeGrain(requestedGrain, bounds.start, bounds.end);
  const buckets = [];
  let cursor = bucketStartFor(bounds.start, grain);
  while (cursor < bounds.end) {
    const next = stepActivityBucket(cursor, grain);
    buckets.push(emptyActivityBucket(bucketKeyFor(cursor, grain), bucketLabelFor(cursor, grain), cursor, next));
    cursor = next;
  }
  for (const [key, raw] of Object.entries(source)) {
    if (!isRecord(raw)) continue;
    const time = dayKeyTime(key);
    if (time === 0 || time < bounds.start || time >= bounds.end) continue;
    if (grain === 'hour') {
      const hours = isRecord(raw.hours) ? raw.hours : {};
      for (let hour = 0; hour < 24; hour += 1) {
        const at = new Date(time);
        at.setHours(hour, 0, 0, 0);
        const bucket = buckets.find(item => at.getTime() >= item.start && at.getTime() < item.end);
        const hourRecord = isRecord(hours[String(hour).padStart(2, '0')]) ? hours[String(hour).padStart(2, '0')] : {};
        if (bucket !== undefined) absorbActivityRecord(bucket, withDaySpans(hourRecord, raw), scope);
      }
    } else {
      const bucket = buckets.find(item => time >= item.start && time < item.end);
      if (bucket !== undefined) absorbActivityRecord(bucket, raw, scope);
    }
  }
  if (turns !== null) spreadTurnTokens(buckets, turns, scope);
  const view = assembleActivityView('custom', buckets, {});
  return {
    ...view,
    mode: 'custom',
    grain,
    requestedGrain,
    start: bounds.start,
    end: bounds.end,
    days: Math.max(1, Math.round((bounds.end - bounds.start) / (24 * 60 * 60 * 1000))),
  };
}

/** Narrow a ledger record to the picked sessions (wall cells reuse it). */
function scopedRecord(raw, scope) {
  if (!(scope instanceof Set) || !isRecord(raw)) return raw;
  let tokens = 0;
  let durationMs = 0;
  let spans = [];
  for (const [id, session] of Object.entries(isRecord(raw.sessions) ? raw.sessions : {})) {
    if (!scope.has(id) || !isRecord(session)) continue;
    tokens += Math.max(0, Number(session.tokens) || 0);
    durationMs += Math.max(0, Number(session.durationMs) || 0);
    if (Array.isArray(session.spans)) spans = spans.concat(session.spans);
  }
  return { tokens, durationMs, spans };
}

/**
 * GitHub-style daily activity wall: seven weekday rows by 53 weeks, with a
 * four-step token intensity scale. Future cells stay blank rather than zero.
 * When a window is supplied, cells outside it are flagged so the wall can dim
 * them while keeping the long-range rhythm readable.
 */
function activityWall(days, now = Date.now(), weeks = 53, range = null, scope = null) {
  const source = isRecord(days) ? days : {};
  const count = Math.max(4, Math.min(60, Math.floor(Number(weeks) || 53)));
  const bounds = isRecord(range) && Number(range.start) > 0 && Number(range.end) > Number(range.start)
    ? { start: Number(range.start), end: Number(range.end) }
    : null;
  const today = startOfLocalDay(now);
  const first = addLocalDays(startOfLocalWeek(now), -(count - 1) * 7);
  const rawWeeks = [];
  let maxTokens = 0;
  let activeDays = 0;
  let totalTokens = 0;
  for (let week = 0; week < count; week += 1) {
    const cells = [];
    for (let day = 0; day < 7; day += 1) {
      const time = addLocalDays(first, week * 7 + day);
      const key = localDayKey(time);
      const raw = scopedRecord(isRecord(source[key]) ? source[key] : {}, scope);
      const tokens = Math.max(0, Number(raw.tokens) || 0);
      const durationMs = Math.max(0, Number(raw.durationMs) || 0);
      const busyMs = spanTotalMs(mergeSpans(Array.isArray(raw.spans) ? raw.spans : [], time, time + 24 * 60 * 60 * 1000));
      const future = time > today;
      const outside = bounds !== null && !future && (time < bounds.start || time >= bounds.end);
      if (!future && !outside && (tokens > 0 || durationMs > 0)) activeDays += 1;
      if (!future) {
        // Inside a chosen window only that window decides the colour scale.
        totalTokens += outside ? 0 : tokens;
        maxTokens = Math.max(maxTokens, outside ? 0 : tokens);
      }
      cells.push({ key, time, tokens, durationMs, busyMs, future, outside, level: 0 });
    }
    rawWeeks.push(cells);
  }
  for (const cells of rawWeeks) {
    for (const cell of cells) {
      if (cell.future) continue;
      if (cell.tokens <= 0 && cell.durationMs <= 0) continue;
      cell.level = maxTokens <= 0 ? 1 : Math.max(1, Math.min(4, Math.ceil(cell.tokens / maxTokens * 4)));
    }
  }
  const monthLabels = [];
  let previousMonth = -1;
  for (let week = 0; week < rawWeeks.length; week += 1) {
    const firstCell = rawWeeks[week][0];
    const month = new Date(firstCell.time).getMonth();
    if (month !== previousMonth) {
      previousMonth = month;
      monthLabels.push({ index: week, label: (month + 1) + '月' });
    }
  }
  return { weeks: rawWeeks, monthLabels, maxTokens, activeDays, totalTokens, start: first, range: bounds };
}

/** Time windows offered by the overview filter bar. */
const TIME_FILTERS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
];

/** Local timestamp floor for a time filter, or 0 when unbounded. */
function timeFilterFloor(range, now = Date.now()) {
  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (range === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  if (range === '30d') return now - 30 * 24 * 60 * 60 * 1000;
  return 0;
}

/** Does one session belong to the selected status bucket? */
function matchesStatus(entry, status, now = Date.now(), stallAfterMs = STALL_AFTER_MS) {
  if (!status || status === 'all') return true;
  if (status === 'live') return entry.status === 'running' || entry.status === 'tool';
  if (status === 'waiting') return entry.status === 'approval' || entry.status === 'question';
  if (status === 'stalled') return isStalledEntry(entry, now, stallAfterMs);
  if (status === 'finished') return entry.status === 'done' || entry.status === 'migration';
  if (status === 'idle') return entry.status === 'idle';
  return true;
}

/** Case-insensitive local filter across visible fields, narrowed by time, workspace, model and status. */
function filterEntries(entries, query, filters) {
  const settings = filters || {};
  const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  const workspace = settings.workspace && settings.workspace !== 'all' ? settings.workspace : '';
  const model = settings.model && settings.model !== 'all' ? settings.model : '';
  const status = typeof settings.status === 'string' ? settings.status : 'all';
  const now = Number(settings.now) || Date.now();
  const stallAfterMs = normalizeStallMs(settings.stallAfterMs);
  const floor = timeFilterFloor(settings.range, now);
  const statusActive = status !== '' && status !== 'all';
  if (terms.length === 0 && workspace === '' && model === '' && floor === 0 && !statusActive) return entries.slice();
  return entries.filter(entry => {
    if (!matchesStatus(entry, status, now, stallAfterMs)) return false;
    if (workspace !== '' && entry.workspace !== workspace) return false;
    if (model !== '' && entry.model !== model) return false;
    if (floor > 0 && (Number(entry.updatedAt) || 0) < floor) return false;
    if (terms.length === 0) return true;
    const haystack = [
      entry.title,
      entry.workspace,
      entry.cwd,
      entry.model,
      entry.currentTool?.name,
      entry.currentTool?.label,
      entry.currentTodo?.content,
      ...entry.actions.map(action => action.name + ' ' + action.label + ' ' + action.detail),
    ].join(' ').toLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}

/** Distinct workspace and model values available for the filter bar, with session counts. */
function filterOptions(entries, now = Date.now(), options = {}) {
  const stallAfterMs = normalizeStallMs(options.stallAfterMs);
  const workspaces = new Map();
  const models = new Map();
  for (const entry of entries) {
    if (entry.workspace) workspaces.set(entry.workspace, (workspaces.get(entry.workspace) || 0) + 1);
    if (entry.model) models.set(entry.model, (models.get(entry.model) || 0) + 1);
  }
  const list = map => [...map.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'zh-Hans-CN'))
    .map(([value, count]) => ({ value, label: value, count }));
  const statuses = STATUS_FILTERS
    .map(option => ({
      value: option.value,
      label: option.label,
      count: option.value === 'all' ? entries.length : entries.filter(entry => matchesStatus(entry, option.value, now, stallAfterMs)).length,
    }))
    .filter(option => option.value === 'all' || option.count > 0);
  return { workspaces: list(workspaces), models: list(models), statuses };
}

/** Narrow deliverables to a local time window; default is one week in the UI. */
function filterDeliverables(items, range, now = Date.now()) {
  const floor = timeFilterFloor(range, Number(now) || Date.now());
  const list = Array.isArray(items) ? items : [];
  if (floor <= 0) return list.slice();
  return list.filter(item => (Number(item?.at) || 0) >= floor);
}

/** Flatten and dedupe deliverables across entries for the delivery board. */
function aggregateDeliverables(entries) {
  const seen = new Map();
  for (const entry of entries) {
    for (const item of entry.deliverables || []) {
      const key = entry.id + '\u0000' + item.path;
      if (!seen.has(key)) seen.set(key, { ...item, sessionId: entry.id, sessionTitle: entry.title, workspace: entry.workspace });
    }
  }
  return [...seen.values()].sort((a, b) => b.at - a.at).slice(0, 120);
}

/** Counters used by the rail, the dock header, and the overview. */
function computeCounts(entries) {
  let active = 0;
  let waiting = 0;
  let unread = 0;
  let pinned = 0;
  let tokenSum = 0;
  let steps = 0;
  let deliverables = 0;
  let stalled = 0;
  for (const entry of entries) {
    if (entry.status === 'running' || entry.status === 'tool') active += 1;
    if (entry.stalled === true) stalled += 1;
    if (entry.status === 'approval' || entry.status === 'question') waiting += 1;
    if (entry.unread) unread += 1;
    if (entry.pinned) pinned += 1;
    tokenSum += entry.tokenTotal || 0;
    steps += Number(entry.stats?.steps) || 0;
    deliverables += entry.deliverableCount || 0;
  }
  return { active, waiting, unread, pinned, stalled, tokenSum, steps, deliverables, total: entries.length };
}

/**
 * Aggregate the tool chain of every kept turn: how often a tool ran, how long it
 * took in total, and how many of those calls failed. Sorted by total time.
 */
function toolBreakdown(turns, limit = 6) {
  const map = new Map();
  for (const turn of Array.isArray(turns) ? turns : []) {
    const chain = Array.isArray(turn && turn.chain) ? turn.chain : [];
    for (const step of chain) {
      const name = String((step && (step.name || step.label)) || 'tool');
      const row = map.get(name) || { name, count: 0, totalMs: 0, failed: 0, slowestMs: 0, lastPath: '' };
      const duration = Math.max(0, Number(step && step.durationMs) || 0);
      row.count += 1;
      row.totalMs += duration;
      row.slowestMs = Math.max(row.slowestMs, duration);
      if (step && step.status === 'error') row.failed += 1;
      if (step && step.path) row.lastPath = step.path;
      map.set(name, row);
    }
  }
  const rows = [...map.values()].map(row => ({ ...row, avgMs: row.count > 0 ? Math.round(row.totalMs / row.count) : 0 }));
  rows.sort((a, b) => b.totalMs - a.totalMs || b.count - a.count || a.name.localeCompare(b.name));
  const head = typeof limit === 'number' && limit > 0 ? rows.slice(0, limit) : rows;
  const rest = rows.slice(head.length);
  if (rest.length > 0) {
    const sum = key => rest.reduce((total, row) => total + row[key], 0);
    head.push({
      name: '其他 ' + rest.length + ' 种工具',
      count: sum('count'),
      totalMs: sum('totalMs'),
      failed: sum('failed'),
      slowestMs: 0,
      avgMs: 0,
      lastPath: '',
      other: true,
    });
  }
  return head;
}

/** Which kind of work a tool call stands for, independent of its exact name. */
const WORK_KIND = {
  read_file: 'read', list_files: 'read', read_dir: 'read', glob: 'read', grep: 'read', search_files: 'read', list_directory: 'read',
  write_file: 'write', edit_file: 'write', apply_patch: 'write', str_replace_editor: 'write', multi_edit: 'write', create_file: 'write',
  run_code: 'run', run_command: 'run', shell: 'run', pwsh: 'run', bash: 'run', computer_use: 'run', kill_job: 'run', job_output: 'run',
  web_search: 'search', web_fetch: 'search', fetch: 'search', recalc: 'run',
  todo_write: 'plan', update_plan: 'plan', exit_plan: 'plan',
  present_file: 'present', present: 'present', send_file: 'present',
};

const WORK_CATEGORY_KIND = { file: 'read', code: 'run', plan: 'plan', deliver: 'present', search: 'search', job: 'run', image: 'run', computer: 'run' };

/** Human label + plural unit for one work kind, used to build a one-line digest. */
const WORK_TEXT = {
  read: ['读文件', '次'],
  write: ['改代码', '处'],
  run: ['执行', '次'],
  search: ['查资料', '次'],
  plan: ['更新计划', '次'],
  present: ['交付产物', '份'],
  other: ['其他操作', '次'],
};

/**
 * What one round actually did, in one line. The UI shows this instead of the
 * raw tool chain: "改代码 4 处 · 执行 3 次 · 读文件 2 次" tells a reader more
 * than a list of nine tool names.
 */
function turnDigest(turn) {
  const chain = Array.isArray(turn && turn.chain) ? turn.chain : [];
  const counts = { read: 0, write: 0, run: 0, search: 0, plan: 0, present: 0, other: 0 };
  for (const step of chain) {
    const name = String((step && step.name) || '');
    const kind = WORK_KIND[name] || WORK_CATEGORY_KIND[step && step.category] || 'other';
    counts[kind] = (counts[kind] || 0) + 1;
  }
  const files = Array.isArray(turn && turn.deliverables) ? turn.deliverables.length : 0;
  const writes = Math.max(counts.write, files);
  const parts = [];
  const order = ['write', 'run', 'read', 'search', 'plan', 'present', 'other'];
  for (const kind of order) {
    const value = kind === 'write' ? writes : counts[kind];
    if (!value) continue;
    const text = WORK_TEXT[kind];
    parts.push(text[0] + ' ' + value + ' ' + text[1]);
  }
  const errors = Number(turn && turn.errors) || 0;
  if (errors > 0) parts.push('失败 ' + errors + ' 次');
  return {
    counts: Object.assign({}, counts, { write: writes }),
    files: files,
    steps: chain.length,
    summary: parts.join(' · '),
  };
}

/** Parent session plus subagent branches of one session, resolved against the ledger. */
function sessionBranches(entries, id) {
  const list = Array.isArray(entries) ? entries : [];
  const self = list.find(entry => entry && entry.id === id) || null;
  const parentId = self && self.parentId ? String(self.parentId) : '';
  const parent = parentId ? list.find(entry => entry && entry.id === parentId) || null : null;
  const children = list.filter(entry => entry && entry.id !== id && entry.parentId === id);
  return { self, parentId, parent, children };
}

const TURN_STATE_TEXT = { done: '已完成', running: '进行中', open: '已中断', error: '有失败' };

const FILE_TOOL_TEXT = { write: '写入', edit: '编辑', apply_patch: '补丁', str_replace_editor: '编辑', present: '交付' };

/**
 * Markdown report of one session: what each round asked for, what the agent
 * replied, which tools it ran and which files it touched. Built for the
 * "导出报告" button so a run can be pasted into a note or a PR.
 */
function sessionReportMarkdown(entry, options = {}) {
  const turns = Array.isArray(entry && entry.turns) ? entry.turns : [];
  const now = Number(options.now) || Date.now();
  const lines = [];
  lines.push('# ' + (entry.title || entry.id || '会话'));
  lines.push('');
  lines.push('- 会话：`' + String(entry.id || '') + '`');
  if (entry.workspace) lines.push('- 工作区：' + entry.workspace);
  if (entry.model) lines.push('- 模型：' + entry.model);
  lines.push('- 状态：' + (entry.statusLabel || entry.status || '未知'));
  lines.push('- 累计 token：' + formatTokens(entry.tokenTotal) + (entry.tokenTotal > 0 ? '（' + formatTokensExact(entry.tokenTotal) + '）' : ''));
  if (entry.contextPercent !== null && entry.contextPercent !== undefined) lines.push('- 上下文占用：' + entry.contextPercent + '%');
  lines.push('- 轮次：' + turns.length + ' · 工具调用：' + (Number(entry.toolCount) || 0) + ' · 文件改动：' + (Number(entry.deliverableCount) || 0));
  const tools = toolBreakdown(turns, 5).filter(row => row.other !== true);
  if (tools.length > 0) {
    lines.push('- 主要工具：' + tools.map(row => row.name + ' × ' + row.count).join('、'));
  }
  lines.push('- 生成时间：' + new Date(now).toLocaleString('zh-CN'));
  lines.push('');
  if (turns.length === 0) {
    lines.push('_还没有记录到对话轮次。_');
    return lines.join('\n');
  }
  for (const turn of turns) {
    const head = [];
    head.push('## 第 ' + turn.index + ' 轮');
    head.push(TURN_STATE_TEXT[turn.state] || '已完成');
    if (turn.durationMs > 0) head.push(formatDuration(turn.durationMs));
    if (turn.calls > 0) head.push(turn.calls + ' 次工具');
    if (turn.tokens > 0) head.push(formatTokens(turn.tokens) + ' token');
    lines.push(head.join(' · '));
    lines.push('');
    if (turn.prompt) {
      lines.push('**用户指令**');
      lines.push('');
      for (const line of String(turn.prompt).split(/\r?\n/)) lines.push('> ' + line);
      lines.push('');
    }
    if (turn.text) {
      lines.push('**AI 回复**');
      lines.push('');
      lines.push(String(turn.text).trim());
      lines.push('');
    }
    if (turn.reasoning) {
      lines.push('**思考摘要**');
      lines.push('');
      lines.push(String(turn.reasoning).trim());
      lines.push('');
    }
    const chain = Array.isArray(turn.chain) ? turn.chain : [];
    if (chain.length > 0) {
      lines.push('**工具链**' + (turn.chainTotal > chain.length ? '（共 ' + turn.chainTotal + ' 步，列出前 ' + chain.length + ' 步）' : ''));
      lines.push('');
      chain.forEach((step, index) => {
        const parts = [];
        const label = String(step.label || step.name || 'tool');
        parts.push('`' + String(step.name || 'tool') + '`');
        if (label !== '' && label !== step.name) parts.push(label);
        const target = step.path || step.detail || '';
        if (target !== '' && target !== label && target !== step.name) parts.push(String(target));
        if (step.durationMs > 0) parts.push(formatDuration(step.durationMs));
        if (step.status === 'error') parts.push('失败');
        lines.push((index + 1) + '. ' + parts.filter(Boolean).join(' · '));
      });
      lines.push('');
    }
    const files = Array.isArray(turn.deliverables) ? turn.deliverables : [];
    if (files.length > 0) {
      lines.push('**文件改动**');
      lines.push('');
      for (const item of files) lines.push('- `' + String(item.path || '') + '`（' + (FILE_TOOL_TEXT[item.tool] || '改动') + '）');
      lines.push('');
    }
    const models = turn.models || {};
    const modelNames = Object.keys(models);
    if (modelNames.length > 0) {
      lines.push('**模型**：' + modelNames.map(name => name + (models[name] > 0 ? ' × ' + models[name] : '')).join('、'));
      lines.push('');
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** dsh-resource://file/... builder shared with the Sidebar file preview. */
function fileAddress(sessionId, path) {
  const normalized = String(path || '').replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
  const encode = segment => encodeURIComponent(segment).replace(/%3A/gi, ':');
  return 'dsh-resource://file/session/' + encode(String(sessionId)) + '/' + normalized.split('/').map(encode).join('/');
}

/** Last two path segments, enough to identify a file in a dense row. */
function shortPath(path) {
  const normalized = String(path || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 2) return normalized;
  return '…/' + parts.slice(-2).join('/');
}

/** Safe JSON read from a Web Storage-like object. */
function readStoredJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    if (typeof raw !== 'string' || raw === '') return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Safe JSON write; storage failures are intentionally silent. */
function writeStoredJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}


    // ---- styles -----------------------------------------------------------
/**
 * Session Radar visual system.
 *
 * Operate-mode rules: a data-dense card matrix, restrained state colour,
 * native product type, one authored motion (the live radar sweep), and full
 * light/dark token support. The floating dock keeps its compact rows.
 */
const RADAR_CSS = [
  ".dsr-dock, .dsr-dock *, .dsr-page, .dsr-page *, .dsr-rail, .dsr-rail * { box-sizing: border-box; } .dsr-dock, .dsr-page, .dsr-rail { font-family: var(--dsw-font-family); }",
  ":root, body { --dsr-accent: var(--dsw-alias-brand-primary); --dsr-green: var(--dsw-alias-state-success-primary); --dsr-amber: var(--dsw-alias-state-warn-primary); --dsr-red: var(--dsw-alias-state-error-primary); --dsr-line: var(--dsw-alias-border-l2); --dsr-line-soft: var(--dsw-alias-border-l1); --dsr-bg: var(--dsw-alias-bg-layer-1); --dsr-soft: var(--dsw-alias-bg-layer-2); --dsr-text: var(--dsw-alias-label-primary); --dsr-secondary: var(--dsw-alias-label-secondary); --dsr-muted: var(--dsw-alias-label-tertiary); --dsr-focus: var(--dsw-focus-ring-color); }",
  ".dsr-rail { position: fixed; right: 8px; top: 92px; z-index: 57; transform: none; display: flex; flex-direction: column; align-items: center; gap: 7px; width: 42px; padding: 10px 0 8px; border: 1px solid var(--dsr-line); border-radius: 21px; background: var(--dsr-bg); color: var(--dsr-secondary); box-shadow: var(--dsw-shadow-lv2); cursor: grab; touch-action: none; user-select: none; transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease, transform 160ms ease; } .dsr-rail.is-dragging { cursor: grabbing; transition: none; }",
  ".dsr-rail:hover { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 36%, var(--dsr-line)); transform: translateX(-2px); }",
  ".dsr-rail:active { transform: translateX(0); }",
  ".dsr-rail__glyph { width: 24px; height: 24px; display: grid; place-items: center; }",
  ".dsr-rail__count { min-width: 20px; height: 18px; padding: 0 5px; border-radius: 9px; display: grid; place-items: center; background: var(--dsr-soft); color: var(--dsr-text); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; }",
  ".dsr-rail__count.has-work { background: var(--dsr-accent); color: var(--dsw-alias-label-primary-inverted); }",
  ".dsr-rail__label { writing-mode: vertical-rl; text-orientation: upright; letter-spacing: 2px; font: var(--dsw-font-xxxs-strong-11); color: currentColor; }",
  ".dsr-rail__unread { position: absolute; top: 5px; right: 5px; width: 7px; height: 7px; border: 1.5px solid var(--dsr-bg); border-radius: 50%; background: var(--dsr-green); box-sizing: content-box; box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 12%, transparent); }",
  ".dsr-scrim { position: fixed; inset: 0; z-index: 58; background: var(--dsw-alias-bg-mask-1); animation: dsr-fade 150ms ease-out; }",
  ".dsr-dock { position: fixed; z-index: 59; top: max(64px, calc(var(--dsh-frame-top-clearance, 0px) + 48px)); right: 14px; bottom: 14px; width: min(430px, calc(100vw - 28px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--dsr-line); border-radius: 26px; background: var(--dsr-bg); color: var(--dsr-text); box-shadow: var(--dsw-shadow-lv3); animation: dsr-slide-in 200ms cubic-bezier(.2,.8,.2,1); }",
  ".dsr-dock__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px 14px 11px 16px; }",
  ".dsr-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }",
  ".dsr-brand__mark { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 50%; background: transparent; color: var(--dsr-accent); flex: none; }",
  ".dsr-brand__copy { min-width: 0; }",
  ".dsr-brand__title { margin: 0; font: var(--dsw-font-s-strong-14); letter-spacing: -.01em; }",
  ".dsr-brand__sub { margin: 2px 0 0; font: var(--dsw-font-xxxs-11); color: var(--dsr-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-header-actions { display: flex; align-items: center; gap: 2px; flex: none; }",
  ".dsr-icon-btn { width: 28px; height: 28px; padding: 0; border: 0; border-radius: 7px; display: grid; place-items: center; background: transparent; color: var(--dsr-secondary); cursor: pointer; transition: background-color 140ms ease, color 140ms ease; }",
  ".dsr-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsr-text); }",
  ".dsr-icon-btn:active { background: var(--dsw-alias-interactive-bg-active); }",
  ".dsr-icon-btn.is-active { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); }",
  ".dsr-icon-btn.is-danger:hover { color: var(--dsr-red); background: color-mix(in srgb, var(--dsr-red) 10%, transparent); }",
  ".dsr-icon-btn:disabled { opacity: .4; cursor: default; }",
  ".dsr-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line); }",
  ".dsr-stat { min-width: 0; padding: 8px 12px 9px; border-right: 1px solid var(--dsr-line-soft); background: transparent; text-align: left; }",
  ".dsr-stat:last-child { border-right: 0; }",
  ".dsr-stat--button { cursor: pointer; }",
  ".dsr-stat--button:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-stat__value { display: block; font: var(--dsw-font-s-strong-14); font-variant-numeric: tabular-nums; line-height: 18px; }",
  ".dsr-stat__label { display: block; margin-top: 1px; font: var(--dsw-font-xxxs-11); color: var(--dsr-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-tabs { display: flex; align-items: center; gap: 18px; padding: 0 16px; border-bottom: 1px solid var(--dsr-line); flex: none; }",
  ".dsr-tab { position: relative; height: 35px; padding: 0; border: 0; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xs-13); cursor: pointer; }",
  ".dsr-page__views .dsr-tab:hover { color: var(--dsr-text); }",
  ".dsr-page__views .dsr-tab.is-active { color: var(--dsr-text); font-weight: 600; }",
  ".dsr-tab.is-active::after { content: \"\"; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: var(--dsr-accent); }",
  ".dsr-tab__count { margin-left: 4px; color: var(--dsr-muted); font-variant-numeric: tabular-nums; font-weight: 400; }",
  ".dsr-searchrow { display: flex; align-items: center; gap: 6px; padding: 10px 12px 8px; flex: none; }",
  ".dsr-search { min-width: 0; flex: 1; display: flex; align-items: center; gap: 6px; height: 31px; padding: 0 9px; border: 1px solid transparent; border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-muted); transition: border-color 140ms ease, background-color 140ms ease; }",
  ".dsr-search:focus-within { border-color: var(--dsr-focus); background: var(--dsr-bg); }",
  ".dsr-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--dsr-text); font: var(--dsw-font-xs-13); }",
  ".dsr-search input::placeholder { color: var(--dsr-muted); }",
  ".dsr-search input { caret-color: var(--dsr-accent); }",
  ".dsr-dock ::selection, .dsr-page ::selection { background: color-mix(in srgb, var(--dsr-accent) 22%, transparent); color: var(--dsr-text); }",
  ".dsr-search button { width: 18px; height: 18px; padding: 0; border: 0; background: transparent; color: var(--dsr-muted); display: grid; place-items: center; cursor: pointer; }",
  ".dsr-search button:hover { color: var(--dsr-text); }",
  ".dsr-scroll { min-height: 0; flex: 1; overflow: auto; overscroll-behavior: contain; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-scroll::-webkit-scrollbar { width: 8px; height: 8px; }",
  ".dsr-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l2); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }",
  ".dsr-scroll::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-scrollbar-hover-l2); background-clip: padding-box; }",
  ".dsr-section { border-bottom: 1px solid var(--dsr-line); }",
  ".dsr-section:last-child { border-bottom: 0; }",
  ".dsr-section__head { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px 7px; }",
  ".dsr-section__title { margin: 0; font: var(--dsw-font-xxxs-strong-11); letter-spacing: .06em; color: var(--dsr-muted); }",
  ".dsr-section__count { font: var(--dsw-font-xxxs-11); color: var(--dsr-muted); font-variant-numeric: tabular-nums; }",
  ".dsr-session-row { position: relative; display: flex; align-items: stretch; border-top: 1px solid var(--dsr-line-soft); transition: background-color 140ms ease; }",
  ".dsr-session-row:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-session-row.is-selected { background: color-mix(in srgb, var(--dsr-accent) 7%, var(--dsr-bg)); }",
  ".dsr-row-main { min-width: 0; flex: 1; display: flex; gap: 9px; padding: 11px 8px 10px 15px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-dot { width: 7px; height: 7px; margin-top: 6px; flex: none; border-radius: 50%; background: var(--dsr-muted); box-shadow: 0 0 0 3px transparent; }",
  ".dsr-session-row[data-tone=\"running\"] .dsr-dot, .dsr-session-row[data-tone=\"tool\"] .dsr-dot { background: var(--dsr-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 14%, transparent); animation: dsr-pulse 2s ease-out infinite; }",
  ".dsr-session-row[data-tone=\"tool\"] .dsr-dot { background: var(--dsr-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-accent) 14%, transparent); }",
  ".dsr-session-row[data-tone=\"approval\"] .dsr-dot, .dsr-session-row[data-tone=\"question\"] .dsr-dot { background: var(--dsr-amber); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-amber) 14%, transparent); }",
  ".dsr-session-row[data-tone=\"done\"] .dsr-dot { background: var(--dsr-green); }",
  ".dsr-session-row[data-tone=\"migration\"] .dsr-dot { background: var(--dsr-amber); }",
  ".dsr-row-body { min-width: 0; flex: 1; }",
  ".dsr-row-top { display: flex; align-items: center; gap: 7px; min-width: 0; }",
  ".dsr-row-title { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-strong-13); }",
  ".dsr-row-top .dsr-badge { flex: none; }",
  ".dsr-row-meta { display: flex; align-items: center; gap: 5px; min-width: 0; margin-top: 2px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; overflow: hidden; }",
  ".dsr-row-meta span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-row-meta .sep { color: var(--dsr-line); flex: none; }",
  ".dsr-row-live { display: flex; align-items: center; gap: 5px; min-width: 0; margin-top: 7px; font: var(--dsw-font-xxs-12); color: var(--dsr-secondary); }",
  ".dsr-row-live .dsr-tool-glyph { color: var(--dsr-accent); }",
  ".dsr-live-label { flex: none; font-weight: 550; color: var(--dsr-text); }",
  ".dsr-live-detail { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-secondary); }",
  ".dsr-live-elapsed { flex: none; margin-left: auto; color: var(--dsr-muted); font-variant-numeric: tabular-nums; font: var(--dsw-font-xxxs-11); }",
  ".dsr-row-bottom { display: flex; align-items: center; gap: 9px; margin-top: 7px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-metric { display: inline-flex; align-items: center; gap: 3px; }",
  ".dsr-metric strong { font-weight: 600; color: var(--dsr-secondary); }",
  ".dsr-metric .dsr-mini-bar { width: 34px; height: 3px; border-radius: 2px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-mini-bar > i { display: block; height: 100%; background: var(--dsr-accent); border-radius: 2px; }",
  ".dsr-progress { height: 2px; margin-top: 8px; border-radius: 2px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-progress__fill { height: 100%; border-radius: 2px; background: var(--dsr-accent); transition: width 300ms ease; }",
  ".dsr-progress.is-busy .dsr-progress__fill { width: 34%; animation: dsr-indeterminate 1.5s ease-in-out infinite; }",
  ".dsr-row-actions { display: flex; align-items: flex-start; gap: 1px; padding: 8px 7px 0 0; }",
  ".dsr-row-actions .dsr-icon-btn { width: 25px; height: 25px; }",
  ".dsr-row-actions .dsr-icon-btn[aria-pressed=\"true\"] { color: var(--dsr-accent); }",
  ".dsr-session-row.is-compact .dsr-row-main { padding-top: 9px; padding-bottom: 8px; }",
  ".dsr-session-row.is-compact .dsr-row-live, .dsr-session-row.is-compact .dsr-progress { display: none; }",
  ".dsr-session-row.is-compact .dsr-row-bottom { margin-top: 3px; }",
  ".dsr-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 30px 26px 28px; text-align: center; }",
  ".dsr-empty__icon { width: 34px; height: 34px; display: grid; place-items: center; color: var(--dsr-muted); border: 1px solid var(--dsr-line); border-radius: 11px; }",
  ".dsr-empty__title { margin: 3px 0 0; font: var(--dsw-font-s-strong-14); }",
  ".dsr-empty__text { max-width: 290px; margin: 0; color: var(--dsr-muted); font: var(--dsw-font-xxs-12); line-height: 18px; }",
  ".dsr-empty__actions { display: flex; gap: 6px; margin-top: 4px; }",
  ".dsr-empty__actions .dsr-button { flex: 0 0 auto; }",
  ".dsr-banner { display: flex; align-items: flex-start; gap: 7px; margin: 8px 12px 0; padding: 8px 9px; border: 1px solid var(--dsr-line); border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 16px; }",
  ".dsr-banner svg { flex: none; margin-top: 1px; color: var(--dsr-amber); }",
  ".dsr-banner.is-error svg { color: var(--dsr-red); }",
  ".dsr-banner__action { margin-left: auto; padding: 0; border: 0; background: transparent; color: var(--dsr-accent); font: inherit; font-weight: 600; cursor: pointer; }",
  ".dsr-footer { display: flex; align-items: center; gap: 6px; padding: 7px 10px 8px; border-top: 1px solid var(--dsr-line); background: var(--dsr-bg); flex: none; }",
  ".dsr-footer__status { display: inline-flex; align-items: center; gap: 5px; min-width: 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-footer__status .dsr-dot { width: 5px; height: 5px; margin: 0; }",
  ".dsr-footer__status.is-live .dsr-dot { background: var(--dsr-green); }",
  ".dsr-footer__status.is-reconnecting .dsr-dot { background: var(--dsr-amber); animation: dsr-pulse 1.2s ease-out infinite; }",
  ".dsr-footer__sync { margin-left: auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-footer .dsr-icon-btn { width: 25px; height: 25px; }",
  ".dsr-badge { display: inline-flex; align-items: center; height: 16px; padding: 0 5px; border: 1px solid var(--dsr-line); border-radius: 4px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); font-weight: 500; white-space: nowrap; }",
  ".dsr-badge.is-accent { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); }",
  ".dsr-badge.is-warn { color: var(--dsr-amber); border-color: color-mix(in srgb, var(--dsr-amber) 30%, var(--dsr-line)); }",
  ".dsr-badge.is-green { color: var(--dsr-green); border-color: color-mix(in srgb, var(--dsr-green) 30%, var(--dsr-line)); }",
  ".dsr-tool-glyph { width: 14px; height: 14px; display: inline-grid; place-items: center; flex: none; }",
  ".dsr-detail { display: flex; flex-direction: column; min-height: 0; height: 100%; }",
  ".dsr-dock > .dsr-detail { flex: 1; height: auto; }",
  ".dsr-detail__head { display: flex; align-items: center; gap: 7px; padding: 9px 10px 8px 8px; border-bottom: 1px solid var(--dsr-line); flex: none; }",
  ".dsr-detail__headcopy { min-width: 0; flex: 1; }",
  ".dsr-detail__title { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-s-strong-14); }",
  ".dsr-detail__sub { display: flex; align-items: center; gap: 5px; margin-top: 2px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; overflow: hidden; }",
  ".dsr-detail__body { min-height: 0; flex: 1; overflow: auto; padding: 0 16px 24px; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-detail__body::-webkit-scrollbar { width: 8px; }",
  ".dsr-detail__body::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l2); border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }",
  ".dsr-detail__section { padding: 15px 0; border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-detail__section:last-child { border-bottom: 0; }",
  ".dsr-detail__section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 9px; }",
  ".dsr-detail__section-title { margin: 0; font: var(--dsw-font-xxxs-strong-11); letter-spacing: .06em; color: var(--dsr-muted); }",
  ".dsr-detail__section-meta { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-detail-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid var(--dsr-line); border-radius: 9px; overflow: hidden; }",
  ".dsr-dstat { min-width: 0; padding: 9px 10px 10px; border-right: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-dstat:nth-child(3n) { border-right: 0; }",
  ".dsr-dstat:nth-child(n+4) { border-bottom: 0; }",
  "@media (max-width: 360px) { .dsr-detail-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-dstat:nth-child(3n) { border-right: 1px solid var(--dsr-line-soft); } .dsr-dstat:nth-child(2n) { border-right: 0; } .dsr-dstat:nth-child(n+4) { border-bottom: 1px solid var(--dsr-line-soft); } .dsr-dstat:nth-child(n+5) { border-bottom: 0; } }",
  ".dsr-dstat__label { display: block; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-dstat__value { display: flex; align-items: baseline; gap: 3px; margin-top: 3px; font: var(--dsw-font-s-strong-14); font-variant-numeric: tabular-nums; }",
  ".dsr-dstat__value small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-weight: 400; }",
  ".dsr-meter { height: 3px; margin-top: 6px; border-radius: 3px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-meter > i { display: block; height: 100%; border-radius: 3px; background: var(--dsr-accent); }",
  ".dsr-meter > i.is-warn { background: var(--dsr-amber); }",
  ".dsr-current { border: 1px solid var(--dsr-line); border-radius: 9px; background: var(--dsr-soft); padding: 10px 11px; }",
  ".dsr-current__row { display: flex; align-items: center; gap: 6px; min-width: 0; }",
  ".dsr-current__label { font: var(--dsw-font-xs-strong-13); }",
  ".dsr-current__detail { margin-top: 4px; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 17px; overflow-wrap: anywhere; }",
  ".dsr-current__meta { display: flex; align-items: center; gap: 8px; margin-top: 7px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-pulse-line { display: flex; align-items: center; gap: 3px; }",
  ".dsr-pulse-line i { width: 3px; height: 3px; border-radius: 50%; background: var(--dsr-accent); animation: dsr-dot 1.2s ease-in-out infinite; }",
  ".dsr-pulse-line i:nth-child(2) { animation-delay: .15s; }",
  ".dsr-pulse-line i:nth-child(3) { animation-delay: .3s; }",
  ".dsr-plan { display: flex; flex-direction: column; gap: 0; }",
  ".dsr-plan__bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-plan__bar .dsr-meter { flex: 1; margin: 0; }",
  ".dsr-plan-item { display: flex; align-items: flex-start; gap: 7px; padding: 5px 0; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 17px; }",
  ".dsr-plan-item__mark { width: 14px; height: 14px; margin-top: 1px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 50%; color: transparent; }",
  ".dsr-plan-item.is-completed { color: var(--dsr-muted); text-decoration: line-through; text-decoration-color: var(--dsr-line); }",
  ".dsr-plan-item.is-completed .dsr-plan-item__mark { background: var(--dsr-green); border-color: var(--dsr-green); color: var(--dsw-alias-label-primary-inverted); }",
  ".dsr-plan-item.is-active { color: var(--dsr-text); font-weight: 550; }",
  ".dsr-plan-item.is-active .dsr-plan-item__mark { border-color: var(--dsr-accent); box-shadow: inset 0 0 0 3px var(--dsr-soft); background: var(--dsr-accent); }",
  ".dsr-timeline__item.is-done .dsr-timeline__dot { background: var(--dsr-green); }",
  ".dsr-timeline__item.is-running .dsr-timeline__dot { background: var(--dsr-accent); animation: dsr-pulse 1.6s ease-out infinite; }",
  ".dsr-timeline__item.is-error .dsr-timeline__dot { background: var(--dsr-red); }",
  ".dsr-file-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 0; border: 0; border-bottom: 1px solid var(--dsr-line-soft); background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-file-row:last-child { border-bottom: 0; }",
  ".dsr-file-row:hover .dsr-file-name { color: var(--dsr-accent); }",
  ".dsr-file-icon { width: 27px; height: 27px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 7px; background: var(--dsr-soft); color: var(--dsr-secondary); }",
  ".dsr-file-copy { min-width: 0; flex: 1; }",
  ".dsr-file-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-strong-13); }",
  ".dsr-file-path { display: block; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-file-tag { flex: none; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-note { margin: 0; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 18px; overflow-wrap: anywhere; }",
  ".dsr-note.is-clamped { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }",
  ".dsr-detail__actions { display: flex; gap: 6px; align-items: center; padding: 10px 12px 12px; border-top: 1px solid var(--dsr-line); flex: none; background: var(--dsr-bg); }",
  ".dsr-button { height: 30px; padding: 0 12px; border: 1px solid var(--dsr-line); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-text); font: var(--dsw-font-xxs-12); font-weight: 550; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }",
  ".dsr-button:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-button--primary { background: var(--dsw-alias-button-primary-fill); border-color: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-inverted); flex: 1; justify-content: center; }",
  ".dsr-button--primary:hover { background: var(--dsw-alias-button-primary-hover); }",
  ".dsr-button--danger { color: var(--dsr-red); border-color: color-mix(in srgb, var(--dsr-red) 30%, var(--dsr-line)); }",
  ".dsr-button--danger:hover { background: color-mix(in srgb, var(--dsr-red) 9%, transparent); }",
  ".dsr-button--ghost { border-color: transparent; background: transparent; color: var(--dsr-secondary); }",
  ".dsr-button--ghost:hover { color: var(--dsr-text); }",
  ".dsr-button:disabled { opacity: .45; cursor: default; }",
  ".dsr-inline-form { display: flex; gap: 5px; align-items: center; width: 100%; }",
  ".dsr-inline-form input { min-width: 0; flex: 1; height: 30px; padding: 0 8px; border: 1px solid var(--dsr-focus); border-radius: 6px; background: var(--dsr-bg); color: var(--dsr-text); font: var(--dsw-font-xxs-12); outline: 0; }",
  ".dsr-prefs { position: relative; }",
  ".dsr-prefs__menu { position: absolute; right: 0; top: 34px; bottom: auto; z-index: 4; width: 244px; padding: 6px; border: 1px solid var(--dsr-line); border-radius: 11px; background: var(--dsr-bg); box-shadow: var(--dsw-shadow-lv3); }",
  ".dsr-page .dsr-prefs__menu { top: 34px; bottom: auto; }",
  ".dsr-prefs__title { padding: 6px 8px 7px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .05em; }",
  ".dsr-toggle { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 8px; border-radius: 7px; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); cursor: pointer; }",
  ".dsr-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsr-text); }",
  ".dsr-toggle input { accent-color: var(--dsr-accent); width: 14px; height: 14px; margin: 0; }",
  ".dsr-prefs__note { margin: 5px 8px 4px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 15px; }",
  ".dsr-page { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--dsw-alias-bg-base); color: var(--dsr-text); container-type: inline-size; container-name: dsr-page; }",
  ".dsr-page__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 24px 28px 16px; flex: none; }",
  ".dsr-page__heading { display: flex; align-items: center; gap: 12px; min-width: 0; }",
  ".dsr-page__mark { width: 36px; height: 36px; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 11px; background: var(--dsr-soft); color: var(--dsr-accent); flex: none; }",
  ".dsr-page__title { margin: 0; font: var(--dsw-font-l-20); letter-spacing: -.02em; }",
  ".dsr-page__sub { margin: 3px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxs-12); }",
  ".dsr-page__toolbar { display: flex; align-items: center; gap: 6px; flex: none; }",
  ".dsr-page__toolbar .dsr-search { width: 230px; }",
  ".dsr-page__stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line); padding: 0 28px; flex: none; }",
  ".dsr-page__stats .dsr-stat { padding: 10px 0; margin-right: 24px; border-right: 0; }",
  ".dsr-page__stats .dsr-stat:last-child { margin-right: 0; }",
  ".dsr-page__stats .dsr-stat__value { font-size: 17px; line-height: 21px; }",
  ".dsr-page__views { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 28px; border-bottom: 1px solid var(--dsr-line); flex: none; }",
  ".dsr-page__views .dsr-tabs { padding: 0; border-bottom: 0; gap: 22px; }",
  ".dsr-page__body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 370px); }",
  ".dsr-page__list { min-width: 0; min-height: 0; overflow: auto; border-right: 1px solid var(--dsr-line); scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-page__list::-webkit-scrollbar { width: 9px; }",
  ".dsr-page__list::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l2); border-radius: 9px; border: 2px solid transparent; background-clip: padding-box; }",
  ".dsr-page__detail { min-width: 0; min-height: 0; background: var(--dsr-bg); }",
  ".dsr-page__view { padding-bottom: 24px; }",
  ".dsr-page__sectionhead { display: flex; align-items: baseline; justify-content: space-between; padding: 17px 20px 8px; }",
  ".dsr-page__sectionhead h2 { margin: 0; font: var(--dsw-font-xxs-strong-12); color: var(--dsr-secondary); }",
  ".dsr-page__sectionhead span { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-page__empty { padding: 34px 28px 26px; border-top: 1px solid var(--dsr-line-soft); }",
  ".dsr-page .dsr-session-row .dsr-row-main { padding-top: 13px; padding-bottom: 12px; padding-left: 20px; }",
  ".dsr-page .dsr-row-actions { padding-right: 18px; padding-top: 10px; }",
  ".dsr-page .dsr-row-live { margin-top: 8px; }",
  ".dsr-page .dsr-row-bottom { margin-top: 8px; }",
  ".dsr-table { width: 100%; }",
  ".dsr-table__head, .dsr-table__row { display: grid; grid-template-columns: minmax(0, 2.3fr) 110px 100px 70px; gap: 12px; align-items: center; padding: 0 20px; }",
  ".dsr-table__head { position: sticky; top: 0; z-index: 1; height: 30px; border-bottom: 1px solid var(--dsr-line); background: var(--dsw-alias-bg-base); color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); }",
  ".dsr-table__row { width: 100%; min-height: 48px; border: 0; border-bottom: 1px solid var(--dsr-line-soft); background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-table__row:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-table__session { min-width: 0; }",
  ".dsr-table__name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-strong-13); }",
  ".dsr-table__meta { display: block; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-table__num { font: var(--dsw-font-xxs-12); font-variant-numeric: tabular-nums; color: var(--dsr-secondary); }",
  ".dsr-table__bar { height: 3px; margin-top: 4px; border-radius: 3px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-table__bar i { display: block; height: 100%; background: var(--dsr-accent); border-radius: 3px; }",
  ".dsr-searchpage { padding: 20px 20px 30px; }",
  ".dsr-searchpage__form { display: flex; align-items: center; gap: 7px; max-width: 640px; }",
  ".dsr-searchpage__form .dsr-search { height: 35px; }",
  ".dsr-searchpage__hint { margin: 8px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 16px; }",
  ".dsr-searchpage__form .dsr-button--primary { flex: 0 0 auto; }",
  ".dsr-result { display: block; width: 100%; padding: 10px 0; border: 0; border-bottom: 1px solid var(--dsr-line-soft); background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-result:hover .dsr-result__title { color: var(--dsr-accent); }",
  ".dsr-result__title { font: var(--dsw-font-xs-strong-13); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-result__snippet { margin-top: 2px; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 17px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }",
  ".dsr-result__meta { margin-top: 3px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-skeleton { display: flex; flex-direction: column; gap: 10px; padding: 16px; }",
  ".dsr-skeleton__row { height: 44px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: linear-gradient(90deg, var(--dsr-soft), color-mix(in srgb, var(--dsr-soft) 60%, var(--dsr-line)), var(--dsr-soft)); background-size: 200% 100%; animation: dsr-shimmer 1.4s linear infinite; }",
  ".dsr-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }",
  ".dsr-button:focus-visible, .dsr-icon-btn:focus-visible, .dsr-tab:focus-visible, .dsr-rail:focus-visible, .dsr-session-row .dsr-row-main:focus-visible, .dsr-card__main:focus-visible, .dsr-workspace-card:focus-visible, .dsr-history-card__main:focus-visible, .dsr-check:focus-visible, .dsr-table__row:focus-visible, .dsr-file-row:focus-visible, .dsr-result:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 2px; }",
  "@keyframes dsr-slide-in { from { opacity: 0; transform: translateX(13px); } to { opacity: 1; transform: translateX(0); } }",
  "@keyframes dsr-fade { from { opacity: 0; } to { opacity: 1; } }",
  "@keyframes dsr-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 30%, transparent); } 70% { box-shadow: 0 0 0 5px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }",
  "@keyframes dsr-dot { 0%, 100% { opacity: .3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-1px); } }",
  "@keyframes dsr-sweep { to { transform: rotate(360deg); } }",
  "@keyframes dsr-indeterminate { 0% { transform: translateX(-110%); } 100% { transform: translateX(330%); } }",
  "@keyframes dsr-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }",
  ".dsr-radar { display: block; overflow: visible; }",
  ".dsr-radar__sweep { transform-origin: 8px 8px; transform: rotate(25deg); }",
  ".dsr-radar.is-active .dsr-radar__sweep { animation: dsr-sweep 4.2s linear infinite; }",
  ".dsr-scrim { background: transparent; animation: none; }",
  ".dsr-page { background: var(--dsw-alias-bg-base); }",
  ".dsr-page__head { align-items: center; padding: 25px 30px 14px; }",
  ".dsr-page__mark { width: 38px; height: 38px; border-radius: 12px; background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); }",
  ".dsr-page__title { font-size: 21px; line-height: 26px; letter-spacing: -.025em; }",
  ".dsr-page__sub { max-width: 46ch; }",
  ".dsr-page__toolbar { gap: 8px; }",
  ".dsr-page__stats { border-bottom-color: var(--dsr-line-soft); }",
  ".dsr-page__stats .dsr-stat { padding-top: 11px; padding-bottom: 11px; }",
  ".dsr-page__stats .dsr-stat__value { font-size: 18px; line-height: 22px; }",
  ".dsr-page__views { padding-top: 2px; }",
  ".dsr-page__body { grid-template-columns: minmax(0, 1fr); transition: grid-template-columns 180ms ease; }",
  ".dsr-page__body.has-selection { grid-template-columns: minmax(0, 1fr) minmax(340px, 390px); }",
  ".dsr-page__list { border-right: 0; }",
  ".dsr-page__detail { display: none; border-left: 1px solid var(--dsr-line); box-shadow: -10px 0 24px -24px rgba(0, 0, 0, .22); }",
  ".dsr-page__body.has-selection .dsr-page__detail { display: block; }",
  ".dsr-board { padding: 19px 26px 30px; }",
  ".dsr-board__section + .dsr-board__section { margin-top: 28px; }",
  ".dsr-board__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 11px; }",
  ".dsr-board__head h2 { margin: 0; font: var(--dsw-font-s-strong-14); font-size: 15px; letter-spacing: -.015em; }",
  ".dsr-board__head p { margin: 3px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-board__headmeta { display: flex; align-items: center; gap: 8px; flex: none; }",
  ".dsr-board__count { display: inline-flex; align-items: center; height: 23px; padding: 0 8px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; background: var(--dsr-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(282px, 1fr)); gap: 12px; align-items: stretch; }",
  ".dsr-card-grid--live { grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }",
  ".dsr-card { position: relative; min-width: 0; min-height: 246px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--dsr-line); border-radius: 14px; background: var(--dsr-bg); box-shadow: 0 1px 2px rgba(0, 0, 0, .025), 0 14px 30px -30px rgba(0, 0, 0, .35); transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }",
  ".dsr-card::before { content: \"\"; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 100% 0, color-mix(in srgb, var(--dsr-accent) 8%, transparent), transparent 52%); opacity: .75; }",
  ".dsr-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--dsr-accent) 26%, var(--dsr-line)); box-shadow: 0 14px 32px -20px rgba(0, 0, 0, .25); }",
  ".dsr-card.is-live { grid-column: span 2; border-color: color-mix(in srgb, var(--dsr-accent) 18%, var(--dsr-line)); }",
  ".dsr-card.is-live::before { background: radial-gradient(ellipse at 100% 0, color-mix(in srgb, var(--dsr-accent) 13%, transparent), transparent 50%), linear-gradient(115deg, transparent 62%, color-mix(in srgb, var(--dsr-accent) 3%, transparent)); }",
  ".dsr-card.is-compact { min-height: 220px; }",
  ".dsr-card.is-compact .dsr-card__main { padding-top: 6px; }",
  ".dsr-card.is-compact .dsr-card__footer { min-height: 34px; }",
  ".dsr-card__head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 13px 13px 0 15px; }",
  ".dsr-card__statusline { display: flex; align-items: center; gap: 7px; min-width: 0; }",
  ".dsr-card__status { overflow: hidden; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-strong-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-card .dsr-dot { width: 7px; height: 7px; margin-top: 0; }",
  ".dsr-card[data-tone=\"running\"] .dsr-dot, .dsr-card[data-tone=\"tool\"] .dsr-dot { background: var(--dsr-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 13%, transparent); animation: dsr-pulse 2s ease-out infinite; }",
  ".dsr-card[data-tone=\"tool\"] .dsr-dot { background: var(--dsr-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-accent) 13%, transparent); }",
  ".dsr-card[data-tone=\"approval\"] .dsr-dot, .dsr-card[data-tone=\"question\"] .dsr-dot { background: var(--dsr-amber); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-amber) 13%, transparent); }",
  ".dsr-card[data-tone=\"done\"] .dsr-dot { background: var(--dsr-green); }",
  ".dsr-card[data-tone=\"migration\"] .dsr-dot { background: var(--dsr-amber); }",
  ".dsr-card__headactions { display: flex; gap: 1px; flex: none; }",
  ".dsr-card__main { position: relative; z-index: 1; flex: 1; width: 100%; min-width: 0; display: flex; flex-direction: column; padding: 8px 15px 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-card__title { margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font: var(--dsw-font-s-strong-14); line-height: 20px; letter-spacing: -.012em; }",
  ".dsr-card__meta { display: flex; align-items: center; gap: 5px; min-width: 0; margin: 4px 0 0; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-card__meta span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-card__meta .sep { flex: none; color: var(--dsr-line); }",
  ".dsr-card__live { display: flex; align-items: center; gap: 6px; min-width: 0; min-height: 31px; margin-top: 10px; padding: 6px 8px; border: 1px solid transparent; border-radius: 8px; background: color-mix(in srgb, var(--dsr-soft) 78%, transparent); color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); }",
  ".dsr-card.is-live .dsr-card__live { border-color: color-mix(in srgb, var(--dsr-accent) 12%, transparent); background: color-mix(in srgb, var(--dsr-accent) 7%, transparent); }",
  ".dsr-card__live .dsr-tool-glyph { flex: none; color: var(--dsr-accent); }",
  ".dsr-card__live-label { flex: none; color: var(--dsr-text); font-weight: 600; }",
  ".dsr-card__live-detail { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-card__live-time { flex: none; margin-left: auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-card__progress { margin-top: 8px; }",
  ".dsr-card__todo { display: block; margin-top: 5px; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-card__times { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 11px; padding-top: 9px; border-top: 1px solid var(--dsr-line-soft); }",
  ".dsr-card__time { display: flex; flex-direction: column; gap: 1px; min-width: 0; }",
  ".dsr-card__time-label { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-card__time-value { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-variant-numeric: tabular-nums; line-height: 18px; }",
  ".dsr-card__footer { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; min-height: 38px; margin-top: 10px; padding: 7px 13px 9px 15px; border-top: 1px solid var(--dsr-line-soft); }",
  ".dsr-card__metric { display: inline-flex; align-items: center; gap: 3px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-card__metric strong { color: var(--dsr-secondary); font-weight: 600; }",
  ".dsr-card__spacer { flex: 1; }",
  ".dsr-card__enter { display: inline-flex; align-items: center; gap: 3px; padding: 3px 0; border: 0; background: transparent; color: var(--dsr-accent); font: var(--dsw-font-xxxs-strong-11); cursor: pointer; }",
  ".dsr-card__enter:hover { text-decoration: underline; text-underline-offset: 3px; }",
  ".dsr-card__enter:focus-visible, .dsr-workspace-card:focus-visible, .dsr-history-card__main:focus-visible, .dsr-check:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 2px; }",
  ".dsr-board__quiet, .dsr-board__hint { display: flex; align-items: center; gap: 9px; min-height: 54px; padding: 11px 13px; border: 1px dashed var(--dsr-line); border-radius: 11px; color: var(--dsr-muted); font: var(--dsw-font-xxs-12); }",
  ".dsr-board__quiet .dsr-radar { color: var(--dsr-accent); flex: none; }",
  ".dsr-board__hint { margin-top: 14px; }",
  ".dsr-board__foot { margin-top: 22px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-workspace-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(238px, 1fr)); gap: 10px; margin-top: 12px; }",
  ".dsr-workspace-card { position: relative; min-height: 154px; display: flex; flex-direction: column; align-items: stretch; padding: 14px; border: 1px solid var(--dsr-line); border-radius: 13px; background: var(--dsr-bg); color: inherit; text-align: left; cursor: pointer; transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease; }",
  ".dsr-workspace-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--dsr-accent) 25%, var(--dsr-line)); }",
  ".dsr-workspace-card.is-selected { border-color: color-mix(in srgb, var(--dsr-accent) 42%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 5%, var(--dsr-bg)); }",
  ".dsr-workspace-card__head { display: flex; align-items: center; gap: 8px; min-width: 0; }",
  ".dsr-workspace-card__icon { width: 26px; height: 26px; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-accent); flex: none; }",
  ".dsr-workspace-card__title { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-strong-13); }",
  ".dsr-workspace-card__arrow { color: var(--dsr-muted); flex: none; }",
  ".dsr-workspace-card__path { display: block; margin-top: 8px; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-workspace-card__meters { display: flex; align-items: center; gap: 9px; margin-top: 11px; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }",
  ".dsr-workspace-card__meters span { display: inline-flex; align-items: center; gap: 4px; }",
  ".dsr-workspace-card__meters .dsr-dot { width: 6px; height: 6px; margin-top: 0; background: var(--dsr-muted); }",
  ".dsr-workspace-card__meters .dsr-dot.is-on { background: var(--dsr-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 12%, transparent); }",
  ".dsr-workspace-card__dots { display: flex; align-items: center; gap: 3px; min-height: 12px; margin-top: auto; padding-top: 14px; }",
  ".dsr-workspace-card__dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--dsr-line); }",
  ".dsr-workspace-card__dots i[data-tone=\"running\"], .dsr-workspace-card__dots i[data-tone=\"tool\"] { background: var(--dsr-green); }",
  ".dsr-workspace-card__dots i[data-tone=\"tool\"] { background: var(--dsr-accent); }",
  ".dsr-workspace-card__dots i[data-tone=\"approval\"], .dsr-workspace-card__dots i[data-tone=\"question\"] { background: var(--dsr-amber); }",
  ".dsr-workspace-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-workspace-card__foot span:last-child { color: var(--dsr-accent); font-weight: 600; }",
  ".dsr-workspaces { display: flex; flex-direction: column; }",
  ".dsr-workspace-detail { order: -1; margin-top: 0; margin-bottom: 20px; padding-top: 0; border-top: 0; }",
  ".dsr-history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 9px; margin-top: 12px; }",
  ".dsr-history-card { display: flex; align-items: flex-start; gap: 8px; min-width: 0; padding: 11px 10px 10px; border: 1px solid var(--dsr-line-soft); border-radius: 11px; background: var(--dsr-bg); transition: border-color 150ms ease, background-color 150ms ease; }",
  ".dsr-history-card:hover { border-color: var(--dsr-line); background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-history-card.is-checked { border-color: color-mix(in srgb, var(--dsr-accent) 40%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 6%, var(--dsr-bg)); }",
  ".dsr-check { width: 18px; height: 18px; flex: none; display: grid; place-items: center; margin-top: 2px; padding: 0; border: 1px solid var(--dsr-line); border-radius: 5px; background: var(--dsr-bg); color: var(--dsw-alias-label-primary-inverted); cursor: pointer; }",
  ".dsr-check.is-checked { border-color: var(--dsr-accent); background: var(--dsr-accent); }",
  ".dsr-history-card__main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }",
  ".dsr-history-card__title { overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xs-strong-13); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-history-card__meta { overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-history-card__live { display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-history-card__live span:last-child { overflow: hidden; text-overflow: ellipsis; color: var(--dsr-muted); }",
  ".dsr-history-card__times { display: flex; align-items: center; gap: 9px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-history-card__times strong { color: var(--dsr-secondary); font-weight: 600; }",
  ".dsr-archive-section { margin-top: 28px; }",
  ".dsr-bulkbar { position: sticky; bottom: 12px; z-index: 3; display: flex; align-items: center; gap: 9px; min-height: 42px; margin-top: 14px; padding: 8px 10px 8px 12px; border: 1px solid var(--dsr-line); border-radius: 11px; background: color-mix(in srgb, var(--dsr-bg) 92%, transparent); box-shadow: 0 10px 26px -20px rgba(0, 0, 0, .35); backdrop-filter: blur(12px); }",
  ".dsr-bulkbar.is-danger { border-color: color-mix(in srgb, var(--dsr-amber) 35%, var(--dsr-line)); }",
  ".dsr-bulkbar__count { color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); white-space: nowrap; }",
  ".dsr-bulkbar__message { overflow: hidden; color: var(--dsr-green); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-bulkbar__error { overflow: hidden; color: var(--dsr-red); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-bulkbar__spacer { flex: 1; }",
  ".dsr-bulkbar__actions { display: flex; align-items: center; gap: 6px; flex: none; }",
  ".dsr-bulkbar__confirm { display: flex; align-items: center; gap: 9px; min-width: 0; flex: 1; flex-wrap: wrap; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }",
  ".dsr-bulkbar__confirm strong { color: var(--dsr-amber); font: var(--dsw-font-xxs-strong-12); }",
  ".dsr-bulkbar__confirm .dsr-bulkbar__actions { margin-left: auto; }",
  ".dsr-button--danger { border-color: color-mix(in srgb, var(--dsr-red) 28%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-red) 9%, var(--dsr-bg)); color: var(--dsr-red); }",
  ".dsr-button--danger:hover { background: color-mix(in srgb, var(--dsr-red) 14%, var(--dsr-bg)); }",
  ".dsr-artifact-grid, .dsr-usage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; margin-top: 12px; }",
  ".dsr-artifact-card { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-height: 112px; padding: 13px; border: 1px solid var(--dsr-line-soft); border-radius: 11px; background: var(--dsr-bg); color: inherit; text-align: left; cursor: pointer; transition: border-color 150ms ease, transform 150ms ease; }",
  ".dsr-artifact-card:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--dsr-accent) 25%, var(--dsr-line)); }",
  ".dsr-artifact-card__icon { width: 25px; height: 25px; display: grid; place-items: center; border-radius: 7px; background: var(--dsr-soft); color: var(--dsr-accent); }",
  ".dsr-artifact-card__name { max-width: 100%; overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xs-strong-13); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-artifact-card__path { max-width: 100%; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-artifact-card__foot { display: flex; align-items: center; gap: 7px; margin-top: auto; padding-top: 6px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-usage-card { display: flex; flex-direction: column; gap: 8px; min-height: 128px; padding: 13px; border: 1px solid var(--dsr-line-soft); border-radius: 11px; background: var(--dsr-bg); color: inherit; text-align: left; cursor: pointer; transition: border-color 150ms ease, transform 150ms ease; }",
  ".dsr-usage-card:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--dsr-accent) 25%, var(--dsr-line)); }",
  ".dsr-usage-card__title { overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xs-strong-13); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-usage-card__meta { overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-usage-card__big { color: var(--dsr-text); font: var(--dsw-font-l-20); font-size: 22px; line-height: 26px; font-variant-numeric: tabular-nums; letter-spacing: -.03em; }",
  ".dsr-usage-card__big small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); letter-spacing: 0; }",
  ".dsr-usage-card__bar { height: 4px; border-radius: 4px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-usage-card__bar i { display: block; height: 100%; border-radius: 4px; background: var(--dsr-accent); }",
  ".dsr-usage-card__foot { display: flex; gap: 9px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-usage-card__foot strong { color: var(--dsr-secondary); font-weight: 600; }",
  "@container dsr-page (max-width: 1120px) { .dsr-card.is-live { grid-column: auto; } .dsr-page__body.has-selection { grid-template-columns: minmax(0, 1fr) minmax(320px, 350px); } }",
  "@media (max-width: 980px) { .dsr-card.is-live { grid-column: auto; } .dsr-board { padding-left: 18px; padding-right: 18px; } .dsr-page__body.has-selection { grid-template-columns: minmax(0, 1fr); } .dsr-page__body.has-selection .dsr-page__detail { display: block; } }",
  "@media (max-width: 680px) { .dsr-page__head { padding: 18px 16px 12px; } .dsr-page__sub { max-width: none; } .dsr-board { padding: 16px 14px 24px; } .dsr-card-grid, .dsr-card-grid--live, .dsr-workspace-grid, .dsr-history-grid, .dsr-artifact-grid, .dsr-usage-grid { grid-template-columns: minmax(0, 1fr); } .dsr-card { min-height: 220px; } .dsr-board__head { align-items: flex-start; flex-direction: column; gap: 8px; } .dsr-bulkbar { flex-wrap: wrap; } .dsr-bulkbar__spacer { display: none; } .dsr-bulkbar__actions { margin-left: auto; } }",
  ".dsr-dock__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; border-top: 1px solid var(--dsr-line-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-dock__foottext { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-detail__spacer { flex: 1; }",
  ".dsr-files { display: flex; flex-direction: column; gap: 2px; }",
  ".dsr-file-row__icon { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 7px; background: var(--dsr-soft); color: var(--dsr-accent); flex: none; }",
  ".dsr-file-row__name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-file-row__meta { min-width: 0; max-width: 46%; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-plan__mark { width: 18px; height: 18px; display: grid; place-items: center; color: var(--dsr-muted); flex: none; }",
  ".dsr-plan__item[data-status=\"completed\"] .dsr-plan__mark { color: var(--dsr-green); }",
  ".dsr-plan__item[data-status=\"in_progress\"] .dsr-plan__mark { color: var(--dsr-accent); }",
  ".dsr-plan__item[data-status=\"in_progress\"] .dsr-plan__text { color: var(--dsr-text); font-weight: 600; }",
  ".dsr-output { margin: 0; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 19px; white-space: pre-wrap; }",
  ".dsr-search-results { display: flex; flex-direction: column; gap: 0; padding: 4px 14px 8px; border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-search-results__head { padding: 8px 0 5px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .05em; }",
  ".dsr-search-results--empty { padding: 14px; color: var(--dsr-muted); font: var(--dsw-font-xxs-12); }",
  "@container dsr-page (max-width: 900px) { .dsr-page__body { grid-template-columns: minmax(0, 1fr); } .dsr-page__detail { display: none; border-top: 1px solid var(--dsr-line); } .dsr-page__body.has-selection .dsr-page__list { display: none; } .dsr-page__body.has-selection .dsr-page__detail { display: block; } .dsr-page__toolbar .dsr-search { width: 180px; } }",
  "@media (max-width: 980px) { .dsr-page__body { grid-template-columns: minmax(0, 1fr); } .dsr-page__detail { display: none; border-top: 1px solid var(--dsr-line); } .dsr-page__body.has-selection .dsr-page__list { display: none; } .dsr-page__body.has-selection .dsr-page__detail { display: block; } .dsr-page__toolbar .dsr-search { width: 180px; } }",
  "@media (max-width: 680px) { .dsr-dock { top: 56px; right: 8px; bottom: 8px; width: calc(100vw - 16px); border-radius: 22px; } .dsr-rail { top: auto; right: 14px; bottom: 18px; transform: none; flex-direction: row; width: auto; height: 42px; padding: 0 11px; border-radius: 21px; } .dsr-rail:hover { transform: translateY(-2px); } .dsr-rail__label { display: none; } .dsr-page__head { padding: 18px 16px 12px; gap: 10px; } .dsr-page__toolbar .dsr-search { display: none; } .dsr-page__stats { padding: 0 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-page__stats .dsr-stat { margin-right: 12px; } .dsr-page__views { padding: 0 16px; } .dsr-page__sectionhead { padding-left: 16px; padding-right: 16px; } .dsr-page .dsr-session-row .dsr-row-main { padding-left: 16px; } .dsr-page .dsr-row-actions { padding-right: 12px; } .dsr-table__head, .dsr-table__row { grid-template-columns: minmax(0, 1.7fr) 90px; } .dsr-table__head > :nth-child(3), .dsr-table__head > :nth-child(4), .dsr-table__row > :nth-child(3), .dsr-table__row > :nth-child(4) { display: none; } .dsr-page__title { font-size: 18px; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-dock, .dsr-scrim, .dsr-dot, .dsr-radar__sweep, .dsr-progress__fill, .dsr-skeleton__row, .dsr-pulse-line i { animation: none !important; transition: none !important; } }",
  "/* ---- v2 layer system: elevation, tone, instrument tiles ---------------- */",
  ":root, body { --dsr-elev-1: 0 1px 2px rgba(15,23,42,.04), 0 10px 24px -18px rgba(15,23,42,.34), inset 0 1px 0 rgba(255,255,255,.9); --dsr-elev-2: 0 2px 6px rgba(15,23,42,.05), 0 20px 40px -24px rgba(15,23,42,.36), inset 0 1px 0 rgba(255,255,255,.95); --dsr-elev-live: 0 2px 6px rgba(15,23,42,.05), 0 28px 48px -28px color-mix(in srgb, var(--dsr-accent) 42%, rgba(15,23,42,.45)), inset 0 1px 0 rgba(255,255,255,.85); --dsr-well: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 78%, transparent); --dsr-well-line: color-mix(in srgb, var(--dsr-line) 62%, transparent); --dsr-inner-hi: rgba(255,255,255,.62); }",
  "[data-ds-dark-theme] { --dsr-elev-1: 0 14px 30px -22px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.035); --dsr-elev-2: 0 20px 42px -24px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.055); --dsr-elev-live: 0 26px 54px -26px color-mix(in srgb, var(--dsr-accent) 30%, rgba(0,0,0,.92)), inset 0 1px 0 rgba(255,255,255,.06); --dsr-well: rgba(255,255,255,.035); --dsr-well-line: rgba(255,255,255,.07); --dsr-inner-hi: rgba(255,255,255,.04); }",
  ".dsr-card { --dsr-tone: var(--dsr-muted); min-height: 252px; border-radius: 15px; border-color: var(--dsr-line); background: var(--dsr-bg); box-shadow: var(--dsr-elev-1); }",
  ".dsr-card::after { content: \"\"; position: absolute; left: 0; right: 0; top: 0; height: 2px; pointer-events: none; opacity: 0; background: linear-gradient(90deg, var(--dsr-tone), color-mix(in srgb, var(--dsr-tone) 45%, transparent) 34%, transparent 76%); transition: opacity 220ms ease; }",
  ".dsr-card[data-tone=\"running\"] { --dsr-tone: var(--dsr-green); }",
  ".dsr-card[data-tone=\"tool\"] { --dsr-tone: var(--dsr-accent); }",
  ".dsr-card[data-tone=\"approval\"], .dsr-card[data-tone=\"question\"] { --dsr-tone: var(--dsr-amber); }",
  ".dsr-card[data-tone=\"done\"] { --dsr-tone: var(--dsr-green); }",
  ".dsr-card[data-tone=\"migration\"] { --dsr-tone: var(--dsr-amber); }",
  ".dsr-card.is-live { background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-tone) 6%, var(--dsr-bg)), var(--dsr-bg) 48%); box-shadow: var(--dsr-elev-live); }",
  ".dsr-card[data-tone=\"approval\"], .dsr-card[data-tone=\"question\"] { background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-amber) 4%, var(--dsr-bg)), var(--dsr-bg) 44%); }",
  ".dsr-card.is-live::after, .dsr-card[data-tone=\"approval\"]::after, .dsr-card[data-tone=\"question\"]::after { opacity: 1; }",
  ".dsr-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--dsr-tone) 30%, var(--dsr-line)); box-shadow: var(--dsr-elev-2); }",
  ".dsr-card__head { padding: 12px 13px 0 14px; }",
  ".dsr-card__status { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; height: 20px; padding: 0 7px 0 6px; overflow: visible; border: 1px solid color-mix(in srgb, var(--dsr-tone) 22%, transparent); border-radius: 6px; background: color-mix(in srgb, var(--dsr-tone) 9%, transparent); color: var(--dsr-tone); font: var(--dsw-font-xxxs-strong-11); }",
  ".dsr-card__status .dsr-dot { width: 6px; height: 6px; margin: 0; background: currentColor; animation: none; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 16%, transparent); }",
  ".dsr-card__status-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-card__main { padding: 9px 14px 0; }",
  ".dsr-card__title { font-size: 15px; line-height: 21px; font-weight: 600; letter-spacing: -.018em; }",
  ".dsr-card__meta { margin-top: 5px; }",
  ".dsr-card__live { min-height: 32px; padding: 6px 9px; border: 1px solid var(--dsr-well-line); border-radius: 9px; background: var(--dsr-well); box-shadow: inset 0 1px 0 var(--dsr-inner-hi); }",
  ".dsr-card.is-live .dsr-card__live { border-color: color-mix(in srgb, var(--dsr-tone) 20%, transparent); background: color-mix(in srgb, var(--dsr-tone) 8%, transparent); }",
  ".dsr-card .dsr-card__live .dsr-tool-glyph { color: var(--dsr-tone); }",
  ".dsr-signals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 11px; padding: 8px 0 7px; border-top: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-signals__cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 0 9px; border-right: 1px solid var(--dsr-line-soft); }",
  ".dsr-signals__cell:first-child { padding-left: 0; }",
  ".dsr-signals__cell:last-child { padding-right: 0; border-right: 0; }",
  ".dsr-signals__label { display: flex; align-items: center; gap: 3px; min-width: 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 14px; }",
  ".dsr-signals__label span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-signals__label svg { flex: none; opacity: .78; }",
  ".dsr-signals__value { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-size: 14px; line-height: 18px; font-variant-numeric: tabular-nums; }",
  ".dsr-cost { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 10px; margin-top: 9px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-cost__item { display: inline-flex; align-items: center; gap: 4px; min-width: 0; white-space: nowrap; }",
  ".dsr-cost__item svg { flex: none; opacity: .78; }",
  ".dsr-cost__item strong { color: var(--dsr-secondary); font-weight: 600; }",
  ".dsr-cost__label, .dsr-cost__unit { color: var(--dsr-muted); }",
  ".dsr-cost__sep { color: var(--dsr-line); }",
  ".dsr-cost__bar { width: 26px; height: 3px; border-radius: 2px; background: var(--dsr-line); overflow: hidden; }",
  ".dsr-cost__bar > i { display: block; height: 100%; border-radius: 2px; background: var(--dsr-accent); }",
  ".dsr-cost__bar.is-warn > i { background: var(--dsr-amber); }",
  ".dsr-card__footer { margin-top: 10px; min-height: 38px; padding: 8px 13px 9px 14px; border-top: 1px solid var(--dsr-line-soft); background: color-mix(in srgb, var(--dsr-bg) 86%, transparent); }",
  ".dsr-delivery { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px 0 6px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); white-space: nowrap; }",
  ".dsr-delivery.is-delivered { color: var(--dsr-green); border-color: color-mix(in srgb, var(--dsr-green) 30%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-green) 7%, transparent); }",
  ".dsr-delivery.is-changed { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 28%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 6%, transparent); }",
  ".dsr-card.is-compact { min-height: 228px; }",
  ".dsr-card.is-compact .dsr-signals { margin-top: 9px; padding: 6px 0 5px; }",
  ".dsr-card.is-compact .dsr-card__title { font-size: 14px; line-height: 20px; }",
  ".dsr-board__head { align-items: center; gap: 11px; margin-bottom: 13px; }",
  ".dsr-board__mark { width: 30px; height: 30px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 9px; background: var(--dsr-soft); color: var(--dsr-accent); }",
  ".dsr-board__headcopy { min-width: 0; margin-right: auto; }",
  ".dsr-board__head h2 { font-size: 15px; }",
  ".dsr-board__headmeta { gap: 7px; }",
  ".dsr-stat { display: flex; align-items: center; gap: 9px; }",
  ".dsr-stat__body { min-width: 0; display: flex; flex-direction: column; }",
  ".dsr-stat__icon { width: 30px; height: 30px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 9px; background: var(--dsr-soft); color: var(--dsr-secondary); }",
  ".dsr-stat[data-tone=\"green\"] .dsr-stat__icon { color: var(--dsr-green); background: color-mix(in srgb, var(--dsr-green) 8%, var(--dsr-soft)); border-color: color-mix(in srgb, var(--dsr-green) 22%, var(--dsr-line-soft)); }",
  ".dsr-stat[data-tone=\"amber\"] .dsr-stat__icon { color: var(--dsr-amber); background: color-mix(in srgb, var(--dsr-amber) 8%, var(--dsr-soft)); border-color: color-mix(in srgb, var(--dsr-amber) 22%, var(--dsr-line-soft)); }",
  ".dsr-stat[data-tone=\"accent\"] .dsr-stat__icon { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); border-color: color-mix(in srgb, var(--dsr-accent) 22%, var(--dsr-line-soft)); }",
  ".dsr-stats .dsr-stat { gap: 7px; padding: 9px 10px; }",
  ".dsr-stats .dsr-stat__icon { width: 24px; height: 24px; border-radius: 7px; }",
  ".dsr-stats .dsr-stat__value { font-size: 14px; line-height: 17px; }",
  ".dsr-page__stats { grid-template-columns: repeat(5, minmax(0, 1fr)); }",
  ".dsr-page__stats .dsr-stat { gap: 10px; padding: 11px 0; margin-right: 18px; }",
  ".dsr-page { background: var(--dsw-alias-bg-layer-2); } [data-ds-dark-theme] .dsr-page { background: var(--dsw-alias-bg-base); }",
  ".dsr-page__head { background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-accent) 4%, transparent), transparent 76%); }",
  ".dsr-page__copy { min-width: 0; }",
  ".dsr-page__titlerow { display: flex; align-items: center; gap: 9px; min-width: 0; }",
  ".dsr-page__live { display: inline-flex; align-items: center; gap: 5px; height: 20px; padding: 0 8px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; background: var(--dsr-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); white-space: nowrap; }",
  ".dsr-page__live .dsr-dot { width: 5px; height: 5px; margin: 0; background: var(--dsr-muted); }",
  ".dsr-page__live.is-on { color: var(--dsr-green); border-color: color-mix(in srgb, var(--dsr-green) 26%, var(--dsr-line-soft)); background: color-mix(in srgb, var(--dsr-green) 7%, transparent); }",
  ".dsr-page__live.is-on .dsr-dot { background: var(--dsr-green); animation: dsr-pulse 2s ease-out infinite; }",
  ".dsr-card__title { display: -webkit-box; } .dsr-workspace-card { box-shadow: var(--dsr-elev-1); } .dsr-workspace-card:hover { box-shadow: var(--dsr-elev-2); } .dsr-artifact-card, .dsr-usage-card { box-shadow: var(--dsr-elev-1); } .dsr-artifact-card:hover, .dsr-usage-card:hover { box-shadow: var(--dsr-elev-2); } .dsr-artifact-card__icon { color: var(--dsr-accent); }",
  "/* ---- board: tracked lane ---------------------------------------------- */",
  ".dsr-board__section--tracked { position: relative; padding: 13px 14px 16px; border: 1px solid color-mix(in srgb, var(--dsr-accent) 20%, var(--dsr-line)); border-radius: 16px; background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-accent) 6%, transparent), color-mix(in srgb, var(--dsr-accent) 2%, transparent)); }",
  ".dsr-board__section--tracked::before { content: \"\"; position: absolute; left: 16px; right: 16px; top: -1px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, var(--dsr-accent), transparent 72%); opacity: .65; }",
  ".dsr-board__section--tracked .dsr-board__head { padding: 0 2px; margin-bottom: 12px; }",
  ".dsr-board__section--tracked .dsr-board__mark { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 10%, var(--dsr-bg)); border-color: color-mix(in srgb, var(--dsr-accent) 24%, var(--dsr-line-soft)); }",
  ".dsr-card-grid--tracked { gap: 10px; }",
  ".dsr-board__section--tracked .dsr-card { box-shadow: var(--dsr-elev-1); }",
  "@media (max-width: 680px) { .dsr-board__section--tracked { padding: 11px 10px 13px; } }",
  "/* ---- page: filter bar ------------------------------------------------- */",
  ".dsr-filterbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; padding: 9px 12px; border: 1px solid var(--dsr-line); border-radius: 12px; background: var(--dsr-bg); box-shadow: var(--dsr-elev-1); }",
  ".dsr-filterbar.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 26%, var(--dsr-line)); }",
  ".dsr-filterbar__lead { display: inline-flex; align-items: center; gap: 5px; margin-right: 2px; font: var(--dsw-font-xs); color: var(--dsr-muted); }",
  ".dsr-filter { display: inline-flex; align-items: center; gap: 6px; padding: 3px 4px 3px 9px; border: 1px solid var(--dsr-line-soft); border-radius: 9px; background: var(--dsr-well); color: var(--dsr-muted); transition: border-color .15s ease, background .15s ease; }",
  ".dsr-filter:hover { border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); }",
  ".dsr-filter__label { font: var(--dsw-font-xs); color: var(--dsr-muted); white-space: nowrap; }",
  ".dsr-filter__control { position: relative; display: inline-flex; align-items: center; min-width: 0; }",
  ".dsr-filter__select { appearance: none; -webkit-appearance: none; max-width: 190px; padding: 2px 18px 2px 2px; border: 0; background: transparent; color: var(--dsr-text); font: var(--dsw-font-xs-strong-13); cursor: pointer; text-overflow: ellipsis; color-scheme: light; }",
  "[data-ds-dark-theme] .dsr-filter__select { color-scheme: dark; }",
  ".dsr-filter__select:focus-visible { outline: none; }",
  ".dsr-filter__control svg { position: absolute; right: 2px; pointer-events: none; opacity: .55; }",
  ".dsr-filterbar__clear { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 9px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xs); cursor: pointer; }",
  ".dsr-filterbar__clear:hover { color: var(--dsr-text); border-color: var(--dsr-line); background: var(--dsr-well); }",
  ".dsr-filterbar__count { margin-left: auto; font: var(--dsw-font-xs); color: var(--dsr-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  "@media (max-width: 680px) { .dsr-filterbar { padding: 8px 10px; } .dsr-filterbar__count { margin-left: 0; } .dsr-filter__select { max-width: 132px; } }",
  "/* ---- detail: instrument stats ------------------------------------------ */",
  ".dsr-dstat { padding: 10px 11px 11px; }",
  ".dsr-dstat__head { display: flex; align-items: center; gap: 5px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-dstat__icon { width: 18px; height: 18px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 5px; background: var(--dsr-soft); color: var(--dsr-accent); }",
  ".dsr-dstat__value { margin-top: 5px; }",
  ".dsr-detail__section-title { display: flex; align-items: center; gap: 5px; }",
  ".dsr-detail__section-title svg { flex: none; opacity: .9; }",
  ".dsr-current__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-current__top { display: flex; align-items: center; gap: 7px; min-width: 0; }",
  ".dsr-current__icon { width: 22px; height: 22px; flex: none; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--dsr-accent) 24%, transparent); border-radius: 6px; background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); color: var(--dsr-accent); }",
  ".dsr-current__icon.is-warn { border-color: color-mix(in srgb, var(--dsr-amber) 26%, transparent); background: color-mix(in srgb, var(--dsr-amber) 10%, transparent); color: var(--dsr-amber); }",
  "/* ---- detail: session flow ---------------------------------------------- */",
  ".dsr-flow__strip { display: flex; align-items: stretch; gap: 3px; height: 9px; margin: 0 0 14px; }",
  ".dsr-flow__seg { flex: 1 1 0; min-width: 7px; border-radius: 3px; background: color-mix(in srgb, var(--dsr-muted) 22%, transparent); transition: opacity 160ms ease; }",
  ".dsr-flow__seg.is-done { background: color-mix(in srgb, var(--dsr-green) 52%, transparent); }",
  ".dsr-flow__seg.is-open { background: color-mix(in srgb, var(--dsr-muted) 34%, transparent); }",
  ".dsr-flow__seg.is-error { background: color-mix(in srgb, var(--dsr-red) 68%, transparent); }",
  ".dsr-flow__seg.is-running { background: var(--dsr-accent); animation: dsr-flow-pulse 1.8s ease-in-out infinite; }",
  ".dsr-flow { display: flex; flex-direction: column; }",
  ".dsr-turn { position: relative; display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 9px; padding-bottom: 9px; }",
  ".dsr-turn:last-child { padding-bottom: 0; }",
  ".dsr-turn:not(:last-child)::before { content: \"\"; position: absolute; left: 9px; top: 26px; bottom: 2px; width: 1px; background: linear-gradient(180deg, var(--dsr-line), var(--dsr-line-soft)); }",
  ".dsr-turn__node { position: relative; z-index: 1; width: 20px; height: 20px; margin-top: 8px; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 50%; background: var(--dsr-bg); color: var(--dsr-muted); font: 600 10px/1 var(--dsw-font-family); font-variant-numeric: tabular-nums; }",
  ".dsr-turn[data-state=\"done\"] .dsr-turn__node { color: var(--dsr-green); border-color: color-mix(in srgb, var(--dsr-green) 38%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-green) 8%, var(--dsr-bg)); }",
  ".dsr-turn[data-state=\"running\"] .dsr-turn__node { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 52%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 10%, var(--dsr-bg)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-accent) 9%, transparent); }",
  ".dsr-turn[data-state=\"error\"] .dsr-turn__node { color: var(--dsr-red); border-color: color-mix(in srgb, var(--dsr-red) 40%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-red) 8%, var(--dsr-bg)); }",
  ".dsr-turn__body { min-width: 0; padding: 8px 10px 9px; border: 1px solid var(--dsr-line-soft); border-radius: 10px; background: color-mix(in srgb, var(--dsr-soft) 46%, transparent); }",
  ".dsr-turn[data-state=\"running\"] .dsr-turn__body { border-color: color-mix(in srgb, var(--dsr-accent) 22%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 4%, transparent); }",
  ".dsr-turn__head { display: flex; align-items: baseline; gap: 6px; min-width: 0; }",
  ".dsr-turn__title { color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); white-space: nowrap; }",
  ".dsr-turn__state { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-turn__time { margin-left: auto; flex: none; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-turn__prompt { margin: 5px 0 0; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }",
  ".dsr-turn__chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 7px; }",
  ".dsr-turn__chip { display: inline-flex; align-items: center; gap: 3px; height: 18px; padding: 0 6px; border: 1px solid var(--dsr-line-soft); border-radius: 5px; background: color-mix(in srgb, var(--dsr-bg) 72%, transparent); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-turn__chip.is-error { color: var(--dsr-red); border-color: color-mix(in srgb, var(--dsr-red) 28%, var(--dsr-line-soft)); }",
  ".dsr-turn__chain { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }",
  ".dsr-chain .dsr-tool-glyph { color: var(--dsr-accent); }",
  ".dsr-turn__files { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; padding-top: 7px; border-top: 1px dashed var(--dsr-line-soft); }",
  ".dsr-file-pill { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 21px; padding: 0 7px 0 5px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: color-mix(in srgb, var(--dsr-bg) 80%, transparent); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }",
  ".dsr-file-pill:hover { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); }",
  ".dsr-file-pill svg { flex: none; color: var(--dsr-accent); }",
  ".dsr-file-pill span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-flow__more { margin: 10px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  "@keyframes dsr-flow-pulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }",
  "@container dsr-page (max-width: 1180px) { .dsr-page__stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }",
  "@media (max-width: 680px) { .dsr-signals__cell { padding: 0 6px; } .dsr-page__live { display: none; } .dsr-page__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-board__mark { display: none; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-card, .dsr-card::after, .dsr-flow__seg, .dsr-page__live .dsr-dot { animation: none !important; transition: none !important; } }",

  /* ---------- v3: editorial instrument layer ---------- */
  ".dsr-page { background: linear-gradient(180deg, color-mix(in srgb, var(--dsr-soft) 42%, var(--dsw-alias-bg-base)) 0, var(--dsw-alias-bg-base) 280px); }",
  ".dsr-page__head { position: relative; padding: 30px 32px 14px; gap: 24px; align-items: flex-start; }",
  ".dsr-page__head::before { content: \"\"; position: absolute; inset: 0 0 -20px; pointer-events: none; opacity: .5; background-image: radial-gradient(circle at 1px 1px, var(--dsr-line) 1px, transparent 0); background-size: 24px 24px; mask-image: radial-gradient(560px 190px at 82% 0%, #000 0%, transparent 78%); -webkit-mask-image: radial-gradient(560px 190px at 82% 0%, #000 0%, transparent 78%); }",
  ".dsr-page__head > * { position: relative; z-index: 1; }",
  ".dsr-page__heading { align-items: flex-start; gap: 14px; }",
  ".dsr-page__mark { width: 42px; height: 42px; margin-top: 2px; border-radius: 50%; border-color: var(--dsr-line); background: color-mix(in srgb, var(--dsr-bg) 72%, transparent); color: var(--dsr-accent); }",
  ".dsr-page__title { font-size: 27px; line-height: 33px; letter-spacing: -.025em; font-weight: 600; }",
  ".dsr-page__sub { margin-top: 5px; color: var(--dsr-muted); font-size: 13px; line-height: 20px; letter-spacing: -.005em; }",
  ".dsr-page__titlerow { gap: 12px; align-items: baseline; }",
  ".dsr-page__live { height: auto; padding: 0; border: 0; background: none; color: var(--dsr-muted); font-size: 11px; letter-spacing: .01em; }",
  ".dsr-page__live.is-on { background: none; border: 0; }",
  ".dsr-page__live.is-on .dsr-dot { box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 12%, transparent); }",
  ".dsr-page__toolbar { gap: 4px; }",
  ".dsr-page__toolbar .dsr-search { width: 248px; height: 34px; border-radius: 10px; background: var(--dsr-soft); border-color: transparent; transition: width 240ms cubic-bezier(.16,1,.3,1), border-color 160ms ease, background-color 160ms ease; }",
  ".dsr-page__toolbar .dsr-search:focus-within { width: 288px; background: var(--dsr-bg); border-color: var(--dsr-line); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-focus) 14%, transparent); }",
  ".dsr-page__stats { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 30px; padding: 0 32px 20px; border: 0; }",
  ".dsr-page__stats .dsr-stat { display: flex; align-items: center; flex: 0 0 auto; gap: 8px; padding: 0; margin: 0; border: 0; }",
  ".dsr-page__stats .dsr-stat__icon { width: auto; height: auto; border: 0; background: none; color: var(--dsr-muted); }",
  ".dsr-page__stats .dsr-stat[data-tone=\"green\"] .dsr-stat__icon { color: var(--dsr-green); background: none; border: 0; }",
  ".dsr-page__stats .dsr-stat[data-tone=\"amber\"] .dsr-stat__icon { color: var(--dsr-amber); background: none; border: 0; }",
  ".dsr-page__stats .dsr-stat[data-tone=\"accent\"] .dsr-stat__icon { color: var(--dsr-accent); background: none; border: 0; }",
  ".dsr-page__stats .dsr-stat__body { display: flex; align-items: baseline; gap: 6px; }",
  ".dsr-page__stats .dsr-stat__value { font-size: 17px; line-height: 21px; font-weight: 600; letter-spacing: -.02em; }",
  ".dsr-page__stats .dsr-stat__label { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsr-muted); }",
  ".dsr-page__views { height: 47px; padding: 0 32px; border-top: 1px solid var(--dsr-line-soft); border-bottom: 1px solid var(--dsr-line); }",
  ".dsr-page__views .dsr-tabs { height: 100%; gap: 26px; }",
  ".dsr-page__views .dsr-tab { height: 100%; font-size: 13px; font-weight: 500; color: var(--dsr-muted); transition: color 160ms ease; }",
  ".dsr-tab:hover { color: var(--dsr-text); }",
  ".dsr-tab.is-active { color: var(--dsr-text); font-weight: 600; }",
  ".dsr-page__views .dsr-tab::after { content: \"\"; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: var(--dsr-accent); transform: scaleX(0); transform-origin: 50% 100%; transition: transform 260ms cubic-bezier(.16,1,.3,1); }",
  ".dsr-page__views .dsr-tab.is-active::after { transform: scaleX(1); }",
  ".dsr-page__views .dsr-tab__count { margin-left: 6px; font-size: 11px; font-weight: 500; }",
  ".dsr-footer__status { flex: none; font-size: 11px; }",
  ".dsr-board { padding: 26px 32px 44px; }",
  ".dsr-board__section + .dsr-board__section { margin-top: 38px; }",
  ".dsr-board__head { align-items: flex-start; margin-bottom: 14px; gap: 10px; }",
  ".dsr-board__head h2 { font-size: 17px; line-height: 23px; letter-spacing: -.025em; font-weight: 600; }",
  ".dsr-board__head p { margin-top: 3px; font-size: 12px; line-height: 18px; }",
  ".dsr-board__mark { width: 20px; height: 20px; margin-top: 2px; border: 0; border-radius: 0; background: none; color: var(--dsr-muted); }",
  ".dsr-board__count { height: auto; padding: 0; border: 0; background: none; color: var(--dsr-muted); font-size: 12px; font-weight: 500; letter-spacing: .01em; }",
  ".dsr-board__headmeta { gap: 12px; }",
  ".dsr-board__quiet { min-height: 0; padding: 14px 0; border: 0; border-radius: 0; background: transparent; }",
  ".dsr-card-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }",
  ".dsr-card { min-height: 0; cursor: pointer; border-radius: 16px; border-color: var(--dsr-line-soft); background: var(--dsr-bg); box-shadow: 0 1px 2px rgba(16, 24, 40, .035); transition: transform 260ms cubic-bezier(.16,1,.3,1), border-color 200ms ease, box-shadow 260ms cubic-bezier(.16,1,.3,1); }",
  ".dsr-card::before, .dsr-card::after { display: none; }",
  ".dsr-card:hover { transform: translateY(-3px); border-color: var(--dsr-line); box-shadow: 0 22px 44px -30px rgba(16, 24, 40, .35), 0 2px 6px rgba(16, 24, 40, .05); }",
  ".dsr-card:active { transform: translateY(-1px); }",
  ".dsr-card.is-live { grid-column: span 2; border-color: var(--dsr-line); background: var(--dsr-bg); }",
  ".dsr-card-grid--live .dsr-card:first-child .dsr-card__title { font-size: 17px; line-height: 24px; letter-spacing: -.02em; }",
  ".dsr-card-grid--live .dsr-card:first-child .dsr-signals__value { font-size: 16px; }",
  ".dsr-card__head { padding: 15px 16px 0 18px; }",
  ".dsr-card__statusline { gap: 8px; }",
  ".dsr-card__status { height: auto; padding: 0; border: 0; background: none; color: var(--dsr-secondary); font-size: 11px; font-weight: 500; letter-spacing: .01em; }",
  ".dsr-card__status .dsr-dot { width: 6px; height: 6px; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 10%, transparent); }",
  ".dsr-card__main { padding: 11px 18px 16px; }",
  ".dsr-card__title { font-size: 15px; line-height: 22px; letter-spacing: -.015em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }",
  ".dsr-card__meta { margin-top: 5px; font-size: 12px; line-height: 18px; }",
  ".dsr-card__live { margin-top: 12px; min-height: 22px; padding: 0; gap: 6px; border: 0; border-radius: 0; background: none; box-shadow: none; font-size: 12px; line-height: 18px; }",
  ".dsr-card.is-live .dsr-card__live { margin: 12px -18px 0; padding: 8px 18px; border-radius: 0; background: color-mix(in srgb, var(--dsr-accent) 5.5%, transparent); }",
  ".dsr-card__live-label { font-weight: 600; }",
  ".dsr-card__live-time { font-size: 11px; }",
  ".dsr-card__progress { margin-top: 10px; }",
  ".dsr-signals { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 15px; padding: 12px 0 0; border-top: 1px solid var(--dsr-line-soft); border-bottom: 0; }",
  ".dsr-signals__cell { padding: 0; border: 0; gap: 3px; }",
  ".dsr-signals__label { font-size: 10.5px; line-height: 14px; letter-spacing: .02em; }",
  ".dsr-signals__value { font-size: 15px; line-height: 19px; letter-spacing: -.015em; }",
  ".dsr-cost { margin-top: 11px; gap: 6px 12px; font-size: 11px; }",
  ".dsr-cost__bar { width: 22px; height: 2px; }",
  ".dsr-card__footer { margin-top: 0; padding: 0 18px; min-height: 44px; border-top: 1px solid var(--dsr-line-soft); background: transparent; }",
  ".dsr-delivery { height: auto; padding: 0; border: 0; background: none; font-size: 11px; }",
  ".dsr-delivery.is-delivered { background: none; border: 0; }",
  ".dsr-delivery.is-changed { background: none; border: 0; }",
  ".dsr-card__enter { height: 26px; padding: 0; border: 0; background: none; color: var(--dsr-muted); font-size: 11px; gap: 3px; }",
  ".dsr-card__enter:hover { color: var(--dsr-accent); background: none; }",
  ".dsr-card__enter svg { transition: transform 200ms cubic-bezier(.16,1,.3,1); }",
  ".dsr-card__enter:hover svg { transform: translateX(2px); }",
  ".dsr-card__headactions .dsr-icon-btn { opacity: 0; transition: opacity 160ms ease, background-color 140ms ease, color 140ms ease; }",
  ".dsr-card:hover .dsr-card__headactions .dsr-icon-btn, .dsr-card:focus-within .dsr-card__headactions .dsr-icon-btn, .dsr-card__headactions .dsr-icon-btn.is-active { opacity: 1; }",
  "@media (hover: none) { .dsr-card__headactions .dsr-icon-btn { opacity: 1; } }",
  ".dsr-filterbar { margin: 0 0 22px; padding: 0; border: 0; background: transparent; box-shadow: none; gap: 8px; }",
  ".dsr-filterbar.is-active { border: 0; }",
  ".dsr-filterbar__lead { font-size: 11px; gap: 5px; margin-right: 4px; }",
  ".dsr-filter { height: 30px; padding: 0 6px 0 12px; border-color: transparent; border-radius: 999px; background: var(--dsr-soft); }",
  ".dsr-filter:hover { border-color: transparent; background: color-mix(in srgb, var(--dsr-soft) 40%, var(--dsr-line-soft)); }",
  ".dsr-filter__label { font-size: 11px; }",
  ".dsr-filter__select { font-size: 12px; font-weight: 500; }",
  ".dsr-filterbar__clear { height: 28px; border-radius: 999px; padding: 0 11px; font-size: 11px; }",
  ".dsr-filterbar__count { font-size: 11px; }",
  ".dsr-detail--page .dsr-detail__head { padding: 22px 22px 16px; gap: 6px; align-items: flex-start; }",
  ".dsr-detail--page .dsr-detail__title { font-size: 19px; line-height: 25px; letter-spacing: -.02em; font-weight: 600; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }",
  ".dsr-detail--page .dsr-detail__sub { margin-top: 6px; font-size: 12px; line-height: 18px; white-space: normal; }",
  ".dsr-detail--page .dsr-detail__body { padding: 0 22px 32px; }",
  ".dsr-detail--page .dsr-detail__section { padding: 19px 0; }",
  ".dsr-detail--page .dsr-detail__section-head { margin-bottom: 11px; }",
  ".dsr-detail--page .dsr-detail__section-title { font-size: 11px; font-weight: 600; letter-spacing: .04em; }",
  ".dsr-detail--page .dsr-detail__section-meta { font-size: 11px; }",
  ".dsr-detail--page .dsr-dstat { padding: 12px 13px 13px; }",
  ".dsr-detail--page .dsr-dstat__value { font-size: 17px; }",
  ".dsr-board__foot { margin-top: 34px; padding-top: 14px; border-top: 1px solid var(--dsr-line-soft); font-size: 11px; }",
  "@keyframes dsr-rise { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }",
  ".dsr-page__head, .dsr-page__stats, .dsr-page__views { animation: dsr-rise 460ms cubic-bezier(.16,1,.3,1) both; }",
  ".dsr-page__stats { animation-delay: 50ms; }",
  ".dsr-page__views { animation-delay: 100ms; }",
  ".dsr-board__section { animation: dsr-rise 540ms cubic-bezier(.16,1,.3,1) both; animation-delay: 120ms; }",
  ".dsr-board__section:nth-child(2) { animation-delay: 170ms; }",
  ".dsr-board__section:nth-child(3) { animation-delay: 220ms; }",
  ".dsr-board__section:nth-child(4) { animation-delay: 270ms; }",
  ".dsr-card { animation: dsr-rise 520ms cubic-bezier(.16,1,.3,1) backwards; }",
  ".dsr-card:nth-child(2) { animation-delay: 30ms; }",
  ".dsr-card:nth-child(3) { animation-delay: 60ms; }",
  ".dsr-card:nth-child(4) { animation-delay: 90ms; }",
  ".dsr-card:nth-child(5) { animation-delay: 120ms; }",
  ".dsr-card:nth-child(6) { animation-delay: 150ms; }",
  "[data-ds-dark-theme] .dsr-card { border-color: var(--dsr-line); box-shadow: none; }",
  "[data-ds-dark-theme] .dsr-card:hover { box-shadow: 0 24px 48px -30px rgba(0, 0, 0, .9); }",
  "[data-ds-dark-theme] .dsr-page__head::before { opacity: .3; }",
  "@container dsr-page (max-width: 900px) { .dsr-page__head { padding: 24px 22px 12px; } .dsr-page__stats { padding: 0 22px 16px; gap: 8px 20px; } .dsr-page__views { padding: 0 22px; } .dsr-board { padding: 22px 22px 36px; } .dsr-page__toolbar .dsr-search { width: 200px; } .dsr-page__toolbar .dsr-search:focus-within { width: 240px; } }",
  "@container dsr-page (max-width: 700px) { .dsr-page__head { flex-wrap: wrap; } .dsr-page__title { font-size: 23px; line-height: 29px; } .dsr-page__mark { width: 36px; height: 36px; } .dsr-page__toolbar { width: 100%; } .dsr-page__toolbar .dsr-search { flex: 1 1 auto; width: auto; } .dsr-page__toolbar .dsr-search:focus-within { width: auto; } }",
  "@media (max-width: 680px) { .dsr-page__head { padding: 20px 16px 10px; flex-wrap: wrap; } .dsr-page__toolbar { width: 100%; } .dsr-page__toolbar .dsr-search { flex: 1; width: auto; } .dsr-page__stats { padding: 0 16px 14px; gap: 7px 16px; } .dsr-page__views { padding: 0 16px; } .dsr-page__views .dsr-tabs { gap: 18px; } .dsr-board { padding: 20px 16px 32px; } .dsr-card.is-live { grid-column: auto; } .dsr-card-grid { grid-template-columns: minmax(0, 1fr); } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-page__head, .dsr-page__stats, .dsr-page__views, .dsr-board__section, .dsr-card { animation: none !important; } }",

  ".dsr-card.is-selected { border-color: color-mix(in srgb, var(--dsr-accent) 42%, var(--dsr-line)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-accent) 9%, transparent), 0 18px 40px -30px rgba(16, 24, 40, .3); }",
  ".dsr-card:focus-within { border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); }",
  ".dsr-filter.is-set { border-color: color-mix(in srgb, var(--dsr-accent) 26%, transparent); background: color-mix(in srgb, var(--dsr-accent) 7%, var(--dsr-soft)); }",
  ".dsr-filter.is-set .dsr-filter__label, .dsr-filter.is-set .dsr-filter__select { color: var(--dsr-accent); }",
  ".dsr-icon-btn.is-active svg { animation: dsr-pop 280ms cubic-bezier(.2, 1.5, .4, 1); }",
  "@keyframes dsr-pop { 0% { transform: scale(.72); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-icon-btn.is-active svg { animation: none !important; } }",

  ".dsr-page__toolbar .dsr-icon-btn { width: 32px; height: 32px; border-radius: 9px; }",
  ".dsr-button { transition: transform 120ms ease, background-color 140ms ease, border-color 140ms ease, color 140ms ease; }",
  ".dsr-button:active, .dsr-icon-btn:active { transform: scale(.96); }",
  ".dsr-page__views .dsr-tabs { min-width: 0; flex: 1 1 auto; overflow-x: auto; scrollbar-width: none; }",
  ".dsr-page__views .dsr-tabs::-webkit-scrollbar { display: none; }",
  ".dsr-board__section--tracked .dsr-board__mark { color: var(--dsr-accent); background: none; border: 0; }",
  ".dsr-board__section--active .dsr-board__mark { color: var(--dsr-green); }",
  ".dsr-board__section--recent .dsr-board__mark { color: var(--dsr-muted); }",
  ".dsr-board__section--tracked { padding: 0; border: 0; border-radius: 0; background: none; }",
  ".dsr-board__section--tracked::before { display: none; }",
  ".dsr-board__section--tracked .dsr-board__head { padding: 0; }",
  ".dsr-board__section--tracked .dsr-card { box-shadow: 0 1px 2px rgba(16, 24, 40, .035); }",
  ".dsr-empty { gap: 9px; padding: 54px 26px 50px; }",
  ".dsr-empty__icon { width: 44px; height: 44px; border-radius: 50%; color: var(--dsr-accent); }",
  ".dsr-empty__title { font-size: 16px; line-height: 23px; letter-spacing: -.015em; }",
  ".dsr-empty__text { max-width: 320px; font-size: 13px; line-height: 20px; }",
  ".dsr-page__body.has-selection .dsr-page__detail { animation: dsr-panel-in 280ms cubic-bezier(.16,1,.3,1); }",
  "@keyframes dsr-panel-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-page__body.has-selection .dsr-page__detail { animation: none !important; } }",
  ".dsr-filter:focus-within { border-color: var(--dsr-focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-focus) 14%, transparent); }",
  ".dsr-page__head > * { position: relative; z-index: 1; }",
  ".dsr-review-dot { position: absolute; z-index: 3; top: 8px; left: 8px; width: 6px; height: 6px; border-radius: 50%; background: var(--dsr-green); box-shadow: 0 0 0 2px var(--dsr-bg), 0 0 0 4px color-mix(in srgb, var(--dsr-green) 14%, transparent); animation: dsr-review-in 380ms cubic-bezier(.16,1,.3,1) both; }",
  ".dsr-session-row > .dsr-review-dot { top: 7px; left: 6px; width: 6px; height: 6px; box-shadow: 0 0 0 1.5px var(--dsr-bg); pointer-events: none; }",
  "@keyframes dsr-review-in { from { opacity: 0; transform: scale(.45); } 65% { opacity: 1; transform: scale(1.08); } to { opacity: 1; transform: none; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-review-dot { animation: none !important; } }",
  ".dsr-review-dot.is-inline { position: static; top: auto; left: auto; display: inline-block; width: 6px; height: 6px; margin-right: 6px; vertical-align: 1px; box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 12%, transparent); animation: none; }",
  /* Configurable card sheets: static paint only, no filters or animated textures; texture "none" opts out. */
  ".dsr-page[data-card-tint=\"auto\"] .dsr-card { background-color: var(--dsr-bg); }",
  ".dsr-page[data-card-tint=\"sand\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 91%, var(--dsr-amber) 9%); }",
  ".dsr-page[data-card-tint=\"mist\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 92%, var(--dsr-accent) 8%); }",
  ".dsr-page[data-card-tint=\"sage\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 92%, var(--dsr-green) 8%); }",
  "[data-ds-dark-theme] .dsr-page[data-card-tint=\"sand\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 88%, var(--dsr-amber) 12%); }",
  "[data-ds-dark-theme] .dsr-page[data-card-tint=\"mist\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 89%, var(--dsr-accent) 11%); }",
  "[data-ds-dark-theme] .dsr-page[data-card-tint=\"sage\"] .dsr-card { background-color: color-mix(in srgb, var(--dsr-bg) 89%, var(--dsr-green) 11%); }",
  ":where(.dsr-page[data-card-tint]) .dsr-card { border-color: color-mix(in srgb, var(--dsr-line) 78%, var(--dsr-bg)); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 38%, transparent), 0 1px 2px rgba(16, 24, 40, .045), 0 10px 22px -20px rgba(16, 24, 40, .3); }",
  "[data-ds-dark-theme] :where(.dsr-page[data-card-tint]) .dsr-card { border-color: var(--dsr-line); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 10px 24px -20px rgba(0, 0, 0, .8); }",
  ".dsr-page[data-card-texture=\"paper\"] .dsr-card::before { content: \"\"; display: block; position: absolute; inset: 0; z-index: 0; pointer-events: none; border-radius: inherit; opacity: .7; background: none; background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dsr-text) 7%, transparent) .55px, transparent .9px); background-size: 4px 4px; }",
  ".dsr-page[data-card-texture=\"dots\"] .dsr-card::before { content: \"\"; display: block; position: absolute; inset: 0; z-index: 0; pointer-events: none; border-radius: inherit; opacity: .8; background: none; background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dsr-text) 8%, transparent) .9px, transparent 1.1px); background-size: 14px 14px; }",
  ".dsr-prefs__menu { max-height: min(560px, calc(100vh - 88px)); overflow-y: auto; }",
  ".dsr-prefs__divider { height: 1px; margin: 6px 8px; background: var(--dsr-line-soft); }",
  ".dsr-prefs__label { padding: 5px 8px 4px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .04em; }",
  ".dsr-swatches, .dsr-textures { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 0 4px 4px; }",
  ".dsr-swatch, .dsr-texture-option { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 2px 5px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease; }",
  ".dsr-swatch:hover, .dsr-texture-option:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsr-text); }",
  ".dsr-swatch.is-active, .dsr-texture-option.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 6%, var(--dsr-bg)); color: var(--dsr-text); }",
  ".dsr-swatch__dot { width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsr-text) 8%, transparent); }",
  ".dsr-swatch.is-active .dsr-swatch__dot { box-shadow: 0 0 0 2px var(--dsr-bg), 0 0 0 3.5px var(--dsr-accent), inset 0 0 0 1px color-mix(in srgb, var(--dsr-text) 8%, transparent); }",
  ".dsr-texture-option__preview { width: 20px; height: 15px; border: 1px solid var(--dsr-line-soft); border-radius: 4px; background-color: var(--dsr-bg); }",
  ".dsr-texture-option__preview[data-texture=\"paper\"] { background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dsr-text) 12%, transparent) .5px, transparent .7px); background-size: 3px 3px; }",
  ".dsr-texture-option__preview[data-texture=\"dots\"] { background-image: radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--dsr-text) 18%, transparent) .8px, transparent 1px); background-size: 5px 5px; }",
  ".dsr-swatch:focus-visible, .dsr-texture-option:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 1px; }",
  ".dsr-dock { background: var(--dsr-bg); background: color-mix(in srgb, var(--dsr-bg) 78%, transparent); background-image: linear-gradient(135deg, rgba(255,255,255,.14), transparent 38%, rgba(255,255,255,.035) 68%, rgba(0,0,0,.025)); -webkit-backdrop-filter: blur(24px) saturate(1.35); backdrop-filter: blur(24px) saturate(1.35); box-shadow: var(--dsw-shadow-lv3), inset 0 1px 0 color-mix(in srgb, #fff 52%, transparent); }",
  ".dsr-dock .dsr-prefs { position: static; }",
  ".dsr-dock .dsr-prefs__menu { position: absolute; inset: 0; width: auto; max-height: none; border-radius: inherit; padding: 10px 12px 14px; background: var(--dsr-bg); box-shadow: none; z-index: 20; overflow-y: auto; overscroll-behavior: contain; }",
  ".dsr-prefs__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 0 0 2px; }",
  ".dsr-prefs__head .dsr-prefs__title { padding: 5px 4px 6px; }",
  ".dsr-prefs__head .dsr-icon-btn { width: 25px; height: 25px; }",
  ".dsr-dock .dsr-prefs__note { display: none; }",
  ".dsr-rail { background: var(--dsr-bg); background: color-mix(in srgb, var(--dsr-bg) 80%, transparent); background-image: linear-gradient(135deg, rgba(255,255,255,.13), transparent 46%, rgba(0,0,0,.02)); -webkit-backdrop-filter: blur(20px) saturate(1.3); backdrop-filter: blur(20px) saturate(1.3); }",
  ".dsr-prefs__menu { background: var(--dsr-bg); -webkit-backdrop-filter: blur(18px) saturate(1.2); backdrop-filter: blur(18px) saturate(1.2); }",
  "@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .dsr-dock, .dsr-rail, .dsr-prefs__menu { background: var(--dsr-bg); } }",
  "html[data-omd-layout=\"glyph-motion\"] .dsr-rail.dsr-rail { background-color: color-mix(in srgb, var(--dsr-bg) 80%, transparent) !important; background-image: linear-gradient(135deg, rgba(255,255,255,.13), transparent 46%, rgba(0,0,0,.02)) !important; color: var(--dsr-secondary) !important; border-color: var(--dsr-line) !important; border-radius: 21px !important; box-shadow: var(--dsw-shadow-lv2) !important; -webkit-backdrop-filter: blur(20px) saturate(1.3) !important; backdrop-filter: blur(20px) saturate(1.3) !important; }",
  "html[data-omd-layout=\"glyph-motion\"] .dsr-dock.dsr-dock { background-color: color-mix(in srgb, var(--dsr-bg) 78%, transparent) !important; background-image: linear-gradient(135deg, rgba(255,255,255,.14), transparent 38%, rgba(255,255,255,.035) 68%, rgba(0,0,0,.025)) !important; border-color: var(--dsr-line) !important; border-radius: 26px !important; box-shadow: var(--dsw-shadow-lv3) !important; -webkit-backdrop-filter: blur(24px) saturate(1.35) !important; backdrop-filter: blur(24px) saturate(1.35) !important; }",
  "html[data-omd-layout=\"glyph-motion\"] .dsr-dock.dsr-dock .dsr-prefs__menu { background: var(--dsr-bg) !important; border-color: var(--dsr-line) !important; border-radius: 11px !important; box-shadow: var(--dsw-shadow-lv3) !important; }",
  "html[data-omd-layout=\"glyph-motion\"] .dsr-dock.dsr-dock button, html[data-omd-layout=\"glyph-motion\"] .dsr-page.dsr-page button { border-radius: 7px !important; }",
  ".dsr-inline-note { display: flex; align-items: center; gap: 7px; margin: 9px 0 0; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--dsr-green) 24%, var(--dsr-line-soft)); border-radius: 8px; background: color-mix(in srgb, var(--dsr-green) 6%, var(--dsr-bg)); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); }",
  ".dsr-inline-note.is-error { border-color: color-mix(in srgb, var(--dsr-red) 26%, var(--dsr-line-soft)); background: color-mix(in srgb, var(--dsr-red) 6%, var(--dsr-bg)); color: var(--dsr-red); }",
  ".dsr-modal__scrim { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 22px; background: color-mix(in srgb, #101828 38%, transparent); backdrop-filter: blur(6px); animation: dsr-fade 140ms ease-out; }",
  ".dsr-modal { width: min(430px, 100%); padding: 19px 20px 17px; border: 1px solid var(--dsr-line); border-radius: 15px; background: var(--dsr-bg); color: var(--dsr-text); box-shadow: 0 24px 70px -24px rgba(16, 24, 40, .5); animation: dsr-modal-in 180ms cubic-bezier(.2,.8,.2,1); }",
  ".dsr-modal__head { display: flex; align-items: center; gap: 9px; }",
  ".dsr-modal__icon { width: 30px; height: 30px; display: grid; place-items: center; flex: none; border-radius: 9px; background: color-mix(in srgb, var(--dsr-red) 9%, var(--dsr-soft)); color: var(--dsr-red); }",
  ".dsr-modal__title { margin: 0; font: var(--dsw-font-s-strong-15); font-size: 16px; letter-spacing: -.015em; }",
  ".dsr-modal__text { margin: 12px 0 0; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); line-height: 19px; }",
  ".dsr-modal__list { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; padding: 8px 9px; border-radius: 8px; background: var(--dsr-soft); }",
  ".dsr-modal__item { overflow: hidden; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-modal__item::before { content: \"·\"; margin-right: 6px; color: var(--dsr-red); }",
  ".dsr-modal__more { margin: 7px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-modal__actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 18px; }",
  ".dsr-modal__actions .dsr-button--danger { min-width: 92px; }",
  "@keyframes dsr-modal-in { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }",
  ".dsr-activity { padding-bottom: 36px; }",
  ".dsr-activity__summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin: 3px 0 14px; border: 1px solid var(--dsr-line-soft); border-radius: 12px; background: color-mix(in srgb, var(--dsr-bg) 84%, var(--dsr-soft)); overflow: hidden; }",
  ".dsr-activity__metric { min-width: 0; display: flex; align-items: center; gap: 9px; padding: 12px 14px; border: 0; border-left: 1px solid var(--dsr-line-soft); border-radius: 0; background: transparent; transition: background-color 140ms ease; }",
  ".dsr-activity__metric:first-child { border-left: 0; }",
  ".dsr-activity__metric:hover { background: color-mix(in srgb, var(--dsr-accent) 3%, transparent); }",
  ".dsr-activity__metric-icon { width: 28px; height: 28px; display: grid; place-items: center; flex: none; border-radius: 8px; background: var(--dsr-soft); color: var(--dsr-muted); }",
  ".dsr-activity__metric--tokens .dsr-activity__metric-icon { background: color-mix(in srgb, var(--dsr-accent) 9%, var(--dsr-soft)); color: var(--dsr-accent); }",
  ".dsr-activity__metric--time .dsr-activity__metric-icon { background: color-mix(in srgb, var(--dsr-green) 9%, var(--dsr-soft)); color: var(--dsr-green); }",
  ".dsr-activity__metric--sessions .dsr-activity__metric-icon { background: color-mix(in srgb, var(--dsr-amber) 10%, var(--dsr-soft)); color: var(--dsr-amber); }",
  ".dsr-activity__metric-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }",
  ".dsr-activity__metric-label { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-activity__metric-value { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-size: 16px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
  ".dsr-activity__panel { margin-top: 10px; padding: 14px 15px 13px; border: 1px solid var(--dsr-line-soft); border-radius: 13px; background: var(--dsr-bg); box-shadow: 0 1px 2px rgba(16, 24, 40, .025); }",
  ".dsr-activity__panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 25px; }",
  ".dsr-activity__panel-title { display: flex; align-items: center; gap: 6px; color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); }",
  ".dsr-activity__panel-title .dsr-icon { color: var(--dsr-muted); }",
  ".dsr-activity__modes { display: flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); }",
  ".dsr-activity__mode { min-width: 45px; display: flex; align-items: baseline; justify-content: center; gap: 4px; height: 25px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xs-13); cursor: pointer; transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease; }",
  ".dsr-activity__mode small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-weight: 400; }",
  ".dsr-activity__mode:hover { color: var(--dsr-text); }",
  ".dsr-activity__mode.is-active { background: var(--dsr-bg); color: var(--dsr-text); box-shadow: 0 1px 2px rgba(16, 24, 40, .08); }",
  ".dsr-activity__mode.is-active small { color: var(--dsr-secondary); }",
  ".dsr-activity__chart-wrap { position: relative; margin-top: 12px; }",
  ".dsr-activity__legend { display: flex; align-items: center; gap: 13px; margin: 0 0 7px 1px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-activity__legend span { display: inline-flex; align-items: center; gap: 5px; }",
  ".dsr-activity__legend i { width: 7px; height: 7px; border-radius: 2px; display: inline-block; }",
  ".dsr-activity__legend i.is-token { background: var(--dsr-accent); }",
  ".dsr-activity__legend i.is-time { background: color-mix(in srgb, var(--dsr-green) 72%, var(--dsr-bg)); }",
  ".dsr-activity__chart { display: flex; align-items: stretch; gap: 4px; height: 151px; padding: 0 1px; border-bottom: 1px solid var(--dsr-line-soft); }",
  ".dsr-activity__bucket { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 7px; padding: 4px 1px 0; border: 0; border-radius: 6px 6px 0 0; background: transparent; color: var(--dsr-muted); cursor: pointer; transition: background-color 130ms ease; }",
  ".dsr-activity__bucket:hover { background: color-mix(in srgb, var(--dsr-accent) 4%, transparent); }",
  ".dsr-activity__bucket.is-active { background: color-mix(in srgb, var(--dsr-accent) 6%, transparent); }",
  ".dsr-activity__plot { width: 100%; height: 118px; display: flex; align-items: flex-end; justify-content: center; gap: 3px; }",
  ".dsr-activity__bar { width: min(9px, 38%); height: 100%; display: flex; align-items: flex-end; border-radius: 3px 3px 0 0; overflow: hidden; }",
  ".dsr-activity__bar i { display: block; width: 100%; min-height: 0; border-radius: 3px 3px 0 0; transition: height 240ms cubic-bezier(.2,.8,.2,1); }",
  ".dsr-activity__bar--token i { background: color-mix(in srgb, var(--dsr-accent) 68%, var(--dsr-bg)); }",
  ".dsr-activity__bar--time i { background: color-mix(in srgb, var(--dsr-green) 48%, var(--dsr-bg)); }",
  ".dsr-activity__bucket.is-active .dsr-activity__bar--token i { background: var(--dsr-accent); }",
  ".dsr-activity__bucket.is-active .dsr-activity__bar--time i { background: color-mix(in srgb, var(--dsr-green) 78%, var(--dsr-bg)); }",
  ".dsr-activity__bucket-label { max-width: 100%; overflow: hidden; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-activity__bucket.is-active .dsr-activity__bucket-label { color: var(--dsr-text); font-weight: 600; }",
  ".dsr-activity__quiet { margin-top: 12px; padding: 17px 12px; border-radius: 9px; background: var(--dsr-soft); color: var(--dsr-muted); font: var(--dsw-font-xxs-12); text-align: center; }",
  ".dsr-wall-panel { overflow: hidden; }",
  ".dsr-activity__wall-meta { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-wall__scroll { margin-top: 11px; overflow-x: auto; padding-bottom: 2px; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-wall__inner { min-width: 666px; padding: 1px 0 2px; }",
  ".dsr-wall__months { position: relative; height: 14px; margin-left: 21px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-wall__month { position: absolute; top: 0; white-space: nowrap; transform: translateX(0); }",
  ".dsr-wall__body { display: flex; align-items: flex-start; gap: 6px; }",
  ".dsr-wall__days { display: grid; grid-template-rows: repeat(7, 10px); gap: 2px; width: 16px; padding-top: 1px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 10px; text-align: right; }",
  ".dsr-wall__weeks { display: flex; gap: 2px; }",
  ".dsr-wall__week { display: grid; grid-template-rows: repeat(7, 10px); gap: 2px; }",
  ".dsr-wall__cell { width: 10px; height: 10px; display: block; border: 1px solid transparent; border-radius: 2px; background: color-mix(in srgb, var(--dsr-line-soft) 60%, var(--dsr-bg)); }",
  ".dsr-wall__cell.is-level-1 { background: color-mix(in srgb, var(--dsr-accent) 16%, var(--dsr-soft)); }",
  ".dsr-wall__cell.is-level-2 { background: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-soft)); }",
  ".dsr-wall__cell.is-level-3 { background: color-mix(in srgb, var(--dsr-accent) 58%, var(--dsr-soft)); }",
  ".dsr-wall__cell.is-level-4 { background: var(--dsr-accent); }",
  ".dsr-wall__cell.is-future { background: transparent; border-color: var(--dsr-line-soft); opacity: .5; }",
  "[data-ds-dark-theme] .dsr-wall__cell { background: color-mix(in srgb, var(--dsr-line-soft) 48%, var(--dsr-bg)); }",
  "[data-ds-dark-theme] .dsr-wall__cell.is-level-1 { background: color-mix(in srgb, var(--dsr-accent) 22%, var(--dsr-bg)); }",
  "[data-ds-dark-theme] .dsr-wall__cell.is-level-2 { background: color-mix(in srgb, var(--dsr-accent) 40%, var(--dsr-bg)); }",
  ".dsr-wall__legend { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 8px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-wall__legend .dsr-wall__cell { width: 8px; height: 8px; }",
  ".dsr-activity__detail-meta { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }",
  ".dsr-activity__session-list { display: flex; flex-direction: column; margin-top: 9px; }",
  ".dsr-activity__session { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 13px; padding: 9px 7px; border: 0; border-top: 1px solid var(--dsr-line-soft); background: transparent; color: var(--dsr-secondary); text-align: left; cursor: pointer; transition: background-color 130ms ease; }",
  ".dsr-activity__session:first-child { border-top: 0; }",
  ".dsr-activity__session:hover { background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-activity__session-name { overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-activity__session-turns { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-activity__session-value { color: var(--dsr-green); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-activity__session-tokens { min-width: 64px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }",
  ".dsr-history-card .dsr-icon-btn.is-danger { flex: none; opacity: .55; }",
  ".dsr-history-card:hover .dsr-icon-btn.is-danger, .dsr-history-card .dsr-icon-btn.is-danger:focus-visible { opacity: 1; }",
  "@media (max-width: 860px) { .dsr-activity__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-activity__metric:nth-child(3) { border-left: 0; border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__metric:nth-child(4) { border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__chart { height: 132px; } .dsr-activity__plot { height: 99px; } }",
  "@media (max-width: 560px) { .dsr-activity { padding-left: 16px; padding-right: 16px; } .dsr-activity__panel { padding: 12px 11px 11px; } .dsr-activity__panel-head { align-items: flex-start; flex-direction: column; gap: 8px; } .dsr-activity__modes { align-self: stretch; justify-content: flex-start; } .dsr-activity__session { grid-template-columns: minmax(0, 1fr) auto; row-gap: 3px; } .dsr-activity__session-value { text-align: right; } .dsr-activity__session-tokens { grid-column: 2; text-align: right; } .dsr-modal { padding: 16px; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-modal, .dsr-modal__scrim, .dsr-activity__bar i { animation: none !important; transition: none !important; } }",
  ".dsr-activity__summary { grid-template-columns: repeat(5, minmax(0, 1fr)); }",
  ".dsr-activity__metric--calls .dsr-activity__metric-icon { background: color-mix(in srgb, #8b5cf6 12%, var(--dsr-soft)); color: #7c3aed; }",
  "[data-ds-dark-theme] .dsr-activity__metric--calls .dsr-activity__metric-icon { background: color-mix(in srgb, #a78bfa 16%, var(--dsr-bg)); color: #c4b5fd; }",
  ".dsr-activity__controls { display: flex; align-items: center; justify-content: flex-end; gap: 7px; flex-wrap: wrap; min-width: 0; }",
  ".dsr-activity__chart-switch { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); }",
  ".dsr-activity__chart-switch-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 25px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); cursor: pointer; transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease; }",
  ".dsr-activity__chart-switch-btn:hover { color: var(--dsr-text); }",
  ".dsr-activity__chart-switch-btn.is-active { background: var(--dsr-bg); color: var(--dsr-text); box-shadow: 0 1px 2px rgba(16, 24, 40, .08); }",
  ".dsr-activity__chart-switch-btn:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 48%, transparent); outline-offset: 1px; }",
  ".dsr-activity__chart-sub { margin: 5px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-activity__chart-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 7px 1px; }",
  ".dsr-activity__chart-meta .dsr-activity__legend { margin: 0; }",
  ".dsr-activity__chart-total { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-activity__chart--hours { gap: 2px; }",
  ".dsr-activity__chart--hours .dsr-activity__bar { width: min(8px, 36%); }",
  ".dsr-activity__chart--hours .dsr-activity__bucket-label { font-size: 10px; }",
  ".dsr-activity__pie-wrap { margin-top: 8px; }",
  ".dsr-activity__pie { display: flex; align-items: center; justify-content: center; gap: 25px; min-height: 176px; padding: 7px 10px 3px; }",
  ".dsr-activity__pie-figure { position: relative; flex: none; width: 154px; height: 154px; }",
  ".dsr-activity__pie-figure svg { display: block; width: 100%; height: 100%; }",
  ".dsr-activity__pie-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; pointer-events: none; text-align: center; }",
  ".dsr-activity__pie-center strong { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-size: 20px; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }",
  ".dsr-activity__pie-center small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-activity__model-list { min-width: 0; flex: 0 1 460px; max-width: 520px; display: flex; flex-direction: column; gap: 0; max-height: 174px; overflow-y: auto; }",
  ".dsr-activity__model-row { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto auto; align-items: center; gap: 9px; min-height: 29px; border-top: 1px solid var(--dsr-line-soft); }",
  ".dsr-activity__model-row:first-child { border-top: 0; }",
  ".dsr-activity__model-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 12%, transparent); }",
  ".dsr-activity__model-name { min-width: 0; overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }",
  ".dsr-activity__model-calls { color: var(--dsr-secondary); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; white-space: nowrap; }",
  ".dsr-activity__model-share { min-width: 31px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; text-align: right; }",
  "@media (max-width: 860px) { .dsr-activity__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dsr-activity__metric:nth-child(3) { border-left: 0; border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__metric:nth-child(4) { border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__metric:nth-child(5) { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--dsr-line-soft); } .dsr-activity__controls { width: 100%; justify-content: space-between; } .dsr-activity__pie { gap: 18px; } .dsr-activity__pie-figure { width: 140px; height: 140px; } }",
  "@media (max-width: 560px) { .dsr-activity__controls { align-items: flex-start; flex-wrap: wrap; } .dsr-activity__modes { flex: 1 1 100%; justify-content: space-between; } .dsr-activity__chart-switch { align-self: flex-start; } .dsr-activity__pie { flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 12px; padding-left: 3px; padding-right: 3px; } .dsr-activity__model-list { width: 100%; flex: 1 1 auto; max-width: none; max-height: none; } .dsr-activity__chart--hours .dsr-activity__bucket-label { font-size: 9px; } }",
  ".dsr-board__filters { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }",
  ".dsr-settings { min-width: 0; height: 100%; display: flex; flex-direction: column; background: var(--dsr-bg); color: var(--dsr-text); }",
  ".dsr-settings__head { display: flex; align-items: center; gap: 9px; padding: 16px 14px 12px; border-bottom: 1px solid var(--dsr-line-soft); flex: none; }",
  ".dsr-settings__mark { width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid var(--dsr-line); border-radius: 9px; background: var(--dsr-soft); color: var(--dsr-accent); flex: none; }",
  ".dsr-settings__headcopy { min-width: 0; flex: 1; }",
  ".dsr-settings__title { margin: 0; color: var(--dsr-text); font: var(--dsw-font-s-strong-14); letter-spacing: -.02em; }",
  ".dsr-settings__sub { margin: 2px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-settings__tabs { display: flex; gap: 3px; padding: 9px 12px; border-bottom: 1px solid var(--dsr-line-soft); flex: none; }",
  ".dsr-settings__tab { flex: 1; height: 28px; border: 0; border-radius: 7px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxs-strong-12); cursor: pointer; transition: background-color 140ms ease, color 140ms ease; }",
  ".dsr-settings__tab:hover { color: var(--dsr-text); background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-settings__tab.is-active { background: var(--dsr-soft); color: var(--dsr-text); box-shadow: 0 1px 2px rgba(16, 24, 40, .06); }",
  ".dsr-settings__tab:focus-visible, .dsr-settings__range-btn:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 1px; }",
  ".dsr-settings__body { flex: 1; min-height: 0; overflow: auto; padding: 13px 14px 18px; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }",
  ".dsr-settings__section { display: flex; flex-direction: column; gap: 8px; animation: dsr-settings-in 180ms ease both; }",
  ".dsr-settings__section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
  ".dsr-settings__section-title { color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); }",
  ".dsr-settings__badge { padding: 2px 6px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }",
  ".dsr-settings__note { margin: 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 17px; }",
  ".dsr-settings__label { margin-top: 4px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .04em; }",
  ".dsr-settings .dsr-swatches, .dsr-settings .dsr-textures { padding: 0; gap: 5px; }",
  ".dsr-settings .dsr-swatch, .dsr-settings .dsr-texture-option { padding-top: 9px; padding-bottom: 8px; border-radius: 8px; }",
  ".dsr-settings .dsr-swatch__dot { width: 18px; height: 18px; }",
  ".dsr-settings__range { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin-top: 2px; }",
  ".dsr-settings__range-btn { height: 32px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease; }",
  ".dsr-settings__range-btn:hover { border-color: var(--dsr-line); color: var(--dsr-text); background: var(--dsw-alias-interactive-bg-hover); }",
  ".dsr-settings__range-btn.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 36%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); color: var(--dsr-text); }",
  ".dsr-settings__hint { margin: 2px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 16px; }",
  ".dsr-settings__foot { display: flex; align-items: center; gap: 5px; padding: 10px 14px; border-top: 1px solid var(--dsr-line-soft); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); flex: none; }",
  ".dsr-page__settings { display: none; min-width: 0; min-height: 0; overflow: hidden; border-left: 1px solid var(--dsr-line); background: var(--dsr-bg); }",
  ".dsr-page__body.has-settings { grid-template-columns: minmax(0, 1fr) minmax(320px, 380px); }",
  ".dsr-page__body.has-settings .dsr-page__settings { display: block; }",
  ".dsr-dock .dsr-prefs__menu--dock { inset: 0; width: auto; max-height: none; padding: 0; overflow: hidden; border-radius: inherit; background: var(--dsr-bg); box-shadow: none; }",
  ".dsr-dock .dsr-settings { height: 100%; }",
  ".dsr-dock .dsr-settings__head { padding: 13px 12px 10px; }",
  ".dsr-dock .dsr-settings__body { padding: 10px 12px 14px; }",
  ".dsr-dock .dsr-settings__note { display: block; }",
  "@keyframes dsr-settings-in { from { opacity: 0; transform: translateX(5px); } to { opacity: 1; transform: none; } }",
  "@media (prefers-reduced-motion: reduce) { .dsr-settings__section { animation: none; } }",
  "@container dsr-page (max-width: 1120px) { .dsr-page__body.has-settings { grid-template-columns: minmax(0, 1fr) minmax(300px, 350px); } }",
  "@container dsr-page (max-width: 900px) { .dsr-page__body.has-settings { grid-template-columns: minmax(0, 1fr); } .dsr-page__body.has-settings .dsr-page__list { display: none; } .dsr-page__body.has-settings .dsr-page__settings { display: block; border-left: 0; border-top: 1px solid var(--dsr-line); } }",
  "@media (max-width: 980px) { .dsr-page__body.has-settings { grid-template-columns: minmax(0, 1fr); } .dsr-page__body.has-settings .dsr-page__list { display: none; } .dsr-page__body.has-settings .dsr-page__settings { display: block; border-left: 0; border-top: 1px solid var(--dsr-line); } }",
  ".dsr-activity__bucket { position: relative; }",
  ".dsr-activity__tip { position: absolute; left: 50%; bottom: calc(100% + 7px); z-index: 8; width: max-content; min-width: 168px; display: flex; flex-direction: column; gap: 4px; padding: 9px 10px; border: 1px solid var(--dsr-line); border-radius: 9px; background: var(--dsr-bg); box-shadow: var(--dsw-shadow-lv3); color: var(--dsr-secondary); opacity: 0; visibility: hidden; transform: translate(-50%, 4px); transition: opacity 120ms ease, transform 120ms ease, visibility 120ms ease; pointer-events: none; text-align: left; }",
  ".dsr-activity__bucket[data-tip-align=\"start\"] .dsr-activity__tip { left: 0; transform: translate(0, 4px); }",
  ".dsr-activity__bucket[data-tip-align=\"end\"] .dsr-activity__tip { left: auto; right: 0; transform: translate(0, 4px); }",
  ".dsr-activity__bucket:hover .dsr-activity__tip, .dsr-activity__bucket:focus-visible .dsr-activity__tip { opacity: 1; visibility: visible; transform: translate(-50%, 0); }",
  ".dsr-activity__bucket[data-tip-align=\"start\"]:hover .dsr-activity__tip, .dsr-activity__bucket[data-tip-align=\"start\"]:focus-visible .dsr-activity__tip, .dsr-activity__bucket[data-tip-align=\"end\"]:hover .dsr-activity__tip, .dsr-activity__bucket[data-tip-align=\"end\"]:focus-visible .dsr-activity__tip { transform: translate(0, 0); }",
  ".dsr-activity__tip-title { color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); }",
  ".dsr-activity__tip-row { display: flex; justify-content: space-between; gap: 18px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }",
  ".dsr-activity__tip-row strong { color: var(--dsr-text); font-weight: 600; font-variant-numeric: tabular-nums; }",
  "@media (max-width: 680px) { .dsr-board__headmeta { width: 100%; min-width: 0; } .dsr-board__filters { width: 100%; } }",
  "@media (max-width: 560px) { .dsr-settings__range { grid-template-columns: minmax(0, 1fr); } .dsr-settings__tabs { padding-left: 10px; padding-right: 10px; } }",
  ".dsr-token__group-switch { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-soft); }\n.dsr-token__group-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 25px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); cursor: pointer; transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease; }\n.dsr-token__group-btn:hover { color: var(--dsr-text); }\n.dsr-token__group-btn.is-active { background: var(--dsr-bg); color: var(--dsr-text); box-shadow: 0 1px 2px rgba(16, 24, 40, .08); }\n.dsr-token__group-btn:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 48%, transparent); outline-offset: 1px; }\n.dsr-token__layout { display: grid; grid-template-columns: minmax(255px, .78fr) minmax(0, 1.3fr); align-items: stretch; gap: 20px; margin-top: 12px; }\n.dsr-token__pie-col { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 7px 20px 4px 4px; border-right: 1px solid var(--dsr-line-soft); }\n.dsr-token__pie { position: relative; width: 172px; height: 172px; flex: none; }\n.dsr-token__pie svg { display: block; width: 100%; height: 100%; }\n.dsr-token__pie-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; pointer-events: none; text-align: center; }\n.dsr-token__pie-center strong { color: var(--dsr-text); font: var(--dsw-font-s-strong-14); font-size: 20px; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }\n.dsr-token__pie-center small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }\n.dsr-token__legend { width: 100%; max-height: 132px; overflow-y: auto; scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent; }\n.dsr-token__legend-row { min-width: 0; min-height: 26px; display: grid; grid-template-columns: 8px minmax(0, 1fr) auto 31px; align-items: center; gap: 8px; border-top: 1px solid var(--dsr-line-soft); }\n.dsr-token__legend-row:first-child { border-top: 0; }\n.dsr-token__dot { width: 8px; height: 8px; display: block; border-radius: 50%; }\n.dsr-token__legend-name { min-width: 0; overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xxs-strong-12); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }\n.dsr-token__legend-value { color: var(--dsr-secondary); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; white-space: nowrap; }\n.dsr-token__legend-share { min-width: 31px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; text-align: right; }\n.dsr-token__bar-col { min-width: 0; display: flex; flex-direction: column; padding: 2px 2px 0 0; }\n.dsr-token__bar-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 19px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }\n.dsr-token__bar-head > span:first-child { color: var(--dsr-secondary); font-weight: 600; }\n.dsr-token__bar-total { font-variant-numeric: tabular-nums; white-space: nowrap; }\n.dsr-token__bars { position: relative; flex: 1; min-height: 202px; display: flex; align-items: stretch; padding: 16px 0 0; border-bottom: 1px solid var(--dsr-line-soft); }\n.dsr-token__grid { position: absolute; inset: 16px 0 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }\n.dsr-token__grid i { display: block; border-top: 1px dashed color-mix(in srgb, var(--dsr-line-soft) 82%, transparent); }\n.dsr-token__bar-list { position: relative; z-index: 1; width: 100%; display: flex; align-items: stretch; gap: 9px; padding: 0 3px; }\n.dsr-token__bar { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; padding: 0; border: 0; background: transparent; color: var(--dsr-muted); outline: none; }\n.dsr-token__bar-plot { width: 100%; flex: 1; display: flex; align-items: flex-end; justify-content: center; min-height: 0; }\n.dsr-token__bar-fill { display: block; width: min(31px, 74%); min-height: 3px; border-radius: 4px 4px 2px 2px; box-shadow: inset 0 1px rgba(255, 255, 255, .2); transition: height 280ms cubic-bezier(.2,.8,.2,1), filter 140ms ease; }\n.dsr-token__bar:hover .dsr-token__bar-fill, .dsr-token__bar:focus-visible .dsr-token__bar-fill { filter: saturate(1.15) brightness(1.05); }\n.dsr-token__bar:focus-visible .dsr-token__bar-plot { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 46%, transparent); outline-offset: 3px; border-radius: 4px; }\n.dsr-token__bar-label { width: 100%; min-height: 28px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding: 0 2px; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 1.35; text-align: center; overflow-wrap: anywhere; }\n.dsr-token__bar.is-other .dsr-token__bar-label { color: var(--dsr-muted); }\n.dsr-token__axis { display: flex; align-items: center; gap: 8px; padding: 5px 3px 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }\n.dsr-token__axis span:last-child { margin-left: auto; }\n@media (max-width: 860px) { .dsr-token__layout { grid-template-columns: minmax(0, 1fr); gap: 14px; } .dsr-token__pie-col { flex-direction: row; justify-content: center; align-items: center; gap: 18px; padding: 2px 0 12px; border-right: 0; border-bottom: 1px solid var(--dsr-line-soft); } .dsr-token__pie { width: 150px; height: 150px; } .dsr-token__legend { flex: 1; min-width: 0; max-height: 112px; } .dsr-token__bar-col { padding: 0; } .dsr-token__bars { min-height: 180px; } }\n@media (max-width: 560px) { .dsr-token__pie-col { flex-direction: column; gap: 8px; padding: 0 0 10px; } .dsr-token__pie { width: 142px; height: 142px; } .dsr-token__legend { width: 100%; max-height: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; } .dsr-token__legend-row { min-height: 25px; } .dsr-token__bar-list { gap: 5px; padding: 0 1px; } .dsr-token__bars { min-height: 160px; } .dsr-token__bar-label { font-size: 10px; } .dsr-token__group-switch { width: 100%; } .dsr-token__group-btn { flex: 1; } }",
  `
/* quick launch rail: a compact, glassy companion to the radar entry */
.dsr-quickbar, .dsr-quickbar * { box-sizing: border-box; }
.dsr-quickbar { position: fixed; right: 8px; top: 204px; z-index: 57; transform: none; display: flex; flex-direction: column; align-items: stretch; gap: 5px; width: 48px; max-height: calc(100vh - 228px); overflow-x: hidden; overflow-y: auto; padding: 8px 6px; border: 1px solid var(--dsr-line); border-radius: 24px; background: var(--dsr-bg); background: color-mix(in srgb, var(--dsr-bg) 90%, transparent); box-shadow: var(--dsw-shadow-lv2); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); scrollbar-width: none; transition: width 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease, background-color 180ms ease; } .dsr-quickbar:hover, .dsr-quickbar:has(:focus-visible), .dsr-quickbar.is-near { width: 270px; box-shadow: var(--dsw-shadow-lv3); background: color-mix(in srgb, var(--dsr-bg) 96%, transparent); }
.dsr-quickbar.is-solo { right: 8px; top: 50%; transform: translateY(-50%); }
.dsr-quickbar::-webkit-scrollbar { display: none; }
.dsr-quickbar__cap { width: 100%; min-height: 26px; display: flex; align-items: center; padding: 0 0 4px; margin-bottom: 1px; border-bottom: 1px solid var(--dsr-line-soft); color: var(--dsr-muted); flex: none; cursor: grab; touch-action: none; user-select: none; } .dsr-quickbar__cap:active, .dsr-quickbar.is-dragging .dsr-quickbar__cap { cursor: grabbing; } .dsr-quickbar.is-dragging { transition: none; } .dsr-quickbar__cap:hover .dsr-icon { color: var(--dsr-text); } .dsr-quickbar__cap .dsr-quickbar__glyph { width: 32px; height: 22px; } .dsr-quickbar__cap .dsr-quickbar__label { font: var(--dsw-font-xxxs-strong-11); letter-spacing: .08em; text-transform: uppercase; }
.dsr-quickbar__item { position: relative; display: flex; align-items: center; gap: 0; width: 100%; flex: none; } .dsr-quickbar__btn { position: relative; width: auto; min-width: 0; height: 34px; flex: 1 1 auto; padding: 0; display: flex; align-items: center; border: 1px solid transparent; border-radius: 10px; background: var(--dsr-soft); color: var(--dsr-secondary); cursor: pointer; transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease; }
.dsr-quickbar__btn:hover { border-color: var(--dsr-line); background: color-mix(in srgb, var(--dsr-text) 6%, var(--dsr-soft)); color: var(--dsr-text); }
.dsr-quickbar__btn:active { background: color-mix(in srgb, var(--dsr-text) 10%, var(--dsr-soft)); }
.dsr-quickbar__btn:focus-visible, .dsr-quickbar__pin:focus-visible, .dsr-workspace-card__pin:focus-visible { outline: 2px solid var(--dsr-accent); outline-offset: 2px; }
.dsr-quickbar__btn.is-pinned { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); }
.dsr-quickbar__btn.is-live { color: var(--dsr-green); }
.dsr-quickbar__btn.is-live[data-status="approval"], .dsr-quickbar__btn.is-live[data-status="question"] { color: var(--dsr-amber); }
.dsr-quickbar__btn.is-review { border-color: color-mix(in srgb, var(--dsr-red) 30%, var(--dsr-line)); }
.dsr-quickbar__btn.is-stalled { color: var(--dsr-red); }
.dsr-quickbar__btn.is-stalled .dsr-quickbar__status { background: var(--dsr-red); }
.dsr-quickbar__btn.is-workspace { color: var(--dsr-accent); background: color-mix(in srgb, var(--dsr-accent) 7%, var(--dsr-soft)); }
.dsr-quickbar__btn.is-more { color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); }
.dsr-quickbar__pin { width: 0; height: 34px; flex: none; display: grid; place-items: center; padding: 0; overflow: hidden; border: 0; border-radius: 9px; background: transparent; color: var(--dsr-muted); opacity: 0; pointer-events: none; cursor: pointer; transition: width 180ms cubic-bezier(.2,.8,.2,1), margin-left 180ms cubic-bezier(.2,.8,.2,1), opacity 140ms ease, color 140ms ease, background-color 140ms ease; } .dsr-quickbar:hover .dsr-quickbar__pin, .dsr-quickbar:has(:focus-visible) .dsr-quickbar__pin, .dsr-quickbar.is-near .dsr-quickbar__pin { width: 26px; margin-left: 4px; border: 1px solid transparent; opacity: 1; pointer-events: auto; } .dsr-quickbar__pin:hover { color: var(--dsr-text); background: color-mix(in srgb, var(--dsr-text) 8%, transparent); } .dsr-quickbar__pin.is-active { color: var(--dsr-accent); }
.dsr-quickbar__glyph { position: relative; width: 32px; height: 32px; flex: none; display: grid; place-items: center; } .dsr-quickbar__btn .dsr-icon { width: 17px; height: 17px; } .dsr-quickbar__copy { display: flex; flex-direction: column; justify-content: center; gap: 1px; min-width: 0; max-width: 0; padding-left: 0; overflow: hidden; opacity: 0; transform: translateX(-3px); transition: max-width 180ms cubic-bezier(.2,.8,.2,1), opacity 140ms ease, transform 180ms cubic-bezier(.2,.8,.2,1), padding-left 180ms cubic-bezier(.2,.8,.2,1); } .dsr-quickbar:hover .dsr-quickbar__copy, .dsr-quickbar:has(:focus-visible) .dsr-quickbar__copy, .dsr-quickbar.is-near .dsr-quickbar__copy { max-width: 184px; padding-left: 8px; opacity: 1; transform: none; } .dsr-quickbar__label { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xxs-strong-12); letter-spacing: -.01em; color: var(--dsr-text); } .dsr-quickbar__item.is-current .dsr-quickbar__btn { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 44%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 11%, var(--dsr-soft)); box-shadow: inset 2px 0 0 var(--dsr-accent); } .dsr-quickbar__item.is-current .dsr-quickbar__label { color: var(--dsr-accent); } .dsr-quickbar__item.is-current .dsr-quickbar__status { background: var(--dsr-accent); } .dsr-quickbar__meta { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xxxs-11); color: var(--dsr-muted); }
.dsr-quickbar__status { position: absolute; left: 3px; bottom: 3px; width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
.dsr-quickbar__alert { position: absolute; top: -2px; right: -2px; width: 7px; height: 7px; border: 1.5px solid var(--dsr-bg); border-radius: 50%; background: var(--dsr-red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-red) 12%, transparent); }
.dsr-quickbar__divider { width: 100%; height: 1px; flex: none; margin: 2px 0; background: var(--dsr-line); }
.dsr-quickpin-list { display: flex; flex-direction: column; gap: 5px; margin: 2px 0 13px; }
.dsr-quickpin { display: flex; align-items: center; gap: 8px; min-height: 38px; padding: 5px 5px 5px 8px; border: 1px solid var(--dsr-line-soft); border-radius: 10px; background: var(--dsr-soft); }
.dsr-quickpin.is-pinned { border-color: color-mix(in srgb, var(--dsr-accent) 25%, var(--dsr-line-soft)); background: color-mix(in srgb, var(--dsr-accent) 5%, var(--dsr-soft)); }
.dsr-quickpin__icon { width: 24px; height: 24px; flex: none; display: grid; place-items: center; border: 1px solid var(--dsr-line-soft); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-secondary); }
.dsr-quickpin__icon.is-workspace { color: var(--dsr-accent); }
.dsr-quickpin__copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.dsr-quickpin__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xxs-strong-12); }
.dsr-quickpin__meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-quickpin .dsr-icon-btn { width: 26px; height: 26px; flex: none; }
.dsr-workspace-card-slot { position: relative; display: flex; min-width: 0; }
.dsr-workspace-card-slot > .dsr-workspace-card { width: 100%; flex: 1; }
.dsr-workspace-card-slot .dsr-workspace-card__title { padding-right: 24px; }
.dsr-workspace-card-slot .dsr-workspace-card__arrow { display: none; }
.dsr-workspace-card__pin { position: absolute; top: 9px; right: 9px; z-index: 2; width: 26px !important; height: 26px !important; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: color-mix(in srgb, var(--dsr-bg) 84%, transparent); opacity: .72; }
.dsr-workspace-card__pin:hover, .dsr-workspace-card__pin.is-active { opacity: 1; }
.dsr-workspace-card__pin.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); }
@media (max-width: 720px) { .dsr-quickbar { top: auto; right: 8px; bottom: 72px; width: 44px; max-height: calc(100vh - 160px); padding: 6px 4px; border-radius: 22px; transform: none; } .dsr-quickbar:hover, .dsr-quickbar:has(:focus-visible), .dsr-quickbar.is-near { width: min(270px, calc(100vw - 24px)); } .dsr-quickbar.is-solo { right: 8px; top: auto; bottom: 16px; transform: none; } .dsr-quickbar__cap { min-height: 24px; } .dsr-quickbar__cap .dsr-quickbar__glyph { width: 30px; height: 20px; } .dsr-quickbar__btn { width: auto; height: 30px; flex: 1 1 auto; } .dsr-quickbar__glyph { width: 30px; height: 30px; } .dsr-quickbar__btn .dsr-icon { width: 16px; height: 16px; } }
@media (prefers-reduced-motion: reduce) { .dsr-quickbar, .dsr-quickbar__btn, .dsr-quickbar__copy { transition: none; } }
`
,
`
.dsr-page[data-card-texture="glass"] .dsr-card {
  background-color: color-mix(in srgb, var(--dsr-bg) 18%, transparent);
  background-image: none;
  -webkit-backdrop-filter: blur(32px) saturate(1.4);
  backdrop-filter: blur(32px) saturate(1.4);
  border-color: color-mix(in srgb, #fff 52%, var(--dsr-line));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.2), 0 1px 2px rgba(16,24,40,.04), 0 20px 38px -28px rgba(16,24,40,.32);
}
[data-ds-dark-theme] .dsr-page[data-card-texture="glass"] .dsr-card {
  background-color: color-mix(in srgb, var(--dsr-bg) 16%, transparent);
  border-color: color-mix(in srgb, #fff 24%, var(--dsr-line));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.09), 0 18px 36px -26px rgba(0,0,0,.9);
}
.dsr-page[data-card-texture="glass"] .dsr-card:hover {
  border-color: color-mix(in srgb, #fff 68%, var(--dsr-line));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.26), 0 24px 44px -28px rgba(16,24,40,.36);
}
.dsr-page[data-card-texture="glass"] .dsr-card::before { content: none; }
.dsr-texture-option__preview[data-texture="glass"] { background-color: color-mix(in srgb, var(--dsr-bg) 32%, transparent); background-image: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,.5), 0 1px 4px rgba(16,24,40,.08); }

`,
`
/* ---------- v6: custom statistics window + conversation tree ---------- */
.dsr-rangebar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 11px; padding: 9px 10px; border: 1px solid var(--dsr-line-soft); border-radius: 10px; background: color-mix(in srgb, var(--dsr-soft) 58%, transparent); }
.dsr-rangebar__field { display: inline-flex; align-items: center; gap: 5px; height: 27px; padding: 0 8px 0 9px; border: 1px solid var(--dsr-line); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-rangebar__field:focus-within { border-color: color-mix(in srgb, var(--dsr-accent) 46%, var(--dsr-line)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsr-accent) 12%, transparent); }
.dsr-rangebar__label { color: var(--dsr-muted); }
.dsr-rangebar__field input { height: 25px; min-width: 118px; border: 0; background: transparent; color: var(--dsr-text); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; outline: none; color-scheme: light dark; }
.dsr-rangebar__grains, .dsr-rangebar__quick { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-bg); }
.dsr-rangebar__grain, .dsr-rangebar__preset { height: 23px; min-width: 30px; padding: 0 7px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); cursor: pointer; transition: background-color 130ms ease, color 130ms ease; }
.dsr-rangebar__grain:hover, .dsr-rangebar__preset:hover { color: var(--dsr-text); background: color-mix(in srgb, var(--dsr-text) 6%, transparent); }
.dsr-rangebar__grain.is-active { background: var(--dsr-accent); color: var(--dsw-alias-label-primary-inverted); }
.dsr-rangebar__grain:focus-visible, .dsr-rangebar__preset:focus-visible, .dsr-flow__tool:focus-visible, .dsr-turn__head:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 52%, transparent); outline-offset: 1px; }
.dsr-rangebar__resolved { margin-left: auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }
.dsr-wall__cell.is-outside { opacity: .26; }

.dsr-flow__tool { height: 20px; padding: 0 8px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-flow__tool:hover { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 32%, var(--dsr-line)); }
.dsr-turn__head { width: 100%; display: flex; align-items: baseline; gap: 6px; min-width: 0; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.dsr-turn__head:hover .dsr-turn__title { color: var(--dsr-accent); }
.dsr-turn__caret { align-self: center; display: inline-flex; color: var(--dsr-muted); }
.dsr-turn[data-expanded="true"] .dsr-turn__prompt { display: none; }
.dsr-turn__chip.is-file { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 26%, var(--dsr-line-soft)); background: color-mix(in srgb, var(--dsr-accent) 7%, var(--dsr-bg)); }
.dsr-turn__panel { margin-top: 9px; padding-top: 8px; border-top: 1px dashed var(--dsr-line-soft); display: flex; flex-direction: column; gap: 9px; }
.dsr-turn__block { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.dsr-turn__blocktitle { color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .02em; }
.dsr-turn__text { margin: 0; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 17px; white-space: pre-wrap; overflow-wrap: anywhere; }
.dsr-turn__think { display: flex; gap: 5px; margin: 0; padding: 6px 8px; border-left: 2px solid color-mix(in srgb, var(--dsr-amber) 46%, transparent); border-radius: 0 6px 6px 0; background: color-mix(in srgb, var(--dsr-amber) 7%, transparent); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 16px; overflow-wrap: anywhere; }
.dsr-turn__think .dsr-icon { flex: none; margin-top: 2px; color: var(--dsr-amber); }
.dsr-file-pill.is-change { gap: 5px; }
.dsr-file-pill__tool { flex: none; padding: 0 4px; border-radius: 4px; background: color-mix(in srgb, var(--dsr-accent) 10%, transparent); color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); }
.dsr-tag { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }
button.dsr-flow__more { cursor: pointer; border: 0; background: transparent; padding: 0; text-align: left; }
button.dsr-flow__more:hover { color: var(--dsr-accent); }
@media (max-width: 560px) { .dsr-rangebar__resolved { margin-left: 0; white-space: normal; } .dsr-rangebar__field input { min-width: 104px; } }

/* ---- monitoring: stall, wait, throughput, tool cost ---------------------- */
.dsr-badge.is-alert { color: var(--dsr-red); border-color: color-mix(in srgb, var(--dsr-red) 32%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-red) 7%, var(--dsr-bg)); }
.dsr-session-row.is-stalled .dsr-dot { background: var(--dsr-red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-red) 14%, transparent); animation: none; }
.dsr-card.is-stalled { --dsr-tone: var(--dsr-red); }
.dsr-card.is-stalled .dsr-card__live { border-color: color-mix(in srgb, var(--dsr-red) 24%, transparent); background: color-mix(in srgb, var(--dsr-red) 7%, transparent); }
.dsr-card.is-stalled .dsr-card__live .dsr-icon, .dsr-card.is-stalled .dsr-card__live .dsr-tool-glyph { color: var(--dsr-red); }
.dsr-stat[data-tone="red"] .dsr-stat__icon { color: var(--dsr-red); background: color-mix(in srgb, var(--dsr-red) 8%, var(--dsr-soft)); border-color: color-mix(in srgb, var(--dsr-red) 22%, var(--dsr-line-soft)); }
.dsr-page__stats .dsr-stat[data-tone="red"] .dsr-stat__icon { color: var(--dsr-red); background: none; border: 0; }

/* sort switch on the recent board */
.dsr-sort { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 6px 0 7px; border: 1px solid var(--dsr-line-soft); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-muted); cursor: pointer; }
.dsr-sort:hover { border-color: color-mix(in srgb, var(--dsr-accent) 26%, var(--dsr-line-soft)); color: var(--dsr-secondary); }
.dsr-sort .dsr-icon { flex: none; }
.dsr-sort__select { appearance: none; border: 0; background: transparent; color: inherit; font: var(--dsw-font-xxxs-11); padding: 0 1px; cursor: pointer; outline: none; }
.dsr-sort__select:focus-visible { outline: 2px solid var(--dsr-focus); outline-offset: 1px; border-radius: 4px; }

/* tool cost table inside the detail panel */
.dsr-tools__row.is-other { color: var(--dsr-muted); }
.dsr-tools__row.is-other .dsr-tools__name { color: var(--dsr-muted); font-weight: 500; }
.dsr-tools__row.is-other .dsr-tools__bar i { background: color-mix(in srgb, var(--dsr-muted) 45%, transparent); }
@media (max-width: 400px) { .dsr-tools__row { grid-template-columns: minmax(0, 1fr) auto; } .dsr-tools__bar { display: none; } }

/* statistics: session time cost — wall-clock (merged) vs summed */
.dsr-time__summary { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 0 0 10px; }
.dsr-time__total { display: inline-flex; align-items: baseline; gap: 5px; padding: 2px 9px; border: 1px solid transparent; border-radius: 999px; color: var(--dsr-muted); font-variant-numeric: tabular-nums; }
.dsr-time__total strong { color: var(--dsr-secondary); font: var(--dsw-font-s-strong-14); }
.dsr-time__total small { font: var(--dsw-font-xxxs-11); }
.dsr-time__total.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 30%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 8%, var(--dsr-soft)); }
.dsr-time__total.is-active strong { color: var(--dsr-text); }
.dsr-time__total.is-muted strong { color: var(--dsr-muted); }
.dsr-time__hint { margin-left: auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-time__rows { display: flex; flex-direction: column; gap: 4px; }
.dsr-time__row { display: grid; grid-template-columns: minmax(72px, 176px) minmax(0, 1fr) 62px; align-items: center; gap: 10px; padding: 3px 6px; border-radius: 7px; }
.dsr-time__row:hover { background: color-mix(in srgb, var(--dsr-text) 4%, transparent); }
.dsr-time__name { min-width: 0; overflow: hidden; color: var(--dsr-text); font: var(--dsw-font-xs); text-overflow: ellipsis; white-space: nowrap; }
.dsr-time__track { position: relative; height: 10px; border-radius: 5px; background: color-mix(in srgb, var(--dsr-text) 7%, transparent); overflow: hidden; }
.dsr-time__seg { position: absolute; top: 1px; bottom: 1px; border-radius: 3px; background: color-mix(in srgb, var(--dsr-accent) 72%, transparent); }
.dsr-time__row:hover .dsr-time__seg { background: var(--dsr-accent); }
.dsr-time__track.is-bar .dsr-time__seg { top: 2px; bottom: 2px; }
.dsr-time__value { color: var(--dsr-secondary); text-align: right; font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; white-space: nowrap; }
@media (max-width: 560px) {
  .dsr-time__row { grid-template-columns: minmax(0, 1fr) 58px; }
  .dsr-time__track { grid-column: 1 / -1; order: 3; margin-top: 3px; }
  .dsr-time__hint { margin-left: 0; flex-basis: 100%; }
}

/* ---- fullscreen session detail ------------------------------------------- */
.dsr-detail__scrim { position: fixed; inset: 0; z-index: 900; background: color-mix(in srgb, #05070d 60%, transparent); animation: dsr-fade 140ms ease-out; }
.dsr-detail.is-fullscreen { position: fixed; inset: 22px; z-index: 901; width: auto; max-width: none; height: auto; max-height: none; overflow: hidden; border: 1px solid var(--dsr-line); border-radius: 18px; background: var(--dsr-bg); box-shadow: 0 34px 90px -34px rgba(0, 0, 0, .55); animation: dsr-detail-in 170ms cubic-bezier(.2,.8,.2,1); }
.dsr-detail.is-fullscreen .dsr-detail__body { max-height: none; }
.dsr-dock:has(.dsr-detail.is-fullscreen) { -webkit-backdrop-filter: none; backdrop-filter: none; }
.dsr-detail.is-fullscreen .dsr-detail-stats { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.dsr-detail.is-fullscreen .dsr-turn__summary { -webkit-line-clamp: 1; }
@keyframes dsr-detail-in { from { opacity: 0; transform: translateY(7px) scale(.996); } to { opacity: 1; transform: none; } }
@media (max-width: 760px) {
  .dsr-detail.is-fullscreen { inset: 8px; border-radius: 13px; }
  .dsr-detail.is-fullscreen .dsr-detail-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* ---- round rail: jump straight to any round ----------------------------- */
.dsr-flow__nav { display: flex; align-items: center; gap: 5px; margin: 0 0 7px; }
.dsr-flow__navlist { flex: 1 1 auto; min-width: 0; display: flex; gap: 4px; overflow-x: auto; padding: 1px 0; scrollbar-width: none; }
.dsr-flow__navlist::-webkit-scrollbar { display: none; }
.dsr-flow__navchip { flex: 0 0 auto; min-width: 21px; height: 21px; padding: 0 5px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); font-variant-numeric: tabular-nums; cursor: pointer; transition: color 130ms ease, border-color 130ms ease, background-color 130ms ease; }
.dsr-flow__navchip:hover { color: var(--dsr-text); border-color: color-mix(in srgb, var(--dsr-accent) 42%, var(--dsr-line)); }
.dsr-flow__navchip.is-done:hover { color: var(--dsr-green); border-color: color-mix(in srgb, var(--dsr-green) 45%, var(--dsr-line)); }
.dsr-flow__navchip.is-current { color: #fff; background: var(--dsr-accent); border-color: var(--dsr-accent); }
.dsr-flow__navchip.is-error { color: var(--dsr-red); border-color: color-mix(in srgb, var(--dsr-red) 34%, var(--dsr-line-soft)); }
.dsr-flow__navchip.is-running { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 38%, var(--dsr-line-soft)); }
.dsr-flow__navbtn { flex: 0 0 auto; display: grid; place-items: center; width: 21px; height: 21px; padding: 0; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: transparent; color: var(--dsr-secondary); cursor: pointer; transition: color 130ms ease, border-color 130ms ease; }
.dsr-flow__navbtn:hover:not(:disabled) { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 40%, var(--dsr-line)); }
.dsr-flow__navbtn:disabled { opacity: .35; cursor: default; }
.dsr-flip { transform: rotate(180deg); }

/* ---- branch relations --------------------------------------------------- */
.dsr-branches { display: flex; flex-direction: column; gap: 5px; }
.dsr-branch { display: flex; align-items: center; gap: 3px; border: 1px solid var(--dsr-line-soft); border-radius: 9px; background: color-mix(in srgb, var(--dsr-well) 55%, transparent); transition: border-color 140ms ease, background-color 140ms ease; }
.dsr-branch:hover { border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); }
.dsr-branch[data-state="running"] { border-color: color-mix(in srgb, var(--dsr-accent) 42%, var(--dsr-line)); }
.dsr-branch__open { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 7px 8px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.dsr-branch__role { flex: 0 0 auto; padding: 1px 5px; border-radius: 4px; background: color-mix(in srgb, var(--dsr-accent) 12%, transparent); color: var(--dsr-accent); font: var(--dsw-font-xxxs-strong-11); }
.dsr-branch__title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-text); font: var(--dsw-font-xs-12); }
.dsr-branch__meta { flex: 0 0 auto; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }
.dsr-branch__pin { flex: 0 0 auto; display: grid; place-items: center; width: 26px; height: 26px; margin-right: 3px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dsr-muted); cursor: pointer; transition: color 130ms ease, border-color 130ms ease; }
.dsr-branch__pin:hover { color: var(--dsr-accent); border-color: var(--dsr-line-soft); }
.dsr-branch__pin.is-active { color: var(--dsr-accent); }

/* ---- summarised rounds -------------------------------------------------- */
.dsr-turn__summary { margin: 3px 0 0; color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 15px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.dsr-turn__summary.is-empty { color: var(--dsr-muted); }
.dsr-turn__ask { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-turn__spacer { flex: 0 0 auto; width: 0; }
.dsr-turn[data-expanded="true"] .dsr-turn__summary { color: var(--dsr-text); }

/* statistics: scope picker (workspaces / sessions) + collapsible time panel */
.dsr-scope__chips { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 11px; }
.dsr-scope__chip { display: inline-flex; align-items: center; gap: 5px; height: 25px; padding: 0 9px; border: 1px solid var(--dsr-line-soft); border-radius: 999px; background: var(--dsr-bg); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-scope__chip small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-scope__chip:hover { border-color: color-mix(in srgb, var(--dsr-accent) 28%, var(--dsr-line)); color: var(--dsr-text); }
.dsr-scope__chip.is-active { border-color: color-mix(in srgb, var(--dsr-accent) 46%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 12%, var(--dsr-bg)); color: var(--dsr-text); font-weight: 600; }
.dsr-scope__note { margin: 8px 0 0; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-scope__picker { margin-top: 9px; padding: 9px; border: 1px solid var(--dsr-line-soft); border-radius: 10px; background: var(--dsr-soft); }
.dsr-scope__search { width: 100%; height: 28px; padding: 0 9px; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: var(--dsr-bg); color: var(--dsr-text); font: var(--dsw-font-xxs-12); }
.dsr-scope__search:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 1px; }
.dsr-scope__list { display: flex; flex-direction: column; gap: 2px; max-height: 232px; margin-top: 7px; overflow-y: auto; }
.dsr-scope__row { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 5px 7px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); text-align: left; cursor: pointer; }
.dsr-scope__row:hover { background: color-mix(in srgb, var(--dsr-text) 5%, transparent); }
.dsr-scope__row.is-on { border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); background: color-mix(in srgb, var(--dsr-accent) 10%, var(--dsr-bg)); color: var(--dsr-text); }
.dsr-scope__row .dsr-icon { color: var(--dsr-muted); }
.dsr-scope__row.is-on .dsr-icon { color: var(--dsr-accent); }
.dsr-scope__row-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-scope__row-meta { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); white-space: nowrap; }
.dsr-time__toggle { border: 0; padding: 0; background: transparent; cursor: pointer; }
.dsr-time__toggle:hover { color: var(--dsr-accent); }
.dsr-time__toggle small { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); font-variant-numeric: tabular-nums; }
.dsr-activity__panel.is-collapsed { padding-bottom: 11px; }
.dsr-workspace-card-slot .dsr-workspace-card__stats { position: absolute; top: 9px; right: 41px; z-index: 2; width: 26px !important; height: 26px !important; border: 1px solid var(--dsr-line-soft); border-radius: 8px; background: color-mix(in srgb, var(--dsr-bg) 84%, transparent); opacity: .72; }
.dsr-workspace-card-slot .dsr-workspace-card__stats:hover { opacity: 1; }
/* Settings: the stall safety window is a number field, not a preset list. */
.dsr-settings__field { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 2px; padding: 7px 8px; border-radius: 7px; color: var(--dsr-secondary); font: var(--dsw-font-xxs-12); }
.dsr-settings__field:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsr-settings__fieldlabel { color: var(--dsr-secondary); }
.dsr-settings__unit { display: flex; align-items: center; gap: 5px; }
.dsr-settings__num { width: 54px; height: 26px; padding: 0 7px; border: 1px solid var(--dsr-line-soft); border-radius: 7px; background: var(--dsr-bg); color: var(--dsr-text); font: var(--dsw-font-xxs-12); font-variant-numeric: tabular-nums; text-align: right; }
.dsr-settings__num:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 1px; }
.dsr-settings__suffix { color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); }
.dsr-settings__reset { height: 22px; padding: 0 7px; border: 1px solid var(--dsr-line-soft); border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-settings__reset:hover { color: var(--dsr-accent); border-color: color-mix(in srgb, var(--dsr-accent) 34%, var(--dsr-line)); }
/* Left sidebar strip: running, pinned and current sessions above the tree. */
.dsr-sidepins-host { display: flex; flex-direction: column; flex: none; min-height: 0; }
.dsr-sidepins { display: flex; flex-direction: column; padding: 5px var(--dsh-sidebar-inline-padding, 8px) 9px 2px; border-bottom: 1px solid color-mix(in srgb, var(--dsr-line-soft) 70%, transparent); }
.dsr-sidepins__head { display: flex; align-items: center; gap: 6px; padding: 0 2px 4px; }
.dsr-sidepins__toggle { display: inline-flex; align-items: center; gap: 5px; min-width: 0; padding: 3px 5px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-strong-11); letter-spacing: .03em; cursor: pointer; }
.dsr-sidepins__toggle:hover { color: var(--dsr-text); background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins__toggle:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: 1px; }
.dsr-sidepins__toggle .dsr-icon { flex: none; opacity: .8; }
.dsr-sidepins__title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-sidepins__count { min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px; background: color-mix(in srgb, var(--dsr-text) 8%, transparent); color: var(--dsr-secondary); font: var(--dsw-font-xxxs-11); line-height: 17px; text-align: center; font-variant-numeric: tabular-nums; }
.dsr-sidepins__all { margin-left: auto; padding: 3px 5px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dsr-sidepins__all:hover { color: var(--dsr-accent); background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins__hint { margin: 0 2px; padding: 3px 5px 1px; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-align: left; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-sidepins__hint:hover { color: var(--dsr-secondary); background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins__list { display: flex; flex-direction: column; gap: 2px; }
.dsr-sidepins__row { display: flex; align-items: center; gap: 1px; border-radius: 8px; transition: background .12s ease; }
.dsr-sidepins__row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins__row.is-current { background: color-mix(in srgb, var(--dsr-accent) 8%, transparent); }
.dsr-sidepins__main { display: flex; align-items: flex-start; gap: 8px; flex: 1 1 auto; min-width: 0; padding: 5px 7px; border: 0; border-radius: 8px; background: transparent; color: var(--dsr-secondary); text-align: left; cursor: pointer; }
.dsr-sidepins__main:focus-visible { outline: 2px solid color-mix(in srgb, var(--dsr-accent) 45%, transparent); outline-offset: -1px; }
.dsr-sidepins__dot { flex: none; width: 6px; height: 6px; margin-top: 6px; border-radius: 50%; background: var(--dsr-muted); }
.dsr-sidepins__dot.is-running, .dsr-sidepins__dot.is-tool { background: var(--dsr-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-green) 16%, transparent); }
.dsr-sidepins__dot.is-approval, .dsr-sidepins__dot.is-question { background: var(--dsr-amber); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-amber) 16%, transparent); }
.dsr-sidepins__dot.is-done { background: var(--dsr-green); }
.dsr-sidepins__dot.is-stalled { background: var(--dsr-red); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsr-red) 18%, transparent); }
.dsr-sidepins__copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dsr-sidepins__line { display: flex; align-items: center; gap: 5px; min-width: 0; }
.dsr-sidepins__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-text); font: var(--dsw-font-xxs-12); line-height: 16px; }
.dsr-sidepins__flag { flex: none; height: 14px; padding: 0 4px; border-radius: 4px; background: color-mix(in srgb, var(--dsr-accent) 14%, transparent); color: var(--dsr-accent); font: var(--dsw-font-xxxs-11); line-height: 14px; }
.dsr-sidepins__flag.is-pin { background: color-mix(in srgb, var(--dsr-text) 8%, transparent); color: var(--dsr-muted); }
.dsr-sidepins__flag.is-review { background: color-mix(in srgb, var(--dsr-green) 15%, transparent); color: var(--dsr-green); }
.dsr-sidepins__meta { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); line-height: 14px; }
.dsr-sidepins__row.is-stalled .dsr-sidepins__meta { color: var(--dsr-red); }
.dsr-sidepins__pin { flex: none; width: 24px; height: 24px; margin-right: 3px; display: grid; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--dsr-muted); opacity: 0; cursor: pointer; transition: opacity .12s ease; }
.dsr-sidepins__row:hover .dsr-sidepins__pin, .dsr-sidepins__pin:focus-visible, .dsr-sidepins__pin.is-active { opacity: .85; }
.dsr-sidepins__pin.is-active { color: var(--dsr-accent); }
.dsr-sidepins__pin:hover { background: color-mix(in srgb, var(--dsr-text) 9%, transparent); }
.dsr-sidepins__row:hover .dsr-sidepins__pin:focus-visible { opacity: 1; }
.dsr-sidepins__more { margin-top: 3px; padding: 4px 7px; border: 0; border-radius: 7px; background: transparent; color: var(--dsr-muted); font: var(--dsw-font-xxxs-11); text-align: left; cursor: pointer; }
.dsr-sidepins__more:hover { color: var(--dsr-accent); background: var(--dsw-alias-interactive-bg-hover); }
.dsr-sidepins.is-collapsed { padding-bottom: 7px; }
@media (max-width: 560px) { .dsr-scope__row-meta { display: none; } }

`
].join('\n');


    // ---- controller -------------------------------------------------------
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
};

const CARD_TEXTURE_VALUES = new Set(['none', 'paper', 'dots', 'glass']);
const ACTIVITY_MODE_VALUES = new Set(['today', 'day', 'week', 'month', 'custom']);
const ACTIVITY_GRAIN_VALUES = new Set(['hour', 'day', 'week', 'month']);
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_PREFS = {
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

class RadarController {
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

  select(id) {
    this.ui.selectedId = id;
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
    try { this.ctx.layout.selectPanel('session-radar'); } catch (error) {
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
      const response = await globalThis.fetch('/api/session-radar.delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: targets }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload && typeof payload.error === 'string' ? payload.error : '永久删除失败（HTTP ' + response.status + '）');
      }
      const deleted = Array.isArray(payload.deleted) ? payload.deleted.filter(id => typeof id === 'string') : [];
      const failed = Array.isArray(payload.failed) ? payload.failed : [];
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
    if (key === 'stallMinutes') value = normalizeStallMinutes(value);
    if (key === 'activityRange') value = normalizeActivityRange(value);
    if (key === 'activityScope') value = normalizeActivityScope(value);
    if (key === 'quickBarPos' || key === 'railPos') {
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
    try { this.ctx.layout.selectPanel('session-radar'); } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.publish();
    }
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
      stallAfterMs: this.stallAfterMs(),
      phase: this.rosterPhase,
      streaming: [...this.watches.values()].some(watch => watch.stream === 'reconnecting') ? 'reconnecting' : [...this.watches.values()].some(watch => watch.stream === 'live') ? 'live' : 'idle',
      error: this.error,
      lastSyncAt: this.lastSyncAt,
      now,
    };
  }
}


    // ---- React surfaces ---------------------------------------------------
/**
 * Session Radar browser surfaces.
 *
 * One controller feeds a right-edge rail/dock and a full center-column board.
 * Operate-mode vocabulary: dense data cards, restrained state color, and the
 * radar sweep as the single authored motion.
 */

function cx() {
  return Array.prototype.filter.call(arguments, Boolean).join(' ');
}

function useRadar(controller) {
  const subscribe = useCallback(callback => controller.subscribe(callback), [controller]);
  const read = useCallback(() => controller.getSnapshot(), [controller]);
  return useSyncExternalStore(subscribe, read, read);
}

function useNow(interval) {
  const tick = interval || 1000;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), tick);
    return () => clearInterval(timer);
  }, [tick]);
  return now;
}

function iconPath(d, extra) {
  return h('path', { d: d, ...(extra || {}) });
}

function iconCircle(cxValue, cyValue, r, extra) {
  return h('circle', { cx: cxValue, cy: cyValue, r: r, ...(extra || {}) });
}

function iconRect(x, y, width, height, rx, extra) {
  return h('rect', { x: x, y: y, width: width, height: height, rx: rx, ...(extra || {}) });
}

function Icon(props) {
  const name = props.name;
  const size = props.size || 16;
  const common = {
    viewBox: '0 0 16 16',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    className: cx('dsr-icon', props.className),
  };
  let children;
  switch (name) {
    case 'search':
      children = [iconCircle(7, 7, 4.2), iconPath('M10.1 10.1 14 14')];
      break;
    case 'close':
      children = [iconPath('M3.2 3.2 12.8 12.8'), iconPath('M12.8 3.2 3.2 12.8')];
      break;
    case 'refresh':
      children = [iconPath('M13 6.2A5.2 5.2 0 1 0 13.2 10'), iconPath('M13 2.8v3.6H9.4')];
      break;
    case 'expand':
      children = [iconPath('M6.2 2.2H2.2v4'), iconPath('M9.8 13.8h4v-4'), iconPath('M2.2 2.2l4.2 4.2'), iconPath('M13.8 13.8 9.6 9.6')];
      break;
    case 'compress':
      children = [iconPath('M2.2 6.2h4v-4'), iconPath('M13.8 9.8h-4v4'), iconPath('M6.2 6.2 2.2 2.2'), iconPath('M9.8 9.8l4 4')];
      break;
    case 'branch':
      children = [iconCircle(3.4, 8, 1.4), iconPath('M4.8 8h2.6'), iconPath('M7.4 8C7.4 5.9 8.8 4.4 10.9 4.4'), iconPath('M7.4 8c0 2.1 1.4 3.6 3.5 3.6'), iconCircle(12.3, 4.4, 1.3), iconCircle(12.3, 11.6, 1.3)];
      break;
    case 'external':
      children = [iconPath('M9.2 2.2h4.6v4.6'), iconPath('M13.8 2.2 7.4 8.6'), iconPath('M12.2 9.4v3.2a1.2 1.2 0 0 1-1.2 1.2H3.4a1.2 1.2 0 0 1-1.2-1.2V5a1.2 1.2 0 0 1 1.2-1.2h3.2')];
      break;
    case 'pin':
      children = [iconPath('M5.2 2.2h5.6l-.9 3.2 2.1 2.2H4l2.1-2.2-.9-3.2Z'), iconPath('M8 7.6v6.2')];
      break;
    case 'pin-filled':
      children = [h('path', { d: 'M5.2 2.2h5.6l-.9 3.2 2.1 2.2H4l2.1-2.2-.9-3.2Z', fill: 'currentColor' }), iconPath('M8 7.6v6.2')];
      break;
    case 'stop':
      children = [iconRect(4.2, 4.2, 7.6, 7.6, 1.2, { fill: 'currentColor', stroke: 'none' })];
      break;
    case 'arrow-left':
      children = [iconPath('M13 8H3'), iconPath('M7 4 3 8l4 4')];
      break;
    case 'arrow-right':
      children = [iconPath('M3 8h10'), iconPath('M9 4l4 4-4 4')];
      break;
    case 'chevron-right':
      children = [iconPath('M6 3.5 10.5 8 6 12.5')];
      break;
    case 'chevron-down':
      children = [iconPath('M3.5 6 8 10.5 12.5 6')];
      break;
    case 'filter':
      children = [iconPath('M2.4 3h11.2l-4.3 4.7v5.5l-2.6-1.4V7.7z')];
      break;
    case 'sort':
      children = [iconPath('M2.6 4.2h10.8'), iconPath('M2.6 8h7.2'), iconPath('M2.6 11.8h3.6')];
      break;
    case 'model':
      children = [iconRect(3, 3, 10, 10, 1.7), iconRect(5.4, 5.4, 5.2, 5.2, 0.9), iconPath('M8 1.2v1.7'), iconPath('M8 13.1v1.7'), iconPath('M1.2 8H2.9'), iconPath('M13.1 8h1.7')];
      break;
    case 'folder':
      children = [iconPath('M2 3.2h4.4l1.3 1.8H14v8.4H2z'), iconPath('M2 5h12')];
      break;
    case 'archive':
      children = [iconRect(2, 3, 12, 3, 1), iconPath('M3.2 6v7.2h9.6V6'), iconPath('M6.2 8.3h3.6')];
      break;
    case 'trash':
      children = [iconPath('M3.2 4.6h9.6'), iconPath('M6.1 4.6V2.8h3.8v1.8'), iconPath('M4.4 4.6l.7 9h5.8l.7-9'), iconPath('M6.7 7.4v3.8'), iconPath('M9.3 7.4v3.8')];
      break;
    case 'activity':
      children = [iconPath('M2.2 13.4h11.6'), iconPath('M3.6 11V8.2'), iconPath('M6.7 11V4.8'), iconPath('M9.8 11V6.4'), iconPath('M12.9 11V2.6')];
      break;
    case 'pie':
      children = [iconCircle(8, 8, 5.6), iconPath('M8 2.4V8l4.4 3.3'), iconPath('M8 8h5.6')];
      break;
    case 'calendar':
      children = [iconRect(2.4, 3.3, 11.2, 10.2, 1.4), iconPath('M5 2v2.6'), iconPath('M11 2v2.6'), iconPath('M2.4 6.4h11.2'), iconPath('M5.3 9.2h1.2'), iconPath('M8 9.2h1.2'), iconPath('M10.7 9.2h1.2')];
      break;
    case 'restore':
      children = [iconPath('M2.8 6.2A5.4 5.4 0 1 1 3 10'), iconPath('M2.8 2.8v3.6h3.6'), iconPath('M8 6.2v4.2l2.5 1.4')];
      break;
    case 'layers':
      children = [iconPath('M8 2.2 13.5 5 8 7.8 2.5 5z'), iconPath('M2.5 8 8 10.8 13.5 8'), iconPath('M2.5 11 8 13.8 13.5 11')];
      break;
    case 'file':
      children = [iconPath('M4 1.8h5l3 3v9.4H4z'), iconPath('M9 1.8v3.2h3')];
      break;
    case 'code':
      children = [iconPath('M5.5 4.2 2 8l3.5 3.8'), iconPath('M10.5 4.2 14 8l-3.5 3.8'), iconPath('M9.2 2.8 6.8 13.2')];
      break;
    case 'terminal':
      children = [iconRect(2, 3, 12, 10, 1.4), iconPath('M4.8 6.2 7 8 4.8 9.8'), iconPath('M8.2 10.4h3')];
      break;
    case 'deliver':
      children = [iconPath('M2.6 6.6 8 2.2l5.4 4.4'), iconPath('M4.1 7.4v5.4a1 1 0 0 0 1 1h5.8a1 1 0 0 0 1-1V7.4'), iconPath('M8 10.6V5.2'), iconPath('M6.2 7 8 5.2 9.8 7')];
      break;
    case 'plan':
      children = [iconPath('M6 3.4h7'), iconPath('M6 8h7'), iconPath('M6 12.6h7'), iconPath('M2.4 3.4l.9.9 1.5-1.8'), iconPath('M2.4 8l.9.9 1.5-1.8'), iconPath('M2.4 12.6l.9.9 1.5-1.8')];
      break;
    case 'job':
      children = [iconCircle(8, 8, 5.8), iconPath('M8 4.4V8l2.3 1.4')];
      break;
    case 'image':
      children = [iconRect(2.2, 3, 11.6, 10, 1.5), iconCircle(5.2, 5.8, 1.1), iconPath('M3.2 11.5 6.5 8.2l2.2 2.2 1.8-1.8 2.3 2.9')];
      break;
    case 'computer':
      children = [iconRect(1.8, 3, 12.4, 8, 1.2), iconPath('M5.6 14h4.8'), iconPath('M8 11v3')];
      break;
    case 'tool':
      children = [iconPath('M9.6 2.4a3.2 3.2 0 0 0-3 4.3L2.4 10.9a1.4 1.4 0 0 0 2 2l4.2-4.2a3.2 3.2 0 0 0 4.3-3l-2 2-1.9-.5-.5-1.9 2-2Z')];
      break;
    case 'settings':
      children = [iconPath('M2.4 4.2h11.2'), iconPath('M2.4 8h11.2'), iconPath('M2.4 11.8h11.2'), iconCircle(5.2, 4.2, 1.2), iconCircle(10.2, 8, 1.2), iconCircle(6.8, 11.8, 1.2)];
      break;
    case 'copy':
      children = [iconRect(5, 5, 8, 8, 1.2), iconPath('M11 5V3.2A1.2 1.2 0 0 0 9.8 2H3.2A1.2 1.2 0 0 0 2 3.2v6.6A1.2 1.2 0 0 0 3.2 11H5')];
      break;
    case 'check':
      children = [iconPath('M3 8.2 6.4 11.6 13 4.6')];
      break;
    case 'warning':
      children = [iconPath('M8 2.2 14 13H2z'), iconPath('M8 6.2v3.2'), iconPath('M8 11.4h.01')];
      break;
    case 'plus':
      children = [iconPath('M8 3v10'), iconPath('M3 8h10')];
      break;
    case 'menu':
      children = [iconPath('M2.8 4h10.4'), iconPath('M2.8 8h10.4'), iconPath('M2.8 12h10.4')];
      break;
    case 'clock':
      children = [iconCircle(8, 8, 5.8), iconPath('M8 4.6V8l2.2 1.6')];
      break;
    case 'token':
      children = [iconCircle(8, 8, 5.8), iconCircle(8, 8, 2.2), iconPath('M8 2.2v1.4'), iconPath('M8 12.4v1.4'), iconPath('M2.2 8h1.4'), iconPath('M12.4 8h1.4')];
      break;
    case 'context':
      children = [iconPath('M5.4 2.2H3.2a1 1 0 0 0-1 1v3.2'), iconPath('M10.6 2.2h2.2a1 1 0 0 1 1 1v3.2'), iconPath('M5.4 13.8H3.2a1 1 0 0 1-1-1V9.6'), iconPath('M10.6 13.8h2.2a1 1 0 0 0 1-1V9.6')];
      break;
    case 'spark':
      children = [iconPath('M8 1.8 9.5 6.5 14.2 8 9.5 9.5 8 14.2 6.5 9.5 1.8 8 6.5 6.5z')];
      break;
    case 'turn':
      children = [iconPath('M3.4 5.6h6.4a3.2 3.2 0 0 1 0 6.4H6.6'), iconPath('M5.8 3.4 3.4 5.6 5.8 7.8')];
      break;
    case 'steps':
      children = [iconPath('M4.2 4 7.8 8 4.2 12'), iconPath('M8.8 4 12.4 8 8.8 12')];
      break;
    case 'flow':
      children = [iconCircle(3.2, 3.6, 1.5), iconCircle(12.8, 8, 1.5), iconCircle(3.2, 12.4, 1.5), iconPath('M4.6 4.4 11.4 7.2'), iconPath('M11.4 8.8 4.6 11.6')];
      break;
    case 'pulse':
      children = [iconPath('M1.8 8h2.4l1.5-4.2 2.6 8.4 1.6-4.2h4.3')];
      break;
    case 'gauge':
      children = [iconPath('M2.4 11.6a5.6 5.6 0 0 1 11.2 0'), iconPath('M8 11.4 10.8 6.6'), iconCircle(8, 11.4, 0.9, { fill: 'currentColor', stroke: 'none' })];
      break;
    case 'artifact':
      children = [iconPath('M8 1.9 13.6 4.7v6.6L8 14.1 2.4 11.3V4.7z'), iconPath('M2.4 4.7 8 7.5l5.6-2.8'), iconPath('M8 7.5v6.6')];
      break;
    case 'session':
      children = [iconPath('M2.4 3.2h11.2v7.4H7.2l-2.8 2.6v-2.6H2.4z')];
      break;
    default:
      children = [iconCircle(8, 8, 4.8)];
  }
  return h('svg', common, children);
}

function RadarGlyph(props) {
  const size = props.size || 18;
  return h('svg', {
    viewBox: '0 0 16 16',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.25,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    className: cx('dsr-radar', props.active && 'is-active', props.className),
  }, [
    iconCircle(8, 8, 6.2, { opacity: 0.28, key: 'a' }),
    iconCircle(8, 8, 3.2, { opacity: 0.45, key: 'b' }),
    h('path', { d: 'M8 8V1.8', className: 'dsr-radar__sweep', key: 'sweep' }),
    h('circle', { cx: 8, cy: 8, r: 1.05, fill: 'currentColor', stroke: 'none', key: 'dot' }),
  ]);
}

function ToolGlyph(props) {
  const names = { code: 'code', file: 'file', search: 'search', deliver: 'deliver', plan: 'plan', job: 'job', image: 'image', computer: 'computer', tool: 'tool' };
  return h('span', { className: 'dsr-tool-glyph' }, h(Icon, { name: names[props.category] || 'tool', size: props.size || 14 }));
}

function IconButton(props) {
  return h('button', {
    type: 'button',
    className: cx('dsr-icon-btn', props.active && 'is-active', props.className),
    'aria-label': props.label,
    title: props.title || props.label,
    disabled: props.disabled,
    onClick: props.onClick,
    'aria-pressed': props.active === undefined ? undefined : props.active,
  }, props.children || h(Icon, { name: props.name, size: 15 }));
}

function Badge(props) {
  return h('span', { className: cx('dsr-badge', props.tone && 'is-' + props.tone) }, props.children);
}

function Progress(props) {
  if (props.busy) return h('span', { className: cx('dsr-progress', 'is-busy', props.className), 'aria-hidden': 'true' }, h('span', { className: 'dsr-progress__fill' }));
  return h('span', {
    className: cx('dsr-progress', props.className),
    role: 'progressbar',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': Math.round(props.value || 0),
  }, h('span', { className: 'dsr-progress__fill', style: { width: Math.max(0, Math.min(100, props.value || 0)) + '%' } }));
}

function Meter(props) {
  return h('div', { className: 'dsr-meter', 'aria-hidden': 'true' }, h('i', { className: props.warn ? 'is-warn' : undefined, style: { width: Math.max(0, Math.min(100, props.value || 0)) + '%' } }));
}

function Stat(props) {
  const contents = [
    props.icon ? h('span', { className: 'dsr-stat__icon', key: 'i' }, h(Icon, { name: props.icon, size: props.iconSize || 14 })) : null,
    h('span', { className: 'dsr-stat__body', key: 'b' }, [
      h('span', { className: 'dsr-stat__value', key: 'v' }, props.value),
      h('span', { className: 'dsr-stat__label', key: 'l' }, props.label),
    ]),
  ];
  return props.onClick
    ? h('button', { type: 'button', className: 'dsr-stat dsr-stat--button', 'data-tone': props.tone, onClick: props.onClick, title: props.title }, contents)
    : h('div', { className: 'dsr-stat', 'data-tone': props.tone, title: props.title }, contents);
}

function SectionHeader(props) {
  return h('div', { className: 'dsr-section__head' }, [
    h('h3', { className: 'dsr-section__title', key: 't' }, props.title),
    props.count === undefined ? null : h('span', { className: 'dsr-section__count', key: 'c' }, props.count),
  ]);
}

function BoardHead(props) {
  return h('div', { className: 'dsr-board__head' }, [
    props.icon ? h('span', { className: 'dsr-board__mark', key: 'mark' }, h(Icon, { name: props.icon, size: 14 })) : null,
    h('div', { className: 'dsr-board__headcopy', key: 'copy' }, [
      h('h2', { key: 't' }, props.title),
      props.sub ? h('p', { key: 's' }, props.sub) : null,
    ]),
    props.children === undefined || props.children === null ? null : h('div', { className: 'dsr-board__headmeta', key: 'meta' }, props.children),
  ]);
}

function EmptyRadar(props) {
  return h('div', { className: 'dsr-empty' }, [
    h('span', { className: 'dsr-empty__icon', key: 'i' }, h(RadarGlyph, { size: 21 })),
    h('p', { className: 'dsr-empty__title', key: 't' }, props.title || '雷达安静'),
    h('p', { className: 'dsr-empty__text', key: 'x' }, props.text || '没有正在运行的会话。开始一个新任务后，这里会显示步骤、工具、token 和交付物。'),
    h('div', { className: 'dsr-empty__actions', key: 'a' }, [
      props.onRecent ? h('button', { type: 'button', className: 'dsr-button', key: 'r', onClick: props.onRecent }, '看看最近会话') : null,
      props.onNew ? h('button', { type: 'button', className: 'dsr-button dsr-button--primary', key: 'n', onClick: props.onNew }, h(Icon, { name: 'plus', size: 14 }), '新建会话') : null,
    ]),
  ]);
}

function SkeletonRows(props) {
  const count = props.count || 4;
  return h('div', { className: 'dsr-skeleton', 'aria-label': '正在载入会话' }, Array.from({ length: count }, function (_, index) {
    return h('div', { className: 'dsr-skeleton__row', key: index });
  }));
}

function SearchBox(props) {
  return h('div', { className: 'dsr-search' }, [
    h(Icon, { name: 'search', size: 14, key: 'i' }),
    h('input', {
      key: 'input',
      ref: props.inputRef,
      value: props.value,
      onChange: function (event) { props.onChange(event.target.value); },
      onKeyDown: function (event) {
        if (event.key === 'Enter') { event.preventDefault(); if (props.onSubmit) props.onSubmit(); }
      },
      placeholder: props.placeholder || '筛选标题、工作区或工具',
      'aria-label': props.placeholder || '筛选会话',
      autoFocus: props.autoFocus,
      spellCheck: false,
    }),
    props.value ? h('button', { type: 'button', key: 'clear', onClick: function () { props.onChange(''); }, 'aria-label': '清除搜索' }, h(Icon, { name: 'close', size: 12 })) : null,
  ]);
}

function ReviewDot(props) {
  return h('span', {
    className: cx('dsr-review-dot', props && props.inline && 'is-inline'),
    role: 'img',
    'aria-label': '最近完成，尚未验收',
    title: '最近完成，尚未验收',
  });
}

/** Waiting badges carry how long the session has been blocked on the user. */
function waitingSuffix(entry) {
  const ms = Number(entry.waitingMs) || 0;
  return ms >= 15000 ? ' · ' + formatDuration(ms) : '';
}

function badgeForStatus(entry) {
  if (entry.status === 'approval') return h(Badge, { tone: 'warn' }, '等你审批' + waitingSuffix(entry));
  if (entry.status === 'question') return h(Badge, { tone: 'warn' }, '等你回答' + waitingSuffix(entry));
  if (entry.stalled === true) return h(Badge, { tone: 'alert' }, '疑似卡住 ' + formatDuration(entry.stalledMs));
  if (entry.status === 'migration') return h(Badge, { tone: 'warn' }, '需迁移');
  if (entry.origin === 'subagent') return h(Badge, null, '子会话');
  if (entry.queueLength > 0) return h(Badge, { tone: 'accent' }, '队列 ' + entry.queueLength);
  return null;
}

function isLiveEntry(entry) {
  return entry.status === 'running' || entry.status === 'tool' || entry.status === 'approval' || entry.status === 'question';
}

function sessionSubline(entry, now) {
  const parts = [];
  if (entry.current) parts.push('当前对话');
  if (entry.workspace) parts.push(entry.workspace);
  if (entry.model) parts.push(entry.model);
  if (entry.turn > 0) parts.push('T' + entry.turn + ' · S' + entry.step);
  parts.push(formatRelative(entry.updatedAt, now));
  return parts;
}

/** One-line "what is it doing" label for the sidebar pin strip. */
function sidebarPinStatus(entry) {
  if (entry.stalled === true) return '疑似卡住 ' + formatDuration(entry.stalledMs);
  if (entry.status === 'approval') return '等你审批' + waitingSuffix(entry);
  if (entry.status === 'question') return '等你回答' + waitingSuffix(entry);
  if (entry.status === 'tool') return entry.currentTool && entry.currentTool.label ? entry.currentTool.label : '调用工具';
  if (entry.status === 'running') return entry.phase === 'thinking' ? '思考中' : '运行中';
  return entry.statusLabel || '已固定';
}

/** The user-chosen safety window as a short label, e.g. "5 分钟". */
function stallWindowLabel(ms) {
  const minutes = Math.round(((Number(ms) || STALL_AFTER_MS) / 60000) * 10) / 10;
  return (Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1)) + ' 分钟';
}

function liveLine(entry) {
  if (entry.stalled === true) {
    return {
      icon: h(Icon, { name: 'warning', size: 14 }),
      label: '疑似卡住',
      detail: entry.currentTool
      ? '这次工具调用已经跑了 ' + formatDuration(entry.stalledMs) + '，超出安全区间 ' + stallWindowLabel(entry.stallAfterMs) + '，可停止后重试'
      : '已 ' + formatDuration(entry.stalledMs) + ' 没有新事件，超出安全区间 ' + stallWindowLabel(entry.stallAfterMs) + '，可停止后重试',
      elapsed: entry.turnTimeMs > 0 ? formatDuration(entry.turnTimeMs) : '',
    };
  }
  if (entry.currentTool) {
    return {
      icon: h(ToolGlyph, { category: entry.currentTool.category, size: 14 }),
      label: entry.currentTool.label,
      detail: entry.currentTool.detail || entry.currentTool.name,
      elapsed: formatDuration(entry.currentTool.elapsedMs),
    };
  }
  if (entry.status === 'approval') return { icon: h(Icon, { name: 'warning', size: 14 }), label: '等待审批', detail: entry.waitingMs > 0 ? '已经等了 ' + formatDuration(entry.waitingMs) : '任务暂停，处理后会继续', elapsed: entry.waitingMs > 0 ? formatDuration(entry.waitingMs) : formatDuration(entry.turnTimeMs) };
  if (entry.status === 'question') return { icon: h(Icon, { name: 'warning', size: 14 }), label: '等待回答', detail: entry.waitingMs > 0 ? '已经等了 ' + formatDuration(entry.waitingMs) : 'Agent 正在等你补充信息', elapsed: entry.waitingMs > 0 ? formatDuration(entry.waitingMs) : formatDuration(entry.turnTimeMs) };
  if (entry.running) return { icon: h(Icon, { name: 'spark', size: 14 }), label: entry.phaseLabel, detail: entry.currentTodo ? entry.currentTodo.content : (entry.reasoning || '正在推进本轮任务'), elapsed: formatDuration(entry.turnTimeMs) };
  if (entry.lastAction) return { icon: h(ToolGlyph, { category: toolCategory(entry.lastAction.name), size: 14 }), label: entry.lastAction.label, detail: entry.lastAction.detail || entry.lastAction.name, elapsed: entry.lastAction.durationMs ? formatDuration(entry.lastAction.durationMs) : '' };
  return { icon: h(Icon, { name: 'clock', size: 14 }), label: entry.statusLabel, detail: entry.lastText || '还没有可展示的动作', elapsed: entry.lastEventAgo !== null ? formatRelative(entry.lastEventAt, Date.now()) : '' };
}

function timeMetric(label, value, title) {
  return h('span', { className: 'dsr-card__time', title: title || undefined }, [
    h('span', { className: 'dsr-card__time-label', key: 'l' }, label),
    h('strong', { className: 'dsr-card__time-value', key: 'v' }, value > 0 ? formatDuration(value) : '—'),
  ]);
}

function SessionRow(props) {
  const entry = props.entry;
  const now = props.now;
  const live = liveLine(entry);
  const meta = sessionSubline(entry, now);
  return h('div', {
    className: cx('dsr-session-row', props.selected && 'is-selected', props.compact && 'is-compact', entry.unread && 'is-review', entry.stalled && 'is-stalled'),
    'data-tone': entry.status,
    'data-stalled': entry.stalled === true ? 'true' : undefined,
    'data-session-id': entry.id,
  }, [
    entry.unread ? h(ReviewDot, { key: 'review' }) : null,
    h('button', {
      type: 'button',
      className: 'dsr-row-main',
      key: 'main',
      onClick: function () { if (props.onOpen) props.onOpen(entry.id); else props.onSelect(entry.id); },
      title: '进入会话：' + entry.title,
      'aria-label': '进入会话 ' + entry.title + (entry.unread ? '（最近完成，尚未验收）' : ''),
    }, [
      h('span', { className: 'dsr-dot', key: 'dot', 'aria-hidden': 'true' }),
      h('span', { className: 'dsr-row-body', key: 'body' }, [
        h('span', { className: 'dsr-row-top', key: 'top' }, [
          h('span', { className: 'dsr-row-title', key: 'title', title: entry.title }, entry.title),
          badgeForStatus(entry),
        ]),
        h('span', { className: 'dsr-row-meta', key: 'meta' }, meta.map(function (part, index) {
          return [
            index > 0 ? h('span', { className: 'sep', key: 's' + index, 'aria-hidden': 'true' }, '·') : null,
            h('span', { key: 'm' + index, title: part }, part),
          ];
        })),
        h('span', { className: 'dsr-row-live', key: 'live' }, [
          live.icon,
          h('span', { className: 'dsr-live-label', key: 'label' }, live.label),
          h('span', { className: 'dsr-live-detail', key: 'detail' }, live.detail),
          live.elapsed ? h('span', { className: 'dsr-live-elapsed', key: 'time' }, live.elapsed) : null,
        ]),
        entry.progress ? h(Progress, { key: 'progress', value: entry.progress.percent }) : entry.running ? h(Progress, { key: 'progress', busy: true }) : null,
        h('span', { className: 'dsr-row-bottom', key: 'bottom' }, [
          (entry.turnTimeMs > 0 || entry.totalTimeMs > 0) ? h('span', { className: 'dsr-metric', key: 'time', title: '本轮 / 累计运行' }, [
            h(Icon, { name: 'clock', size: 11, key: 'i' }),
            h('span', { key: 't' }, '本轮 ', h('strong', null, formatDuration(entry.turnTimeMs))),
            h('span', { key: 'sep', className: 'sep' }, '·'),
            h('span', { key: 'total' }, '总 ', h('strong', null, formatDuration(entry.totalTimeMs))),
          ]) : null,
          entry.tokenTotal > 0 ? h('span', { className: 'dsr-metric', key: 'tokens', title: '本会话累计 token' }, h(Icon, { name: 'token', size: 11 }), h('strong', null, formatTokens(entry.tokenTotal)), ' tok') : null,
          entry.contextPercent !== null ? h('span', { className: 'dsr-metric', key: 'ctx', title: '当前上下文占用' }, [
            h('span', { key: 'l' }, 'ctx ', h('strong', null, entry.contextPercent + '%')),
            h('span', { className: 'dsr-mini-bar', key: 'b' }, h('i', { style: { width: entry.contextPercent + '%', background: entry.contextPercent >= 85 ? 'var(--dsr-amber)' : undefined } })),
          ]) : null,
          entry.deliverableCount > 0 ? h('span', { className: 'dsr-metric', key: 'files', title: '已捕获的改动/交付文件' }, h(Icon, { name: 'file', size: 11 }), h('strong', null, entry.deliverableCount), ' 产物') : null,
        ]),
      ]),
    ]),
    h('div', { className: 'dsr-row-actions', key: 'actions' }, [
      props.onSelect ? h(IconButton, { key: 'detail', name: 'layers', label: '查看实时详情', onClick: function () { props.onSelect(entry.id); } }) : null,
      props.onPin ? h(IconButton, { key: 'pin', name: entry.pinned ? 'pin-filled' : 'pin', label: entry.pinned ? '取消固定' : '固定到快捷栏', active: entry.pinned, onClick: function () { props.onPin(entry.id); } }) : null,
      props.onOpen ? h(IconButton, { key: 'open', name: 'arrow-right', label: '直接进入会话', onClick: function () { props.onOpen(entry.id); } }) : null,
    ]),
  ]);
}

const CARD_TINTS = [
  { value: 'auto', label: '主题', swatch: 'linear-gradient(135deg, var(--dsr-bg) 0 50%, var(--dsr-soft) 50% 100%)' },
  { value: 'sand', label: '暖砂', swatch: 'color-mix(in srgb, var(--dsr-bg) 45%, var(--dsr-amber) 55%)' },
  { value: 'mist', label: '雾青', swatch: 'color-mix(in srgb, var(--dsr-bg) 45%, var(--dsr-accent) 55%)' },
  { value: 'sage', label: '苔绿', swatch: 'color-mix(in srgb, var(--dsr-bg) 45%, var(--dsr-green) 55%)' },
];

const CARD_TEXTURES = [
  { value: 'none', label: '无' },
  { value: 'paper', label: '纸纹' },
  { value: 'dots', label: '点阵' },
  { value: 'glass', label: '毛玻璃' },
];

const PREF_TABS = [
  { value: 'appearance', label: '外观' },
  { value: 'scope', label: '范围' },
  { value: 'quick', label: '快捷栏' },
  { value: 'display', label: '显示' },
];

function PrefsSidebar(props) {
  const [tab, setTab] = useState('appearance');
  const prefs = props.prefs || {};
  const controller = props.controller;
  const [stallDraft, setStallDraft] = useState(String(normalizeStallMinutes(prefs.stallMinutes)));
  useEffect(function () {
    setStallDraft(String(normalizeStallMinutes(prefs.stallMinutes)));
  }, [prefs.stallMinutes]);
  const commitStall = function (raw) {
    const next = normalizeStallMinutes(raw);
    setStallDraft(String(next));
    set('stallMinutes', next);
  };
  const set = function (key, value) {
    if (controller && typeof controller.setPref === 'function') controller.setPref(key, value);
  };
  const close = props.onClose;
  const defaultRange = prefs.defaultRange || '7d';
  const appearance = h('div', { className: 'dsr-settings__section', key: 'appearance' }, [
    h('div', { className: 'dsr-settings__section-head', key: 'head' }, [
      h('span', { className: 'dsr-settings__section-title', key: 't' }, '卡片外观'),
      h('span', { className: 'dsr-settings__badge', key: 'b' }, '总览页'),
    ]),
    h('p', { className: 'dsr-settings__note', key: 'note' }, '只影响总览页的会话卡片；悬浮雷达保持轻量列表。'),
    h('div', { className: 'dsr-settings__label', key: 'tint-label' }, '底色'),
    h('div', { className: 'dsr-swatches', key: 'tints', role: 'group', 'aria-label': '卡片底色' }, CARD_TINTS.map(function (item) {
      const active = (prefs.cardTint || 'sand') === item.value;
      return h('button', {
        type: 'button', key: item.value, className: cx('dsr-swatch', active && 'is-active'),
        title: '卡片底色：' + item.label, 'aria-pressed': active,
        onClick: function () { set('cardTint', item.value); },
      }, [
        h('span', { className: 'dsr-swatch__dot', key: 'dot', style: { background: item.swatch } }),
        h('span', { className: 'dsr-swatch__label', key: 'label' }, item.label),
      ]);
    })),
    h('div', { className: 'dsr-settings__label', key: 'texture-label' }, '纹理'),
    h('div', { className: 'dsr-textures', key: 'textures', role: 'group', 'aria-label': '卡片纹理' }, CARD_TEXTURES.map(function (item) {
      const active = (prefs.cardTexture || 'paper') === item.value;
      return h('button', {
        type: 'button', key: item.value, className: cx('dsr-texture-option', active && 'is-active'),
        title: '卡片纹理：' + item.label, 'aria-pressed': active,
        onClick: function () { set('cardTexture', item.value); },
      }, [
        h('span', { className: 'dsr-texture-option__preview', key: 'preview', 'data-texture': item.value }),
        h('span', { className: 'dsr-texture-option__label', key: 'label' }, item.label),
      ]);
    })),
  ]);
  const scope = h('div', { className: 'dsr-settings__section', key: 'scope' }, [
    h('div', { className: 'dsr-settings__section-head', key: 'head' }, [
      h('span', { className: 'dsr-settings__section-title', key: 't' }, '默认时间范围'),
      h('span', { className: 'dsr-settings__badge', key: 'b' }, '浏览'),
    ]),
    h('p', { className: 'dsr-settings__note', key: 'note' }, '打开实况、工作区与用量时默认使用这个范围；统计信息页有自己的区间设置，各页仍可临时调整。'),
    h('div', { className: 'dsr-settings__range', key: 'ranges', role: 'group', 'aria-label': '默认时间范围' }, TIME_FILTERS.map(function (item) {
      const active = defaultRange === item.value;
      return h('button', {
        type: 'button', key: item.value, className: cx('dsr-settings__range-btn', active && 'is-active'),
        'aria-pressed': active, onClick: function () { set('defaultRange', item.value); },
      }, item.label);
    })),
    h('p', { className: 'dsr-settings__hint', key: 'hint' }, '默认：近 7 天。筛选条里的「全部时间」可以看到更早的历史。'),
  ]);
  const display = h('div', { className: 'dsr-settings__section', key: 'display' }, [
    h('div', { className: 'dsr-settings__section-head', key: 'head' }, [
      h('span', { className: 'dsr-settings__section-title', key: 't' }, '显示与提醒'),
      h('span', { className: 'dsr-settings__badge', key: 'b' }, '界面'),
    ]),
    h('p', { className: 'dsr-settings__note', key: 'note' }, '控制雷达入口、子会话、完成提醒与「疑似卡住」的安全区间；偏好只保存在本机。'),
    h('label', { className: 'dsr-toggle', key: 'rail' }, [h('span', null, '显示右侧雷达入口'), h('input', { type: 'checkbox', checked: prefs.showRail !== false, onChange: function (event) { set('showRail', event.target.checked); } })]),
    h('label', { className: 'dsr-toggle', key: 'subagents' }, [h('span', null, '显示子会话'), h('input', { type: 'checkbox', checked: prefs.includeSubagents !== false, onChange: function (event) { set('includeSubagents', event.target.checked); } })]),
    h('label', { className: 'dsr-toggle', key: 'compact' }, [h('span', null, '紧凑卡片'), h('input', { type: 'checkbox', checked: prefs.compact === true, onChange: function (event) { set('compact', event.target.checked); } })]),
    h('label', { className: 'dsr-toggle', key: 'badge' }, [h('span', null, '完成待验收提醒'), h('input', { type: 'checkbox', checked: prefs.completionBadge !== false, onChange: function (event) { set('completionBadge', event.target.checked); } })]),
    h('div', { className: 'dsr-settings__field', key: 'stall' }, [
      h('span', { className: 'dsr-settings__fieldlabel', key: 'label' }, '疑似卡住的安全区间'),
      h('span', { className: 'dsr-settings__unit', key: 'unit' }, [
        h('input', {
          key: 'input',
          type: 'number',
          className: 'dsr-settings__num',
          min: STALL_MINUTES_MIN,
          max: STALL_MINUTES_MAX,
          step: 1,
          inputMode: 'numeric',
          value: stallDraft,
          'aria-label': '疑似卡住的安全区间（分钟）',
          onChange: function (event) { setStallDraft(event.target.value); },
          onBlur: function () { commitStall(stallDraft); },
          onKeyDown: function (event) {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            commitStall(stallDraft);
          },
        }),
        h('span', { className: 'dsr-settings__suffix', key: 'suffix' }, '分钟'),
        h('button', {
          type: 'button', key: 'reset', className: 'dsr-settings__reset',
          title: '恢复默认 5 分钟', 'aria-label': '把安全区间恢复为默认 5 分钟',
          onClick: function () { commitStall(STALL_MINUTES_DEFAULT); },
        }, '默认'),
      ]),
    ]),
    h('p', { className: 'dsr-settings__hint', key: 'stall-hint' }, '一次工具调用跑过这个时长（或运行中静默这么久）才标成「疑似卡住」，默认 ' + STALL_MINUTES_DEFAULT + ' 分钟，可填 ' + STALL_MINUTES_MIN + '–' + STALL_MINUTES_MAX + ' 分钟。'),
  ]);
  const quickState = props.state || {};
  const quickEntries = Array.isArray(quickState.entries) ? quickState.entries : [];
  const quickWorkspaces = Array.isArray(quickState.workspaces) ? quickState.workspaces : [];
  const sessionChoices = quickEntries.filter(function (entry) { return entry.pinned === true || isLiveEntry(entry) || entry.unread === true; }).slice(0, 10);
  const workspaceChoices = quickWorkspaces.slice(0, 8);
  const quick = h('div', { className: 'dsr-settings__section', key: 'quick' }, [
    h('div', { className: 'dsr-settings__section-head', key: 'head' }, [
      h('span', { className: 'dsr-settings__section-title', key: 't' }, '快捷栏与置顶'),
      h('span', { className: 'dsr-settings__badge', key: 'b' }, '导航'),
    ]),
    h('p', { className: 'dsr-settings__note', key: 'note' }, '运行中、待验收和钉住的会话，以及钉住的工作区会出现在雷达旁；最多展示 6 个会话与 3 个工作区。'),
    h('label', { className: 'dsr-toggle', key: 'show' }, [h('span', null, '显示右侧快捷栏'), h('input', { type: 'checkbox', checked: prefs.showQuickBar !== false, onChange: function (event) { set('showQuickBar', event.target.checked); } })]),
    h('label', { className: 'dsr-toggle', key: 'sidepins' }, [h('span', null, '在工作区栏顶部置顶会话'), h('input', { type: 'checkbox', checked: prefs.showSidebarPins !== false, onChange: function (event) { set('showSidebarPins', event.target.checked); } })]),
    h('p', { className: 'dsr-settings__hint', key: 'sidepins-hint' }, '和右侧快捷栏一样：正在运行、已固定的会话，以及你当前正在看的那个会话都会顶到左侧工作区栏最上面，最多 ' + SIDEBAR_PIN_MAX + ' 个；标题可以点开或收起，侧边栏收成图标条时自动隐藏。'),
    h('div', { className: 'dsr-settings__label', key: 'sessions-label' }, '会话'),
    sessionChoices.length === 0 ? h('p', { className: 'dsr-settings__hint', key: 'sessions-empty' }, '还没有运行中或钉住的会话。') : h('div', { className: 'dsr-quickpin-list', key: 'sessions' }, sessionChoices.map(function (entry) {
      return h('div', { className: cx('dsr-quickpin', entry.pinned && 'is-pinned'), key: 's:' + entry.id }, [
        h('span', { className: 'dsr-quickpin__icon', key: 'icon' }, h(Icon, { name: 'session', size: 13 })),
        h('span', { className: 'dsr-quickpin__copy', key: 'copy' }, [
          h('span', { className: 'dsr-quickpin__title', key: 'title', title: entry.title }, entry.title),
          h('span', { className: 'dsr-quickpin__meta', key: 'meta' }, [entry.workspace || '', entry.pinned ? '已固定' : isLiveEntry(entry) ? '运行中' : entry.unread ? '待验收' : ''].filter(Boolean).join(' · ')),
        ]),
        h(IconButton, { key: 'pin', name: entry.pinned ? 'pin-filled' : 'pin', label: (entry.pinned ? '从快捷栏取消固定 ' : '固定到快捷栏 ') + entry.title, active: entry.pinned, onClick: function () { controller.togglePin(entry.id); } }),
      ]);
    })),
    h('div', { className: 'dsr-settings__label', key: 'workspaces-label' }, '工作区'),
    workspaceChoices.length === 0 ? h('p', { className: 'dsr-settings__hint', key: 'workspaces-empty' }, '还没有工作区。') : h('div', { className: 'dsr-quickpin-list', key: 'workspaces' }, workspaceChoices.map(function (workspace) {
      return h('div', { className: cx('dsr-quickpin', workspace.pinned && 'is-pinned'), key: 'w:' + workspace.id }, [
        h('span', { className: 'dsr-quickpin__icon is-workspace', key: 'icon' }, h(Icon, { name: 'folder', size: 13 })),
        h('span', { className: 'dsr-quickpin__copy', key: 'copy' }, [
          h('span', { className: 'dsr-quickpin__title', key: 'title', title: workspace.title }, workspace.title),
          h('span', { className: 'dsr-quickpin__meta', key: 'meta' }, [workspace.count + ' 个会话', workspace.pinned ? '已固定' : '未固定'].join(' · ')),
        ]),
        h(IconButton, { key: 'pin', name: workspace.pinned ? 'pin-filled' : 'pin', label: (workspace.pinned ? '从快捷栏取消固定 ' : '固定到快捷栏 ') + workspace.title, active: workspace.pinned, onClick: function () { controller.toggleWorkspacePin(workspace.id); } }),
      ]);
    })),
    h('p', { className: 'dsr-settings__hint', key: 'hint' }, '也可以直接在会话卡片、工作区卡片或右侧快捷栏的图钉按钮上操作。'),
    h('p', { className: 'dsr-settings__hint', key: 'keys' }, '快捷键：Alt+] / Alt+[ 在固定会话间切换，Alt+P 固定或取消固定当前会话。'),
  ]);
  const content = tab === 'scope' ? scope : tab === 'quick' ? quick : tab === 'display' ? display : appearance;
  return h('div', { className: cx('dsr-settings', props.variant && 'dsr-settings--' + props.variant) }, [
    h('header', { className: 'dsr-settings__head', key: 'head' }, [
      h('span', { className: 'dsr-settings__mark', key: 'mark' }, h(Icon, { name: 'settings', size: 15 })),
      h('div', { className: 'dsr-settings__headcopy', key: 'copy' }, [
        h('h2', { className: 'dsr-settings__title', key: 'title' }, '设置'),
        h('p', { className: 'dsr-settings__sub', key: 'sub' }, '外观、范围、快捷栏与提醒'),
      ]),
      close ? h(IconButton, { key: 'close', name: 'close', label: '关闭设置', onClick: close }) : null,
    ]),
    h('div', { className: 'dsr-settings__tabs', key: 'tabs', role: 'tablist', 'aria-label': '设置分类' }, PREF_TABS.map(function (item) {
      return h('button', {
        type: 'button', key: item.value, role: 'tab', 'aria-selected': tab === item.value,
        className: cx('dsr-settings__tab', tab === item.value && 'is-active'),
        onClick: function () { setTab(item.value); },
      }, item.label);
    })),
    h('div', { className: 'dsr-settings__body', key: 'body', role: 'tabpanel' }, content),
    h('footer', { className: 'dsr-settings__foot', key: 'foot' }, [h(Icon, { name: 'check', size: 11, key: 'i' }), h('span', { key: 't' }, '自动保存到本机浏览器')]),
  ]);
}

function PrefsMenu(props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(function () {
    if (!open) return;
    const close = function (event) {
      if (wrap.current !== null && !wrap.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    return function () { document.removeEventListener('pointerdown', close, true); };
  }, [open]);
  return h('div', { className: 'dsr-prefs', ref: wrap }, [
    h(IconButton, { key: 'button', name: 'settings', label: '雷达显示设置', active: open, onClick: function () { setOpen(function (value) { return !value; }); } }),
    open ? h('div', { className: 'dsr-prefs__menu dsr-prefs__menu--dock', key: 'menu', role: 'dialog', 'aria-label': '雷达设置' }, h(PrefsSidebar, { controller: props.controller, prefs: props.prefs, state: props.state, variant: 'dock', onClose: function () { setOpen(false); } })) : null,
  ]);
}

function SearchResultsPanel(props) {
  const state = props.state;
  if (state.ui.searchStatus === 'idle') return null;
  if (state.ui.searchStatus === 'loading') return h('div', { className: 'dsr-search-results' }, h(SkeletonRows, { count: 3 }));
  if (state.ui.searchStatus === 'error') return h('div', { className: 'dsr-banner is-error' }, [h(Icon, { name: 'warning', size: 13 }), h('span', null, state.error || '搜索失败')]);
  if (state.ui.searchResults.length === 0) return h('div', { className: 'dsr-search-results dsr-search-results--empty' }, '没有命中。试试更短的关键词。');
  return h('div', { className: 'dsr-search-results' }, [
    h('div', { className: 'dsr-search-results__head', key: 'head' }, '消息命中 · ' + state.ui.searchResults.length + ' 条'),
    ...state.ui.searchResults.map(function (item) {
      return h('button', { type: 'button', className: 'dsr-result', key: item.sessionId, onClick: function () { props.onOpen(item.sessionId); } }, [
        h('span', { className: 'dsr-result__title', key: 't' }, item.title),
        h('span', { className: 'dsr-result__snippet', key: 's' }, item.snippet || '（没有可展示的摘要）'),
        h('span', { className: 'dsr-result__meta', key: 'm' }, item.workspace || ''),
      ]);
    }),
  ]);
}

const QUICKBAR_MAX_SESSIONS = 6;
const QUICKBAR_MAX_WORKSPACES = 3;

function quickBarIcon(entry) {
  switch (entry && entry.status) {
    case 'approval': return 'warning';
    case 'question': return 'spark';
    case 'tool': return 'tool';
    case 'running': return 'pulse';
    case 'done': return entry && entry.unread ? 'artifact' : 'check';
    case 'migration': return 'archive';
    default: return 'session';
  }
}

function readSurfacePos(prefs, key) {
  const value = prefs && prefs[key];
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x: x, y: y } : null;
}

function applySurfacePosition(surface, pos, anchor) {
  if (!surface) return;
  if (pos) {
    const rect = surface.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (anchor === 'right') {
      surface.style.left = 'auto';
      surface.style.right = Math.max(0, window.innerWidth - pos.x - width) + 'px';
    } else {
      surface.style.left = Math.max(0, Math.min(pos.x, window.innerWidth - width)) + 'px';
      surface.style.right = 'auto';
    }
    surface.style.top = Math.max(0, Math.min(pos.y, window.innerHeight - height)) + 'px';
    surface.style.bottom = 'auto';
    surface.style.transform = '';
  } else {
    surface.style.left = '';
    surface.style.top = '';
    surface.style.right = '';
    surface.style.bottom = '';
    surface.style.transform = '';
  }
}

function useSurfaceDrag(name, controller, prefs, surfaceRef, anchor) {
  const dragRef = useRef(null);
  const suppressRef = useRef(0);
  const pos = readSurfacePos(prefs, name);
  const attach = useCallback(function (node) {
    surfaceRef.current = node;
    if (node) applySurfacePosition(node, pos, anchor);
  }, [surfaceRef, pos && pos.x, pos && pos.y, anchor]);
  useEffect(function () {
    if (surfaceRef.current) applySurfacePosition(surfaceRef.current, pos, anchor);
  }, [surfaceRef, pos && pos.x, pos && pos.y, anchor]);
  const onPointerDown = function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    const surface = surfaceRef.current;
    const handle = event.currentTarget;
    if (!surface || !handle) return;
    const rect = surface.getBoundingClientRect();
    surface.style.width = rect.width + 'px';
    surface.classList.add('is-dragging');
    dragRef.current = {
      pointerId: event.pointerId,
      handle: handle,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      x: rect.left,
      y: rect.top,
    };
    try { handle.setPointerCapture(event.pointerId); } catch (error) { /* pointer capture is best-effort */ }
  };
  const onPointerMove = function (event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const liveRect = surface.getBoundingClientRect();
    if (!drag.moved) {
      drag.moved = true;
      if (liveRect.width !== drag.width || liveRect.left !== drag.originX || liveRect.top !== drag.originY) {
        drag.originX = liveRect.left;
        drag.originY = liveRect.top;
      }
      surface.classList.add('is-dragging');
      surface.style.transition = 'none';
    }
    drag.width = Math.max(drag.width, liveRect.width);
    drag.height = Math.max(drag.height, liveRect.height);
    const maxX = Math.max(0, window.innerWidth - drag.width);
    const maxY = Math.max(0, window.innerHeight - drag.height);
    drag.x = Math.min(maxX, Math.max(0, drag.originX + dx));
    drag.y = Math.min(maxY, Math.max(0, drag.originY + dy));
    surface.style.left = drag.x + 'px';
    surface.style.top = drag.y + 'px';
    surface.style.right = 'auto';
    surface.style.bottom = 'auto';
    surface.style.transform = 'none';
    if (event.cancelable) event.preventDefault();
  };
  const finish = function (event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const surface = surfaceRef.current;
    if (drag.moved) {
      suppressRef.current = Date.now() + 400;
      if (controller && typeof controller.setPref === 'function') {
        controller.setPref(name, { x: Math.round(drag.x), y: Math.round(drag.y) });
      }
      if (surface) applySurfacePosition(surface, { x: Math.round(drag.x), y: Math.round(drag.y) }, anchor);
    }
    if (surface) {
      surface.classList.remove('is-dragging');
      surface.style.transition = '';
      surface.style.transform = '';
      surface.style.width = '';
    }
    try { drag.handle.releasePointerCapture(event.pointerId); } catch (error) { /* pointer capture is best-effort */ }
    dragRef.current = null;
  };
  const consumeDrag = function () {
    if (Date.now() < suppressRef.current) {
      suppressRef.current = 0;
      return true;
    }
    return false;
  };
  return {
    attach: attach,
    onPointerDown: onPointerDown,
    onPointerMove: onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    consumeDrag: consumeDrag,
  };
}

function useQuickBarProximity(surfaceRef) {
  const [near, setNear] = useState(false);
  useEffect(function () {
    let frame = 0;
    let last = false;
    const measure = function (event) {
      const surface = surfaceRef.current;
      if (!surface || surface.classList.contains('is-dragging')) return;
      const rect = surface.getBoundingClientRect();
      const next = event.clientX >= rect.left - 52 &&
        event.clientX <= window.innerWidth + 4 &&
        event.clientY >= rect.top - 24 &&
        event.clientY <= rect.bottom + 24;
      if (next !== last) {
        last = next;
        setNear(next);
      }
    };
    const move = function (event) {
      if (frame !== 0) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        measure(event);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return function () {
      window.removeEventListener('pointermove', move);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [surfaceRef]);
  return near;
}

function QuickBar(props) {
  const state = props.state;
  const surfaceRef = useRef(null);
  const near = useQuickBarProximity(surfaceRef);
  const drag = useSurfaceDrag('quickBarPos', props.controller, state && state.prefs, surfaceRef, 'right');
  if (!state || state.prefs.showQuickBar === false) return null;
  if (state.ui.prefsOpen === true) return null;
  const entries = Array.isArray(state.entries) ? state.entries : [];
  const workspaces = Array.isArray(state.workspaces) ? state.workspaces : [];
  const seen = new Set();
  const sessions = [];
  const pushSession = function (entry) {
    if (!entry || seen.has(entry.id) || entry.archived === true) return;
    seen.add(entry.id);
    sessions.push(entry);
  };
  sortEntries(entries.filter(function (entry) { return entry.pinned === true; }), 'live').forEach(pushSession);
  const currentEntry = entries.find(function (entry) { return entry.id === state.currentId; });
  if (currentEntry !== undefined) pushSession(currentEntry);
  sortEntries(entries.filter(function (entry) { return entry.pinned !== true && isLiveEntry(entry); }), 'live').forEach(pushSession);
  sortEntries(entries.filter(function (entry) { return entry.pinned !== true && !isLiveEntry(entry) && entry.unread === true; }), 'recent').forEach(pushSession);
  const pinnedWorkspaces = workspaces.filter(function (workspace) { return workspace.pinned === true; });
  let visibleSessions = sessions.slice(0, QUICKBAR_MAX_SESSIONS);
  const currentIndex = sessions.findIndex(function (entry) { return entry.id === state.currentId; });
  if (currentIndex >= QUICKBAR_MAX_SESSIONS) {
    visibleSessions = visibleSessions.slice(0, QUICKBAR_MAX_SESSIONS - 1).concat(sessions[currentIndex]);
  }
  const visibleWorkspaces = pinnedWorkspaces.slice(0, QUICKBAR_MAX_WORKSPACES);
  const overflow = sessions.length - visibleSessions.length + pinnedWorkspaces.length - visibleWorkspaces.length;
  if (visibleSessions.length === 0 && visibleWorkspaces.length === 0) return null;
  const items = [];
  items.push(h('span', {
    className: 'dsr-quickbar__cap',
    key: 'cap',
    title: '右侧快捷栏 · 拖动调整位置 · Alt+] 下一个固定会话',
    onPointerDown: drag.onPointerDown,
    onPointerMove: drag.onPointerMove,
    onPointerUp: drag.onPointerUp,
    onPointerCancel: drag.onPointerCancel,
  }, [
    h('span', { className: 'dsr-quickbar__glyph', key: 'g' }, h(Icon, { name: 'pin', size: 11 })),
    h('span', { className: 'dsr-quickbar__copy', key: 'c' }, h('span', { className: 'dsr-quickbar__label' }, '快捷栏')),
  ]));
  visibleSessions.forEach(function (entry) {
    const live = isLiveEntry(entry);
    const statusText = entry.stalled ? '疑似卡住 ' + formatDuration(entry.stalledMs) : (entry.statusLabel || (live ? '运行中' : '最近会话'));
    const metaText = [statusText, entry.id === state.currentId ? '当前' : '', entry.pinned ? '已固定' : '', entry.unread ? '待验收' : ''].filter(Boolean).join(' · ');
    const sessionTitle = entry.title || '未命名会话';
    items.push(h('div', {
      className: cx('dsr-quickbar__item', entry.pinned && 'is-pinned', entry.id === state.currentId && 'is-current'),
      key: 'srow:' + entry.id,
    }, [
      h('button', {
        type: 'button',
        key: 'main',
        className: cx('dsr-quickbar__btn', entry.pinned && 'is-pinned', live && 'is-live', entry.unread && 'is-review', entry.stalled && 'is-stalled'),
        'data-glyph-external': '',
        'data-quickbar-kind': 'session',
        'data-status': entry.status,
        title: sessionTitle + ' · ' + metaText,
        'aria-current': entry.id === state.currentId ? 'true' : undefined,
        'aria-label': '打开会话：' + sessionTitle + (entry.id === state.currentId ? '，当前会话' : '') + (entry.unread ? '，最近完成，待验收' : ''),
        onClick: function () { props.onOpenSession(entry.id); },
      }, [
        h('span', { className: 'dsr-quickbar__glyph', key: 'g' }, [
          h(Icon, { name: quickBarIcon(entry), size: 17, key: 'i' }),
          live ? h('span', { className: 'dsr-quickbar__status', key: 'live', 'aria-hidden': 'true' }) : null,
          entry.unread ? h('span', { className: 'dsr-quickbar__alert', key: 'alert', 'aria-hidden': 'true' }) : null,
        ]),
        h('span', { className: 'dsr-quickbar__copy', key: 'c' }, [
          h('span', { className: 'dsr-quickbar__label', key: 'l' }, sessionTitle),
          h('span', { className: 'dsr-quickbar__meta', key: 'm' }, metaText),
        ]),
      ]),
      h('button', {
        type: 'button',
        key: 'pin',
        className: cx('dsr-quickbar__pin', entry.pinned && 'is-active'),
        'data-glyph-external': '',
        title: entry.pinned ? '取消固定会话' : '固定到快捷栏',
        'aria-label': (entry.pinned ? '取消固定会话：' : '固定到快捷栏：') + sessionTitle,
        'aria-pressed': entry.pinned ? 'true' : 'false',
        onClick: function (event) {
          event.stopPropagation();
          if (props.onTogglePin) props.onTogglePin(entry.id);
        },
      }, h(Icon, { name: entry.pinned ? 'pin-filled' : 'pin', size: 13 })),
    ]));
  });
  if (visibleSessions.length > 0 && visibleWorkspaces.length > 0) items.push(h('span', { className: 'dsr-quickbar__divider', key: 'divider', 'aria-hidden': 'true' }));
  visibleWorkspaces.forEach(function (workspace) {
    const workspaceTitle = workspace.title || '未命名工作区';
    const workspaceMeta = '工作区' + (workspace.activeCount > 0 ? ' · ' + workspace.activeCount + ' 个运行中' : '');
    items.push(h('div', { className: 'dsr-quickbar__item is-workspace', key: 'wrow:' + workspace.id }, [
      h('button', {
        type: 'button',
        key: 'main',
        className: 'dsr-quickbar__btn is-workspace',
        'data-glyph-external': '',
        'data-quickbar-kind': 'workspace',
        title: workspaceTitle + ' · ' + workspaceMeta,
        'aria-label': '打开工作区：' + workspaceTitle,
        onClick: function () { props.onOpenWorkspace(workspace.id); },
      }, [
        h('span', { className: 'dsr-quickbar__glyph', key: 'g' }, h(Icon, { name: 'folder', size: 16, key: 'i' })),
        h('span', { className: 'dsr-quickbar__copy', key: 'c' }, [
          h('span', { className: 'dsr-quickbar__label', key: 'l' }, workspaceTitle),
          h('span', { className: 'dsr-quickbar__meta', key: 'm' }, workspaceMeta),
        ]),
      ]),
      h('button', {
        type: 'button',
        key: 'pin',
        className: 'dsr-quickbar__pin is-active',
        'data-glyph-external': '',
        title: '取消固定工作区',
        'aria-label': '取消固定工作区：' + workspaceTitle,
        'aria-pressed': 'true',
        onClick: function (event) {
          event.stopPropagation();
          if (props.onToggleWorkspacePin) props.onToggleWorkspacePin(workspace.id);
        },
      }, h(Icon, { name: 'pin-filled', size: 13 })),
    ]));
  });
  if (overflow > 0) items.push(h('button', {
    type: 'button',
    key: 'more',
    className: 'dsr-quickbar__btn is-more',
    'data-glyph-external': '',
    title: '还有 ' + overflow + ' 个快捷项，打开会话雷达查看',
    'aria-label': '还有 ' + overflow + ' 个快捷项，打开会话雷达',
    onClick: function () { props.onMore(); },
  }, [
    h('span', { className: 'dsr-quickbar__glyph', key: 'g' }, '+' + overflow),
    h('span', { className: 'dsr-quickbar__copy', key: 'c' }, [
      h('span', { className: 'dsr-quickbar__label', key: 'l' }, '还有 ' + overflow + ' 个快捷项'),
      h('span', { className: 'dsr-quickbar__meta', key: 'm' }, '打开会话雷达查看'),
    ]),
  ]));
  return h('nav', {
    ref: drag.attach,
    className: cx('dsr-quickbar', props.railVisible === false && 'is-solo', near && 'is-near'),
    'data-glyph-external': '',
    'aria-label': '右侧快捷栏',
  }, items);
}
/* --- left sidebar pins -------------------------------------------------
 * The workspace column belongs to the host shell (its slot is single-owner),
 * so the strip that lifts running and pinned sessions to the top of that
 * column is portalled into the region element instead of registered as a
 * slot entry. Everything below degrades to nothing when the host has no such
 * region or no react-dom seed.
 */

const SIDEBAR_REGION_SELECTOR = '[class*="regionArea"]';
const SIDEBAR_PINS_MIN_WIDTH = 150;

function useSidebarRegion(enabled) {
  const [host, setHost] = useState(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(function () {
    const canMount = enabled && typeof document !== 'undefined' && typeof MutationObserver === 'function';
    if (!canMount) {
      setHost(null);
      setNarrow(false);
      return undefined;
    }
    const node = document.createElement('div');
    node.className = 'dsr-sidepins-host';
    node.setAttribute('data-dsr-sidepins-host', '');
    let frame = 0;
    let resize = null;
    let observed = null;
    const attach = function () {
      const region = document.querySelector(SIDEBAR_REGION_SELECTOR);
      if (region === null) {
        setHost(null);
        setNarrow(false);
        return;
      }
      if (node.parentNode !== region) region.insertBefore(node, region.firstChild);
      const width = region.getBoundingClientRect().width;
      setNarrow(width > 0 && width < SIDEBAR_PINS_MIN_WIDTH);
      setHost(node.parentNode === region ? node : null);
      if (typeof ResizeObserver === 'function' && observed !== region) {
        if (resize !== null) resize.disconnect();
        resize = new ResizeObserver(schedule);
        resize.observe(region);
        observed = region;
      }
    };
    const schedule = function () {
      if (frame !== 0) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        attach();
      });
    };
    attach();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    return function () {
      observer.disconnect();
      if (resize !== null) resize.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
      if (node.parentNode !== null) node.parentNode.removeChild(node);
      setHost(null);
      setNarrow(false);
    };
  }, [enabled]);
  return { host, narrow };
}

/** One strip row: status dot, title, then workspace and what it is doing now. */
function SidebarPinRow(props) {
  const entry = props.entry;
  const current = props.current === true;
  const title = entry.title || '未命名会话';
  const status = sidebarPinStatus(entry);
  const meta = [entry.workspace, status].filter(Boolean).join(' · ');
  const flags = [];
  if (current) flags.push({ key: 'current', className: 'dsr-sidepins__flag', label: '当前' });
  else if (entry.pinned === true) flags.push({ key: 'pinned', className: 'dsr-sidepins__flag is-pin', label: '已固定' });
  else if (entry.unread === true) flags.push({ key: 'review', className: 'dsr-sidepins__flag is-review', label: '待验收' });
  return h('div', {
    className: cx('dsr-sidepins__row', entry.pinned === true && 'is-pinned', current && 'is-current', entry.stalled === true && 'is-stalled'),
    key: 'pin:' + entry.id,
    role: 'listitem',
    'data-dsr-sidepins-row': entry.id,
    'data-status': entry.status,
  }, [
    h('button', {
      type: 'button',
      key: 'main',
      className: 'dsr-sidepins__main',
      title: title + ' · ' + meta,
      'aria-current': current ? 'true' : undefined,
      'aria-label': '打开会话：' + title + '（' + status + '）',
      onClick: function () { props.onOpen(entry.id); },
    }, [
      h('span', {
        className: cx('dsr-sidepins__dot', entry.stalled === true ? 'is-stalled' : 'is-' + entry.status),
        key: 'dot',
        'aria-hidden': 'true',
      }),
      h('span', { className: 'dsr-sidepins__copy', key: 'copy' }, [
        h('span', { className: 'dsr-sidepins__line', key: 'line' }, [
          h('span', { className: 'dsr-sidepins__name', key: 'name' }, title),
          flags.length > 0 ? h('span', { className: flags[0].className, key: flags[0].key }, flags[0].label) : null,
        ]),
        h('span', { className: 'dsr-sidepins__meta', key: 'meta' }, meta),
      ]),
    ]),
    h('button', {
      type: 'button',
      key: 'pin',
      className: cx('dsr-sidepins__pin', entry.pinned === true && 'is-active'),
      title: entry.pinned === true ? '取消固定' : '固定到顶部',
      'aria-label': (entry.pinned === true ? '取消固定会话：' : '固定会话到顶部：') + title,
      'aria-pressed': entry.pinned === true ? 'true' : 'false',
      onClick: function (event) {
        event.stopPropagation();
        props.onPin(entry.id);
      },
    }, h(Icon, { name: entry.pinned === true ? 'pin-filled' : 'pin', size: 12 })),
  ]);
}

/** The strip itself, rendered inside the host sidebar column. */
function SidebarPins(props) {
  const state = props.state;
  const controller = props.controller;
  const group = sidebarPinSessions(state.entries, { max: SIDEBAR_PIN_MAX, currentId: state.currentId });
  if (group.items.length === 0) return null;
  const open = (state.prefs || {}).sidebarPinsOpen !== false;
  const toggle = function () {
    if (controller && typeof controller.setPref === 'function') controller.setPref('sidebarPinsOpen', !open);
  };
  const summary = [];
  if (group.pinnedCount > 0) summary.push(group.pinnedCount + ' 已固定');
  if (group.liveCount > 0) summary.push(group.liveCount + ' 运行中');
  if (group.currentCount > 0) summary.push('当前会话');
  const head = h('div', { className: 'dsr-sidepins__head', key: 'head' }, [
    h('button', {
      type: 'button',
      key: 'toggle',
      className: cx('dsr-sidepins__toggle', open && 'is-open'),
      'aria-expanded': open ? 'true' : 'false',
      'aria-controls': 'dsr-sidepins-list',
      title: open ? '收起置顶会话' : '展开置顶会话',
      onClick: toggle,
    }, [
      h(Icon, { name: open ? 'chevron-down' : 'chevron-right', size: 11, key: 'chevron' }),
      h('span', { className: 'dsr-sidepins__title', key: 'title' }, '置顶会话'),
      h('span', { className: 'dsr-sidepins__count', key: 'count', title: summary.join(' · ') }, String(group.total)),
    ]),
    h('button', {
      type: 'button',
      key: 'all',
      className: 'dsr-sidepins__all',
      title: '在会话雷达里查看全部会话',
      'aria-label': '打开会话雷达查看全部会话',
      onClick: function () { controller.open(); },
    }, '全部'),
  ]);
  if (!open) {
    const collapsedHint = summary.length > 0 ? summary.join(' · ') : '';
    return h('section', { className: 'dsr-sidepins is-collapsed', 'data-dsr-sidepins': '', 'aria-label': '置顶会话：运行中与已固定' }, [
      head,
      collapsedHint === '' ? null : h('button', {
        type: 'button',
        key: 'hint',
        className: 'dsr-sidepins__hint',
        title: '展开置顶会话',
        onClick: toggle,
      }, collapsedHint),
    ]);
  }
  const rows = group.items.map(function (entry) {
    return h(SidebarPinRow, {
      key: 'row:' + entry.id,
      entry: entry,
      current: entry.id === state.currentId,
      onOpen: function (id) { controller.openSession(id); },
      onPin: function (id) { controller.togglePin(id); },
    });
  });
  const more = group.hidden > 0 ? h('button', {
    type: 'button',
    key: 'more',
    className: 'dsr-sidepins__more',
    title: '还有 ' + group.hidden + ' 个运行中或已固定的会话',
    onClick: function () { controller.open(); },
  }, '还有 ' + group.hidden + ' 个') : null;
  const list = h('div', {
    className: 'dsr-sidepins__list',
    key: 'list',
    id: 'dsr-sidepins-list',
    role: 'list',
    'aria-label': '运行中与已固定的会话',
  }, more === null ? rows : rows.concat([more]));
  return h('section', { className: 'dsr-sidepins', 'data-dsr-sidepins': '', 'aria-label': '置顶会话：运行中与已固定' }, [head, list]);
}

/** Mounts the strip into the sidebar region, or renders nothing at all. */
function SidebarPinsPortal(props) {
  const state = props.state;
  const enabled = state !== null && state !== undefined && (state.prefs || {}).showSidebarPins !== false;
  const region = useSidebarRegion(enabled);
  if (!enabled || createPortal === null) return null;
  if (region.host === null || region.narrow) return null;
  return createPortal(h(SidebarPins, { state: state, controller: props.controller }), region.host);
}

function DockFooter(props) {
  const state = props.state;
  return h('div', { className: 'dsr-dock__foot' }, [
    h('span', { className: cx('dsr-footer__status', 'is-' + state.streaming), key: 'status' }, [
      h('span', { className: 'dsr-dot', 'aria-hidden': 'true' }),
      state.streaming === 'reconnecting' ? '事件流重连中' : state.streaming === 'live' ? '实时' : '目录已同步',
    ]),
    h('span', { className: 'dsr-dock__foottext', key: 'hint' }, '本轮与总计按事件 / sessionStats 计算'),
  ]);
}

function Dock(props) {
  const controller = props.controller;
  const state = useRadar(controller);
  const now = useNow(1000);
  const inputRef = useRef(null);
  const railRef = useRef(null);
  const railDrag = useSurfaceDrag('railPos', controller, state.prefs, railRef);
  const open = state.ui.open;
  useEffect(function () {
    if (controller.hasShortcut) return;
    const fallback = function (event) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.code === 'BracketRight') {
        event.preventDefault();
        controller.cyclePinned(1);
        return;
      }
      if (event.code === 'BracketLeft') {
        event.preventDefault();
        controller.cyclePinned(-1);
        return;
      }
      if (event.code === 'KeyP') {
        event.preventDefault();
        controller.togglePinnedCurrent();
        return;
      }
      if (event.code !== 'KeyR') return;
      event.preventDefault();
      controller.toggle();
    };
    window.addEventListener('keydown', fallback, true);
    return function () { window.removeEventListener('keydown', fallback, true); };
  }, [controller]);
  useEffect(function () {
    if (!open) return;
    const timer = setTimeout(function () {
      const input = inputRef.current;
      if (input) input.focus({ preventScroll: true });
    }, 70);
    return function () { clearTimeout(timer); };
  }, [open]);
  useEffect(function () {
    if (!open) return;
    const keydown = function (event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (state.ui.selectedId !== null) controller.back();
      else controller.close();
    };
    window.addEventListener('keydown', keydown, true);
    return function () { window.removeEventListener('keydown', keydown, true); };
  }, [open, state.ui.selectedId, controller]);
  if (!open) {
    const working = state.counts.active + state.counts.waiting;
    const railVisible = state.prefs.showRail !== false;
    return h(Fragment, null, [
      h(SidebarPinsPortal, { key: 'sidepins', controller: controller, state: state }),
      h(QuickBar, {
        key: 'quickbar', state: state, railVisible: railVisible, controller: controller,
        onTogglePin: function (id) { controller.togglePin(id); },
        onToggleWorkspacePin: function (id) { controller.toggleWorkspacePin(id); },
        onOpenSession: function (id) { controller.openSession(id); },
        onOpenWorkspace: function (id) {
          if (typeof controller.focusWorkspace === 'function') controller.focusWorkspace(id);
          else controller.openOverview();
        },
        onMore: function () { controller.open(); },
      }),
      railVisible ? h('button', {
        type: 'button',
        ref: railDrag.attach,
        className: 'dsr-rail',
        key: 'rail',
        'data-glyph-external': '',
        'aria-label': '打开会话雷达',
        'aria-expanded': false,
        'aria-controls': 'dsr-dock',
        title: '会话雷达 · Ctrl+Alt+Shift+R · 拖动调整位置',
        onPointerDown: railDrag.onPointerDown,
        onPointerMove: railDrag.onPointerMove,
        onPointerUp: railDrag.onPointerUp,
        onPointerCancel: railDrag.onPointerCancel,
        onClick: function () {
          if (railDrag.consumeDrag()) return;
          controller.open();
        },
      }, [
        working > 0 ? h('span', { className: 'dsr-rail__unread', key: 'live', 'aria-hidden': 'true' }) : null,
        h('span', { className: 'dsr-rail__glyph', key: 'glyph' }, h(RadarGlyph, { size: 22, active: working > 0 })),
        h('span', { className: cx('dsr-rail__count', working > 0 && 'has-work'), key: 'count', title: '运行中与等待中的会话' }, String(working)),
        h('span', { className: 'dsr-rail__label', key: 'label' }, '雷达'),
        state.counts.unread > 0 ? h('span', { className: 'dsr-sr-only', key: 'sr' }, state.counts.unread + ' 个会话最近完成，尚未验收') : null,
      ]) : null,
    ]);
  }
  const filtered = filterEntries(state.entries, state.ui.query);
  const recent = sortEntries(filtered, 'recent');
  const pinned = recent.filter(function (entry) { return entry.pinned; });
  const pinnedIds = new Set(pinned.map(function (entry) { return entry.id; }));
  const live = sortEntries(filtered.filter(function (entry) { return isLiveEntry(entry) && !pinnedIds.has(entry.id); }), 'live');
  const recentTailSource = recent.filter(function (entry) { return !pinnedIds.has(entry.id); });
  const liveIds = new Set(live.map(function (entry) { return entry.id; }));
  const recentTail = recentTailSource.filter(function (entry) { return !liveIds.has(entry.id); }).slice(0, 6);
  const selected = state.selected;
  const dockPool = state.entries.concat(state.archivedEntries || []);
  let body;
  if (selected) {
    body = h(DetailPanel, { key: 'detail', entry: selected, controller: controller, now: now, variant: 'dock', entries: dockPool, onSelect: function (id) { controller.select(id); }, onBack: function () { controller.back(); } });
  } else {
    const items = [];
    if (state.error) items.push(h('div', { className: 'dsr-banner is-error', key: 'error' }, [h(Icon, { name: 'warning', size: 13 }), h('span', null, state.error), h('button', { type: 'button', className: 'dsr-banner__action', onClick: function () { controller.refresh(); } }, '重试')]));
    if (state.streaming === 'reconnecting') items.push(h('div', { className: 'dsr-banner', key: 'reconnect' }, [h(Icon, { name: 'warning', size: 13 }), h('span', null, '事件流正在重连，数字可能滞后几秒。')]));
    if (state.ui.searchStatus !== 'idle') items.push(h(SearchResultsPanel, { key: 'search', state: state, onOpen: function (id) { controller.openSession(id); } }));
    if (state.phase !== 'ready' && state.entries.length === 0) items.push(h(SkeletonRows, { key: 'skeleton', count: 4 }));
    else if (state.ui.tab === 'live') items.push(h('section', { className: 'dsr-section', key: 'live' }, [
      h(SectionHeader, { key: 'head', title: '进行中', count: live.length }),
      live.length === 0 ? h(EmptyRadar, { key: 'empty', compact: true, onRecent: function () { controller.setTab('recent'); } }) : live.map(function (entry) {
        return h(SessionRow, { key: entry.id, entry: entry, now: now, compact: state.prefs.compact, onSelect: function (id) { controller.select(id); }, onOpen: function (id) { controller.openSession(id); }, onPin: function (id) { controller.togglePin(id); } });
      }),
    ]));
    if (state.ui.tab === 'live' && recentTail.length > 0) items.push(h('section', { className: 'dsr-section', key: 'recent' }, [
      h(SectionHeader, { key: 'head', title: '最近', count: recentTailSource.length }),
      ...recentTail.map(function (entry) {
        return h(SessionRow, { key: entry.id, entry: entry, now: now, compact: true, onSelect: function (id) { controller.select(id); }, onOpen: function (id) { controller.openSession(id); }, onPin: function (id) { controller.togglePin(id); } });
      }),
    ]));
    if (state.ui.tab === 'recent') items.push(h('section', { className: 'dsr-section', key: 'recent' }, [
      h(SectionHeader, { key: 'head', title: '最近会话', count: recentTailSource.length }),
      recentTailSource.length === 0 ? h(EmptyRadar, { key: 'empty', compact: true }) : recentTailSource.map(function (entry) {
        return h(SessionRow, { key: entry.id, entry: entry, now: now, compact: state.prefs.compact, onSelect: function (id) { controller.select(id); }, onOpen: function (id) { controller.openSession(id); }, onPin: function (id) { controller.togglePin(id); } });
      }),
    ]));
    if (state.ui.tab === 'pinned') items.push(h('section', { className: 'dsr-section', key: 'pinned' }, [
      h(SectionHeader, { key: 'head', title: '正在跟踪', count: pinned.length }),
      pinned.length === 0 ? h('div', { className: 'dsr-banner' }, '点会话卡片上的图钉把它固定到右侧快捷栏，同时会移到「正在跟踪的会话」。') : pinned.map(function (entry) {
        return h(SessionRow, { key: entry.id, entry: entry, now: now, compact: state.prefs.compact, onSelect: function (id) { controller.select(id); }, onOpen: function (id) { controller.openSession(id); }, onPin: function (id) { controller.togglePin(id); } });
      }),
    ]));
    body = h('div', { className: 'dsr-scroll' }, items);
  }
  return h(Fragment, null, [
    h(SidebarPinsPortal, { key: 'sidepins', controller: controller, state: state }),
    h('div', { className: 'dsr-scrim', key: 'scrim', onClick: function () { controller.close(); } }),
    h('aside', { className: 'dsr-dock', key: 'dock', id: 'dsr-dock', 'data-glyph-external': '' }, [
      h('header', { className: 'dsr-dock__head', key: 'head' }, [
        h('div', { className: 'dsr-brand', key: 'brand' }, [
          h('span', { className: 'dsr-brand__mark', key: 'mark' }, h(RadarGlyph, { size: 18, active: live.length > 0 })),
          h('div', { className: 'dsr-brand__copy', key: 'copy' }, [
            h('h2', { className: 'dsr-brand__title', key: 't' }, '会话雷达'),
            h('p', { className: 'dsr-brand__sub', key: 's' }, (state.counts.active + state.counts.waiting) + ' 个任务进行中 · ' + (state.counts.workspaces || 0) + ' 个工作区'),
          ]),
        ]),
        h('div', { className: 'dsr-header-actions', key: 'actions' }, [
          h(IconButton, { key: 'expand', name: 'expand', label: '打开总览', onClick: function () { controller.openOverview(); } }),
          h(IconButton, { key: 'close', name: 'close', label: '关闭会话雷达', onClick: function () { controller.close(); } }),
        ]),
      ]),
      h('div', { className: 'dsr-stats', key: 'stats' }, [
        h(Stat, { key: 'active', icon: 'pulse', iconSize: 13, tone: 'green', label: '运行中', value: String(state.counts.active), title: '正在执行或调用工具' }),
        h(Stat, { key: 'waiting', icon: 'warning', iconSize: 13, tone: 'amber', label: '等待你', value: String(state.counts.waiting), title: '审批或回答后继续' }),
        state.counts.stalled > 0 ? h(Stat, { key: 'stalled', icon: 'warning', iconSize: 13, tone: 'red', label: '卡住', value: String(state.counts.stalled), title: '工具调用或运行中的静默超过安全区间（' + stallWindowLabel(state.stallAfterMs) + '）才提醒，可以停止后重试' }) : null,
        h(Stat, { key: 'unread', icon: 'check', iconSize: 13, tone: 'green', label: '待验收', value: String(state.counts.unread), onClick: state.counts.unread > 0 ? function () { controller.clearUnread(); } : undefined, title: '最近完成且尚未点开验收的会话；点击清除提醒' }),
      ]),
      h('div', { className: 'dsr-tabs', key: 'tabs' }, [
        h('button', { type: 'button', className: cx('dsr-tab', state.ui.tab === 'live' && 'is-active'), key: 'live', onClick: function () { controller.setTab('live'); } }, ['实时', h('span', { className: 'dsr-tab__count' }, String(state.counts.active))]),
        h('button', { type: 'button', className: cx('dsr-tab', state.ui.tab === 'recent' && 'is-active'), key: 'recent', onClick: function () { controller.setTab('recent'); } }, ['最近']),
        h('button', { type: 'button', className: cx('dsr-tab', state.ui.tab === 'pinned' && 'is-active'), key: 'pinned', onClick: function () { controller.setTab('pinned'); } }, ['跟踪', h('span', { className: 'dsr-tab__count' }, String(state.counts.pinned || 0))]),
      ]),
      h('div', { className: 'dsr-searchrow', key: 'search' }, [
        h(SearchBox, { key: 'box', value: state.ui.query, onChange: function (value) { controller.setQuery(value); }, onSubmit: function () { controller.searchContent(); }, placeholder: '筛选或搜索会话', inputRef: inputRef }),
        h(IconButton, { key: 'refresh', name: 'refresh', label: '刷新全部数据', onClick: function () { controller.refresh(); } }),
        h(PrefsMenu, { key: 'prefs', controller: controller, prefs: state.prefs, state: state }),
      ]),
      body,
      h(DockFooter, { key: 'foot', state: state }),
    ]),
  ]);
}

function DStat(props) {
  return h('div', { className: 'dsr-dstat' }, [
    h('span', { className: 'dsr-dstat__head', key: 'head' }, [
      h('span', { className: 'dsr-dstat__icon', key: 'i' }, h(Icon, { name: props.icon, size: 11 })),
      h('span', { key: 'l' }, props.label),
    ]),
    h('span', { className: 'dsr-dstat__value', key: 'value' }, props.value, props.unit ? h('small', { key: 'u' }, props.unit) : null),
    props.children,
    props.note ? h('span', { className: 'dsr-file-path', key: 'note', style: { marginTop: '7px' } }, props.note) : null,
  ]);
}

function DetailStats(props) {
  const entry = props.entry;
  const contextLabel = entry.contextPercent === null || entry.contextPercent === undefined ? '—' : entry.contextPercent + '%';
  const contextDetail = entry.contextWindow > 0 ? formatTokens(entry.usagePromptTokens) + ' / ' + formatTokens(entry.contextWindow) : '等待 provider 采样';
  const steps = Number(entry.stats && entry.stats.steps) || entry.step || 0;
  const turns = Number(entry.stats && entry.stats.turns) || entry.turn || 0;
  const rate = Number(entry.tokensPerMinute) || 0;
  const waiting = entry.status === 'approval' || entry.status === 'question';
  const live = entry.status === 'running' || entry.status === 'tool';
  const healthIcon = entry.stalled === true ? 'warning' : waiting ? 'approval' : live ? 'running' : 'check';
  const healthValue = entry.stalled === true ? '疑似卡住' : waiting ? '等你处理' : live ? '正常' : entry.statusLabel;
  const healthNote = entry.stalled === true
    ? (entry.currentTool ? '工具调用 ' + formatDuration(entry.stalledMs) : formatDuration(entry.stalledMs) + ' 无事件') + ' / 区间 ' + stallWindowLabel(entry.stallAfterMs)
    : waiting
      ? '已等待 ' + formatDuration(entry.waitingMs)
      : entry.lastEventAt > 0 ? '最近事件 ' + formatRelative(entry.lastEventAt, Date.now()) : '还没有事件';
  return h('div', { className: 'dsr-detail-stats' }, [
    h(DStat, {
      key: 'ctx', icon: 'context', label: '上下文占用', value: contextLabel, note: contextDetail,
      children: h(Meter, { key: 'm', value: entry.contextPercent || 0, warn: (entry.contextPercent || 0) >= 85 }),
    }),
    h(DStat, {
      key: 'tokens', icon: 'token', label: '累计 token', value: formatTokens(entry.tokenTotal),
      note: entry.tokens ? ('入 ' + formatTokens(entry.tokens.uncachedInputTokens + entry.tokens.cacheReadTokens + entry.tokens.cacheWriteTokens) + ' · 出 ' + formatTokens(entry.tokens.outputTokens)) : '等待 provider 采样',
    }),
    h(DStat, {
      key: 'steps', icon: 'steps', label: '执行步数', value: String(steps),
      note: turns + ' 轮对话 · ' + String(entry.toolCount || 0) + ' 次工具',
    }),
    h(DStat, {
      key: 'rate', icon: 'spark', label: '吞吐', value: rate > 0 ? formatTokens(rate) : '—', unit: rate > 0 ? '/min' : '',
      note: rate > 0 ? '最近一轮的 token 速率' : '本轮结束后估算',
    }),
    h(DStat, {
      key: 'time', icon: 'clock', label: '本轮 / 总计', value: formatDuration(entry.turnTimeMs),
      note: '总计 ' + formatDuration(entry.totalTimeMs),
    }),
    h(DStat, {
      key: 'health', icon: healthIcon, label: '健康', value: healthValue, note: healthNote,
      children: entry.stalled === true || waiting
        ? h(Meter, { key: 'm', value: waiting && entry.waitingMs > 0 ? Math.min(100, entry.waitingMs / 6000) : 100, warn: true })
        : null,
    }),
  ]);
}

function CurrentState(props) {
  const entry = props.entry;
  const waiting = entry.status === 'approval' || entry.status === 'question';
  const tool = entry.currentTool;
  let icon;
  let label;
  let detail;
  if (waiting) {
    icon = h(Icon, { name: 'warning', size: 15 });
    label = entry.statusLabel;
    detail = entry.status === 'approval' ? '处理审批后任务会继续。' : '补充回答后任务会继续。';
  } else if (tool) {
    icon = h(ToolGlyph, { category: tool.category, size: 15 });
    label = tool.label;
    detail = tool.detail || tool.name;
  } else if (entry.running) {
    icon = h(Icon, { name: 'spark', size: 15 });
    label = entry.phaseLabel;
    detail = entry.currentTodo ? entry.currentTodo.content : (entry.reasoning || '正在推进本轮任务');
  } else {
    icon = h(Icon, { name: 'clock', size: 15 });
    label = entry.statusLabel;
    detail = entry.lastText || '还没有可展示的动作';
  }
  return h('div', { className: 'dsr-current' }, [
    h('div', { className: 'dsr-current__top', key: 'top' }, [
      h('span', { className: cx('dsr-current__icon', waiting && 'is-warn'), key: 'i' }, icon),
      h('span', { className: 'dsr-current__label', key: 'label' }, label),
      tool ? h('code', { className: 'dsr-badge', key: 'name' }, tool.name) : null,
      tool ? h('span', { className: 'dsr-live-elapsed', key: 'elapsed' }, formatDuration(tool.elapsedMs)) : null,
    ]),
    h('div', { className: 'dsr-current__detail', key: 'detail' }, detail),
    h('div', { className: 'dsr-current__meta', key: 'meta' }, [
      h('span', { key: 'pos' }, '回合 ' + (entry.turn || 0) + ' · 步骤 ' + (entry.step || 0)),
      entry.queueLength > 0 ? h('span', { key: 'queue' }, '队列 ' + entry.queueLength + ' 条') : null,
      entry.waitingMs > 0 ? h('span', { key: 'wait' }, '已等待 ' + formatDuration(entry.waitingMs)) : null,
      entry.stalled === true ? h('span', { key: 'stalled' }, '疑似卡住 ' + formatDuration(entry.stalledMs)) : null,
      entry.lastEventAt > 0 ? h('span', { key: 'event' }, formatRelative(entry.lastEventAt, Date.now())) : null,
    ]),
  ]);
}

function PlanSection(props) {
  const entry = props.entry;
  if (!Array.isArray(entry.todos) || entry.todos.length === 0) return null;
  return h('section', { className: 'dsr-detail__section' }, [
    h('div', { className: 'dsr-detail__section-head', key: 'head' }, [
      h('h3', { className: 'dsr-detail__section-title', key: 'title' }, '任务计划'),
      h('span', { className: 'dsr-detail__section-meta', key: 'meta' }, entry.progress ? entry.progress.done + ' / ' + entry.progress.total : ''),
    ]),
    h('div', { className: 'dsr-plan', key: 'plan' }, entry.todos.map(function (todo, index) {
      return h('div', { className: 'dsr-plan__item', key: index, 'data-status': todo.status }, [
        h('span', { className: 'dsr-plan__mark', key: 'mark' }, h(Icon, { name: todo.status === 'completed' ? 'check' : todo.status === 'in_progress' ? 'spark' : 'circle', size: 12 })),
        h('span', { className: 'dsr-plan__text', key: 'text' }, todo.content),
      ]);
    })),
  ]);
}

function DeliverablesSection(props) {
  const entry = props.entry;
  const all = Array.isArray(entry.deliverables) ? entry.deliverables : [];
  if (all.length === 0) return null;
  const covered = new Set();
  for (const turn of entry.turns || []) {
    for (const item of turn.deliverables || []) covered.add(item.path);
  }
  const items = all.filter(function (item) { return !covered.has(item.path); });
  if (items.length === 0) return null;
  return h('section', { className: 'dsr-detail__section' }, [
    h('div', { className: 'dsr-detail__section-head', key: 'head' }, [
      h('h3', { className: 'dsr-detail__section-title', key: 'title' }, [
        h(Icon, { name: 'artifact', size: 12, key: 'i' }),
        h('span', { key: 't' }, covered.size > 0 ? '更早的文件改动' : '文件改动'),
      ]),
      h('span', { className: 'dsr-detail__section-meta', key: 'meta' }, items.length + ' 个'),
    ]),
    h('div', { className: 'dsr-files', key: 'files' }, items.slice(0, 8).map(function (item, index) {
      return h('button', { type: 'button', className: 'dsr-file-row', key: index, onClick: function () { props.controller.previewFile(entry.id, item); } }, [
        h('span', { className: 'dsr-file-row__icon', key: 'i' }, h(Icon, { name: item.kind === 'presented' ? 'deliver' : 'artifact', size: 13 })),
        h('span', { className: 'dsr-file-row__name', key: 'n', title: item.path }, item.name || basename(item.path)),
        h('span', { className: 'dsr-file-row__meta', key: 'm' }, shortPath(item.path)),
      ]);
    })),
  ]);
}

function OutputSection(props) {
  const entry = props.entry;
  if (!entry.lastText) return null;
  return h('section', { className: 'dsr-detail__section' }, [
    h('div', { className: 'dsr-detail__section-head', key: 'head' }, [h('h3', { className: 'dsr-detail__section-title', key: 'title' }, '最近输出')]),
    h('p', { className: 'dsr-output', key: 'text' }, entry.lastText),
  ]);
}

const TURN_STATE_LABEL = { done: '已完成', running: '进行中', open: '已中断', error: '有失败' };

/** Short verb for a per-turn file record, shown on its change pill. */
const FILE_TOOL_LABEL = { write: '写入', edit: '编辑', apply_patch: '补丁', str_replace_editor: '编辑', present: '交付' };

function fileToolLabel(item) {
  if (item.kind === 'presented') return '交付';
  return FILE_TOOL_LABEL[item.tool] || '改动';
}

function FlowStrip(props) {
  const turns = props.turns;
  const weights = turns.map(function (turn) { return Math.max(Number(turn.durationMs) || 0, 700); });
  const max = weights.reduce(function (peak, value) { return Math.max(peak, value); }, 1);
  return h('div', { className: 'dsr-flow__strip', 'aria-hidden': 'true' }, turns.map(function (turn, index) {
    const share = 0.4 + 0.6 * (weights[index] / max);
    return h('span', {
      className: cx('dsr-flow__seg', 'is-' + turn.state),
      key: 'seg-' + index + '-' + turn.index,
      style: { flexGrow: String(Math.round(share * 100)) },
      title: '第 ' + turn.index + ' 轮 · ' + formatDuration(turn.durationMs),
    });
  }));
}

/** One file the round touched, kept as the smallest unit of "what changed". */
function TurnFilePill(props) {
  const item = props.item;
  const label = item.name || basename(item.path);
  const title = item.path + ' · ' + fileToolLabel(item) + (item.description ? ' · ' + item.description : '');
  const inner = [
    h(Icon, { name: item.kind === 'presented' ? 'deliver' : 'code', size: 11, key: 'icon' }),
    h('span', { className: 'dsr-file-pill__tool', key: 'tool' }, fileToolLabel(item)),
    h('span', { key: 'name' }, label),
  ];
  return props.onPreview
    ? h('button', { type: 'button', className: 'dsr-file-pill is-change', key: item.path, title: title, onClick: function () { props.onPreview(item); } }, inner)
    : h('span', { className: 'dsr-file-pill is-change', key: item.path, title: title }, inner);
}

/** One round as a scannable row: state, one-line digest of what it did, tokens. */
function TurnRow(props) {
  const turn = props.turn;
  const files = Array.isArray(turn.deliverables) ? turn.deliverables : [];
  const digest = turnDigest(turn);
  const expanded = props.expanded === true;
  const head = h('button', {
    type: 'button', className: 'dsr-turn__head', key: 'head',
    'aria-expanded': expanded,
    title: expanded ? '收起这一轮' : '展开这一轮：指令、AI 摘要、改动的文件',
    onClick: props.onToggle,
  }, [
    h('span', { className: 'dsr-turn__caret', key: 'caret', 'aria-hidden': 'true' }, h(Icon, { name: expanded ? 'chevron-down' : 'chevron-right', size: 11 })),
    h('span', { className: 'dsr-turn__title', key: 'title' }, '第 ' + turn.index + ' 轮'),
    h('span', { className: 'dsr-turn__state', key: 'state' }, TURN_STATE_LABEL[turn.state] || turn.state),
    h('span', { className: 'dsr-turn__time', key: 'time' }, formatDuration(turn.durationMs)),
  ]);
  const digestLine = h('p', { className: cx('dsr-turn__summary', digest.summary ? '' : 'is-empty'), key: 'summary' }, digest.summary || '这一轮没有工具操作');
  const chips = h('div', { className: 'dsr-turn__chips', key: 'chips' }, [
    turn.prompt ? h('span', { className: 'dsr-turn__ask', key: 'ask', title: turn.prompt }, turn.prompt) : null,
    h('span', { className: 'dsr-turn__spacer', key: 'spacer' }),
    files.length > 0 ? h('span', {
      className: 'dsr-turn__chip is-file', key: 'files',
      title: files.map(function (item) { return item.name || basename(item.path); }).join('\n'),
    }, [h(Icon, { name: 'code', size: 10, key: 'i' }), files.length + ' 文件']) : null,
    turn.tokens > 0 ? h('span', { className: 'dsr-turn__chip', key: 'tokens' }, [h(Icon, { name: 'token', size: 10, key: 'i' }), formatTokens(turn.tokens) + ' tok']) : null,
    turn.errors > 0 ? h('span', { className: 'dsr-turn__chip is-error', key: 'errors' }, [h(Icon, { name: 'warning', size: 10, key: 'i' }), turn.errors + ' 失败']) : null,
  ]);
  const panel = expanded ? h('div', { className: 'dsr-turn__panel', key: 'panel' }, [
    turn.prompt ? h('div', { className: 'dsr-turn__block', key: 'ask' }, [
      h('span', { className: 'dsr-turn__blocktitle', key: 'title' }, '用户指令'),
      h('p', { className: 'dsr-turn__text', key: 'text' }, turn.prompt),
    ]) : null,
    turn.text || turn.reasoning ? h('div', { className: 'dsr-turn__block', key: 'say' }, [
      h('span', { className: 'dsr-turn__blocktitle', key: 'title' }, '这一轮干了什么'),
      h('p', { className: 'dsr-turn__text', key: 'text' }, turn.text || turn.reasoning),
    ]) : null,
    files.length > 0 ? h('div', { className: 'dsr-turn__block', key: 'files' }, [
      h('span', { className: 'dsr-turn__blocktitle', key: 'title' }, '改动的文件 · ' + files.length + ' 个'),
      h('div', { className: 'dsr-turn__files', key: 'list' }, files.map(function (item) {
        return h(TurnFilePill, { key: item.path, item: item, onPreview: props.onPreview });
      })),
    ]) : null,
  ]) : null;
  return h('div', {
    className: 'dsr-turn',
    id: props.domId,
    'data-state': turn.state,
    'data-expanded': expanded ? 'true' : 'false',
    'data-turn': String(turn.index),
  }, [
    h('span', { className: 'dsr-turn__node', key: 'node', 'aria-hidden': 'true' }, turn.state === 'running' ? h(Icon, { name: 'pulse', size: 11 }) : String(turn.index)),
    h('div', { className: 'dsr-turn__body', key: 'body' }, [head, digestLine, chips, panel]),
  ]);
}

const TURN_TREE_DEFAULT_VISIBLE = 12;

/** Round rail: every round is one click away, so long sessions stay navigable. */
function TurnNav(props) {
  const turns = props.turns;
  const active = props.active;
  const position = turns.findIndex(function (turn) { return turn.index === active; });
  return h('div', { className: 'dsr-flow__nav', role: 'group', 'aria-label': '轮次跳转' }, [
    h('button', {
      type: 'button', className: 'dsr-flow__navbtn is-prev', key: 'prev', title: '上一轮', 'aria-label': '上一轮',
      disabled: position <= 0,
      onClick: function () { props.onJump(turns[Math.max(0, position - 1)].index); },
    }, h(Icon, { name: 'chevron-right', size: 11, className: 'dsr-flip' })),
    h('div', { className: 'dsr-flow__navlist', key: 'list' }, turns.map(function (turn) {
      return h('button', {
        type: 'button',
        key: 'nav-' + turn.index,
        className: cx('dsr-flow__navchip', 'is-' + turn.state, turn.index === active && 'is-current'),
        title: '第 ' + turn.index + ' 轮' + (TURN_STATE_LABEL[turn.state] ? ' · ' + TURN_STATE_LABEL[turn.state] : '') + ' · ' + formatDuration(turn.durationMs),
        onClick: function () { props.onJump(turn.index); },
      }, String(turn.index));
    })),
    h('button', {
      type: 'button', className: 'dsr-flow__navbtn', key: 'next', title: '下一轮', 'aria-label': '下一轮',
      disabled: position < 0 || position >= turns.length - 1,
      onClick: function () { props.onJump(turns[Math.min(turns.length - 1, position + 1)].index); },
    }, h(Icon, { name: 'chevron-right', size: 11 })),
  ]);
}

/**
 * The conversation tree: one row per round, summarised. Click a row to read the
 * instruction, what the agent said it did and which files it changed; click a
 * chip in the rail to jump straight to that round.
 */
function SessionFlow(props) {
  const entry = props.entry;
  const turns = Array.isArray(entry.turns) ? entry.turns : [];
  const entryId = entry.id;
  const domPrefix = 'dsr-turn-' + String(entryId).replace(/[^a-zA-Z0-9_-]/g, '') + '-';
  const lastIndex = turns.length > 0 ? turns[turns.length - 1].index : -1;
  const [openSet, setOpenSet] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(function () {
    setOpenSet(null);
    setShowAll(false);
    setActive(-1);
  }, [entryId]);
  if (turns.length === 0) return null;
  const visible = showAll ? turns : turns.slice(-TURN_TREE_DEFAULT_VISIBLE);
  const isOpen = function (index) { return openSet === null ? index === lastIndex : openSet.has(index); };
  const toggle = function (index) {
    const next = new Set(openSet === null ? [lastIndex] : openSet);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setOpenSet(next);
    setActive(index);
  };
  const jump = function (index) {
    const target = turns.filter(function (turn) { return turn.index === index; })[0];
    if (!target) return;
    const next = new Set(openSet === null ? [lastIndex] : openSet);
    next.add(index);
    setOpenSet(next);
    setShowAll(true);
    setActive(index);
    setTimeout(function () {
      const node = document.getElementById(domPrefix + index);
      if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 40);
  };
  const allOpen = visible.every(function (turn) { return isOpen(turn.index); });
  const expandAll = function () {
    setOpenSet(allOpen ? new Set() : new Set(visible.map(function (turn) { return turn.index; })));
  };
  const totalFiles = turns.reduce(function (sum, turn) { return sum + (Array.isArray(turn.deliverables) ? turn.deliverables.length : 0); }, 0);
  const current = active >= 0 ? active : lastIndex;
  return h('section', { className: 'dsr-detail__section dsr-flow-section' }, [
    h('div', { className: 'dsr-detail__section-head', key: 'head' }, [
      h('h3', { className: 'dsr-detail__section-title', key: 'title' }, [
        h(Icon, { name: 'flow', size: 12, key: 'i' }),
        h('span', { key: 't' }, '对话树'),
      ]),
      h('button', { type: 'button', className: 'dsr-flow__tool', key: 'all', onClick: expandAll }, allOpen ? '全部收起' : '全部展开'),
      h('span', { className: 'dsr-detail__section-meta', key: 'meta' }, turns.length + ' 轮 · ' + totalFiles + ' 个文件改动'),
    ]),
    h(TurnNav, { key: 'nav', turns: turns, active: current, onJump: jump }),
    h(FlowStrip, { key: 'strip', turns: visible }),
    h('div', { className: 'dsr-flow', key: 'flow' }, visible.map(function (turn) {
      return h(TurnRow, {
        key: 'turn-' + turn.index,
        turn: turn,
        domId: domPrefix + turn.index,
        expanded: isOpen(turn.index),
        onToggle: function () { toggle(turn.index); },
        onPreview: props.onPreview,
      });
    })),
    turns.length > visible.length ? h('button', { type: 'button', className: 'dsr-flow__more', key: 'more', onClick: function () { setShowAll(true); } }, '展开更早的 ' + (turns.length - visible.length) + ' 轮对话') : null,
    showAll && turns.length > TURN_TREE_DEFAULT_VISIBLE ? h('button', { type: 'button', className: 'dsr-flow__more', key: 'less', onClick: function () { setShowAll(false); } }, '只看最近 ' + TURN_TREE_DEFAULT_VISIBLE + ' 轮') : null,
  ]);
}

/**
 * Parent/child branches of this session: a subagent run is a branch of the
 * session that spawned it. One row per branch, with open and pin actions.
 */
function BranchSection(props) {
  const entry = props.entry;
  const entries = Array.isArray(props.entries) ? props.entries : [];
  const branches = sessionBranches(entries, entry.id);
  if (!branches.parent && branches.children.length === 0) return null;
  const row = function (target, role) {
    return h('div', { className: 'dsr-branch', key: role + '-' + target.id, 'data-state': target.status }, [
      h('button', {
        type: 'button', className: 'dsr-branch__open', key: 'open',
        title: '查看 ' + target.title,
        onClick: function () { if (props.onSelect) props.onSelect(target.id); },
      }, [
        h(Icon, { name: role === 'parent' ? 'arrow-left' : 'branch', size: 11, key: 'i' }),
        h('span', { className: 'dsr-branch__role', key: 'role' }, role === 'parent' ? '父会话' : '分支'),
        h('span', { className: 'dsr-branch__title', key: 'title' }, target.title),
        h('span', { className: 'dsr-branch__meta', key: 'meta' }, (target.statusLabel || '') + (target.turn > 0 ? ' · ' + target.turn + ' 轮' : '')),
      ]),
      h('button', {
        type: 'button', className: cx('dsr-branch__pin', target.pinned && 'is-active'), key: 'pin',
        title: target.pinned ? '取消固定' : '固定到快捷栏', 'aria-label': target.pinned ? '取消固定' : '固定到快捷栏',
        onClick: function () { props.controller.togglePin(target.id); },
      }, h(Icon, { name: target.pinned ? 'pin-filled' : 'pin', size: 11 })),
    ]);
  };
  const rows = [];
  if (branches.parent) rows.push(row(branches.parent, 'parent'));
  for (const child of branches.children) rows.push(row(child, 'child'));
  return h('section', { className: 'dsr-detail__section', key: 'branches' }, [
    h('div', { className: 'dsr-detail__section-head', key: 'head' }, [
      h('h3', { className: 'dsr-detail__section-title', key: 'title' }, [
        h(Icon, { name: 'branch', size: 12, key: 'i' }),
        h('span', { key: 't' }, '分支关系'),
      ]),
      h('span', { className: 'dsr-detail__section-meta', key: 'meta' }, branches.children.length > 0 ? branches.children.length + ' 个分支' : '所属父会话'),
    ]),
    h('div', { className: 'dsr-branches', key: 'rows' }, rows),
  ]);
}

function DetailPanel(props) {
  const entry = props.entry;
  const controller = props.controller;
  const now = props.now;
  const [confirmStop, setConfirmStop] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(entry ? entry.title : '');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [full, setFull] = useState(false);
  const [feedback, setFeedback] = useState('');
  useEffect(function () {
    setConfirmStop(false);
    setRenaming(false);
    setDraft(entry ? entry.title : '');
    setFeedback('');
    setCopied(false);
    setReportCopied(false);
    setFull(false);
  }, [entry && entry.id]);
  useEffect(function () {
    if (!full) return;
    const onKey = function (event) {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      setFull(false);
    };
    window.addEventListener('keydown', onKey, true);
    return function () { window.removeEventListener('keydown', onKey, true); };
  }, [full]);
  if (!entry) return h('div', { className: 'dsr-empty' }, '选择一个会话');
  const copyId = async function () {
    try {
      await navigator.clipboard.writeText(entry.id);
      setCopied(true);
      setTimeout(function () { setCopied(false); }, 1800);
    } catch (error) {
      setFeedback('无法写入剪贴板');
    }
  };
  const copyReport = async function () {
    try {
      const markdown = sessionReportMarkdown(entry, { now: Date.now() });
      await navigator.clipboard.writeText(markdown);
      setReportCopied(true);
      setTimeout(function () { setReportCopied(false); }, 2200);
    } catch (error) {
      setFeedback('无法写入剪贴板');
    }
  };
  const stop = async function () {
    if (!confirmStop) { setConfirmStop(true); return; }
    setBusy(true);
    setFeedback('');
    try { await controller.stop(entry.id); setConfirmStop(false); }
    catch (error) { setFeedback(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  const saveRename = async function () {
    setBusy(true);
    setFeedback('');
    try { await controller.rename(entry.id, draft); setRenaming(false); }
    catch (error) { setFeedback(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return h(Fragment, null, [
    full ? h('div', { className: 'dsr-detail__scrim', key: 'scrim', onClick: function () { setFull(false); } }) : null,
  h('div', { className: cx('dsr-detail', props.variant === 'page' && 'dsr-detail--page', full && 'is-fullscreen') }, [
    h('header', { className: 'dsr-detail__head', key: 'head' }, [
      props.onBack ? h(IconButton, { key: 'back', name: 'arrow-left', label: '返回列表', onClick: props.onBack }) : null,
      h('div', { className: 'dsr-detail__headcopy', key: 'copy' }, [
        h('h2', { className: 'dsr-detail__title', key: 'title', title: entry.title }, entry.title),
        h('div', { className: 'dsr-detail__sub', key: 'sub' }, [entry.statusLabel, ' · ', entry.workspace || '未分组', entry.model ? ' · ' + entry.model : '']),
      ]),
      h('div', { className: 'dsr-header-actions', key: 'actions' }, [
        h(IconButton, { key: 'full', name: full ? 'compress' : 'expand', label: full ? '退出全屏' : '全屏查看会话详情', active: full, onClick: function () { setFull(!full); } }),
        h(IconButton, { key: 'pin', name: entry.pinned ? 'pin-filled' : 'pin', label: entry.pinned ? '取消固定' : '固定到快捷栏', active: entry.pinned, onClick: function () { controller.togglePin(entry.id); } }),
        h(IconButton, { key: 'open', name: 'arrow-right', label: '进入会话', onClick: function () { controller.openSession(entry.id); } }),
      ]),
    ]),
    h('div', { className: 'dsr-detail__body', key: 'body' }, [
      feedback ? h('div', { className: 'dsr-banner is-error', key: 'feedback' }, [h(Icon, { name: 'warning', size: 13 }), h('span', null, feedback)]) : null,
      h('section', { className: 'dsr-detail__section', key: 'stats' }, [
        h('div', { className: 'dsr-detail__section-head', key: 'head' }, [h('h3', { className: 'dsr-detail__section-title', key: 'title' }, '实时指标'), h('span', { className: 'dsr-detail__section-meta', key: 'meta' }, entry.presetLabel)]),
        h(DetailStats, { key: 'stats', entry: entry }),
      ]),
      h('section', { className: 'dsr-detail__section', key: 'current' }, [
        h('div', { className: 'dsr-detail__section-head', key: 'head' }, [h('h3', { className: 'dsr-detail__section-title', key: 'title' }, '当前状态'), h('span', { className: 'dsr-detail__section-meta', key: 'meta' }, entry.lastEventAt ? formatRelative(entry.lastEventAt, now) : '')]),
        h(CurrentState, { key: 'current', entry: entry }),
      ]),
      h(SessionFlow, { key: 'flow', entry: entry, onPreview: function (item) { controller.previewFile(entry.id, item); } }),
      h(PlanSection, { key: 'plan', entry: entry }),
      h(BranchSection, { key: 'branches', entry: entry, entries: props.entries, onSelect: props.onSelect, controller: controller }),
      h(DeliverablesSection, { key: 'files', entry: entry, controller: controller }),
      h(OutputSection, { key: 'output', entry: entry }),
    ]),
    renaming ? h('div', { className: 'dsr-detail__actions', key: 'rename' }, [
      h('div', { className: 'dsr-inline-form', key: 'form' }, [
        h('input', { key: 'input', value: draft, onChange: function (event) { setDraft(event.target.value); }, onKeyDown: function (event) { if (event.key === 'Enter') saveRename(); if (event.key === 'Escape') setRenaming(false); }, 'aria-label': '会话名称', autoFocus: true }),
        h('button', { type: 'button', className: 'dsr-button dsr-button--primary', key: 'save', onClick: saveRename, disabled: busy }, '保存'),
        h('button', { type: 'button', className: 'dsr-button', key: 'cancel', onClick: function () { setRenaming(false); } }, '取消'),
      ]),
    ]) : h('div', { className: 'dsr-detail__actions', key: 'actions' }, [
      h('button', { type: 'button', className: 'dsr-button', key: 'rename', onClick: function () { setRenaming(true); } }, '重命名'),
      h('button', { type: 'button', className: 'dsr-button', key: 'copy', onClick: copyId }, copied ? '已复制' : '复制 ID'),
      h('button', { type: 'button', className: 'dsr-button', key: 'report', onClick: copyReport, title: '把对话树导出成 Markdown 并复制：每轮的指令、回复、工具链和文件改动' }, reportCopied ? '已复制报告' : '复制报告'),
      h('span', { className: 'dsr-detail__spacer', key: 'spacer' }),
      entry.running || entry.status === 'tool' ? h('button', { type: 'button', className: 'dsr-button dsr-button--danger', key: 'stop', onClick: stop, disabled: busy }, confirmStop ? '确认停止' : '停止任务') : null,
    ]),
  ])
  ]);
}

function SignalTiles(props) {
  const entry = props.entry;
  const steps = Number(entry.stats && entry.stats.steps) || entry.step || 0;
  const cells = [
    { key: 'turn', icon: 'turn', label: '轮次', value: entry.turn > 0 ? String(entry.turn) : '—', title: '已记录的对话轮次' },
    { key: 'steps', icon: 'steps', label: '步数', value: steps > 0 ? String(steps) : '—', title: '累计执行步数' },
    { key: 'tools', icon: 'tool', label: '工具', value: String(entry.toolCount || 0), title: '本会话工具调用次数' },
    { key: 'files', icon: 'artifact', label: '产物', value: String(entry.deliverableCount || 0), title: '捕获到的交付物与文件改动' },
  ];
  return h('div', { className: 'dsr-signals', role: 'group', 'aria-label': '会话信号' }, cells.map(function (cell) {
    return h('span', { className: 'dsr-signals__cell', key: cell.key, title: cell.title }, [
      h('span', { className: 'dsr-signals__label', key: 'l' }, [
        h(Icon, { name: cell.icon, size: 11, key: 'i' }),
        h('span', { key: 't' }, cell.label),
      ]),
      h('span', { className: 'dsr-signals__value', key: 'v' }, cell.value),
    ]);
  }));
}

function CostStrip(props) {
  const entry = props.entry;
  const items = [];
  if (entry.tokenTotal > 0) {
    items.push(h('span', { className: 'dsr-cost__item', key: 'tok', title: '本会话累计 token（含缓存）' }, [
      h(Icon, { name: 'token', size: 12, key: 'i' }),
      h('strong', { key: 'v' }, formatTokens(entry.tokenTotal)),
      h('span', { className: 'dsr-cost__unit', key: 'u' }, 'tok'),
    ]));
  }
  if (entry.contextPercent !== null && entry.contextPercent !== undefined) {
    items.push(h('span', { className: 'dsr-cost__item', key: 'ctx', title: '当前上下文占用' }, [
      h(Icon, { name: 'context', size: 12, key: 'i' }),
      h('span', { className: 'dsr-cost__label', key: 'l' }, 'ctx'),
      h('strong', { key: 'v' }, entry.contextPercent + '%'),
      h('span', { className: cx('dsr-cost__bar', entry.contextPercent >= 85 && 'is-warn'), key: 'b' }, h('i', { style: { width: Math.max(4, entry.contextPercent) + '%' } })),
    ]));
  }
  if (entry.tokensPerMinute > 0) {
    items.push(h('span', { className: 'dsr-cost__item', key: 'rate', title: '最近一轮的 token 吞吐（token / 分钟）' }, [
      h(Icon, { name: 'spark', size: 12, key: 'i' }),
      h('span', { className: 'dsr-cost__label', key: 'l' }, '速率'),
      h('strong', { key: 'v' }, formatRate(entry.tokensPerMinute)),
    ]));
  }
  items.push(h('span', { className: 'dsr-cost__item', key: 'time', title: '本轮 / 累计模型与工具运行时长' }, [
    h(Icon, { name: 'clock', size: 12, key: 'i' }),
    h('span', { className: 'dsr-cost__label', key: 'l' }, '本轮'),
    h('strong', { key: 'v' }, entry.turnTimeMs > 0 ? formatDuration(entry.turnTimeMs) : '—'),
    h('span', { className: 'dsr-cost__sep', key: 's' }, '·'),
    h('span', { className: 'dsr-cost__label', key: 'l2' }, '总'),
    h('strong', { key: 'v2' }, entry.totalTimeMs > 0 ? formatDuration(entry.totalTimeMs) : '—'),
  ]));
  return h('div', { className: 'dsr-cost' }, items);
}

function DeliveryChip(props) {
  const entry = props.entry;
  const count = entry.deliverableCount || 0;
  let state = entry.deliveryState;
  if (state === undefined || state === null || state === '') {
    const items = Array.isArray(entry.deliverables) ? entry.deliverables : [];
    state = items.some(function (item) { return item.kind === 'presented'; }) ? 'delivered' : items.length > 0 ? 'changed' : 'none';
  }
  if (state === 'none' || count === 0) return null;
  const label = state === 'delivered' ? '交付 ' + count : '改动 ' + count;
  return h('span', { className: cx('dsr-delivery', 'is-' + state), title: state === 'delivered' ? '已通过 present 交付 ' + count + ' 个产物' : state === 'changed' ? '写入了 ' + count + ' 个文件，但没有 present 交付' : '还没有捕获到交付物' }, [
    h(Icon, { name: state === 'delivered' ? 'deliver' : 'artifact', size: 12, key: 'i' }),
    h('span', { key: 't' }, label),
  ]);
}

function SessionCard(props) {
  const entry = props.entry;
  const live = liveLine(entry);
  const meta = sessionSubline(entry, props.now);
  return h('article', {
    className: cx('dsr-card', props.compact && 'is-compact', entry.running && 'is-live', props.selected && 'is-selected', entry.unread && 'is-review', entry.stalled && 'is-stalled'),
    'data-tone': entry.status,
    'data-stalled': entry.stalled === true ? 'true' : undefined,
    'data-session-id': entry.id,
    'aria-current': props.selected ? 'true' : undefined,
    onClick: function (event) {
      const target = event.target;
      if (target && target.closest && target.closest('button')) return;
      props.onSelect(entry.id);
    },
  }, [
    entry.unread ? h(ReviewDot, { key: 'review' }) : null,
    h('div', { className: 'dsr-card__head', key: 'head' }, [
      h('div', { className: 'dsr-card__statusline', key: 'status' }, [
        h('span', { className: 'dsr-card__status', key: 'label' }, [
          h('span', { className: 'dsr-dot', key: 'dot', 'aria-hidden': 'true' }),
          h('span', { className: 'dsr-card__status-text', key: 'text' }, entry.statusLabel),
        ]),
        badgeForStatus(entry),
      ]),
      h('div', { className: 'dsr-card__headactions', key: 'actions' }, [
        props.onPin ? h(IconButton, { key: 'pin', name: entry.pinned ? 'pin-filled' : 'pin', label: entry.pinned ? '取消固定' : '固定到快捷栏', active: entry.pinned, onClick: function () { props.onPin(entry.id); } }) : null,
      ]),
    ]),
    h('button', {
      type: 'button',
      className: 'dsr-card__main',
      key: 'main',
      onClick: function () { props.onSelect(entry.id); },
      'aria-label': '查看 ' + entry.title + (entry.unread ? '（最近完成，尚未验收）' : '') + ' 的实时详情',
    }, [
      h('span', { className: 'dsr-card__title', key: 'title', role: 'heading', 'aria-level': 3, title: entry.title }, entry.title),
      h('p', { className: 'dsr-card__meta', key: 'meta' }, meta.map(function (part, index) {
        return [
          index > 0 ? h('span', { className: 'sep', key: 's' + index, 'aria-hidden': 'true' }, '·') : null,
          h('span', { key: 'm' + index, title: part }, part),
        ];
      })),
      h('div', { className: 'dsr-card__live', key: 'live' }, [
        live.icon,
        h('span', { className: 'dsr-card__live-label', key: 'label' }, live.label),
        h('span', { className: 'dsr-card__live-detail', key: 'detail' }, live.detail),
        live.elapsed ? h('span', { className: 'dsr-card__live-time', key: 'time' }, live.elapsed) : null,
      ]),
      entry.progress || entry.running ? h('div', { className: 'dsr-card__progress', key: 'progress' }, [
        h(Progress, { key: 'bar', value: entry.progress ? entry.progress.percent : 0, busy: entry.running && !entry.progress }),
        entry.currentTodo ? h('span', { className: 'dsr-card__todo', key: 'todo', title: entry.currentTodo.content }, entry.currentTodo.content) : null,
      ]) : null,
      h(SignalTiles, { key: 'signals', entry: entry }),
      h(CostStrip, { key: 'cost', entry: entry }),
    ]),
    h('div', { className: 'dsr-card__footer', key: 'footer' }, [
      h(DeliveryChip, { key: 'delivery', entry: entry }),
      h('span', { className: 'dsr-card__spacer', key: 'spacer' }),
      props.onOpen ? h('button', { type: 'button', className: 'dsr-card__enter', key: 'open', onClick: function () { props.onOpen(entry.id); }, title: '进入会话' }, ['进入', h(Icon, { name: 'arrow-right', size: 13 })]) : null,
    ]),
  ]);
}

const SORT_OPTIONS = [
  { value: 'recent', label: '最近活动' },
  { value: 'longest', label: '最耗时' },
  { value: 'tokens', label: 'token 最多' },
];

const SORT_HINTS = {
  recent: '按最近活动排序，点击卡片查看细节',
  longest: '本轮耗时最长的会话排在最前',
  tokens: '累计 token 最多的会话排在最前',
};

/** Sort switch for the recent board: recency, longest turn, or heaviest usage. */
function SortSelect(props) {
  return h('label', { className: 'dsr-sort', title: '切换最近会话的排序方式' }, [
    h(Icon, { name: 'sort', size: 12, key: 'i' }),
    h('select', {
      className: 'dsr-sort__select',
      value: props.value,
      'aria-label': '会话排序方式',
      onChange: function (event) { if (props.onChange) props.onChange(event.currentTarget.value); },
    }, SORT_OPTIONS.map(function (option) { return h('option', { value: option.value, key: option.value }, option.label); })),
    h(Icon, { name: 'chevron-down', size: 11, key: 'chevron' }),
  ]);
}

function FilterSelect(props) {
  const values = props.options.map(function (option) { return option.value; });
  const value = values.indexOf(props.value) >= 0 ? props.value : props.options[0] && props.options[0].value;
  const isSet = value !== (props.defaultValue || 'all');
  return h('label', { className: cx('dsr-filter', isSet && 'is-set'), title: props.title }, [
    h(Icon, { name: props.icon, size: 12, key: 'i' }),
    h('span', { className: 'dsr-filter__label', key: 'l' }, props.label),
    h('span', { className: 'dsr-filter__control', key: 'c' }, [
      h('select', {
        className: 'dsr-filter__select',
        value: value,
        'aria-label': props.title || props.label,
        onChange: function (event) { props.onChange(event.currentTarget.value); },
      }, props.options.map(function (option) {
        return h('option', { value: option.value, key: option.value }, option.count === undefined ? option.label : option.label + '（' + option.count + '）');
      })),
      h(Icon, { name: 'chevron-down', size: 11, key: 'chevron' }),
    ]),
  ]);
}

function FilterBar(props) {
  const filters = props.filters || {};
  const options = filterOptions(props.entries, props.now);
  const defaultRange = props.defaultRange || '7d';
  const active = Boolean((filters.range && filters.range !== defaultRange) || (filters.workspace && filters.workspace !== 'all') || (filters.model && filters.model !== 'all') || (filters.status && filters.status !== 'all'));
  return h('div', { className: cx('dsr-filterbar', active && 'is-active'), role: 'group', 'aria-label': '会话筛选' }, [
    h('span', { className: 'dsr-filterbar__lead', key: 'lead' }, [h(Icon, { name: 'filter', size: 13, key: 'i' }), h('span', { key: 't' }, '筛选')]),
    h(FilterSelect, {
      key: 'status', icon: 'pulse', label: '状态', title: '按运行状态筛选：运行中、等你处理、疑似卡住、已完成、空闲',
      value: filters.status || 'all', options: options.statuses || STATUS_FILTERS, defaultValue: 'all',
      onChange: function (value) { props.onChange('status', value); },
    }),
    h(FilterSelect, {
      key: 'range', icon: 'clock', label: '时间', title: '按最近活动时间筛选',
      value: filters.range || defaultRange, options: TIME_FILTERS, defaultValue: defaultRange,
      onChange: function (value) { props.onChange('range', value); },
    }),
    h(FilterSelect, {
      key: 'workspace', icon: 'folder', label: '工作区', title: '按工作区筛选',
      value: filters.workspace || 'all', options: [{ value: 'all', label: '全部工作区' }].concat(options.workspaces),
      onChange: function (value) { props.onChange('workspace', value); },
    }),
    h(FilterSelect, {
      key: 'model', icon: 'model', label: '模型', title: '按会话使用的模型筛选',
      value: filters.model || 'all', options: [{ value: 'all', label: '全部模型' }].concat(options.models),
      onChange: function (value) { props.onChange('model', value); },
    }),
    active ? h('button', { type: 'button', className: 'dsr-filterbar__clear', key: 'clear', onClick: props.onClear }, [h(Icon, { name: 'close', size: 11, key: 'i' }), h('span', { key: 't' }, '清除筛选')]) : null,
    h('span', { className: 'dsr-filterbar__count', key: 'count' }, props.shown + ' / ' + props.total + ' 个会话'),
  ]);
}

function PageLiveView(props) {
  const state = props.state;
  const filters = state.ui.filters || {};
  const defaultRange = props.defaultRange || '7d';
  const tracked = sortEntries(props.entries.filter(function (entry) { return entry.pinned; }), 'live');
  const trackedIds = new Set(tracked.map(function (entry) { return entry.id; }));
  const active = props.active.filter(function (entry) { return !trackedIds.has(entry.id); });
  const recent = props.recent.filter(function (entry) { return !trackedIds.has(entry.id); });
  if (state.entries.length === 0 && state.phase !== 'ready') return null;
  if (state.entries.length === 0) {
    return h('div', { className: 'dsr-page__view dsr-board' }, h(EmptyRadar, { onNew: props.onNew, title: '雷达安静', text: '没有可见的会话。新建一个会话，或确认当前工作区已经有对话记录。' }));
  }
  const liveIds = new Set(active.map(function (entry) { return entry.id; }));
  const tail = recent.filter(function (entry) { return !liveIds.has(entry.id); }).slice(0, 24);
  const bar = h(FilterBar, {
    key: 'filters', entries: state.entries, filters: filters, defaultRange: defaultRange, now: props.now,
    shown: props.entries.length, total: state.entries.length,
    onChange: props.onFilter, onClear: props.onClearFilters,
  });
  if (props.entries.length === 0) {
    const hasFilters = Boolean((filters.range && filters.range !== defaultRange) || (filters.workspace && filters.workspace !== 'all') || (filters.model && filters.model !== 'all') || (filters.status && filters.status !== 'all'));
    const query = String(state.ui.query || '').trim();
    const copy = hasFilters ? '没有符合当前筛选条件的会话。' : query ? '没有找到匹配「' + query + '」的会话。' : '没有可见的会话。';
    return h('div', { className: 'dsr-page__view dsr-board' }, [bar, h('div', { className: 'dsr-board__quiet', key: 'empty' }, [h(Icon, { name: hasFilters ? 'filter' : 'search', size: 19, key: 'i' }), h('span', { key: 'copy' }, copy)])]);
  }
  return h('div', { className: 'dsr-page__view dsr-board' }, [
    bar,
    tracked.length > 0 ? h('section', { className: 'dsr-board__section dsr-board__section--tracked', key: 'tracked' }, [
      h(BoardHead, {
        key: 'head', icon: 'pin', title: '正在跟踪的会话', sub: '关注的会话集中在这一栏；取消关注后会回到进行中或最近会话',
        children: h('span', { className: 'dsr-board__count', key: 'count' }, tracked.length + ' 个'),
      }),
      h('div', { className: 'dsr-card-grid dsr-card-grid--tracked', key: 'grid' }, tracked.map(function (entry) {
        return h(SessionCard, { key: entry.id, entry: entry, now: props.now, compact: state.prefs.compact, selected: props.selectedId === entry.id, onSelect: props.onSelect, onOpen: props.onOpen, onPin: props.onPin });
      })),
    ]) : null,
    h('section', { className: 'dsr-board__section dsr-board__section--active', key: 'active' }, [
      h(BoardHead, {
        key: 'head', icon: 'pulse', title: '进行中', sub: '正在执行的任务与当前的信号',
        children: [
          h('span', { className: 'dsr-board__count', key: 'count' }, active.length + ' 个'),
          h('button', { type: 'button', className: 'dsr-button', key: 'new', onClick: props.onNew }, h(Icon, { name: 'plus', size: 13 }), '新会话'),
        ],
      }),
      active.length === 0
        ? h('div', { className: 'dsr-board__quiet', key: 'empty' }, [h(RadarGlyph, { key: 'glyph', size: 19 }), h('span', { key: 'copy' }, '当前没有运行中的任务，最近的记录在下方。')])
        : h('div', { className: 'dsr-card-grid dsr-card-grid--live', key: 'grid' }, active.map(function (entry) {
          return h(SessionCard, { key: entry.id, entry: entry, now: props.now, compact: state.prefs.compact, selected: props.selectedId === entry.id, onSelect: props.onSelect, onOpen: props.onOpen, onPin: props.onPin });
        })),
    ]),
    h('section', { className: 'dsr-board__section dsr-board__section--recent', key: 'recent' }, [
      h(BoardHead, {
        key: 'head', icon: 'session', title: '最近会话', sub: SORT_HINTS[props.sort] || SORT_HINTS.recent,
        children: [
          h(SortSelect, { key: 'sort', value: props.sort || 'recent', onChange: props.onSort }),
          h('span', { className: 'dsr-board__count', key: 'count' }, recent.length + ' 个'),
        ],
      }),
      tail.length === 0
        ? h('div', { className: 'dsr-board__quiet', key: 'empty' }, h('span', { key: 'copy' }, '还没有最近会话。'))
        : h('div', { className: 'dsr-card-grid', key: 'grid' }, tail.map(function (entry) {
          return h(SessionCard, { key: entry.id, entry: entry, now: props.now, compact: state.prefs.compact, selected: props.selectedId === entry.id, onSelect: props.onSelect, onOpen: props.onOpen, onPin: props.onPin });
        })),
    ]),
    h('div', { className: 'dsr-board__foot', key: 'foot' }, '数据来自 Session Controller · token / 上下文来自投影 · 本轮与总计按事件及 sessionStats 计算'),
  ]);
}

function WorkspaceCard(props) {
  const workspace = props.workspace;
  const sessions = workspace.sessions || [];
  return h('button', {
    type: 'button',
    className: cx('dsr-workspace-card', props.selected && 'is-selected'),
    onClick: function () { props.onSelect(workspace.id); },
    'aria-pressed': props.selected,
  }, [
    h('span', { className: 'dsr-workspace-card__head', key: 'head' }, [
      h('span', { className: 'dsr-workspace-card__icon', key: 'icon' }, h(Icon, { name: 'folder', size: 16 })),
      h('span', { className: 'dsr-workspace-card__title', key: 'title' }, workspace.title),
      h('span', { className: 'dsr-workspace-card__arrow', key: 'arrow' }, h(Icon, { name: 'chevron-right', size: 14 })),
    ]),
    h('span', { className: 'dsr-workspace-card__path', key: 'path', title: workspace.path }, shortPath(workspace.path) || '未绑定路径'),
    h('span', { className: 'dsr-workspace-card__meters', key: 'meters' }, [
      h('span', { key: 'active', title: '运行中 / 等待中' }, h('i', { className: cx('dsr-dot', workspace.activeCount > 0 && 'is-on') }), workspace.activeCount > 0 ? workspace.activeCount + ' 运行中' : '空闲'),
      h('span', { key: 'total' }, workspace.count + ' 会话'),
      workspace.archivedCount > 0 ? h('span', { key: 'archived' }, workspace.archivedCount + ' 归档') : null,
    ]),
    h('span', { className: 'dsr-workspace-card__dots', key: 'dots', 'aria-hidden': 'true' }, sessions.slice(0, 9).map(function (entry, index) {
      return h('i', { key: entry.id + index, 'data-tone': entry.status });
    })),
    h('span', { className: 'dsr-workspace-card__foot', key: 'foot' }, [
      h('span', { key: 'last', title: workspace.updatedAt ? new Date(workspace.updatedAt).toLocaleString('zh-CN') : '' }, workspace.updatedAt ? formatRelative(workspace.updatedAt, props.now) : '还没有会话'),
      h('span', { key: 'open' }, '查看历史'),
    ]),
  ]);
}

function HistorySessionCard(props) {
  const entry = props.entry;
  const live = liveLine(entry);
  return h('article', { className: cx('dsr-history-card', props.checked && 'is-checked'), 'data-tone': entry.status }, [
    h('button', {
      type: 'button',
      className: cx('dsr-check', props.checked && 'is-checked'),
      role: 'checkbox',
      'aria-checked': props.checked,
      'aria-label': (props.checked ? '取消选择 ' : '选择 ') + entry.title,
      onClick: function () { props.onToggle(entry.id); },
      key: 'check',
    }, props.checked ? h(Icon, { name: 'check', size: 12 }) : null),
    h('button', {
      type: 'button',
      className: 'dsr-history-card__main',
      onClick: function () { props.onSelect(entry.id); },
      key: 'main',
    }, [
      h('span', { className: 'dsr-history-card__title', key: 'title', title: entry.title }, [
        entry.unread ? h(ReviewDot, { key: 'review', inline: true }) : null,
        h('span', { key: 'text' }, entry.title),
      ]),
      h('span', { className: 'dsr-history-card__meta', key: 'meta' }, [entry.workspace || '未分组', entry.model || '', entry.updatedAt ? formatRelative(entry.updatedAt, props.now) : ''].filter(Boolean).join(' · ')),
      h('span', { className: 'dsr-history-card__live', key: 'live' }, [live.icon, h('span', { key: 'l' }, live.label), h('span', { key: 'd' }, live.detail)]),
      h('span', { className: 'dsr-history-card__times', key: 'times' }, [
        h('span', { key: 'turn' }, '本轮 ', h('strong', null, entry.turnTimeMs > 0 ? formatDuration(entry.turnTimeMs) : '—')),
        h('span', { key: 'total' }, '总计 ', h('strong', null, entry.totalTimeMs > 0 ? formatDuration(entry.totalTimeMs) : '—')),
        h('span', { key: 'tokens' }, entry.tokenTotal > 0 ? formatTokens(entry.tokenTotal) + ' tok' : ''),
      ]),
    ]),
    props.onOpen ? h(IconButton, { key: 'open', name: 'arrow-right', label: '进入会话', onClick: function () { props.onOpen(entry.id); } }) : null,
    props.onDelete ? h(IconButton, { key: 'delete', name: 'trash', label: '永久删除会话', className: 'is-danger', onClick: function () { props.onDelete(entry.id); } }) : null,
  ]);
}

function BulkBar(props) {
  if (props.count === 0 && !props.confirm && !props.message && !props.error) return null;
  return h('div', { className: cx('dsr-bulkbar', props.danger && 'is-danger') }, [
    props.confirm ? h('div', { className: 'dsr-bulkbar__confirm', key: 'confirm' }, [
      h('strong', { key: 'title' }, '包含运行中的会话'),
      h('span', { key: 'text' }, '归档会停止当前执行。确定继续？'),
      h('div', { className: 'dsr-bulkbar__actions', key: 'actions' }, [
        h('button', { type: 'button', className: 'dsr-button dsr-button--danger', key: 'yes', onClick: props.onConfirm, disabled: props.busy }, props.busy ? '处理中…' : '停止并归档'),
        h('button', { type: 'button', className: 'dsr-button', key: 'no', onClick: props.onCancel, disabled: props.busy }, '取消'),
      ]),
    ]) : [
      h('span', { className: 'dsr-bulkbar__count', key: 'count' }, '已选 ' + props.count + ' 个会话'),
      props.message ? h('span', { className: 'dsr-bulkbar__message', key: 'message' }, props.message) : null,
      props.error ? h('span', { className: 'dsr-bulkbar__error', key: 'error', title: props.error }, props.error) : null,
      h('span', { className: 'dsr-bulkbar__spacer', key: 'spacer' }),
      h('div', { className: 'dsr-bulkbar__actions', key: 'actions' }, [
        h('button', { type: 'button', className: 'dsr-button', key: 'clear', onClick: props.onClear, disabled: props.busy }, '清空选择'),
        h('button', { type: 'button', className: cx('dsr-button', props.danger ? 'dsr-button--danger' : 'dsr-button--primary'), key: 'go', onClick: props.onAction, disabled: props.busy }, props.busy ? '处理中…' : (props.action === 'archive' ? '归档所选' : '恢复所选')),
      ]),
    ],
  ]);
}

function ConfirmDialog(props) {
  useEffect(function () {
    const onKey = function (event) { if (event.key === 'Escape') props.onCancel(); };
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('keydown', onKey); };
  }, [props.onCancel]);
  const titles = Array.isArray(props.titles) ? props.titles.filter(Boolean).slice(0, 3) : [];
  return h('div', {
    className: 'dsr-modal__scrim', role: 'presentation',
    onClick: function (event) { if (event.target === event.currentTarget) props.onCancel(); },
  }, h('div', { className: 'dsr-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': props.title || '确认操作' }, [
    h('div', { className: 'dsr-modal__head', key: 'head' }, [
      h('span', { className: 'dsr-modal__icon', key: 'icon' }, h(Icon, { name: props.icon || 'warning', size: 17 })),
      h('h3', { className: 'dsr-modal__title', key: 'title' }, props.title || '确认操作'),
    ]),
    h('p', { className: 'dsr-modal__text', key: 'text' }, props.text || ''),
    titles.length > 0 ? h('div', { className: 'dsr-modal__list', key: 'list' }, titles.map(function (title, index) {
      return h('span', { key: index, className: 'dsr-modal__item' }, title);
    })) : null,
    props.count > 3 ? h('p', { className: 'dsr-modal__more', key: 'more' }, '以及另外 ' + (props.count - 3) + ' 个会话') : null,
    h('div', { className: 'dsr-modal__actions', key: 'actions' }, [
      h('button', { type: 'button', className: 'dsr-button', key: 'cancel', onClick: props.onCancel, autoFocus: true }, props.cancelLabel || '取消'),
      h('button', { type: 'button', className: 'dsr-button dsr-button--danger', key: 'confirm', onClick: props.onConfirm, disabled: props.busy }, props.busy ? '处理中…' : (props.confirmLabel || '确认')),
    ]),
  ]));
}

function WorkspaceBoard(props) {
  const state = props.state;
  const controller = props.controller;
  const now = props.now;
  const allWorkspaces = state.workspaces || [];
  const workspaceQuery = String(state.ui.query || '').trim().toLowerCase();
  const workspaces = workspaceQuery === '' ? allWorkspaces : allWorkspaces.filter(function (workspace) {
    return (workspace.title + ' ' + workspace.path + ' ' + (workspace.sessions || []).map(function (entry) { return entry.title; }).join(' ')).toLowerCase().includes(workspaceQuery);
  });
  const [workspaceId, setWorkspaceId] = useState(null);
  const [picked, setPicked] = useState([]);
  const focusHandled = useRef(0);
  const [archivedPicked, setArchivedPicked] = useState([]);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [showAllArchived, setShowAllArchived] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  useEffect(function () {
    if (workspaceId !== null && !workspaces.some(function (workspace) { return workspace.id === workspaceId; })) {
      setWorkspaceId(null);
      setPicked([]);
    }
  }, [workspaces, workspaceId]);
  useEffect(function () {
    if (!props.focusId || !props.focusAt || focusHandled.current === props.focusAt) return;
    const target = workspaces.find(function (workspace) { return workspace.id === props.focusId; });
    if (!target) return;
    focusHandled.current = props.focusAt;
    setWorkspaceId(target.id);
    setPicked([]);
    setConfirmArchive(false);
  }, [props.focusId, props.focusAt, workspaces]);
  const workspace = workspaceId === null ? null : workspaces.find(function (item) { return item.id === workspaceId; }) || null;
  const bulk = state.ui.bulk || {};
  const busy = bulk.status === 'busy';
  const workspaceRange = state.ui.workspaceRange || (state.prefs && state.prefs.defaultRange) || '7d';
  const sessions = workspace ? workspace.sessions || [] : [];
  const visibleSessions = filterEntries(sessions, '', { range: workspaceRange, now: now });
  const pickedEntries = visibleSessions.filter(function (entry) { return picked.includes(entry.id); });
  const runningPicked = pickedEntries.filter(function (entry) { return entry.running || isLiveEntry(entry); });
  useEffect(function () { setPicked([]); setConfirmArchive(false); }, [workspaceRange, workspaceId]);
  const toggle = function (id) {
    setPicked(function (current) { return current.includes(id) ? current.filter(function (item) { return item !== id; }) : [...current, id]; });
    setConfirmArchive(false);
    if (state.ui.bulk && state.ui.bulk.status !== 'idle') controller.clearBulk();
  };
  const pickAll = function () {
    setPicked(visibleSessions.map(function (entry) { return entry.id; }));
    setConfirmArchive(false);
  };
  const archive = async function () {
    if (picked.length === 0) return;
    if (runningPicked.length > 0 && !confirmArchive) { setConfirmArchive(true); return; }
    const ok = await controller.archiveSessions(picked, { stopActivity: runningPicked.length > 0 });
    if (ok) { setPicked([]); setConfirmArchive(false); }
  };
  const toggleArchived = function (id) {
    setArchivedPicked(function (current) { return current.includes(id) ? current.filter(function (item) { return item !== id; }) : [...current, id]; });
    if (state.ui.bulk && state.ui.bulk.status !== 'idle') controller.clearBulk();
  };
  const askDelete = function (ids) {
    const unique = [...new Set((Array.isArray(ids) ? ids : []).filter(function (id) { return typeof id === 'string' && id !== ''; }))];
    const entries = (state.archivedEntries || []).filter(function (entry) { return unique.includes(entry.id); });
    if (entries.length > 0) setDeleteRequest(entries);
  };
  const confirmDelete = async function () {
    if (!Array.isArray(deleteRequest) || deleteRequest.length === 0) return;
    await controller.deleteArchivedSessions(deleteRequest.map(function (entry) { return entry.id; }));
    setDeleteRequest(null);
    setArchivedPicked([]);
  };
  const archivedEntries = (state.archivedEntries || []).filter(function (entry) { return workspaceQuery === '' || (entry.title + ' ' + (entry.workspace || '')).toLowerCase().includes(workspaceQuery); });
  return h('div', { className: 'dsr-page__view dsr-board dsr-workspaces' }, [
    h('section', { className: 'dsr-board__section', key: 'grid' }, [
      h(BoardHead, {
        key: 'head', icon: 'layers', title: '工作区', sub: '按工作区聚合会话，选择后批量整理',
        children: [
          h(FilterSelect, {
            key: 'range', icon: 'clock', label: '时间', title: '选择工作区后按最近活动时间筛选历史会话',
            value: workspaceRange, options: TIME_FILTERS, defaultValue: state.prefs && state.prefs.defaultRange || '7d',
            onChange: function (value) { if (typeof controller.setWorkspaceRange === 'function') controller.setWorkspaceRange(value); },
          }),
          h('span', { className: 'dsr-board__count', key: 'count' }, workspaces.length + ' 个'),
        ],
      }),
      workspaces.length === 0
        ? h('div', { className: 'dsr-board__quiet', key: 'empty' }, '还没有工作区。DSH 创建或打开工作区后会显示在这里。')
        : h('div', { className: 'dsr-workspace-grid', key: 'grid' }, workspaces.map(function (item) {
          return h('div', { className: 'dsr-workspace-card-slot', key: item.id }, [
            h(WorkspaceCard, {
              workspace: item, now: now, selected: item.id === workspaceId,
              onSelect: function (id) { setWorkspaceId(id === workspaceId ? null : id); setPicked([]); setConfirmArchive(false); const item = workspaces.find(function (workspace) { return workspace.id === id; }); if (item && Array.isArray(item.sessions) && typeof controller.queueMeta === 'function') item.sessions.forEach(function (entry) { controller.queueMeta(entry.id); }); const list = document.querySelector('.dsr-page__list'); if (list) list.scrollTo({ top: 0, behavior: 'smooth' }); },
            }),
            h(IconButton, {
              key: 'pin', name: item.pinned ? 'pin-filled' : 'pin',
              className: 'dsr-workspace-card__pin', active: item.pinned,
              label: (item.pinned ? '从快捷栏取消固定 ' : '固定工作区到快捷栏 ') + item.title,
              onClick: function () { controller.toggleWorkspacePin(item.id); },
            }),
            h(IconButton, {
              key: 'stats', name: 'activity',
              className: 'dsr-workspace-card__stats',
              label: '在统计信息里只看「' + (item.title || item.path) + '」',
              onClick: function () { if (typeof props.onShowStats === 'function') props.onShowStats({ workspaces: [item.title || item.path], sessions: [] }); },
            }),
          ]);
        })),
    ]),
    workspace ? h('section', { className: 'dsr-workspace-detail', key: 'detail' }, [
      h(BoardHead, {
        key: 'head', icon: 'folder', title: workspace.title, sub: shortPath(workspace.path) || '工作区历史会话',
        children: [
          h('span', { className: 'dsr-board__count', key: 'count' }, visibleSessions.length + (visibleSessions.length !== sessions.length ? ' / ' + sessions.length : '') + ' 个会话'),
          h('button', {
            type: 'button', className: 'dsr-button', key: 'stats', title: '在统计信息里只看这个工作区',
            onClick: function () { if (typeof props.onShowStats === 'function') props.onShowStats({ workspaces: [workspace.title || workspace.path], sessions: [] }); },
          }, [h(Icon, { name: 'activity', size: 12 }), h('span', null, '看统计')]),
          h(IconButton, { key: 'pin', name: workspace.pinned ? 'pin-filled' : 'pin', label: (workspace.pinned ? '从快捷栏取消固定 ' : '固定工作区到快捷栏 ') + workspace.title, active: workspace.pinned, onClick: function () { controller.toggleWorkspacePin(workspace.id); } }),
          h('button', { type: 'button', className: 'dsr-button', key: 'all', onClick: pickAll, disabled: visibleSessions.length === 0 }, '全选'),
          h('button', { type: 'button', className: 'dsr-button', key: 'none', onClick: function () { setPicked([]); setConfirmArchive(false); }, disabled: picked.length === 0 }, '清空'),
        ],
      }),
      visibleSessions.length === 0
        ? h('div', { className: 'dsr-board__quiet', key: 'empty' }, sessions.length === 0 ? '这个工作区还没有历史会话。' : '这个时间范围内还没有历史会话。')
        : h('div', { className: 'dsr-history-grid', key: 'grid' }, visibleSessions.map(function (entry) {
          return h(HistorySessionCard, {
            key: entry.id, entry: entry, now: now, checked: picked.includes(entry.id),
            onToggle: toggle, onSelect: props.onSelect, onOpen: props.onOpen,
          });
        })),
      h(BulkBar, {
        key: 'bulk', count: picked.length, action: 'archive', busy: busy, danger: true,
        onAction: archive, onClear: function () { setPicked([]); setConfirmArchive(false); controller.clearBulk(); },
        confirm: confirmArchive, onConfirm: archive, onCancel: function () { setConfirmArchive(false); },
        message: bulk.action === 'archive' && bulk.message ? bulk.message : '',
        error: bulk.action === 'archive' ? bulk.error : '',
      }),
    ]) : h('div', { className: 'dsr-board__hint', key: 'hint' }, [h(Icon, { name: 'chevron-right', size: 14 }), h('span', { key: 'text' }, '选择一个工作区，查看历史会话并进行批量归档。')]),
    h('section', { className: 'dsr-board__section dsr-archive-section', key: 'archived' }, [
      h(BoardHead, {
        key: 'head', icon: 'archive', title: '已归档', sub: '可恢复；永久删除会移除本地日志',
        children: [
          h('span', { className: 'dsr-board__count', key: 'count' }, String(archivedEntries.length)),
          archivedEntries.length > 0 ? h('button', { type: 'button', className: 'dsr-button', key: 'all', onClick: function () { setArchivedPicked(archivedEntries.map(function (entry) { return entry.id; })); } }, '全选') : null,
          archivedEntries.length > 12 ? h('button', { type: 'button', className: 'dsr-button', key: 'more', onClick: function () { setShowAllArchived(function (value) { return !value; }); } }, showAllArchived ? '收起' : '展开全部') : null,
          archivedPicked.length > 0 ? h('button', { type: 'button', className: 'dsr-button dsr-button--danger', key: 'delete', onClick: function () { askDelete(archivedPicked); } }, '删除所选') : null,
          archivedPicked.length > 0 ? h('button', { type: 'button', className: 'dsr-button', key: 'none', onClick: function () { setArchivedPicked([]); } }, '清空') : null,
        ],
      }),
      bulk.action === 'delete' && (bulk.message || bulk.error) ? h('div', { className: cx('dsr-inline-note', bulk.error && 'is-error'), key: 'delete-status' }, [h(Icon, { name: bulk.error ? 'warning' : 'check', size: 12 }), h('span', null, bulk.error || bulk.message)]) : null,
      archivedEntries.length === 0
        ? h('div', { className: 'dsr-board__quiet', key: 'empty' }, '还没有归档会话。批量归档后会出现在这里。')
        : h('div', { className: 'dsr-history-grid', key: 'grid' }, (showAllArchived ? archivedEntries : archivedEntries.slice(0, 12)).map(function (entry) {
          return h(HistorySessionCard, {
            key: entry.id, entry: entry, now: now, checked: archivedPicked.includes(entry.id),
            onToggle: toggleArchived, onSelect: props.onSelect, onOpen: undefined,
            onDelete: function (id) { askDelete([id]); },
          });
        })),
      h(BulkBar, {
        key: 'bulk', count: archivedPicked.length, action: 'restore', busy: busy,
        onAction: async function () { const ok = await controller.unarchiveSessions(archivedPicked); if (ok) setArchivedPicked([]); },
        onClear: function () { setArchivedPicked([]); controller.clearBulk(); },
        message: bulk.action === 'restore' && bulk.message ? bulk.message : '',
        error: bulk.action === 'restore' ? bulk.error : '',
      }),
      deleteRequest ? h(ConfirmDialog, {
        key: 'delete-dialog', count: deleteRequest.length,
        titles: deleteRequest.map(function (entry) { return entry.title; }),
        title: '永久删除归档会话？',
        text: '删除会移除本地会话日志、子会话记录和雷达统计，且无法恢复。确认继续？',
        confirmLabel: '永久删除 ' + deleteRequest.length + ' 个',
        busy: bulk.status === 'busy' && bulk.action === 'delete',
        onCancel: function () { if (bulk.status !== 'busy') setDeleteRequest(null); },
        onConfirm: confirmDelete,
      }) : null,
    ]),
  ]);
}

function UsageView(props) {
  const range = (props.state.ui && props.state.ui.usageRange) || (props.state.prefs && props.state.prefs.defaultRange) || '7d';
  const timed = filterEntries(props.entries, '', { range: range, now: props.now });
  const measured = timed.filter(function (entry) { return entry.tokenTotal > 0 || entry.contextPercent !== null; });
  const sorted = measured.slice().sort(function (a, b) { return b.tokenTotal - a.tokenTotal; });
  const max = Math.max(1, ...sorted.map(function (entry) { return entry.tokenTotal; }));
  const rangeLabel = (TIME_FILTERS.find(function (item) { return item.value === range; }) || {}).label || '近 7 天';
  function chooseRange(value) {
    if (props.controller && typeof props.controller.setUsageRange === 'function') props.controller.setUsageRange(value);
  }
  if (sorted.length === 0) return h('div', { className: 'dsr-page__view' }, h(EmptyRadar, { title: '还没有测量数据', text: '当前时间范围内没有可展示的 token 与上下文数据；换一个时间范围再试。' }));
  return h('div', { className: 'dsr-page__view dsr-board' }, [
    h(BoardHead, {
      key: 'head', icon: 'gauge', title: '会话用量', sub: formatTokens(sorted.reduce(function (sum, entry) { return sum + entry.tokenTotal; }, 0)) + ' tokens · ' + rangeLabel + ' · 按累计用量排序',
    }, h(FilterSelect, {
      key: 'range', icon: 'clock', label: '时间', title: '按最近活动时间筛选用量',
      value: range, options: TIME_FILTERS, defaultValue: props.state.prefs && props.state.prefs.defaultRange || '7d', onChange: chooseRange,
    })),
    h('div', { className: 'dsr-usage-grid', key: 'grid' }, sorted.map(function (entry) {
      return h('button', { type: 'button', className: 'dsr-usage-card', key: entry.id, title: entry.title + ' · ' + formatExactNumber(entry.tokenTotal) + ' token · 本轮 ' + formatExactDuration(entry.turnTimeMs) + ' · 总计 ' + formatExactDuration(entry.totalTimeMs), onClick: function () { props.onSelect(entry.id); } }, [
        h('span', { className: 'dsr-usage-card__title', key: 'title' }, entry.title),
        h('span', { className: 'dsr-usage-card__meta', key: 'meta' }, entry.workspace + (entry.model ? ' · ' + entry.model : '')),
        h('span', { className: 'dsr-usage-card__big', key: 'big' }, formatTokens(entry.tokenTotal), h('small', { key: 'unit' }, ' tok')),
        h('span', { className: 'dsr-usage-card__bar', key: 'bar' }, h('i', { style: { width: Math.max(2, Math.round(entry.tokenTotal / max * 100)) + '%' } })),
        h('span', { className: 'dsr-usage-card__foot', key: 'foot' }, [
          h('span', { key: 'ctx' }, 'ctx ', h('strong', null, entry.contextPercent === null ? '—' : entry.contextPercent + '%')),
          h('span', { key: 'turn' }, '本轮 ', h('strong', null, entry.turnTimeMs > 0 ? formatDuration(entry.turnTimeMs) : '—')),
          h('span', { key: 'total' }, '总 ', h('strong', null, entry.totalTimeMs > 0 ? formatDuration(entry.totalTimeMs) : '—')),
        ]),
      ]);
    })),
  ]);
}

function formatExactNumber(value) {
  const number = Math.max(0, Math.round(Number(value) || 0));
  return number.toLocaleString('zh-CN');
}

function formatExactDuration(value) {
  const ms = Math.max(0, Math.round(Number(value) || 0));
  if (ms < 1000) return ms + ' ms';
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return hours + ' 小时 ' + minutes + ' 分 ' + seconds + ' 秒';
  if (minutes > 0) return minutes + ' 分 ' + seconds + ' 秒';
  return seconds + ' 秒';
}

const ACTIVITY_MODES = [
  { value: 'today', label: '当日', hint: '24 小时' },
  { value: 'day', label: '日', hint: '近 14 天' },
  { value: 'week', label: '周', hint: '近 12 周' },
  { value: 'month', label: '月', hint: '近 12 月' },
  { value: 'custom', label: '自定义', hint: '任意区间' },
];

const ACTIVITY_GRAIN_OPTIONS = [
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

const ACTIVITY_QUICK_SPANS = [7, 30, 90, 365];

/** YYYY-MM-DD key `count` local days away from the given timestamp. */
function dayKeyFromOffset(now, count) {
  const date = new Date(Number(now) || Date.now());
  date.setDate(date.getDate() + count);
  return localDayKey(date.getTime());
}

function activityGrainLabel(grain) {
  const match = ACTIVITY_GRAIN_OPTIONS.find(function (item) { return item.value === grain; });
  return match ? '按' + match.label : '按天';
}

/** Readable "from → to · N 天" label for a resolved window. */
function activityWindowLabel(start, end, days) {
  return localDayKey(start) + ' → ' + localDayKey(Math.max(start, end - 1)) + ' · ' + days + ' 天';
}

const MODEL_COLORS = ['#3d7dff', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

function compactTokenGroups(rows, max) {
  const list = rows
    .filter(item => item && item.tokens > 0)
    .slice()
    .sort((a, b) => b.tokens - a.tokens || String(a.name).localeCompare(String(b.name), 'zh-CN'));
  if (list.length <= max) return list;
  const head = list.slice(0, max - 1);
  const rest = list.slice(max - 1);
  const other = rest.reduce(function (total, item) {
    total.tokens += item.tokens;
    total.calls += item.calls || 0;
    total.durationMs += item.durationMs || 0;
    total.turns += item.turns || 0;
    return total;
  }, { id: 'other', name: '其他 ' + rest.length + ' 项', tokens: 0, calls: 0, durationMs: 0, turns: 0, isOther: true });
  return head.concat(other);
}

/** "13:00–15:00" inside one day, "11/6 22:00–11/7 03:00" across days. */
function spanClockLabel(start, end) {
  if (!(start > 0) || !(end > start)) return '';
  const from = new Date(start);
  const to = new Date(end);
  const pad = function (value) { return String(value).padStart(2, '0'); };
  const clock = function (date) { return pad(date.getHours()) + ':' + pad(date.getMinutes()); };
  if (localDayKey(start) === localDayKey(end)) return clock(from) + '–' + clock(to);
  return (from.getMonth() + 1) + '/' + from.getDate() + ' ' + clock(from) + '–' + (to.getMonth() + 1) + '/' + to.getDate() + ' ' + clock(to);
}

function ActivityView(props) {
  const state = props.state;
  const controller = props.controller;
  const prefs = state.prefs || {};
  const stored = prefs.activityRange || {};
  const mode = ACTIVITY_MODES.some(function (item) { return item.value === stored.mode; }) ? stored.mode : 'today';
  const grain = ACTIVITY_GRAIN_OPTIONS.some(function (item) { return item.value === stored.grain; }) ? stored.grain : 'day';
  const [groupMode, setGroupMode] = useState('model');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeQuery, setScopeQuery] = useState('');
  const [timeOpen, setTimeOpen] = useState(false);
  // A custom window keeps its own dates; presets keep their rolling windows.
  const customFrom = typeof stored.from === 'string' && stored.from !== '' ? stored.from : dayKeyFromOffset(props.now, -29);
  const customTo = typeof stored.to === 'string' && stored.to !== '' ? stored.to : localDayKey(props.now);
  const customActive = mode === 'custom';
  // Statistics can be narrowed to picked workspaces and sessions; the set of
  // session ids is what both the aggregation and the turn ledger filter on.
  const scopePref = prefs.activityScope || {};
  const scopeWorkspaces = Array.isArray(scopePref.workspaces) ? scopePref.workspaces : [];
  const scopeSessions = Array.isArray(scopePref.sessions) ? scopePref.sessions : [];
  const poolEntries = state.entries.concat(state.archivedEntries || []);
  const scopeIds = (function () {
    if (scopeSessions.length === 0 && scopeWorkspaces.length === 0) return null;
    const ids = new Set(scopeSessions);
    if (scopeWorkspaces.length > 0) {
      const wanted = new Set(scopeWorkspaces);
      for (const entry of poolEntries) {
        if (wanted.has(entry.workspace)) ids.add(entry.id);
      }
    }
    return ids;
  })();
  const turnLedger = state.activityTurns || null;
  const view = customActive
    ? activityRange(state.activity || {}, { from: customFrom, to: customTo, grain: grain, turns: turnLedger, scope: scopeIds }, props.now)
    : activityBuckets(state.activity || {}, mode, props.now, { turns: turnLedger, scope: scopeIds });
  const windowRange = customActive ? { start: view.start, end: view.end } : null;
  const wall = activityWall(state.activity || {}, props.now, 53, windowRange, scopeIds);
  const setRange = function (patch) {
    if (controller === undefined || controller === null || typeof controller.setPref !== 'function') return;
    controller.setPref('activityRange', { mode: mode, from: customFrom, to: customTo, grain: grain, timeMode: stored.timeMode === 'sum' ? 'sum' : 'busy', ...patch });
  };
  useEffect(function () {
    if (controller && typeof controller.ensureActivityHistory === 'function') controller.ensureActivityHistory();
  }, [controller]);
  const totalSessions = view.sessionTotals.length;
  const isToday = mode === 'today';
  const periodLabel = customActive
    ? activityWindowLabel(view.start, view.end, view.days)
    : mode === 'today' ? '今天' : mode === 'week' ? '近 12 周' : mode === 'month' ? '近 12 个月' : '近 14 天';
  const coarseNote = customActive && view.grain !== grain ? ' · 区间较长，已' + activityGrainLabel(view.grain) + '聚合' : '';
  const timeMode = stored.timeMode === 'sum' ? 'sum' : 'busy';
  const setTimeMode = function (value) { setRange({ timeMode: value }); };
  const saveScope = function (workspaces, sessions) {
    if (controller === undefined || controller === null || typeof controller.setPref !== 'function') return;
    controller.setPref('activityScope', { workspaces: workspaces, sessions: sessions });
  };
  const toggleScopeWorkspace = function (name) {
    const next = scopeWorkspaces.includes(name)
      ? scopeWorkspaces.filter(function (item) { return item !== name; })
      : scopeWorkspaces.concat(name);
    saveScope(next, scopeSessions);
  };
  const toggleScopeSession = function (id) {
    const next = scopeSessions.includes(id)
      ? scopeSessions.filter(function (item) { return item !== id; })
      : scopeSessions.concat(id);
    saveScope(scopeWorkspaces, next);
  };
  const clearScope = function () { saveScope([], []); };
  const scopePickerRows = scopeOpen
    ? poolEntries.slice()
      .sort(function (a, b) { return (b.tokenTotal || 0) - (a.tokenTotal || 0) || (b.updatedAt || 0) - (a.updatedAt || 0); })
      .filter(function (entry) {
        const needle = scopeQuery.trim().toLowerCase();
        if (needle === '') return true;
        return ((entry.title || '') + ' ' + (entry.workspace || '')).toLowerCase().includes(needle);
      })
      .slice(0, 60)
    : [];
  const scopeWorkspaceOptions = (state.workspaces || []).slice(0, 12);
  const scopeNote = scopeIds === null
    ? '默认统计全部会话。勾选工作区或会话后只看选中的部分，也可以到「工作区」页签点「统计」把整个工作区带过来。'
    : '统计 ' + scopeWorkspaces.length + ' 个工作区、' + scopeSessions.length + ' 个手选会话，共 ' + scopeIds.size + ' 个会话。';
  const busyMs = Math.max(0, Number(view.totalBusyMs) || 0);
  const sumMs = Math.max(0, Number(view.totalDurationMs) || 0);
  const overlapMs = Math.max(0, Number(view.overlapMs) || 0);
  const shownTimeMs = timeMode === 'sum' ? sumMs : busyMs;
  const timeLabel = timeMode === 'sum' ? '累计时长' : '总耗时';
  const timeTitle = '总耗时 ' + formatExactDuration(busyMs) + ' · 累计 ' + formatExactDuration(sumMs)
    + (overlapMs > 0 ? ' · 并行重叠 ' + formatExactDuration(overlapMs) + ' 只算一次' : '') + ' · ' + periodLabel;
  const windowStart = Number(view.windowStart) || 0;
  const windowEnd = Number(view.windowEnd) || 0;
  const spanWindowMs = Math.max(1, windowEnd - windowStart);
  const timeRows = (view.sessionTotals || []).map(function (item) {
    const spans = Array.isArray(item.spans) ? item.spans : [];
    const own = Number(item.busyMs) || 0;
    const durationMs = Number(item.durationMs) || 0;
    return {
      id: item.id,
      title: item.title || item.id,
      spans: spans,
      busyMs: own > 0 ? own : durationMs,
      durationMs: durationMs,
      turns: Number(item.turns) || 0,
      first: Number(item.first) || 0,
      last: Number(item.last) || 0,
    };
  }).sort(function (a, b) { return b.busyMs - a.busyMs || b.durationMs - a.durationMs || a.title.localeCompare(b.title, 'zh-CN'); });
  const ganttReady = windowEnd > windowStart && timeRows.some(function (item) { return item.spans.length > 0; });
  const timeListRows = timeRows.slice(0, 10);
  const maxRowMs = timeListRows.reduce(function (peak, item) { return Math.max(peak, item.busyMs); }, 0) || 1;
  const groupNoun = groupMode === 'model' ? '模型' : '会话';
  const rawModelRows = (view.modelTotals || []).map(function (item) {
    return { id: item.name, name: item.name, tokens: Number(item.tokens) || 0, calls: Number(item.calls) || 0, durationMs: 0, turns: 0 };
  });
  const modelCalls = rawModelRows.reduce(function (sum, item) { return sum + item.calls; }, 0);
  const modelTokenSum = rawModelRows.reduce(function (sum, item) { return sum + item.tokens; }, 0);
  let modelRows = rawModelRows;
  if (modelTokenSum === 0 && view.totalTokens > 0 && modelCalls > 0) {
    modelRows = rawModelRows.map(function (item) {
      return { ...item, tokens: Math.round(view.totalTokens * item.calls / modelCalls), estimated: true };
    });
  } else if (modelTokenSum < view.totalTokens) {
    modelRows = rawModelRows.concat({
      id: 'unmarked-model', name: '未标注模型', tokens: view.totalTokens - modelTokenSum,
      calls: 0, durationMs: 0, turns: 0,
    });
  }
  const rawSessionRows = (view.sessionTotals || []).map(function (item) {
    return { id: item.id, name: item.title || item.id, tokens: Number(item.tokens) || 0, calls: Number(item.calls) || 0, durationMs: Number(item.durationMs) || 0, turns: Number(item.turns) || 0 };
  });
  const rawGroups = groupMode === 'model' ? modelRows : rawSessionRows;
  const groups = compactTokenGroups(rawGroups, 7).map(function (item, index) {
    return { ...item, color: item.isOther ? '#94a3b8' : MODEL_COLORS[index % MODEL_COLORS.length] };
  });
  const groupTotal = groups.reduce(function (sum, item) { return sum + item.tokens; }, 0);
  const maxGroupTokens = groups.reduce(function (peak, item) { return Math.max(peak, item.tokens); }, 0) || 1;
  const estimated = groupMode === 'model' && modelRows.some(function (item) { return item.estimated === true; });
  const hasResidual = groupMode === 'model' && modelRows.some(function (item) { return item.id === 'unmarked-model'; });
  const groupSub = groupMode === 'model'
    ? '按模型汇总 token 消耗 · 扇区和柱体颜色对应同一模型'
    : '按会话汇总 token 消耗 · 扇区和柱体颜色对应同一会话';
  const detailSessions = view.sessionTotals
    .slice()
    .sort(function (a, b) { return b.tokens - a.tokens || b.durationMs - a.durationMs; })
    .slice(0, 12);
  const pieCircumference = 2 * Math.PI * 42;
  let pieOffset = 0;
  const pieSegments = groups.map(function (item) {
    const length = groupTotal > 0 ? item.tokens / groupTotal * pieCircumference : 0;
    const visible = Math.max(0, length - 2);
    const segment = h('circle', {
      cx: 60, cy: 60, r: 42, fill: 'none', stroke: item.color, strokeWidth: 15,
      strokeDasharray: visible + ' ' + Math.max(0, pieCircumference - visible),
      strokeDashoffset: -pieOffset,
      transform: 'rotate(-90 60 60)',
      key: item.id,
    }, h('title', { key: 'title' }, item.name + '：' + formatExactNumber(item.tokens) + ' token · ' + Math.round(item.tokens / Math.max(1, groupTotal) * 100) + '%'));
    pieOffset += length;
    return segment;
  });
  return h('div', { className: 'dsr-page__view dsr-board dsr-activity' }, [
    h(BoardHead, {
      key: 'head', icon: 'activity', title: '统计信息', sub: '区间内的 token 花费、会话总耗时（并行只算一次）、模型调用与用量分布',
      children: h('span', { className: 'dsr-board__count', key: 'count' }, view.activeDays + ' 个活跃时段 · ' + periodLabel),
    }),
    h('div', { className: 'dsr-activity__summary', key: 'summary' }, [
      h('div', { className: 'dsr-activity__metric dsr-activity__metric--tokens', key: 'tokens', title: '区间内对话 token：' + formatExactNumber(view.totalTokens) + ' · ' + periodLabel + ' · 按轮次实际发生的时间归属，不拿会话总量凑数' }, [
        h('span', { className: 'dsr-activity__metric-icon', key: 'icon' }, h(Icon, { name: 'token', size: 16 })),
        h('span', { className: 'dsr-activity__metric-copy', key: 'copy' }, [
          h('span', { className: 'dsr-activity__metric-label', key: 'label' }, '区间 token'),
          h('strong', { className: 'dsr-activity__metric-value', key: 'value' }, formatTokens(view.totalTokens)),
        ]),
      ]),
      h('div', { className: 'dsr-activity__metric dsr-activity__metric--time', key: 'time', title: timeTitle }, [
        h('span', { className: 'dsr-activity__metric-icon', key: 'icon' }, h(Icon, { name: 'clock', size: 16 })),
        h('span', { className: 'dsr-activity__metric-copy', key: 'copy' }, [
          h('span', { className: 'dsr-activity__metric-label', key: 'label' }, timeLabel),
          h('strong', { className: 'dsr-activity__metric-value', key: 'value' }, formatDuration(shownTimeMs)),
        ]),
      ]),
      h('div', { className: 'dsr-activity__metric dsr-activity__metric--sessions', key: 'sessions', title: '涉及会话：' + totalSessions + ' 个 · ' + periodLabel }, [
        h('span', { className: 'dsr-activity__metric-icon', key: 'icon' }, h(Icon, { name: 'session', size: 16 })),
        h('span', { className: 'dsr-activity__metric-copy', key: 'copy' }, [
          h('span', { className: 'dsr-activity__metric-label', key: 'label' }, '涉及会话'),
          h('strong', { className: 'dsr-activity__metric-value', key: 'value' }, String(totalSessions)),
        ]),
      ]),
      h('div', { className: 'dsr-activity__metric dsr-activity__metric--turns', key: 'turns', title: '对话轮次：' + formatExactNumber(view.totalTurns) + ' · ' + periodLabel }, [
        h('span', { className: 'dsr-activity__metric-icon', key: 'icon' }, h(Icon, { name: 'turn', size: 16 })),
        h('span', { className: 'dsr-activity__metric-copy', key: 'copy' }, [
          h('span', { className: 'dsr-activity__metric-label', key: 'label' }, '对话轮次'),
          h('strong', { className: 'dsr-activity__metric-value', key: 'value' }, String(view.totalTurns)),
        ]),
      ]),
      h('div', { className: 'dsr-activity__metric dsr-activity__metric--calls', key: 'calls', title: '模型调用：' + formatExactNumber(view.totalCalls) + ' 次 · ' + periodLabel }, [
        h('span', { className: 'dsr-activity__metric-icon', key: 'icon' }, h(Icon, { name: 'model', size: 16 })),
        h('span', { className: 'dsr-activity__metric-copy', key: 'copy' }, [
          h('span', { className: 'dsr-activity__metric-label', key: 'label' }, '模型调用'),
          h('strong', { className: 'dsr-activity__metric-value', key: 'value' }, formatTokens(view.totalCalls)),
        ]),
      ]),
    ]),
    h('section', { className: 'dsr-activity__panel dsr-scope-panel', key: 'scope-panel' }, [
      h('div', { className: 'dsr-activity__panel-head', key: 'head' }, [
        h('div', { className: 'dsr-activity__panel-title', key: 'title' }, [h(Icon, { name: 'filter', size: 13 }), h('span', null, '统计范围')]),
        h('div', { className: 'dsr-activity__controls', key: 'controls' }, [
          scopeIds === null ? null : h('button', {
            type: 'button', key: 'clear', className: 'dsr-button dsr-button--ghost',
            onClick: clearScope, title: '恢复统计全部会话',
          }, '恢复全部'),
          h('button', {
            type: 'button', key: 'pick', className: cx('dsr-button', scopeOpen && 'is-active'),
            'aria-expanded': scopeOpen, title: '逐个勾选要统计的会话',
            onClick: function () { setScopeOpen(!scopeOpen); },
          }, [h(Icon, { name: 'session', size: 12 }), h('span', null, '选择会话')]),
        ]),
      ]),
      h('div', { className: 'dsr-scope__chips', key: 'chips' }, [
        h('button', {
          type: 'button', key: 'all', className: cx('dsr-scope__chip', scopeIds === null && 'is-active'),
          'aria-pressed': scopeIds === null, onClick: clearScope, title: '统计全部会话',
        }, '全部会话'),
        ...scopeWorkspaceOptions.map(function (workspace) {
          const name = workspace.title || workspace.path || '工作区';
          const active = scopeWorkspaces.includes(name);
          return h('button', {
            type: 'button', key: 'w-' + workspace.id, className: cx('dsr-scope__chip', active && 'is-active'),
            'aria-pressed': active, title: '只看「' + name + '」的会话',
            onClick: function () { toggleScopeWorkspace(name); },
          }, [h('span', { key: 'n' }, name), h('small', { key: 'c' }, String(workspace.count || 0))]);
        }),
      ]),
      h('p', { className: 'dsr-scope__note', key: 'note' }, scopeNote),
      scopeOpen ? h('div', { className: 'dsr-scope__picker', key: 'picker' }, [
        h('input', {
          className: 'dsr-scope__search', key: 'search', type: 'search', value: scopeQuery,
          placeholder: '搜索会话标题或工作区', 'aria-label': '搜索要统计的会话',
          onChange: function (event) { setScopeQuery(event.target.value); },
        }),
        scopePickerRows.length === 0
          ? h('div', { className: 'dsr-activity__quiet', key: 'empty' }, '没有匹配的会话。')
          : h('div', { className: 'dsr-scope__list', key: 'list' }, scopePickerRows.map(function (entry) {
            const on = scopeSessions.includes(entry.id);
            return h('button', {
              type: 'button', key: entry.id, className: cx('dsr-scope__row', on && 'is-on'),
              'aria-pressed': on, onClick: function () { toggleScopeSession(entry.id); },
            }, [
              h(Icon, { name: on ? 'check' : 'plus', size: 12, key: 'mark' }),
              h('span', { className: 'dsr-scope__row-title', key: 'title' }, entry.title || entry.id),
              h('span', { className: 'dsr-scope__row-meta', key: 'meta' }, (entry.workspace || '未分组') + ' · ' + formatTokens(entry.tokenTotal || 0)),
            ]);
          })),
      ]) : null,
    ]),
    h('section', { className: 'dsr-activity__panel dsr-token-panel', key: 'token-panel' }, [
      h('div', { className: 'dsr-activity__panel-head', key: 'head' }, [
        h('div', { className: 'dsr-activity__panel-title', key: 'title' }, [h(Icon, { name: 'pie', size: 13 }), h('span', null, 'Token 用量分布')]),
        h('div', { className: 'dsr-activity__controls', key: 'controls' }, [
          h('div', { className: 'dsr-activity__modes', key: 'modes', role: 'tablist', 'aria-label': '统计范围' }, ACTIVITY_MODES.map(function (item) {
            return h('button', {
              type: 'button', key: item.value, role: 'tab', 'aria-selected': mode === item.value,
              className: cx('dsr-activity__mode', mode === item.value && 'is-active'),
              title: item.value === 'custom' ? '自定义统计区间：起止日期与聚合粒度' : '统计范围：' + item.hint,
              onClick: function () { setRange({ mode: item.value }); },
            }, [h('span', { key: 'label' }, item.label), h('small', { key: 'hint' }, item.hint)]);
          })),
          h('div', { className: 'dsr-token__group-switch', key: 'group-switch', role: 'group', 'aria-label': '用量分组' }, [
            h('button', { type: 'button', className: cx('dsr-token__group-btn', groupMode === 'model' && 'is-active'), 'aria-pressed': groupMode === 'model', onClick: function () { setGroupMode('model'); } }, h(Icon, { name: 'model', size: 12 }), h('span', null, '按模型')),
            h('button', { type: 'button', className: cx('dsr-token__group-btn', groupMode === 'session' && 'is-active'), 'aria-pressed': groupMode === 'session', onClick: function () { setGroupMode('session'); } }, h(Icon, { name: 'session', size: 12 }), h('span', null, '按会话')),
          ]),
        ]),
      ]),
      customActive ? h('div', { className: 'dsr-rangebar', key: 'rangebar' }, [
        h('label', { className: 'dsr-rangebar__field', key: 'from' }, [
          h('span', { className: 'dsr-rangebar__label', key: 'l' }, '从'),
          h('input', {
            type: 'date', value: customFrom, max: customTo, 'aria-label': '统计区间开始日期',
            onChange: function (event) { setRange({ from: event.target.value }); },
          }),
        ]),
        h('label', { className: 'dsr-rangebar__field', key: 'to' }, [
          h('span', { className: 'dsr-rangebar__label', key: 'l' }, '至'),
          h('input', {
            type: 'date', value: customTo, min: customFrom, 'aria-label': '统计区间结束日期',
            onChange: function (event) { setRange({ to: event.target.value }); },
          }),
        ]),
        h('div', { className: 'dsr-rangebar__grains', key: 'grains', role: 'group', 'aria-label': '统计粒度' }, ACTIVITY_GRAIN_OPTIONS.map(function (item) {
          return h('button', {
            type: 'button', key: item.value, className: cx('dsr-rangebar__grain', grain === item.value && 'is-active'),
            'aria-pressed': grain === item.value, title: '按' + item.label + '聚合',
            onClick: function () { setRange({ grain: item.value }); },
          }, item.label);
        })),
        h('div', { className: 'dsr-rangebar__quick', key: 'quick' }, ACTIVITY_QUICK_SPANS.map(function (span) {
          return h('button', {
            type: 'button', key: span, className: 'dsr-rangebar__preset', title: '把区间设为最近 ' + span + ' 天',
            onClick: function () { setRange({ from: dayKeyFromOffset(props.now, -(span - 1)), to: localDayKey(props.now) }); },
          }, span === 365 ? '近一年' : '近 ' + span + ' 天');
        })),
        h('span', { className: 'dsr-rangebar__resolved', key: 'resolved', title: '实际统计区间（含起止日）' }, activityWindowLabel(view.start, view.end, view.days) + coarseNote),
      ]) : null,
      h('p', { className: 'dsr-activity__chart-sub', key: 'sub' }, groupSub + (estimated ? ' · 历史记录按调用次数估算' : hasResidual ? ' · 未标注模型包含历史未记录的 token' : '')),
      groupTotal > 0 ? h('div', { className: 'dsr-token__layout', key: 'layout' }, [
        h('div', { className: 'dsr-token__pie-col', key: 'pie-col' }, [
          h('div', { className: 'dsr-token__pie', key: 'pie' }, [
            h('svg', { viewBox: '0 0 120 120', role: 'img', 'aria-label': groupNoun + ' token 用量分布', key: 'svg' }, [
              h('circle', { cx: 60, cy: 60, r: 42, fill: 'none', stroke: 'var(--dsr-soft)', strokeWidth: 15, key: 'track' }),
              pieSegments,
            ]),
            h('span', { className: 'dsr-token__pie-center', key: 'center' }, [h('strong', { key: 'n' }, formatTokens(groupTotal)), h('small', { key: 'u' }, 'token')]),
          ]),
          h('div', { className: 'dsr-token__legend', key: 'legend' }, groups.map(function (item) {
            const share = Math.round(item.tokens / Math.max(1, groupTotal) * 100);
            const detail = item.name + '：' + formatExactNumber(item.tokens) + ' token · ' + share + '%' + (item.calls > 0 ? ' · ' + formatExactNumber(item.calls) + ' 次调用' : '');
            return h('div', { className: 'dsr-token__legend-row', key: item.id, title: detail }, [
              h('i', { className: 'dsr-token__dot', style: { background: item.color }, key: 'dot' }),
              h('span', { className: 'dsr-token__legend-name', title: item.name, key: 'name' }, item.name),
              h('span', { className: 'dsr-token__legend-value', key: 'value' }, formatTokens(item.tokens)),
              h('span', { className: 'dsr-token__legend-share', key: 'share' }, share + '%'),
            ]);
          })),
        ]),
        h('div', { className: 'dsr-token__bar-col', key: 'bar-col' }, [
          h('div', { className: 'dsr-token__bar-head', key: 'bar-head' }, [
            h('span', { key: 'label' }, '按' + groupNoun + '用量'),
            h('span', { className: 'dsr-token__bar-total', key: 'total' }, formatExactNumber(groupTotal) + ' token'),
          ]),
          h('div', { className: 'dsr-token__bars', key: 'bars' }, [
            h('div', { className: 'dsr-token__grid', key: 'grid', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(function (line) { return h('i', { key: line }); })),
            h('div', { className: 'dsr-token__bar-list', key: 'list' }, groups.map(function (item) {
              const height = Math.max(5, Math.round(item.tokens / maxGroupTokens * 100));
              const detail = item.name + '：' + formatExactNumber(item.tokens) + ' token · ' + Math.round(item.tokens / Math.max(1, groupTotal) * 100) + '%' + (item.calls > 0 ? ' · ' + formatExactNumber(item.calls) + ' 次调用' : '');
              return h('div', { className: cx('dsr-token__bar', item.isOther && 'is-other'), key: item.id, title: detail, tabIndex: 0, role: 'img', 'aria-label': detail }, [
                h('span', { className: 'dsr-token__bar-plot', key: 'plot' }, h('i', { className: 'dsr-token__bar-fill', style: { height: height + '%', background: item.color }, key: 'fill' })),
                h('span', { className: 'dsr-token__bar-label', key: 'label', title: item.name }, item.name),
              ]);
            })),
          ]),
          h('div', { className: 'dsr-token__axis', key: 'axis', 'aria-hidden': 'true' }, [h('span', { key: 'zero' }, '0'), h('span', { key: 'max' }, formatTokens(maxGroupTokens)), h('span', { key: 'unit' }, 'token')]),
        ]),
      ]) : h('div', { className: 'dsr-activity__quiet', key: 'quiet' }, isToday ? '今天还没有可统计的 token 数据。' : '这个范围还没有可统计的 token 数据。雷达会在会话产生事件后逐步累计。'),
    ]),
    h('section', { className: cx('dsr-activity__panel dsr-time-panel', !timeOpen && 'is-collapsed'), key: 'time-panel' }, [
      h('div', { className: 'dsr-activity__panel-head', key: 'head' }, [
        h('button', {
          type: 'button', key: 'title', className: 'dsr-activity__panel-title dsr-time__toggle',
          'aria-expanded': timeOpen, title: timeOpen ? '收起会话时间耗时' : '展开会话时间耗时',
          onClick: function () { setTimeOpen(!timeOpen); },
        }, [
          h(Icon, { name: timeOpen ? 'chevron-down' : 'chevron-right', size: 13, key: 'caret' }),
          h('span', { key: 'label' }, '会话时间耗时'),
          h('small', { key: 'peek' }, formatDuration(busyMs) + ' 总耗时 · ' + formatDuration(sumMs) + ' 累计'),
        ]),
        h('div', { className: 'dsr-activity__controls', key: 'controls' }, [
          h('div', { className: 'dsr-token__group-switch', key: 'metric', role: 'group', 'aria-label': '时长口径' }, [
            h('button', {
              type: 'button', key: 'busy', className: cx('dsr-token__group-btn', timeMode === 'busy' && 'is-active'),
              'aria-pressed': timeMode === 'busy', title: '总耗时：区间内所有会话叠在一起算一次，并行会话不重复计入',
              onClick: function () { setTimeMode('busy'); },
            }, h(Icon, { name: 'clock', size: 12 }), h('span', null, '总耗时')),
            h('button', {
              type: 'button', key: 'sum', className: cx('dsr-token__group-btn', timeMode === 'sum' && 'is-active'),
              'aria-pressed': timeMode === 'sum', title: '累计：每个会话的时长直接相加，并行会话各算各的',
              onClick: function () { setTimeMode('sum'); },
            }, h(Icon, { name: 'steps', size: 12 }), h('span', null, '累计')),
          ]),
        ]),
      ]),
      timeOpen ? h('div', { className: 'dsr-time__body', key: 'body' }, [
      h('div', { className: 'dsr-time__summary', key: 'summary' }, [
        h('span', { className: cx('dsr-time__total', timeMode === 'busy' && 'is-active'), key: 'busy', title: '总耗时：区间内至少有一个会话在跑的实际时长' }, [
          h('strong', { key: 'v' }, formatDuration(busyMs)), h('small', { key: 'l' }, '总耗时'),
        ]),
        h('span', { className: cx('dsr-time__total', timeMode === 'sum' && 'is-active'), key: 'sum', title: '累计：各会话时长直接相加，并行会话各算各的' }, [
          h('strong', { key: 'v' }, formatDuration(sumMs)), h('small', { key: 'l' }, '累计'),
        ]),
        overlapMs > 0 ? h('span', { className: 'dsr-time__total is-muted', key: 'overlap', title: '并行重叠的时间只算一次，所以总耗时比累计短这么多' }, [
          h('strong', { key: 'v' }, formatDuration(overlapMs)), h('small', { key: 'l' }, '并行重叠'),
        ]) : null,
        h('span', { className: 'dsr-time__hint', key: 'hint' }, view.busyEstimated
          ? '历史记录缺少时间戳，暂按累计时长显示'
          : ganttReady ? '一条轨道是一个会话；同一时刻叠在一起的段只计一次' : '按每个会话自身的耗时排序'),
      ]),
      timeListRows.length === 0
        ? h('div', { className: 'dsr-activity__quiet', key: 'quiet' }, '这个范围还没有会话运行记录。')
        : h('div', { className: 'dsr-time__rows', key: 'rows' }, timeListRows.map(function (item) {
          const detail = item.title + ' · 自身 ' + formatExactDuration(item.busyMs)
            + (item.durationMs > item.busyMs ? ' · 累计 ' + formatExactDuration(item.durationMs) : '')
            + ' · ' + item.turns + ' 轮' + (item.first > 0 ? ' · ' + spanClockLabel(item.first, item.last) : '');
          return h('div', { className: 'dsr-time__row', key: item.id, title: detail }, [
            h('span', { className: 'dsr-time__name', key: 'name', title: item.title }, item.title),
            ganttReady
              ? h('span', { className: 'dsr-time__track', key: 'track', 'aria-hidden': 'true' }, item.spans.map(function (span, index) {
                const left = Math.max(0, Math.min(99.2, (span[0] - windowStart) / spanWindowMs * 100));
                const width = Math.max(0.8, Math.min(100 - left, (span[1] - span[0]) / spanWindowMs * 100));
                return h('i', { className: 'dsr-time__seg', key: index, style: { left: left + '%', width: width + '%' } });
              }))
              : h('span', { className: 'dsr-time__track is-bar', key: 'track', 'aria-hidden': 'true' },
                h('i', { className: 'dsr-time__seg', style: { left: '0%', width: Math.max(2, Math.min(100, item.busyMs / maxRowMs * 100)) + '%' } })),
            h('span', { className: 'dsr-time__value', key: 'value' }, formatDuration(timeMode === 'sum' ? item.durationMs : item.busyMs)),
          ]);
        })),
      ]) : null,
    ]),
    h('section', { className: 'dsr-activity__panel dsr-wall-panel', key: 'wall-panel' }, [
      h('div', { className: 'dsr-activity__panel-head', key: 'head' }, [
        h('div', { className: 'dsr-activity__panel-title', key: 'title' }, [h(Icon, { name: 'calendar', size: 13 }), h('span', null, '使用热力图')]),
        h('span', { className: 'dsr-activity__wall-meta', key: 'meta' }, windowRange === null
          ? wall.activeDays + ' 天有活动 · 过去 53 周'
          : wall.activeDays === 0
            ? '所选区间不在最近 53 周内 · 热力图只覆盖最近一年'
            : '所选区间 ' + wall.activeDays + ' 天有活动 · 其余日期淡化'),
      ]),
      h('div', { className: 'dsr-wall__scroll', key: 'scroll' }, h('div', { className: 'dsr-wall__inner', key: 'inner' }, [
        h('div', { className: 'dsr-wall__months', key: 'months' }, wall.monthLabels.map(function (item) {
          return h('span', { key: item.index + item.label, className: 'dsr-wall__month', style: { left: (item.index * 12) + 'px' } }, item.label);
        })),
        h('div', { className: 'dsr-wall__body', key: 'body' }, [
          h('div', { className: 'dsr-wall__days', key: 'days', 'aria-hidden': 'true' }, ['一', '', '三', '', '五', '', '日'].map(function (label, index) { return h('span', { key: index }, label); })),
          h('div', { className: 'dsr-wall__weeks', key: 'weeks' }, wall.weeks.map(function (week, weekIndex) {
            return h('div', { className: 'dsr-wall__week', key: weekIndex }, week.map(function (cell) {
              return h('span', {
                key: cell.key,
                className: cx('dsr-wall__cell', cell.future && 'is-future', cell.outside && 'is-outside', 'is-level-' + cell.level),
                title: cell.future ? '未来' : cell.key + ' · ' + formatExactNumber(cell.tokens) + ' tok · 总耗时 ' + formatExactDuration(cell.busyMs || cell.durationMs) + ' · 累计 ' + formatExactDuration(cell.durationMs),
                'aria-label': cell.future ? '未来日期' : cell.key + '，' + formatExactNumber(cell.tokens) + ' token，' + formatExactDuration(cell.durationMs),
              });
            }));
          })),
        ]),
      ])),
      h('div', { className: 'dsr-wall__legend', key: 'legend' }, [h('span', { key: 'less' }, '少'), [0, 1, 2, 3, 4].map(function (level) { return h('i', { key: level, className: 'dsr-wall__cell is-level-' + level }); }), h('span', { key: 'more' }, '多')]),
    ]),
    h('section', { className: 'dsr-activity__panel dsr-activity__detail-panel', key: 'detail-panel' }, [
      h('div', { className: 'dsr-activity__panel-head', key: 'head' }, [
        h('div', { className: 'dsr-activity__panel-title', key: 'title' }, [h(Icon, { name: 'session', size: 13 }), h('span', null, '会话用量')]),
        h('span', { className: 'dsr-activity__detail-meta', key: 'meta' }, totalSessions + ' 个会话 · ' + formatExactNumber(view.totalTokens) + ' token'),
      ]),
      detailSessions.length === 0
        ? h('div', { className: 'dsr-activity__quiet', key: 'quiet' }, '这个范围还没有会话运行记录。')
        : h('div', { className: 'dsr-activity__session-list', key: 'list' }, detailSessions.map(function (item) {
          return h('button', { type: 'button', className: 'dsr-activity__session', key: item.id, title: (item.title || item.id) + ' · ' + formatExactNumber(item.tokens) + ' token · ' + formatExactDuration(item.durationMs), onClick: function () { if (typeof props.onSelect === 'function') props.onSelect(item.id); } }, [
            h('span', { className: 'dsr-activity__session-name', key: 'name', title: item.title }, item.title || item.id),
            h('span', { className: 'dsr-activity__session-turns', key: 'turns' }, item.turns + ' 轮'),
            h('span', { className: 'dsr-activity__session-value', key: 'value' }, formatDuration(timeMode === 'sum' ? item.durationMs : (item.busyMs > 0 ? item.busyMs : item.durationMs))),
            h('span', { className: 'dsr-activity__session-tokens', key: 'tokens' }, formatTokens(item.tokens) + ' tok'),
          ]);
        })),
    ]),
  ]);
}

function PageSearchView(props) {
  const state = props.state;
  const status = state.ui.searchStatus;
  return h('div', { className: 'dsr-page__view dsr-searchpage' }, [
    h('div', { className: 'dsr-searchpage__form', key: 'form' }, [
      h(SearchBox, { key: 'box', value: state.ui.query, onChange: function (value) { props.controller.setQuery(value); }, onSubmit: function () { props.controller.searchContent(); }, autoFocus: false, placeholder: '搜索会话标题、工作区或消息内容' }),
      h('button', { type: 'button', className: 'dsr-button dsr-button--primary', key: 'go', onClick: function () { props.controller.searchContent(); }, disabled: state.ui.query.trim() === '' }, h(Icon, { name: 'search', size: 14 }), '搜索'),
    ]),
    h('p', { className: 'dsr-searchpage__hint', key: 'hint' }, '消息内容搜索使用 DSH 的会话索引，不会打开或唤醒会话。按 Enter 也可以执行。'),
    status === 'loading' ? h(SkeletonRows, { key: 'loading', count: 3 }) : null,
    status === 'error' ? h('div', { className: 'dsr-banner is-error', key: 'error' }, [h(Icon, { name: 'warning', size: 13 }), h('span', null, state.error || '搜索失败')]) : null,
    status === 'ready' && state.ui.searchResults.length === 0 ? h('div', { className: 'dsr-page__empty', key: 'empty' }, h(EmptyRadar, { compact: true, title: '没有命中', text: '换一个更短的关键词，或只在左侧列表按标题筛选。' })) : null,
    status === 'ready' && state.ui.searchResults.length > 0 ? h('div', { key: 'results', style: { marginTop: '14px' } }, [
      h('div', { className: 'dsr-page__sectionhead', key: 'head', style: { paddingLeft: 0, paddingRight: 0 } }, [h('h2', { key: 't' }, '消息命中'), h('span', { key: 'c' }, state.ui.searchResults.length + ' 条' + (state.ui.searchHasMore ? '（仅显示前 ' + state.ui.searchResults.length + ' 条）' : ''))]),
      ...state.ui.searchResults.map(function (item) {
        return h('button', { type: 'button', className: 'dsr-result', key: item.sessionId, onClick: function () { props.onOpen(item.sessionId); } }, [
          h('span', { className: 'dsr-result__title', key: 't' }, item.title),
          h('span', { className: 'dsr-result__snippet', key: 's' }, item.snippet || '（没有可展示的摘要）'),
          h('span', { className: 'dsr-result__meta', key: 'm' }, item.workspace || ''),
        ]);
      }),
    ]) : null,
  ]);
}

function RadarPage(props) {
  const controller = props.controller;
  const state = useRadar(controller);
  const now = useNow(5000);
  const [view, setView] = useState('live');
  const [selectedId, setSelectedId] = useState(null);
  const [sortMode, setSortMode] = useState('recent');
  useEffect(function () {
    if (!state.ui.workspaceFocusAt) return;
    setView('workspaces');
    setSelectedId(null);
  }, [state.ui.workspaceFocusAt]);
  useEffect(function () {
    if (!state.ui.statisticsFocusAt) return;
    setView('activity');
    setSelectedId(null);
  }, [state.ui.statisticsFocusAt]);
  useEffect(function () {
    if (selectedId !== null && !state.entries.some(function (entry) { return entry.id === selectedId; }) && !(state.archivedEntries || []).some(function (entry) { return entry.id === selectedId; })) setSelectedId(null);
  }, [state.entries, state.archivedEntries, selectedId]);
  const filtered = filterEntries(state.entries, state.ui.query, state.ui.filters);
  const active = sortEntries(filtered.filter(isLiveEntry), 'live');
  const recent = sortEntries(filtered, sortMode);
  const selected = selectedId === null ? null : state.entries.find(function (entry) { return entry.id === selectedId; }) || (state.archivedEntries || []).find(function (entry) { return entry.id === selectedId; }) || null;
  const selectedPool = state.entries.concat(state.archivedEntries || []);
  const settingsOpen = state.ui.prefsOpen === true;
  useEffect(function () {
    if (!settingsOpen) return;
    const close = function (event) { if (event.key === 'Escape') { event.preventDefault(); controller.togglePrefs(); } };
    window.addEventListener('keydown', close, true);
    return function () { window.removeEventListener('keydown', close, true); };
  }, [settingsOpen, controller]);
  const onSelect = function (id) { if (state.ui.prefsOpen) controller.togglePrefs(); setSelectedId(id); controller.markRead(id); };
  const onOpen = function (id) { controller.openSession(id); };
  const onPin = function (id) { controller.togglePin(id); };
  const workspaceCount = state.workspaces ? state.workspaces.length : 0;
  return h('div', {
    className: 'dsr-page',
    'data-glyph-external': '',
    'data-dsh-session-radar-view': 'page',
    'data-card-tint': state.prefs.cardTint || 'sand',
    'data-card-texture': state.prefs.cardTexture || 'paper',
  }, [
    h('header', { className: 'dsr-page__head', key: 'head' }, [
      h('div', { className: 'dsr-page__heading', key: 'heading' }, [
        h('span', { className: 'dsr-page__mark', key: 'mark' }, h(RadarGlyph, { size: 23, active: state.counts.active + state.counts.waiting > 0 })),
        h('div', { className: 'dsr-page__copy', key: 'copy' }, [
          h('div', { className: 'dsr-page__titlerow', key: 'row' }, [
            h('h1', { className: 'dsr-page__title', key: 'title' }, '会话雷达'),
            h('span', { className: cx('dsr-page__live', state.counts.active + state.counts.waiting > 0 && 'is-on'), key: 'live' }, [
              h('span', { className: 'dsr-dot', key: 'd', 'aria-hidden': 'true' }),
              state.counts.active + state.counts.waiting > 0 ? (state.counts.active + state.counts.waiting) + ' 个任务进行中' : '当前静默',
            ]),
          ]),
          h('p', { className: 'dsr-page__sub', key: 'sub' }, '把并行任务、工作区与上下文收进一张矩阵'),
        ]),
      ]),
      h('div', { className: 'dsr-page__toolbar', key: 'toolbar' }, [
        h(SearchBox, { key: 'search', value: state.ui.query, onChange: function (value) { controller.setQuery(value); }, onSubmit: function () { controller.searchContent(); }, placeholder: '搜索会话或消息' }),
        h(IconButton, { key: 'refresh', name: 'refresh', label: '刷新全部数据', onClick: function () { controller.refresh(); } }),
        h(IconButton, { key: 'prefs', name: 'settings', label: '打开设置侧边栏', title: '设置', active: state.ui.prefsOpen === true, onClick: function () { if (selectedId !== null) setSelectedId(null); controller.togglePrefs(); } }),
        h(IconButton, { key: 'float', name: 'external', label: '打开悬浮雷达', onClick: function () { controller.open(); } }),
      ]),
    ]),
    h('div', { className: 'dsr-page__stats', key: 'stats' }, [
      h(Stat, { key: 'active', icon: 'pulse', tone: 'green', label: '运行中', value: String(state.counts.active), title: '正在执行或调用工具的会话' }),
      h(Stat, { key: 'waiting', icon: 'warning', tone: 'amber', label: '等待你', value: String(state.counts.waiting), title: '等待审批或回答' }),
      state.counts.stalled > 0 ? h(Stat, { key: 'stalled', icon: 'warning', tone: 'red', label: '卡住', value: String(state.counts.stalled), title: '工具调用或运行中的静默超过安全区间（' + stallWindowLabel(state.stallAfterMs) + '）才提醒' }) : null,
      h(Stat, { key: 'workspaces', icon: 'folder', label: '工作区', value: String(workspaceCount), title: '已加载的工作区' }),
      h(Stat, { key: 'tokens', icon: 'token', label: '累计 tokens', value: formatTokens(state.counts.tokenSum), title: '已同步会话的 token 总和' }),
      h(Stat, { key: 'sessions', icon: 'session', tone: 'accent', label: '会话总数', value: String(state.counts.total || 0), title: '目录中已同步的会话总数' }),
    ]),
    h('div', { className: 'dsr-page__views', key: 'views' }, [
      h('div', { className: 'dsr-tabs', key: 'tabs' }, [
        h('button', { type: 'button', className: cx('dsr-tab', view === 'live' && 'is-active'), key: 'live', onClick: function () { setView('live'); } }, ['实况', h('span', { className: 'dsr-tab__count' }, String(active.length))]),
        h('button', { type: 'button', className: cx('dsr-tab', view === 'workspaces' && 'is-active'), key: 'workspaces', onClick: function () { setView('workspaces'); } }, ['工作区', h('span', { className: 'dsr-tab__count' }, String(workspaceCount))]),
        h('button', { type: 'button', className: cx('dsr-tab', view === 'usage' && 'is-active'), key: 'usage', onClick: function () { setView('usage'); } }, ['用量']),
        h('button', { type: 'button', className: cx('dsr-tab', view === 'activity' && 'is-active'), key: 'activity', onClick: function () { setView('activity'); } }, ['统计信息']),
        h('button', { type: 'button', className: cx('dsr-tab', view === 'search' && 'is-active'), key: 'search', onClick: function () { setView('search'); } }, ['搜索']),
      ]),
      h('span', { className: cx('dsr-footer__status', 'is-' + state.streaming), key: 'stream' }, [
        h('span', { className: 'dsr-dot', 'aria-hidden': 'true' }),
        state.streaming === 'reconnecting' ? '事件流重连中' : state.streaming === 'live' ? '实时' : '目录已同步',
      ]),
    ]),
    h('div', { className: cx('dsr-page__body', selected && !settingsOpen && 'has-selection', settingsOpen && 'has-settings'), key: 'body' }, [
      h('div', { className: 'dsr-page__list', key: 'list' }, [
        state.phase !== 'ready' && state.entries.length === 0 ? h(SkeletonRows, { key: 'skeleton', count: 5 }) : null,
        state.error ? h('div', { className: 'dsr-banner is-error', key: 'error' }, [h(Icon, { name: 'warning', size: 13 }), h('span', null, state.error), h('button', { type: 'button', className: 'dsr-banner__action', onClick: function () { controller.refresh(); } }, '重试')]) : null,
        view === 'live' ? h(PageLiveView, {
          key: 'live', entries: filtered, active: active, recent: recent, state: state, now: now, selectedId: selectedId, defaultRange: state.prefs.defaultRange || '7d',
          sort: sortMode, onSort: setSortMode,
          onSelect: onSelect, onOpen: onOpen, onPin: onPin,
          onNew: function () { controller.startSession(); },
          onFilter: function (key, value) { controller.setFilter(key, value); },
          onClearFilters: function () { controller.clearFilters(); },
        }) : null,
        view === 'workspaces' ? h(WorkspaceBoard, {
          key: 'workspaces', state: state, controller: controller, now: now,
          focusId: state.ui.workspaceFocus, focusAt: state.ui.workspaceFocusAt,
          onSelect: onSelect, onOpen: onOpen, onPin: onPin,
          onShowStats: function (scope) { if (typeof controller.showStatisticsFor === 'function') controller.showStatisticsFor(scope); },
        }) : null,
        view === 'usage' ? h(UsageView, { key: 'usage', entries: filterEntries(state.entries, state.ui.query), state: state, controller: controller, now: now, onSelect: onSelect }) : null,
        view === 'activity' ? h(ActivityView, { key: 'activity', state: state, controller: controller, now: now, onSelect: onSelect }) : null,
        view === 'search' ? h(PageSearchView, { key: 'search', state: state, controller: controller, onOpen: onOpen }) : null,
      ]),
      settingsOpen ? h('aside', { className: 'dsr-page__settings', key: 'settings', 'aria-label': '雷达设置' },
        h(PrefsSidebar, { controller: controller, prefs: state.prefs, state: state, variant: 'page', onClose: function () { controller.togglePrefs(); } })
      ) : null,
      selected && !settingsOpen ? h('aside', { className: 'dsr-page__detail', key: 'detail', 'aria-label': '会话详情' },
        h(DetailPanel, { key: selected.id, entry: selected, controller: controller, now: now, variant: 'page', entries: selectedPool, onSelect: function (id) { setSelectedId(id); }, onBack: function () { setSelectedId(null); } })
      ) : null,
    ]),
  ]);
}

function RadarPanelIcon(props) {
  const size = props.size || 16;
  return h('svg', {
    viewBox: '0 0 16 16',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    'data-dsh-panel-entry': 'session-radar',
  }, [
    iconCircle(8, 8, 6.1, { opacity: 0.32, key: 'a' }),
    iconCircle(8, 8, 3.1, { opacity: 0.55, key: 'b' }),
    iconPath('M8 8V2', { key: 'sweep' }),
    h('circle', { cx: 8, cy: 8, r: 1, fill: 'currentColor', stroke: 'none', key: 'dot' }),
  ]);
}

function installRadarStyles() {
  if (typeof document === 'undefined') return;
  const id = 'dsh-session-radar';
  // The plugin bundle can be hot-reloaded while the previous style tag is still
  // mounted. Update that tag in place instead of returning early, otherwise the
  // new UI renders with stale CSS (card appearance controls stop taking effect).
  const selector = 'style[data-plugin-css="' + id + '"], style[data-plugin="' + id + '"]';
  const existing = typeof document.querySelectorAll === 'function'
    ? document.querySelectorAll(selector)
    : [document.querySelector(selector)];
  let updated = false;
  for (const style of existing) {
    if (!style) continue;
    updated = true;
    if (!style.hasAttribute('data-plugin')) style.setAttribute('data-plugin', id);
    if (!style.hasAttribute('data-plugin-css')) style.setAttribute('data-plugin-css', id);
    if (style.textContent !== RADAR_CSS) style.textContent = RADAR_CSS;
  }
  if (updated) return;
  const style = document.createElement('style');
  style.dataset.plugin = id;
  style.dataset.pluginCss = id;
  style.textContent = RADAR_CSS;
  document.head.appendChild(style);
}

const inject = ['slots', 'sessions', 'workspaces', 'remote', 'remote.session', 'uiWorkspace', 'layout'];

function apply(ctx) {
  if (ctx.slots === undefined || ctx.sessions === undefined) return;
  installRadarStyles();
  const controller = new RadarController(ctx);
  const disposers = [];
  const register = function (slot, options, component, injected) {
    try {
      const dispose = ctx.slots.inject(slot, function () {
        return ctx.slots.register(injected ? { ...options, inject: injected } : options, component);
      });
      disposers.push(dispose);
    } catch (error) {
      console.warn('[dsh-session-radar] slot registration failed:', slot, error);
    }
  };
  register('sidebar.panellist', { name: 'sidebar.panellist', id: 'session-radar', order: 17, label: function () { return '会话雷达'; } }, RadarPanelIcon);
  register('main', { name: 'main', key: 'session-radar' }, function (props) { return h(RadarPage, { controller: controller }); });
  register('shell.overlay', { name: 'shell.overlay', id: 'session-radar.dock' }, Dock, function () { return { controller: controller }; });
  const shortcuts = ctx.get ? ctx.get('shortcuts') : undefined;
  if (shortcuts && shortcuts.register !== undefined) {
    controller.hasShortcut = true;
    try {
      const dispose = shortcuts.register({
        id: 'sessionRadar.toggle',
        label: function () { return '切换会话雷达'; },
        aliases: ['open session radar', 'toggle session radar'],
        defaults: {
          'desktop:windows': { code: 'KeyR', modifiers: ['alt'] },
          'desktop:macos': { code: 'KeyR', modifiers: ['alt'] },
          'desktop:linux': { code: 'KeyR', modifiers: ['alt'] },
          'web:windows': { code: 'KeyR', modifiers: ['primary', 'alt', 'shift'] },
          'web:macos': { code: 'KeyR', modifiers: ['primary', 'alt', 'shift'] },
        },
        regions: ['page', 'editable', 'terminal'],
        modals: [],
        resolve: function () { return { status: 'handled', run: function () { controller.toggle(); } }; },
      });
      disposers.push(dispose);
    } catch (error) {
      console.warn('[dsh-session-radar] shortcut registration failed:', error);
      controller.hasShortcut = false;
    }
    const pinShortcuts = [
      {
        id: 'sessionRadar.pinnedNext', code: 'BracketRight',
        label: '切换到下一个固定会话', aliases: ['next pinned session'],
        run: function () { return controller.cyclePinned(1); },
      },
      {
        id: 'sessionRadar.pinnedPrev', code: 'BracketLeft',
        label: '切换到上一个固定会话', aliases: ['previous pinned session'],
        run: function () { return controller.cyclePinned(-1); },
      },
      {
        id: 'sessionRadar.pinCurrent', code: 'KeyP',
        label: '固定或取消固定当前会话', aliases: ['pin current session', 'unpin current session'],
        run: function () { return controller.togglePinnedCurrent(); },
      },
    ];
    for (const spec of pinShortcuts) {
      const defaults = {
        'desktop:windows': { code: spec.code, modifiers: ['alt'] },
        'desktop:macos': { code: spec.code, modifiers: ['alt'] },
        'desktop:linux': { code: spec.code, modifiers: ['alt'] },
        'web:windows': { code: spec.code, modifiers: ['alt'] },
        'web:macos': { code: spec.code, modifiers: ['alt'] },
      };
      try {
        const dispose = shortcuts.register({
          id: spec.id,
          label: function () { return spec.label; },
          aliases: spec.aliases,
          defaults: defaults,
          regions: ['page', 'editable'],
          modals: [],
          resolve: function () { return { status: 'handled', run: spec.run }; },
        });
        disposers.push(dispose);
        controller.hasShortcut = true;
      } catch (error) {
        console.warn('[dsh-session-radar] pinned shortcut registration failed:', spec.id, error);
      }
    }
  } else {
    controller.hasShortcut = false;
  }
  ctx.effect(function () {
    return function () {
      for (const dispose of disposers.splice(0)) {
        try { dispose(); } catch (error) { /* disposal is best-effort during reload */ }
      }
      controller.dispose();
    };
  }, 'session-radar: browser surfaces');
}


    exports.apply = apply;
    exports.inject = inject;
    if (globalThis.__DSR_TEST__ === true) exports.__components = { Dock, SidebarPins, SidebarPinRow, QuickBar, RadarPage, DetailPanel, SessionRow, PrefsMenu, EmptyRadar, UsageView, ActivityView, PageSearchView, SearchResultsPanel, SessionCard, WorkspaceBoard, HistorySessionCard, BulkBar, SessionFlow, TurnRow };
    return module.exports;
  },
});
