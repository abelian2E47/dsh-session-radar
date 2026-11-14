/**
 * Pure telemetry and presentation helpers for dsh-session-manager.
 *
 * The module deliberately has no imports and no React: the browser entry is
 * produced by concatenating it into a single DSH client bundle, while the unit
 * tests import this file directly. Everything here is deterministic and
 * side-effect free except for the tiny JSON-storage helpers at the bottom.
 */

/** Tool names that mutate files and therefore produce a deliverable record. */
export const MUTATING_TOOLS = new Set([
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
export const STATUS_LABELS = {
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
export const STALL_AFTER_MS = 5 * 60 * 1000;
/** Bounds for the user-chosen safety window, in minutes. */
export const STALL_MINUTES_MIN = 1;
export const STALL_MINUTES_MAX = 120;
export const STALL_MINUTES_DEFAULT = STALL_AFTER_MS / 60000;

/** Clamp a user-supplied safety window (milliseconds) into the supported range. */
export function normalizeStallMs(value) {
  const ms = Number(value);
  const fallback = STALL_AFTER_MS;
  if (!Number.isFinite(ms) || ms <= 0) return fallback;
  return Math.min(STALL_MINUTES_MAX * 60000, Math.max(STALL_MINUTES_MIN * 60000, Math.round(ms)));
}

/** Clamp the settings value (minutes) into the supported range. */
export function normalizeStallMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return STALL_MINUTES_DEFAULT;
  return Math.min(STALL_MINUTES_MAX, Math.max(STALL_MINUTES_MIN, Math.round(minutes * 10) / 10));
}

/** Status filter vocabulary shared by the filter bar and the core predicate. */
export const STATUS_FILTERS = [
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
export function isStalledEntry(entry, now = Date.now(), stallAfterMs = STALL_AFTER_MS) {
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
export function toolCategory(name) {
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
export function toolLabel(name) {
  return TOOL_LABELS[name] || String(name || '工具');
}

/** Whether a value is a plain record. */
export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse JSON without throwing. */
export function safeParseJson(value) {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** Collapse whitespace and cap a string for a single-line UI slot. */
export function truncate(value, max = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** Basename accepting both Windows and POSIX separators. */
export function basename(value) {
  const trimmed = String(value ?? '').replace(/[\\/]+$/, '');
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return at === -1 ? trimmed : trimmed.slice(at + 1);
}

/** Lowercase file extension without the dot, or an empty string. */
export function fileExtension(name) {
  const base = basename(name);
  const at = base.lastIndexOf('.');
  return at <= 0 ? '' : base.slice(at + 1).toLowerCase();
}

/** Compact token count: 923, 12.4k, 3.08M, 1.2B. */
export function formatTokens(value) {
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
export function formatRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '—';
  return formatTokens(number) + '/min';
}

/** Exact token count with grouping separators. */
export function formatTokensExact(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '0';
  return Math.round(number).toLocaleString('zh-CN');
}

/** Short elapsed duration. */
export function formatDuration(ms) {
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
export function formatRelative(timestamp, now = Date.now()) {
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
export function formatClock(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '—';
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/** Sum every billable bucket reported by tokenUsage. */
export function tokenTotal(tokens) {
  if (!isRecord(tokens)) return 0;
  return (
    (Number(tokens.uncachedInputTokens) || 0) +
    (Number(tokens.cacheReadTokens) || 0) +
    (Number(tokens.cacheWriteTokens) || 0) +
    (Number(tokens.outputTokens) || 0)
  );
}

/** Prompt-side token count from one provider usage sample. */
export function promptTokens(usage) {
  if (!isRecord(usage)) return 0;
  return (
    (Number(usage.inputTokens ?? usage.uncachedInputTokens) || 0) +
    (Number(usage.cacheReadTokens) || 0) +
    (Number(usage.cacheWriteTokens) || 0)
  );
}

/** Context utilization as a 0..1 ratio, or null when not measurable. */
export function contextRatio(pressure) {
  if (!isRecord(pressure)) return null;
  const used = Number(pressure.pressureTokens ?? pressure.projectedTokens);
  const capacity = Number(pressure.contextWindow);
  if (!Number.isFinite(used) || used <= 0 || !Number.isFinite(capacity) || capacity <= 0) return null;
  return Math.min(1, used / capacity);
}

/** Normalize the todo projection/event payload. */
export function normalizeTodos(value) {
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
export function todoProgress(todos) {
  if (!Array.isArray(todos) || todos.length === 0) return null;
  const done = todos.filter(item => item.status === 'completed').length;
  return { done, total: todos.length, percent: Math.round((done / todos.length) * 100) };
}

/** Create the mutable per-session telemetry accumulator. */
export function createTelemetry(row) {
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
export function applyProjectionValues(telemetry, values) {
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
export function applyState(telemetry, state) {
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
export const MAX_TURNS = 200;

/** How much of a round's own words are kept, so a whole round reads back verbatim. */
export const MAX_TURN_PROMPT = 4000;
export const MAX_TURN_TEXT = 6000;
export const MAX_TURN_REASONING = 2500;

/** Tool calls kept per turn: enough to read one whole round of work. */
export const MAX_TURN_CHAIN = 40;

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
    firstSeq: 0,
    lastSeq: 0,
    chain: [],
  };
  telemetry.turns.push(turn);
  if (telemetry.fullHistory !== true && telemetry.turns.length > MAX_TURNS) telemetry.turns = telemetry.turns.slice(-MAX_TURNS);
  return turn;
}

/** Turn an event belongs to; the tail read can start mid-turn, so create one. */
function ensureTurn(telemetry, at) {
  return currentTurn(telemetry) || openTurn(telemetry, telemetry.turn || 1, at);
}

/** Build the human description of one tool call. */
export function describeToolCall(name, argumentsText) {
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
export function upsertDeliverable(telemetry, item) {
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
export function reduceEvent(telemetry, input) {
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
      let fullText = '';
      let fullReasoning = '';
      if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (!isRecord(block)) continue;
          if (block.type === 'reasoning' && typeof block.text === 'string') fullReasoning += block.text;
          if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
            fullText += (fullText === '' ? '' : '\n\n') + block.text;
            hasText = true;
          }
        }
      }
      // The live line only ever shows a preview, so it stays short; the turn keeps
      // the whole body so the panel can unfold the real reply later.
      if (fullReasoning !== '') telemetry.reasoning = truncate(fullReasoning, 220);
      if (hasText) telemetry.lastText = truncate(fullText, 500);
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
      if (hasText) messageTurn.text = telemetry.fullHistory === true ? fullText : truncate(fullText, MAX_TURN_TEXT);
      if (fullReasoning !== '') messageTurn.reasoning = telemetry.fullHistory === true ? fullReasoning : truncate(fullReasoning, MAX_TURN_REASONING);
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
          ensureTurn(telemetry, time).prompt = telemetry.fullHistory === true ? text : truncate(text, MAX_TURN_PROMPT);
        }
      }
      break;
    }
    default: break;
  }
  if (Number.isFinite(seq)) {
    const activeTurn = currentTurn(telemetry);
    if (activeTurn !== null) {
      if (!(Number(activeTurn.firstSeq) > 0)) activeTurn.firstSeq = seq;
      activeTurn.lastSeq = seq;
    }
  }
  syncPendingSince(telemetry, time);
  return true;
}

/**
 * Remember when the session started waiting for the user, so the UI can show
 * how long an approval or question has been sitting unanswered.
 */
export function syncPendingSince(telemetry, time) {
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
export function reduceEvents(telemetry, records) {
  if (!Array.isArray(records)) return 0;
  let changed = 0;
  for (const record of records) if (reduceEvent(telemetry, record)) changed += 1;
  return changed;
}

/** Current status, combining roster, passive state, and telemetry. */
export function deriveStatus(telemetry, row) {
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
export function phaseLabel(telemetry) {
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
export function activeTool(telemetry) {
  const calls = Object.values(telemetry.pendingCalls || {});
  if (calls.length === 0) return null;
  return calls.sort((a, b) => b.startedAt - a.startedAt)[0];
}

/**
 * Presentation rows for the session flow: one per turn, oldest first.
 * Every row carries the tool chain and the files that turn delivered.
 */
export function buildTurnViews(telemetry, now = Date.now()) {
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
      firstSeq: Number(turn.firstSeq) || 0,
      lastSeq: Number(turn.lastSeq) || 0,
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
export function deriveEntry(row, telemetry, options = {}) {
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
    // DSH keeps ordinary forks out of parentId: the branch facts live in the
    // row's forkLineage projection, so the tree has to read them from there.
    forkSource: forkSourceOf(row) || telemetry.forkSource || '',
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
export function sortEntries(entries, mode = 'live') {
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
export const SIDEBAR_PIN_MAX = 6;

/** Statuses that count as "still working" for the sidebar pin strip. */
const SIDEBAR_LIVE_STATUSES = new Set(['running', 'tool', 'approval', 'question']);

/**
 * The sessions the left sidebar lifts above the workspace tree: pinned
 * sessions first (ordered like the live rail), then the ones still working,
 * capped so the workspace list keeps most of the column. The session the user
 * currently has open keeps its slot even when it would fall past the cap — the
 * same courtesy the right-edge quick bar gives it.
 */
export function sidebarPinSessions(entries, options = {}) {
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
export function localDayKey(value) {
  const date = new Date(Number(value) || Date.now());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

/** Local two-digit hour key (00–23) for intraday activity buckets. */
export function localHourKey(value) {
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
export function mergeSpans(list, start = 0, end = Infinity) {
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
export function spanTotalMs(spans) {
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
export function activityBuckets(days, mode = 'day', now = Date.now(), options = {}) {
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
export const ACTIVITY_GRAINS = ['hour', 'day', 'week', 'month'];

/** Bucket ceiling for one custom window; coarser grains keep the page fast. */
const MAX_RANGE_BUCKETS = 240;

/**
 * Inclusive local-day bounds for a custom window given two YYYY-MM-DD keys.
 * Missing or unusable keys fall back to today and reversed keys are swapped,
 * so the UI can hand over whatever the date inputs currently hold.
 */
export function activityRangeBounds(from, to, now = Date.now()) {
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
export function activityRangeGrain(grain, start, end) {
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
export function activityRange(days, options = {}, now = Date.now()) {
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
export function activityWall(days, now = Date.now(), weeks = 53, range = null, scope = null) {
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
export const TIME_FILTERS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
];

/** Local timestamp floor for a time filter, or 0 when unbounded. */
export function timeFilterFloor(range, now = Date.now()) {
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
export function matchesStatus(entry, status, now = Date.now(), stallAfterMs = STALL_AFTER_MS) {
  if (!status || status === 'all') return true;
  if (status === 'live') return entry.status === 'running' || entry.status === 'tool';
  if (status === 'waiting') return entry.status === 'approval' || entry.status === 'question';
  if (status === 'stalled') return isStalledEntry(entry, now, stallAfterMs);
  if (status === 'finished') return entry.status === 'done' || entry.status === 'migration';
  if (status === 'idle') return entry.status === 'idle';
  return true;
}

/** Case-insensitive local filter across visible fields, narrowed by time, workspace, model and status. */
export function filterEntries(entries, query, filters) {
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
export function filterOptions(entries, now = Date.now(), options = {}) {
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
export function filterDeliverables(items, range, now = Date.now()) {
  const floor = timeFilterFloor(range, Number(now) || Date.now());
  const list = Array.isArray(items) ? items : [];
  if (floor <= 0) return list.slice();
  return list.filter(item => (Number(item?.at) || 0) >= floor);
}

/** Flatten and dedupe deliverables across entries for the delivery board. */
export function aggregateDeliverables(entries) {
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
export function computeCounts(entries) {
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
export function toolBreakdown(turns, limit = 6) {
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
export function turnDigest(turn) {
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
export function sessionBranches(entries, id) {
  const list = Array.isArray(entries) ? entries : [];
  const self = list.find(entry => entry && entry.id === id) || null;
  const parentId = self && self.parentId ? String(self.parentId) : '';
  const parent = parentId ? list.find(entry => entry && entry.id === parentId) || null : null;
  const children = list.filter(entry => entry && entry.id !== id && entry.parentId === id);
  return { self, parentId, parent, children };
}

/** How a tree row came to exist, in the words the panel uses. */
export const TREE_KIND_TEXT = { root: '根会话', fork: '分叉', subagent: '子代理' };

/**
 * The lineage tree around one session: walk up to the topmost ancestor, then
 * depth-first through every fork and subagent child, pruning the branches the
 * caller has collapsed. Rows are what the panel draws; nothing here mutates the
 * entries or depends on their order in the ledger.
 */
/** Session a row was forked from, from whichever field carries it. */
function forkSourceOf(row) {
  if (!isRecord(row)) return '';
  const direct = typeof row.forkSource === 'string' ? row.forkSource : '';
  if (direct !== '') return direct;
  const values = isRecord(row.projectionValues) ? row.projectionValues : null;
  const lineage = values !== null && isRecord(values.forkLineage) ? values.forkLineage : null;
  const source = lineage !== null && typeof lineage.sourceSessionId === 'string' ? lineage.sourceSessionId : '';
  return source;
}

export function sessionTree(entries, id, options = {}) {
  const list = (Array.isArray(entries) ? entries : []).filter(entry => isRecord(entry) && typeof entry.id === 'string' && entry.id !== '');
  const byId = new Map();
  for (const entry of list) if (!byId.has(entry.id)) byId.set(entry.id, entry);
  const currentId = typeof id === 'string' ? id : '';
  const parentOf = entry => {
    const candidates = [entry.parentId, entry.forkSource, forkSourceOf(entry)];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || candidate === '' || candidate === entry.id) continue;
      if (byId.has(candidate)) return candidate;
    }
    return '';
  };
  if (!byId.has(currentId)) return { rootId: '', currentId, rows: [], total: 0 };
  let rootId = currentId;
  const climbed = new Set();
  let cursor = byId.get(currentId);
  while (cursor !== undefined) {
    if (climbed.has(cursor.id)) break;
    climbed.add(cursor.id);
    const parent = parentOf(cursor);
    if (parent === '') break;
    rootId = parent;
    cursor = byId.get(parent);
  }
  const children = new Map();
  for (const entry of byId.values()) {
    const parent = parentOf(entry);
    if (parent === '') continue;
    const bucket = children.get(parent);
    if (bucket === undefined) children.set(parent, [entry]);
    else bucket.push(entry);
  }
  for (const bucket of children.values()) {
    bucket.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0) || String(a.id).localeCompare(String(b.id)));
  }
  const collapsed = new Set((Array.isArray(options.collapsed) ? options.collapsed : []).filter(item => typeof item === 'string'));
  const rawDepth = Number(options.maxDepth);
  const maxDepth = Number.isFinite(rawDepth) && rawDepth >= 0 ? Math.floor(rawDepth) : Number.POSITIVE_INFINITY;
  const rows = [];
  const seen = new Set();
  const walk = (nodeId, depth) => {
    const entry = byId.get(nodeId);
    if (entry === undefined || seen.has(nodeId)) return;
    seen.add(nodeId);
    const kids = children.get(nodeId) || [];
    const isCollapsed = kids.length > 0 && collapsed.has(nodeId);
    rows.push({
      id: nodeId,
      entry,
      depth,
      kind: nodeId === rootId ? 'root' : entry.origin === 'subagent' ? 'subagent' : 'fork',
      children: kids.length,
      collapsed: isCollapsed,
      current: nodeId === currentId,
    });
    if (isCollapsed || depth >= maxDepth) return;
    for (const kid of kids) walk(kid.id, depth + 1);
  };
  walk(rootId, 0);
  return { rootId, currentId, rows, total: rows.length, collapsed };
}

/**
 * Which round of a session a fork cut belongs to: the round whose log span
 * contains the cut seq, or 0 when the rounds are not loaded or the cut is
 * unknown. The branch tree hangs a child session under the round it was cut
 * from, so this is what turns a flat lineage into a conversation tree.
 */
export function roundIndexForSeq(turns, atSeq) {
  const seq = Number(atSeq) || 0;
  const list = Array.isArray(turns) ? turns : [];
  if (seq <= 0 || list.length === 0) return 0;
  for (const turn of list) {
    if (!isRecord(turn)) continue;
    const last = Number(turn.lastSeq) || 0;
    if (last > 0 && last >= seq) return Number(turn.index) || 0;
  }
  return 0;
}

/**
 * One session's place in the branch forest, nested.
 *
 * The link a branch was cut from is not in DSH's own session summary: an
 * ordinary fork records no source session, only an inherited event prefix. The
 * records this plugin keeps when it cuts a branch carry that link, subagents
 * keep DSH's parentage, and older rows may still carry a lineage projection, so
 * every one of those is consulted before a row is treated as its own root.
 */
export function branchForest(entries, branches, currentId) {
  const list = (Array.isArray(entries) ? entries : [])
    .filter(entry => isRecord(entry) && typeof entry.id === 'string' && entry.id !== '');
  const byId = new Map();
  for (const entry of list) if (!byId.has(entry.id)) byId.set(entry.id, entry);
  const records = isRecord(branches) ? branches : {};
  const recordOf = function (id) {
    const record = records[id];
    return isRecord(record) ? record : null;
  };
  const parentOf = function (entry) {
    const record = recordOf(entry.id);
    const candidates = [record ? record.parentId : '', entry.parentId, entry.forkSource, forkSourceOf(entry)];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || candidate === '' || candidate === entry.id) continue;
      if (byId.has(candidate)) return candidate;
    }
    return '';
  };
  const current = typeof currentId === 'string' ? currentId : '';
  const empty = { rootId: '', currentId: current, root: null, path: [], total: 0, forks: 0, subagents: 0 };
  if (!byId.has(current)) {
    // A session the panel was opened for can still be its own single root while
    // its row is missing from the catalog; nothing else can be placed without it.
    return empty;
  }
  let rootId = current;
  const climbed = new Set();
  let cursor = byId.get(current);
  while (cursor !== undefined) {
    if (climbed.has(cursor.id)) break;
    climbed.add(cursor.id);
    const parent = parentOf(cursor);
    if (parent === '') break;
    rootId = parent;
    cursor = byId.get(parent);
  }
  const children = new Map();
  for (const entry of byId.values()) {
    const parent = parentOf(entry);
    if (parent === '') continue;
    const bucket = children.get(parent);
    if (bucket === undefined) children.set(parent, [entry]);
    else bucket.push(entry);
  }
  for (const bucket of children.values()) {
    bucket.sort(function (left, right) {
      const leftSeq = Number(recordOf(left.id)?.atSeq) || 0;
      const rightSeq = Number(recordOf(right.id)?.atSeq) || 0;
      // Branches stay in the order of the rounds they were cut from; a branch
      // without a recorded cut falls to the end, newest activity first.
      if (leftSeq > 0 && rightSeq > 0 && leftSeq !== rightSeq) return leftSeq - rightSeq;
      if (leftSeq > 0 && rightSeq === 0) return -1;
      if (leftSeq === 0 && rightSeq > 0) return 1;
      return (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0) || String(left.id).localeCompare(String(right.id));
    });
  }
  const seen = new Set();
  let total = 0;
  let forks = 0;
  let subagents = 0;
  const build = function (id, depth) {
    const entry = byId.get(id);
    if (entry === undefined || seen.has(id)) return null;
    seen.add(id);
    total += 1;
    const kind = id === rootId ? 'root' : entry.origin === 'subagent' ? 'subagent' : 'fork';
    if (kind === 'fork') forks += 1;
    else if (kind === 'subagent') subagents += 1;
    const record = recordOf(id);
    const kids = [];
    for (const kid of children.get(id) || []) {
      const node = build(kid.id, depth + 1);
      if (node !== null) kids.push(node);
    }
    return {
      id,
      entry,
      kind,
      depth,
      current: id === current,
      record,
      atSeq: record ? Number(record.atSeq) || 0 : 0,
      turnIndex: record ? Number(record.turnIndex) || 0 : 0,
      title: String(entry.title || entry.displayTitle || entry.id || ''),
      children: kids,
    };
  };
  const root = build(rootId, 0);
  const path = [];
  const search = function (node) {
    if (node === null) return false;
    path.push(node.id);
    if (node.current === true) return true;
    for (const kid of node.children) if (search(kid)) return true;
    path.pop();
    return false;
  };
  search(root);
  return { rootId, currentId: current, root, path, total, forks, subagents };
}

/** Depth-first ids of one subtree, the node itself first. */
export function branchSubtreeIds(node, out = []) {
  if (!isRecord(node) || typeof node.id !== 'string') return out;
  out.push(node.id);
  for (const kid of Array.isArray(node.children) ? node.children : []) branchSubtreeIds(kid, out);
  return out;
}

/** The node with this id anywhere in the forest, or null. */
export function branchFindNode(node, id) {
  if (!isRecord(node)) return null;
  if (node.id === id) return node;
  for (const kid of Array.isArray(node.children) ? node.children : []) {
    const found = branchFindNode(kid, id);
    if (found !== null) return found;
  }
  return null;
}

/** How much a subtree holds, in the words the delete confirmation uses. */
export function branchSubtreeSize(node, roundsOf) {
  const ids = branchSubtreeIds(node);
  let rounds = 0;
  let running = 0;
  const walk = function (item) {
    if (!isRecord(item)) return;
    const rounds_ = typeof roundsOf === 'function' ? roundsOf(item.id) : null;
    rounds += Array.isArray(rounds_) ? rounds_.length : 0;
    if (item.entry && item.entry.running === true) running += 1;
    for (const kid of Array.isArray(item.children) ? item.children : []) walk(kid);
  };
  walk(node);
  return { sessions: ids.length, rounds, running };
}

const TURN_STATE_TEXT = { done: '已完成', running: '进行中', open: '已中断', error: '有失败' };

const FILE_TOOL_TEXT = { write: '写入', edit: '编辑', apply_patch: '补丁', str_replace_editor: '编辑', present: '交付' };

/**
 * Markdown report of one session: what each round asked for, what the agent
 * replied, which tools it ran and which files it touched. Built for the
 * "导出报告" button so a run can be pasted into a note or a PR.
 */
export function sessionReportMarkdown(entry, options = {}) {
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
export function fileAddress(sessionId, path) {
  const normalized = String(path || '').replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
  const encode = segment => encodeURIComponent(segment).replace(/%3A/gi, ':');
  return 'dsh-resource://file/session/' + encode(String(sessionId)) + '/' + normalized.split('/').map(encode).join('/');
}

/** Last two path segments, enough to identify a file in a dense row. */
export function shortPath(path) {
  const normalized = String(path || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 2) return normalized;
  return '…/' + parts.slice(-2).join('/');
}

/** Safe JSON read from a Web Storage-like object. */
export function readStoredJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    if (typeof raw !== 'string' || raw === '') return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Safe JSON write; storage failures are intentionally silent. */
export function writeStoredJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
