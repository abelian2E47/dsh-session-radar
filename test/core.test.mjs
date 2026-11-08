import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MUTATING_TOOLS,
  applyProjectionValues,
  applyState,
  activityBuckets,
  mergeSpans,
  spanTotalMs,
  activityRange,
  activityRangeBounds,
  activityRangeGrain,
  activityWall,
  aggregateDeliverables,
  basename,
  computeCounts,
  contextRatio,
  createTelemetry,
  deriveEntry,
  deriveStatus,
  describeToolCall,
  fileAddress,
  filterDeliverables,
  filterEntries,
  filterOptions,
  formatDuration,
  formatRate,
  formatTokens,
  isStalledEntry,
  matchesStatus,
  normalizeStallMinutes,
  normalizeStallMs,
  sidebarPinSessions,
  SIDEBAR_PIN_MAX,
  STALL_MINUTES_DEFAULT,
  sessionReportMarkdown,
  sessionBranches,
  sessionTree,
  TREE_KIND_TEXT,
  MAX_TURNS,
  MAX_TURN_PROMPT,
  MAX_TURN_TEXT,
  turnDigest,
  STALL_AFTER_MS,
  toolBreakdown,
  localDayKey,
  localHourKey,
  normalizeTodos,
  reduceEvent,
  sortEntries,
  tokenTotal,
  toolCategory,
  truncate,
  upsertDeliverable,
} from '../src/core.mjs';

function row(patch = {}) {
  return {
    id: 'session-a',
    displayTitle: '测试会话',
    title: '测试会话',
    running: true,
    blank: false,
    updatedAt: 1_000,
    cwd: 'E:\\repo',
    ...patch,
  };
}

function event(type, seq, data = {}, time = Date.now() + seq * 10) {
  return { type, seq, time, data };
}

test('formats counts and durations without noise', () => {
  assert.equal(formatTokens(999), '999');
  assert.equal(formatTokens(1234), '1.2k');
  assert.equal(formatTokens(12_345), '12k');
  assert.equal(formatTokens(1_234_567), '1.23M');
  assert.equal(formatTokens(999_400_000), '999M');
  assert.equal(formatTokens(1_000_000_000), '1B');
  assert.equal(formatTokens(1_234_000_000), '1.23B');
  assert.equal(formatTokens(12_500_000_000), '12.5B');
  assert.equal(formatTokens(123_000_000_000), '123B');
  assert.equal(formatRate(2617), '2.6k/min');
  assert.equal(formatRate(0), '—');
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(450), '450ms');
  assert.equal(formatDuration(12_400), '12s');
  assert.equal(formatDuration(64_000), '1m 4s');
  assert.equal(formatDuration(3_900_000), '1h 5m');
});

test('deriveEntry separates current turn time from cumulative work time', () => {
  const telemetry = createTelemetry(row({ running: false }));
  telemetry.turnStartedAt = 1_000;
  telemetry.completedAt = 61_000;
  telemetry.stats = { llmMs: 120_000, toolMs: 30_000 };
  const entry = deriveEntry(row({ running: false }), telemetry, { now: 100_000 });
  assert.equal(entry.turnTimeMs, 60_000);
  assert.equal(entry.totalTimeMs, 150_000);
});

test('token total includes all four buckets and context ratio is bounded', () => {
  const tokens = { uncachedInputTokens: 100, outputTokens: 50, cacheReadTokens: 20, cacheWriteTokens: 5 };
  assert.equal(tokenTotal(tokens), 175);
  assert.equal(contextRatio({ pressureTokens: 250, contextWindow: 1000 }), 0.25);
  assert.equal(contextRatio({ pressureTokens: 2000, contextWindow: 1000 }), 1);
  assert.equal(contextRatio({ pressureTokens: 10 }), null);
});

test('normalizes todos and computes progress', () => {
  const todos = normalizeTodos([
    { content: ' one ', status: 'completed' },
    { content: 'two', status: 'in_progress' },
    { content: '', status: 'pending' },
    { content: 'three', status: 'bogus' },
  ]);
  assert.deepEqual(todos, [
    { content: 'one', status: 'completed' },
    { content: 'two', status: 'in_progress' },
    { content: 'three', status: 'pending' },
  ]);
});

test('reduces a tool call lifecycle and captures a changed file', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, { turn: 1 }));
  reduceEvent(t, event('step/start', 2, { step: 1 }));
  const args = JSON.stringify({ path: 'E:\\repo\\out.md', content: 'hello' });
  reduceEvent(t, event('tool/call', 3, { turn: 1, step: 1, callId: 'call-1', name: 'write', arguments: args }));
  assert.equal(Object.keys(t.pendingCalls).length, 1);
  assert.equal(t.actions[0].label, '写入文件');
  assert.equal(t.actions[0].path, 'E:\\repo\\out.md');
  reduceEvent(t, event('tool/result', 4, {
    turn: 1,
    step: 1,
    message: { source: { kind: 'tool', callId: 'call-1' }, toolCallId: 'call-1', isError: false, content: [{ type: 'text', text: 'ok' }] },
  }));
  assert.equal(Object.keys(t.pendingCalls).length, 0);
  assert.equal(t.actions[0].status, 'done');
  assert.equal(t.deliverables.length, 1);
  assert.equal(t.deliverables[0].name, 'out.md');
  assert.equal(t.deliverables[0].kind, 'changed');
});

test('does not record failed or view-only edits', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('tool/call', 1, { callId: 'a', name: 'edit', arguments: JSON.stringify({ path: 'x.js' }) }));
  reduceEvent(t, event('tool/result', 2, { message: { toolCallId: 'a', isError: true, content: [] } }));
  reduceEvent(t, event('tool/call', 3, { callId: 'b', name: 'str_replace_editor', arguments: JSON.stringify({ command: 'view', path: 'y.js' }) }));
  reduceEvent(t, event('tool/result', 4, { message: { toolCallId: 'b', isError: false, content: [] } }));
  assert.equal(t.deliverables.length, 0);
});

test('reads presented files and keeps one row per path', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('deliverables/presented', 1, {
    turn: 1,
    files: [{ path: 'E:\\repo\\report.docx', description: '最终报告' }],
  }));
  upsertDeliverable(t, { path: 'E:\\repo\\report.docx', kind: 'changed', tool: 'write', at: 5000 });
  assert.equal(t.deliverables.length, 1);
  assert.equal(t.deliverables[0].kind, 'presented');
  assert.equal(t.deliverables[0].description, '最终报告');
});

test('tracks thinking, current tool, pending input, and completion', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, { turn: 2 }));
  reduceEvent(t, event('step/start', 2, { step: 4 }));
  assert.equal(deriveStatus(t, row()), 'running');
  reduceEvent(t, event('tool/call', 3, { callId: 'z', name: 'run_code', arguments: JSON.stringify({ description: '检查文件结构' }) }));
  assert.equal(deriveStatus(t, row()), 'tool');
  assert.equal(t.pendingCalls.z.detail, '检查文件结构');
  applyState(t, { pendingInput: ['approval'], queue: [{ id: 1 }] });
  assert.equal(deriveStatus(t, row()), 'approval');
  reduceEvent(t, event('approval/decided', 4));
  reduceEvent(t, event('turn/end', 5));
  assert.equal(deriveStatus(t, row({ running: false })), 'done');
  assert.equal(t.queueLength, 1);
});

test('projection values carry title, tokens, pressure, stats and todos', () => {
  const t = createTelemetry(row());
  applyProjectionValues(t, {
    title: '实时标题',
    tokenUsage: { totals: { uncachedInputTokens: 10, outputTokens: 20, cacheReadTokens: 30, cacheWriteTokens: 40 }, last: { buckets: { uncachedInputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 0 } } },
    contextPressure: { pressureTokens: 600, contextWindow: 1000, projectedTokens: 610 },
    sessionStats: { steps: 7, turns: 2 },
    todos: [{ content: '写测试', status: 'completed' }, { content: '做 UI', status: 'in_progress' }],
    agentPreset: 'omd-ptc',
    modelSelection: { lastUsed: { provider: 'rain-wb', model: 'deepseek-v4.1-flash' } },
    turnOutline: { turns: [{ prompt: '计划', response: '交付完成' }] },
  });
  const entry = deriveEntry(row(), t, { now: 2000, workspace: 'dsh-dev' });
  assert.equal(entry.title, '实时标题');
  assert.equal(entry.tokenTotal, 100);
  assert.equal(entry.contextPercent, 60);
  assert.equal(entry.stats.steps, 7);
  assert.equal(entry.progress.percent, 50);
  assert.equal(entry.currentTodo.content, '做 UI');
  assert.equal(entry.workspace, 'dsh-dev');
  assert.equal(entry.preset, 'omd-ptc');
  assert.equal(entry.model, 'deepseek-v4.1-flash');
  assert.equal(t.lastUsage.inputTokens, 1);
  assert.equal(entry.lastText, '交付完成');
});

test('falls back to assistant usage and context window when projections are unavailable', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('request/context', 1, { contextWindow: 1000 }));
  reduceEvent(t, event('assistant/message', 2, {
    turn: 1,
    step: 1,
    message: { role: 'assistant', content: [{ type: 'text', text: 'done' }], source: { provider: 'rain-wb', model: 'm' } },
    usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 300, cacheWriteTokens: 0 },
  }));
  const entry = deriveEntry(row(), t, { now: Date.now() });
  assert.equal(entry.tokenTotal, 420);
  assert.equal(entry.contextPercent, 40);
});

test('filters and sorts without mutating input', () => {
  const entries = [
    { title: 'Alpha', status: 'idle', pinned: false, updatedAt: 10, actions: [], deliverables: [] },
    { title: 'Beta', status: 'running', pinned: true, updatedAt: 20, actions: [], deliverables: [] },
    { title: 'Gamma', status: 'approval', pinned: false, updatedAt: 30, actions: [], deliverables: [] },
  ];
  assert.deepEqual(sortEntries(entries).map(entry => entry.title), ['Beta', 'Gamma', 'Alpha']);
  assert.deepEqual(filterEntries(entries, 'beta').map(entry => entry.title), ['Beta']);
  assert.equal(entries[0].title, 'Alpha');
});

test('counts and aggregate deliverables are stable', () => {
  const entries = [
    { id: 'a', title: 'A', workspace: 'w', status: 'running', unread: false, pinned: true, tokenTotal: 10, deliverableCount: 1, stats: { steps: 2 }, deliverables: [{ path: 'x', at: 1 }] },
    { id: 'b', title: 'B', workspace: 'w', status: 'approval', unread: true, pinned: false, tokenTotal: 20, deliverableCount: 0, stats: { steps: 3 }, deliverables: [] },
  ];
  assert.deepEqual(computeCounts(entries), { active: 1, waiting: 1, unread: 1, pinned: 1, stalled: 0, tokenSum: 30, steps: 5, deliverables: 1, total: 2 });
  const flat = aggregateDeliverables(entries);
  assert.equal(flat.length, 1);
  assert.equal(flat[0].sessionId, 'a');
  assert.equal(flat[0].workspace, 'w');
});

test('describes tool calls and builds file addresses', () => {
  assert.deepEqual(describeToolCall('run_code', JSON.stringify({ description: '生成报表' })), { label: '执行代码', detail: '生成报表', path: '' });
  assert.equal(describeToolCall('bash', JSON.stringify({ command: 'git status' })).detail, 'git status');
  assert.equal(toolCategory('run_code'), 'code');
  assert.equal(toolCategory('write'), 'file');
  assert.equal(toolCategory('present'), 'deliver');
  assert.equal(basename('C:\\a\\b.txt'), 'b.txt');
  assert.equal(fileAddress('session x', 'E:\\repo\\a b.txt'), 'dsh-resource://file/session/session%20x/E:/repo/a%20b.txt');
});

test('rejects stale event sequences and truncates strings', () => {
  const t = createTelemetry(row());
  assert.equal(reduceEvent(t, event('step/start', 5, { step: 1 })), true);
  assert.equal(reduceEvent(t, event('step/start', 4, { step: 2 })), false);
  assert.equal(truncate('a   b\nc', 20), 'a b c');
  assert.equal(truncate('abcdefghij', 5), 'abcd…');
});

test('mutation set covers the first-party file tools', () => {
  assert.ok(MUTATING_TOOLS.has('write'));
  assert.ok(MUTATING_TOOLS.has('edit'));
  assert.ok(MUTATING_TOOLS.has('apply_patch'));
  assert.ok(MUTATING_TOOLS.has('str_replace_editor'));
});


test('records one flow row per turn with its tool chain and deliverables', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, { turn: 1 }, 1_000));
  reduceEvent(t, event('user/message', 2, { source: { kind: 'user' }, content: [{ type: 'text', text: '先把页面做得更有层次' }] }, 1_100));
  reduceEvent(t, event('step/start', 3, { step: 1 }, 1_200));
  reduceEvent(t, event('tool/call', 4, { callId: 'w1', name: 'write', arguments: JSON.stringify({ path: 'E:\\repo\\a.md' }) }, 1_300));
  reduceEvent(t, event('tool/result', 5, { message: { toolCallId: 'w1', isError: false, content: [] } }, 1_800));
  reduceEvent(t, event('deliverables/presented', 6, { turn: 1, files: [{ path: 'E:\\repo\\report.docx' }] }, 1_900));
  reduceEvent(t, event('turn/end', 7, {}, 2_400));
  reduceEvent(t, event('turn/start', 8, { turn: 2 }, 2_500));
  reduceEvent(t, event('tool/call', 9, { callId: 'r1', name: 'run_code', arguments: JSON.stringify({ description: '核对布局' }) }, 2_600));

  const entry = deriveEntry(row(), t, { now: 3_000 });
  assert.equal(entry.toolCount, 2);
  assert.equal(entry.turns.length, 2);
  assert.equal(entry.turns[0].state, 'done');
  assert.equal(entry.turns[0].prompt, '先把页面做得更有层次');
  assert.equal(entry.turns[0].steps, 1);
  assert.equal(entry.turns[0].tools, 1);
  assert.equal(entry.turns[0].durationMs, 1_400);
  assert.equal(entry.turns[0].chain[0].status, 'done');
  assert.deepEqual(entry.turns[0].deliverables.map(item => item.name), ['a.md', 'report.docx']);
  assert.equal(entry.turns[1].state, 'running');
  assert.equal(entry.turns[1].chain[0].label, '执行代码');
  assert.deepEqual(entry.turns[1].deliverables, []);
});

test('creates a turn row when the tail read starts mid-turn', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('tool/call', 1, { callId: 'x', name: 'read_file', arguments: JSON.stringify({ path: 'a.txt' }) }));
  const entry = deriveEntry(row(), t, { now: 5_000 });
  assert.equal(entry.turns.length, 1);
  assert.equal(entry.turns[0].tools, 1);
  assert.equal(entry.turns[0].state, 'running');
});

test('filters sessions by time window, workspace and model', () => {
  const now = new Date(2026, 0, 10, 12, 0, 0).getTime();
  const day = 24 * 60 * 60 * 1000;
  const entries = [
    { id: 'a', workspace: 'alpha', model: 'm-one', updatedAt: now - 1000, title: 'a', cwd: '', actions: [] },
    { id: 'b', workspace: 'beta', model: 'm-one', updatedAt: now - 8 * day, title: 'b', cwd: '', actions: [] },
    { id: 'c', workspace: 'alpha', model: 'm-two', updatedAt: now - 2 * day, title: 'c', cwd: '', actions: [] },
  ];
  assert.deepEqual(filterEntries(entries, '', { workspace: 'alpha' }).map(entry => entry.id), ['a', 'c']);
  assert.deepEqual(filterEntries(entries, '', { model: 'm-one' }).map(entry => entry.id), ['a', 'b']);
  assert.deepEqual(filterEntries(entries, '', { range: '7d', now }).map(entry => entry.id), ['a', 'c']);
  assert.deepEqual(filterEntries(entries, '', { range: 'today', now }).map(entry => entry.id), ['a']);
  assert.deepEqual(filterEntries(entries, '', { workspace: 'alpha', model: 'm-two', range: '7d', now }).map(entry => entry.id), ['c']);
});

test('limits deliverables to the selected local time window', () => {
  const now = new Date(2026, 10, 7, 12, 0, 0, 0).getTime();
  const day = 24 * 60 * 60 * 1000;
  const items = [
    { name: 'today', at: now - 2 * 60 * 60 * 1000 },
    { name: 'fresh', at: now - 2 * day },
    { name: 'stale', at: now - 8 * day },
  ];
  assert.deepEqual(filterDeliverables(items, '7d', now).map(item => item.name), ['today', 'fresh']);
  assert.deepEqual(filterDeliverables(items, 'today', now).map(item => item.name), ['today']);
  assert.deepEqual(filterDeliverables(items, 'all', now).map(item => item.name), ['today', 'fresh', 'stale']);
});

test('collects filter options for workspaces and models', () => {
  const options = filterOptions([
    { id: 'a', workspace: 'beta', model: 'm2' },
    { id: 'b', workspace: 'alpha', model: 'm1' },
    { id: 'c', workspace: 'alpha', model: '' },
  ]);
  assert.deepEqual(options.workspaces, [{ value: 'alpha', label: 'alpha', count: 2 }, { value: 'beta', label: 'beta', count: 1 }]);
  assert.deepEqual(options.models, [{ value: 'm1', label: 'm1', count: 1 }, { value: 'm2', label: 'm2', count: 1 }]);
});

test('activity buckets roll daily sessions into day, week and month windows', () => {
  const now = new Date(2026, 10, 7, 12).getTime();
  const days = {
    '2026-11-07': { tokens: 120, durationMs: 60_000, turns: 2, sessions: { s1: { title: '会话一', tokens: 120, durationMs: 60_000, turns: 2 } } },
    '2026-11-06': { tokens: 80, durationMs: 30_000, turns: 1, sessions: { s2: { title: '会话二', tokens: 80, durationMs: 30_000, turns: 1 } } },
    '2026-10-30': { tokens: 50, durationMs: 10_000, turns: 1, sessions: { s1: { title: '会话一', tokens: 50, durationMs: 10_000, turns: 1 } } },
  };
  const day = activityBuckets(days, 'day', now);
  assert.equal(day.buckets.length, 14);
  assert.equal(day.totalTokens, 250);
  assert.equal(day.buckets[day.buckets.length - 1].tokens, 120);
  const week = activityBuckets(days, 'week', now);
  assert.equal(week.buckets.length, 12);
  assert.equal(week.totalTokens, 250);
  const month = activityBuckets(days, 'month', now);
  assert.equal(month.buckets.length, 12);
  assert.equal(month.totalTokens, 250);
  assert.equal(month.sessionTotals.find(item => item.id === 's1').tokens, 170);
  assert.equal(localDayKey(new Date(2026, 10, 7, 23, 30).getTime()), '2026-11-07');
});

test('tracks model calls per turn and model mix for intraday activity', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, { turn: 1 }, 1_000));
  reduceEvent(t, event('assistant/message', 2, {
    message: { source: { provider: 'deepseek', model: 'deepseek-v4.1-flash' }, content: [{ type: 'text', text: '第一段' }] },
    usage: { inputTokens: 100, outputTokens: 20 },
  }, 1_200));
  reduceEvent(t, event('assistant/message', 3, {
    message: { source: { provider: 'deepseek', model: 'deepseek-v4.1' }, content: [{ type: 'text', text: '第二段' }] },
    usage: { inputTokens: 60, outputTokens: 10 },
  }, 1_400));
  const entry = deriveEntry(row(), t, { now: 2_000 });
  assert.equal(entry.turns[0].calls, 2);
  assert.deepEqual(entry.turns[0].models, { 'deepseek-v4.1-flash': 1, 'deepseek-v4.1': 1 });
  assert.equal(entry.turns[0].model, 'deepseek-v4.1-flash');
  assert.deepEqual(entry.turns[0].modelTokens, { 'deepseek-v4.1-flash': 120, 'deepseek-v4.1': 70 });
  assert.equal(localHourKey(new Date(2026, 10, 7, 9, 30).getTime()), '09');

  const now = new Date(2026, 10, 7, 12).getTime();
  const today = activityBuckets({
    '2026-11-07': {
      tokens: 120, durationMs: 60_000, turns: 2, calls: 3,
      models: { 'deepseek-v4.1-flash': 2, 'deepseek-v4.1': 1 },
      modelTokens: { 'deepseek-v4.1-flash': 80, 'deepseek-v4.1': 40 },
      sessions: { s1: { title: '会话一', tokens: 120, durationMs: 60_000, turns: 2, calls: 3, models: { 'deepseek-v4.1-flash': 2, 'deepseek-v4.1': 1 } } },
      hours: {
        '09': { tokens: 80, durationMs: 40_000, turns: 1, calls: 2, models: { 'deepseek-v4.1-flash': 2 }, sessions: { s1: { title: '会话一', tokens: 80, durationMs: 40_000, turns: 1, calls: 2, models: { 'deepseek-v4.1-flash': 2 } } } },
        '14': { tokens: 40, durationMs: 20_000, turns: 1, calls: 1, models: { 'deepseek-v4.1': 1 }, sessions: { s1: { title: '会话一', tokens: 40, durationMs: 20_000, turns: 1, calls: 1, models: { 'deepseek-v4.1': 1 } } } },
      },
    },
  }, 'today', now);
  assert.equal(today.buckets.length, 24);
  assert.equal(today.totalTokens, 120);
  assert.equal(today.totalCalls, 3);
  assert.equal(today.buckets[9].tokens, 80);
  assert.equal(today.buckets[14].calls, 1);
  assert.equal(today.modelTotals[0].name, 'deepseek-v4.1-flash');
  assert.equal(today.modelTotals[0].calls, 2);
  assert.equal(today.totalModelTokens, 120);
  assert.equal(today.modelTotals[0].tokens, 80);
});

test('activity wall builds 53 seven-day columns and marks future cells', () => {
  const now = new Date(2026, 10, 7, 12).getTime();
  const wall = activityWall({ '2026-11-07': { tokens: 120, durationMs: 60_000, turns: 1, sessions: {} } }, now, 53);
  assert.equal(wall.weeks.length, 53);
  for (const week of wall.weeks) assert.equal(week.length, 7);
  assert.equal(wall.activeDays, 1);
  assert.equal(wall.totalTokens, 120);
  const todayCell = wall.weeks[wall.weeks.length - 1].find(cell => cell.key === '2026-11-07');
  assert.equal(todayCell.level, 4);
  assert.equal(wall.weeks[wall.weeks.length - 1].some(cell => cell.future), true);
});

test('custom activity windows aggregate any start and end day', () => {
  const now = new Date(2026, 10, 7, 12).getTime();
  const days = {
    '2026-11-07': {
      tokens: 120, durationMs: 60_000, turns: 2,
      sessions: { s1: { title: '会话一', tokens: 120, durationMs: 60_000, turns: 2 } },
      hours: {
        '09': { tokens: 70, durationMs: 40_000, turns: 1, sessions: { s1: { title: '会话一', tokens: 70, durationMs: 40_000, turns: 1 } } },
        '15': { tokens: 50, durationMs: 20_000, turns: 1, sessions: { s1: { title: '会话一', tokens: 50, durationMs: 20_000, turns: 1 } } },
      },
    },
    '2026-11-06': { tokens: 80, durationMs: 30_000, turns: 1, sessions: { s2: { title: '会话二', tokens: 80, durationMs: 30_000, turns: 1 } } },
    '2026-10-30': { tokens: 50, durationMs: 10_000, turns: 1, sessions: { s1: { title: '会话一', tokens: 50, durationMs: 10_000, turns: 1 } } },
  };
  const twoDays = activityRange(days, { from: '2026-11-06', to: '2026-11-07', grain: 'day' }, now);
  assert.equal(twoDays.mode, 'custom');
  assert.equal(twoDays.grain, 'day');
  assert.equal(twoDays.days, 2);
  assert.equal(twoDays.buckets.length, 2);
  assert.equal(twoDays.totalTokens, 200);
  assert.deepEqual(twoDays.sessionTotals.map(item => item.id).sort(), ['s1', 's2']);
  assert.equal(twoDays.buckets[1].tokens, 120);

  const hourly = activityRange(days, { from: '2026-11-07', to: '2026-11-07', grain: 'hour' }, now);
  assert.equal(hourly.buckets.length, 24);
  assert.equal(hourly.totalTokens, 120);
  assert.equal(hourly.buckets[9].tokens, 70);
  assert.equal(hourly.buckets[15].tokens, 50);

  const months = activityRange(days, { from: '2026-01-01', to: '2026-11-07', grain: 'month' }, now);
  assert.equal(months.buckets.length, 11);
  assert.equal(months.totalTokens, 250);
});

test('custom activity windows normalise reversed, missing and oversized ranges', () => {
  const now = new Date(2026, 10, 7, 12).getTime();
  const reversed = activityRangeBounds('2026-11-07', '2026-11-01', now);
  assert.equal(localDayKey(reversed.start), '2026-11-01');
  assert.equal(localDayKey(reversed.end - 1), '2026-11-07');
  const missing = activityRangeBounds('', 'nonsense', now);
  assert.equal(localDayKey(missing.start), '2026-11-07');
  assert.equal(localDayKey(missing.end - 1), '2026-11-07');
  assert.equal(activityRangeGrain('hour', new Date(2026, 10, 7).getTime(), new Date(2026, 10, 8).getTime()), 'hour');
  assert.equal(activityRangeGrain('hour', new Date(2020, 0, 1).getTime(), new Date(2026, 0, 1).getTime()), 'month');
});

test('activity wall dims the days outside a chosen window', () => {
  const now = new Date(2026, 10, 7, 12).getTime();
  const days = {
    '2026-11-07': { tokens: 120, durationMs: 60_000, turns: 2, sessions: {} },
    '2026-11-06': { tokens: 80, durationMs: 30_000, turns: 1, sessions: {} },
    '2026-10-30': { tokens: 50, durationMs: 10_000, turns: 1, sessions: {} },
  };
  const bounds = activityRangeBounds('2026-11-06', '2026-11-07', now);
  const wall = activityWall(days, now, 53, bounds);
  assert.equal(wall.activeDays, 2);
  assert.equal(wall.totalTokens, 200);
  assert.equal(wall.weeks.flat().filter(cell => cell.outside === true).length > 300, true);
  const plain = activityWall(days, now, 53);
  assert.equal(plain.totalTokens, 250);
  assert.equal(plain.activeDays, 3);
  assert.equal(plain.weeks.flat().some(cell => cell.outside === true), false);
});

test('every turn keeps its whole tool chain, its files and what the model said', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, { turn: 1 }, 1_000));
  reduceEvent(t, event('user/message', 2, { source: { kind: 'user' }, content: [{ text: '上半年的统计也给你' }] }, 1_050));
  reduceEvent(t, event('assistant/message', 3, {
    message: { source: { model: 'deepseek-v4.1' }, content: [{ type: 'reasoning', text: '先看聚合模块' }, { type: 'text', text: '我先读 core.mjs' }] },
  }, 1_100));
  for (let index = 0; index < 12; index += 1) {
    reduceEvent(t, event('tool/call', 10 + index * 2, {
      callId: 'c' + index, name: 'write', arguments: JSON.stringify({ path: 'E:\\repo\\f' + (index % 2) + '.mjs' }),
    }, 1_200 + index * 10));
    reduceEvent(t, event('tool/result', 11 + index * 2, { callId: 'c' + index, message: { content: [{ text: 'ok' }] } }, 1_205 + index * 10));
  }
  reduceEvent(t, event('turn/end', 40, {}, 1_500));
  const entry = deriveEntry(row({ running: false }), t, { now: 2_000 });
  const turn = entry.turns[0];
  assert.equal(turn.chain.length, 12);
  assert.equal(turn.chainTotal, 12);
  assert.equal(turn.chain[0].path, 'E:\\repo\\f0.mjs');
  assert.equal(turn.text, '我先读 core.mjs');
  assert.equal(turn.reasoning, '先看聚合模块');
  assert.deepEqual(turn.deliverables.map(item => item.name).sort(), ['f0.mjs', 'f1.mjs']);
  assert.deepEqual(turn.deliverables.map(item => item.kind), ['changed', 'changed']);
});

test('waiting, stall and throughput signals come from the event log', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, {}, 1_000));
  reduceEvent(t, event('assistant/message', 2, {
    message: { content: [{ type: 'text', text: '先跑一遍测试' }] },
    usage: { inputTokens: 4_000, outputTokens: 1_000 },
  }, 2_000));
  reduceEvent(t, event('approval/asked', 3, {}, 3_000));
  assert.equal(t.pendingSince, 3_000);

  const waiting = deriveEntry(row(), t, { now: 63_000 });
  assert.equal(waiting.status, 'approval');
  assert.equal(waiting.waitingMs, 60_000);
  assert.equal(waiting.stalled, false);
  assert.ok(waiting.tokensPerMinute > 0);

  reduceEvent(t, event('approval/decided', 4, {}, 64_000));
  assert.equal(t.pendingSince, 0);
  assert.equal(deriveEntry(row(), t, { now: 65_000 }).waitingMs, 0);
});

test('a running tool call is only flagged once it passes the safety window', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, {}, 10_000));
  reduceEvent(t, event('tool/call', 2, { name: 'run_bash', callId: 'c1', arguments: { command: 'npm test' } }, 11_000));
  const at = ms => deriveEntry(row(), t, { now: 11_000 + ms });
  assert.equal(at(60_000).stalled, false);
  assert.equal(at(4 * 60_000).stalled, false);
  const quiet = at(STALL_AFTER_MS + 1);
  assert.equal(quiet.stalled, true);
  assert.ok(quiet.stalledMs >= STALL_AFTER_MS);
  assert.equal(quiet.stallAfterMs, STALL_AFTER_MS);
  assert.equal(isStalledEntry(quiet, 11_000 + STALL_AFTER_MS + 1), true);
  assert.equal(matchesStatus(quiet, 'stalled', 11_000 + STALL_AFTER_MS + 1), true);
  assert.equal(matchesStatus(quiet, 'live', 11_000 + STALL_AFTER_MS + 1), true);
  // the user's own window beats the default in both directions
  const impatient = deriveEntry(row(), t, { now: 11_000 + 2 * 60_000, stallAfterMs: 60_000 });
  assert.equal(impatient.stalled, true);
  assert.equal(impatient.stallAfterMs, 60_000);
  const relaxed = deriveEntry(row(), t, { now: 11_000 + 4 * 60_000, stallAfterMs: 30 * 60_000 });
  assert.equal(relaxed.stalled, false);
  assert.equal(deriveEntry(row(), t, { now: 11_000 + 31 * 60_000, stallAfterMs: 30 * 60_000 }).stalled, true);
});

test('the safety window clamps, and silence still reports once it runs out', () => {
  assert.equal(STALL_AFTER_MS, 5 * 60_000);
  assert.equal(STALL_MINUTES_DEFAULT, 5);
  assert.equal(normalizeStallMinutes(0), 5);
  assert.equal(normalizeStallMinutes(0.2), 1);
  assert.equal(normalizeStallMinutes(12.5), 12.5);
  assert.equal(normalizeStallMinutes(999), 120);
  assert.equal(normalizeStallMs(0), 5 * 60_000);
  assert.equal(normalizeStallMs(90_000), 90_000);
  assert.equal(normalizeStallMs(10 * 60 * 60 * 1000), 120 * 60_000);
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, {}, 10_000));
  reduceEvent(t, event('assistant/message', 2, { message: { content: [{ type: 'text', text: '想一下' }] } }, 10_500));
  assert.equal(deriveEntry(row(), t, { now: 10_500 + 4 * 60_000 }).stalled, false);
  const late = deriveEntry(row(), t, { now: 10_500 + 6 * 60_000 });
  assert.equal(late.stalled, true);
  // a derived record's own verdict wins over a fresh recomputation
  assert.equal(isStalledEntry({ status: 'tool', stalled: false, currentTool: { startedAt: 0 } }, 10 * 60_000), false);
  assert.equal(isStalledEntry({ status: 'tool', stalled: true }, 0), true);
});

test('the left sidebar pins running and pinned sessions above the workspace tree', () => {
  const entries = [
    { id: 'p1', status: 'done', pinned: true, updatedAt: 10 },
    { id: 'r1', status: 'running', updatedAt: 20 },
    { id: 'w1', status: 'approval', updatedAt: 30 },
    { id: 'i1', status: 'idle', updatedAt: 40 },
    { id: 'a1', status: 'running', updatedAt: 50, archived: true },
  ];
  const group = sidebarPinSessions(entries, { max: 10 });
  assert.deepEqual(group.items.map(entry => entry.id), ['p1', 'r1', 'w1']);
  assert.equal(group.total, 3);
  assert.equal(group.hidden, 0);
  assert.equal(group.pinnedCount, 1);
  assert.equal(group.liveCount, 2);
  assert.equal(SIDEBAR_PIN_MAX, 6);
  const many = entries.concat(Array.from({ length: 8 }, (_, index) => ({ id: 'x' + index, status: 'running', updatedAt: 60 + index })));
  const capped = sidebarPinSessions(many, { max: 3 });
  assert.equal(capped.items.length, 3);
  assert.equal(capped.hidden, capped.total - 3);
  const kept = sidebarPinSessions(many, { max: 3, currentId: 'x0' });
  assert.equal(kept.items.length, 3);
  assert.ok(kept.items.some(entry => entry.id === 'x0'));
  assert.equal(sidebarPinSessions([], {}).items.length, 0);
  assert.deepEqual(sidebarPinSessions([null, {}, { id: '' }], {}).items, []);
  // the session the user is reading survives even when idle and unpinned
  const browsing = sidebarPinSessions([...entries, { id: 'idle9', status: 'idle', updatedAt: 5 }], { currentId: 'idle9' });
  assert.deepEqual(browsing.items.map(entry => entry.id), ['p1', 'r1', 'w1', 'idle9']);
  assert.equal(browsing.hasCurrent, true);
  assert.equal(browsing.currentCount, 1);
  assert.equal(browsing.pinnedCount, 1);
  assert.equal(browsing.liveCount, 2);
  const moved = sidebarPinSessions([...entries, { id: 'idle9', status: 'idle', updatedAt: 5 }], { currentId: 'elsewhere' });
  assert.ok(!moved.items.some(entry => entry.id === 'idle9'));
  assert.equal(moved.hasCurrent, false);
});

test('status filters and sort orders narrow the board', () => {
  const entries = [
    { id: 'a', status: 'running', stalled: false, updatedAt: 300, turnTimeMs: 5_000, tokenTotal: 100, pinned: false },
    { id: 'b', status: 'approval', stalled: false, updatedAt: 200, turnTimeMs: 90_000, tokenTotal: 900, pinned: false },
    { id: 'c', status: 'done', stalled: false, updatedAt: 100, turnTimeMs: 1_000, tokenTotal: 500, pinned: false },
    { id: 'd', status: 'tool', stalled: true, updatedAt: 400, turnTimeMs: 1_000, tokenTotal: 50, pinned: false },
  ];
  const ids = list => list.map(entry => entry.id);
  assert.deepEqual(ids(filterEntries(entries, '', { status: 'live' })), ['a', 'd']);
  assert.deepEqual(ids(filterEntries(entries, '', { status: 'waiting' })), ['b']);
  assert.deepEqual(ids(filterEntries(entries, '', { status: 'stalled' })), ['d']);
  assert.deepEqual(ids(filterEntries(entries, '', { status: 'finished' })), ['c']);
  assert.deepEqual(ids(filterEntries(entries, '', { status: 'all' })), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(sortEntries(entries, 'longest')), ['b', 'a', 'd', 'c']);
  assert.deepEqual(ids(sortEntries(entries, 'tokens')), ['b', 'c', 'a', 'd']);
  const options = filterOptions(entries, 1_000);
  assert.equal(options.statuses.find(option => option.value === 'all').count, 4);
  assert.equal(options.statuses.find(option => option.value === 'live').count, 2);
  assert.equal(options.statuses.find(option => option.value === 'stalled').count, 1);
});

test('every round keeps the event seq window a fork can cut at', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 0, { turn: 1 }, 1_000));
  reduceEvent(t, event('user/message', 1, { source: { kind: 'user' }, content: [{ text: '先跑测试' }] }, 1_100));
  reduceEvent(t, event('tool/call', 2, { name: 'run_code', callId: 'c1', arguments: { description: '跑一遍' } }, 1_200));
  reduceEvent(t, event('tool/result', 3, { callId: 'c1', ok: true }, 1_300));
  reduceEvent(t, event('turn/end', 4, {}, 1_400));
  reduceEvent(t, event('turn/start', 5, { turn: 2 }, 1_500));
  const entry = deriveEntry(row(), t, { now: 2_000 });
  assert.equal(entry.turns.length, 2);
  assert.equal(entry.turns[0].firstSeq, 1);
  assert.equal(entry.turns[0].lastSeq, 4);
  assert.equal(entry.turns[0].state, 'done');
  assert.equal(entry.turns[1].firstSeq, 5);
  assert.equal(entry.turns[1].lastSeq, 5);
  assert.equal(entry.turns[1].state, 'running');
});

test('a long session keeps every round it needs, with the round text intact', () => {
  const t = createTelemetry(row());
  const longPrompt = 'x'.repeat(5000);
  const longReply = 'y'.repeat(7000);
  for (let round = 1; round <= 120; round += 1) {
    reduceEvent(t, event('turn/start', round * 10, { turn: round }, round * 10_000));
    reduceEvent(t, event('user/message', round * 10 + 1, { source: { kind: 'user' }, content: [{ text: round === 1 ? longPrompt : '第 ' + round + ' 轮' }] }, round * 10_000 + 100));
    reduceEvent(t, event('assistant/message', round * 10 + 2, {
      message: {
        role: 'assistant',
        source: { provider: 'rain-wb', model: 'deepseek-v4.1-flash' },
        content: [{ type: 'reasoning', text: 'think ' + round }, { type: 'text', text: round === 1 ? longReply : '好，第 ' + round + ' 轮做完了' }],
      },
    }, round * 10_000 + 200));
    reduceEvent(t, event('turn/end', round * 10 + 3, {}, round * 10_000 + 300));
  }
  const entry = deriveEntry(row(), t, { now: 2_000_000 });
  assert.equal(MAX_TURNS, 200);
  assert.equal(entry.turns.length, 120);
  assert.equal(entry.turns[0].index, 1);
  assert.equal(entry.turns[119].index, 120);
  assert.equal(entry.turns[0].prompt.length, MAX_TURN_PROMPT);
  assert.equal(entry.turns[0].text.length, MAX_TURN_TEXT);
  assert.equal(entry.turns[1].text, '好，第 2 轮做完了');
  assert.match(entry.turns[0].reasoning, /^think 1/);
});

test('the lineage tree nests forks and subagents and folds on demand', () => {
  const entries = [
    { id: 'a', title: '根', updatedAt: 10 },
    { id: 'b', title: '分叉一', updatedAt: 30, parentId: 'a' },
    { id: 'c', title: '子代理', updatedAt: 20, parentId: 'a', origin: 'subagent' },
    { id: 'd', title: '再分叉', updatedAt: 40, parentId: 'b' },
    { id: 'e', title: '无关会话', updatedAt: 5 },
  ];
  const tree = sessionTree(entries, 'd');
  assert.equal(tree.rootId, 'a');
  assert.deepEqual(tree.rows.map(item => item.id), ['a', 'b', 'd', 'c']);
  assert.deepEqual(tree.rows.map(item => item.depth), [0, 1, 2, 1]);
  assert.deepEqual(tree.rows.map(item => item.kind), ['root', 'fork', 'fork', 'subagent']);
  assert.equal(tree.rows[2].current, true);
  assert.equal(tree.rows[0].children, 2);
  assert.equal(TREE_KIND_TEXT.fork, '分叉');
  const folded = sessionTree(entries, 'd', { collapsed: ['b'] });
  assert.deepEqual(folded.rows.map(item => item.id), ['a', 'b', 'c']);
  assert.equal(folded.rows[1].collapsed, true);
  assert.equal(sessionTree(entries, 'e').rows.map(item => item.id).join(','), 'e');
  assert.equal(sessionTree(entries, 'missing').rows.length, 0);
  // cycles degrade to a walkable chain instead of looping forever
  const cyclic = sessionTree([{ id: 'x', parentId: 'y' }, { id: 'y', parentId: 'x' }], 'x');
  assert.deepEqual(cyclic.rows.map(item => item.id), ['x', 'y']);
});

test('tool breakdown and the markdown report describe a whole turn', () => {
  const t = createTelemetry(row());
  reduceEvent(t, event('turn/start', 1, { turn: 1 }, 1_000));
  reduceEvent(t, event('user/message', 2, { source: { kind: 'user' }, content: [{ text: '把统计区间做成可自定义' }] }, 1_100));
  reduceEvent(t, event('assistant/message', 3, {
    message: { source: { model: 'deepseek-v4.1' }, content: [{ type: 'reasoning', text: '先看聚合' }, { type: 'text', text: '我改一下 core' }] },
  }, 1_200));
  reduceEvent(t, event('tool/call', 4, { callId: 'c1', name: 'read_file', arguments: JSON.stringify({ path: 'E:\\repo\\core.mjs' }) }, 1_300));
  reduceEvent(t, event('tool/result', 5, { callId: 'c1', message: { content: [{ text: 'ok' }] } }, 2_300));
  reduceEvent(t, event('tool/call', 6, { callId: 'c2', name: 'write', arguments: JSON.stringify({ path: 'E:\\repo\\core.mjs' }) }, 2_400));
  reduceEvent(t, event('tool/result', 7, { callId: 'c2', message: { content: [{ text: 'ok' }] } }, 3_000));
  reduceEvent(t, event('turn/end', 8, {}, 3_600));
  const entry = deriveEntry(row({ running: false }), t, { now: 4_000 });
  const breakdown = toolBreakdown(entry.turns, 5);
  assert.equal(breakdown.length, 2);
  assert.ok(breakdown[0].totalMs >= breakdown[1].totalMs);
  const md = sessionReportMarkdown(entry, { now: 5_000 });
  assert.ok(md.startsWith('# 测试会话'));
  assert.ok(md.includes('**用户指令**'));
  assert.ok(md.includes('把统计区间做成可自定义'));
  assert.ok(md.includes('我改一下 core'));
  assert.ok(md.includes('**工具链**'));
  assert.ok(md.includes('core.mjs'));
  assert.ok(md.includes('**文件改动**'));
  assert.ok(md.includes('deepseek-v4.1'));
});


test('overlapping sessions count wall-clock time once', () => {
  const at = (hour, minute = 0) => new Date(2026, 10, 7, hour, minute).getTime();
  const hour = 60 * 60 * 1000;
  const days = {
    '2026-11-07': {
      tokens: 200, durationMs: 4 * hour, turns: 2,
      spans: [[at(13), at(15)], [at(14), at(16)]],
      sessions: {
        a: { title: '会话 A', tokens: 100, durationMs: 2 * hour, turns: 1, spans: [[at(13), at(15)]] },
        b: { title: '会话 B', tokens: 100, durationMs: 2 * hour, turns: 1, spans: [[at(14), at(16)]] },
      },
    },
  };
  const view = activityRange(days, { from: '2026-11-07', to: '2026-11-07', grain: 'day' }, at(20));
  assert.equal(view.totalDurationMs, 4 * hour);
  assert.equal(view.totalBusyMs, 3 * hour);
  assert.equal(view.overlapMs, hour);
  assert.equal(view.busyEstimated, false);
  assert.equal(view.buckets[0].busyMs, 3 * hour);
  const totals = Object.fromEntries(view.sessionTotals.map(item => [item.id, item.busyMs]));
  assert.deepEqual(totals, { a: 2 * hour, b: 2 * hour });
  assert.equal(view.spans.length, 1);
});

test('span merging coalesces, clips and ignores noise', () => {
  const at = (hour, minute = 0) => new Date(2026, 10, 7, hour, minute).getTime();
  assert.deepEqual(mergeSpans([[at(14), at(16)], [at(13), at(15)]]), [[at(13), at(16)]]);
  assert.deepEqual(mergeSpans([[at(13), at(14)], [at(14), at(15)]]), [[at(13), at(15)]]);
  assert.deepEqual(mergeSpans([[at(13), at(14)], [at(15), at(16)]]).length, 2);
  assert.deepEqual(mergeSpans([[at(13), at(15)]], at(14), at(14, 30)), [[at(14), at(14, 30)]]);
  assert.deepEqual(mergeSpans([[at(15), at(13)], ['x', 3], null]), []);
  assert.equal(spanTotalMs([[at(13), at(15)], [at(14), at(16)]]), 4 * 60 * 60 * 1000);
  assert.equal(spanTotalMs(mergeSpans([[at(13), at(15)], [at(14), at(16)]])), 3 * 60 * 60 * 1000);
});

test('hour windows keep the union and legacy ledgers fall back to the sum', () => {
  const at = (hour, minute = 0) => new Date(2026, 10, 7, hour, minute).getTime();
  const hour = 60 * 60 * 1000;
  const days = {
    '2026-11-07': {
      tokens: 200, durationMs: 4 * hour, turns: 2,
      spans: [[at(13), at(15)], [at(14), at(16)]],
      hours: {
        '13': { tokens: 100, durationMs: hour, turns: 1, sessions: { a: { title: '会话 A', tokens: 100, durationMs: hour, turns: 1 } } },
        '14': { tokens: 100, durationMs: 2 * hour, turns: 1, sessions: { a: { title: '会话 A', tokens: 0, durationMs: hour, turns: 0 }, b: { title: '会话 B', tokens: 100, durationMs: hour, turns: 1 } } },
        '15': { tokens: 0, durationMs: hour, turns: 0, sessions: { b: { title: '会话 B', tokens: 0, durationMs: hour, turns: 0 } } },
      },
      sessions: {
        a: { title: '会话 A', tokens: 100, durationMs: 2 * hour, turns: 1, spans: [[at(13), at(15)]] },
        b: { title: '会话 B', tokens: 100, durationMs: 2 * hour, turns: 1, spans: [[at(14), at(16)]] },
      },
    },
  };
  const hourly = activityRange(days, { from: '2026-11-07', to: '2026-11-07', grain: 'hour' }, at(20));
  const busyHours = hourly.buckets.filter(bucket => bucket.busyMs > 0).map(bucket => bucket.label);
  assert.deepEqual(busyHours, ['13:00', '14:00', '15:00']);
  assert.equal(hourly.totalBusyMs, 3 * hour);
  // Per-session spans survive the hourly cut so the panel can draw tracks.
  assert.equal(Math.round(hourly.sessionTotals.find(item => item.id === 'a').busyMs / hour), 2);

  const legacy = { '2026-11-07': { tokens: 10, durationMs: 2 * hour, turns: 1, sessions: { a: { title: 'A', tokens: 10, durationMs: 2 * hour, turns: 1 } } } };
  const fallback = activityRange(legacy, { from: '2026-11-07', to: '2026-11-07', grain: 'day' }, at(20));
  assert.equal(fallback.totalBusyMs, 2 * hour);
  assert.equal(fallback.busyEstimated, true);
  assert.equal(fallback.overlapMs, 0);
});

test('turnDigest summarises a round without exposing the tool chain', () => {
  const turn = {
    chain: [
      { name: 'read_file', category: 'file' },
      { name: 'read_file', category: 'file' },
      { name: 'edit_file', category: 'file' },
      { name: 'run_code', category: 'code' },
      { name: 'todo_write', category: 'plan' },
    ],
    deliverables: [{ path: 'a.js' }, { path: 'b.js' }, { path: 'c.js' }],
    errors: 1,
  };
  const digest = turnDigest(turn);
  assert.equal(digest.read, undefined);
  assert.equal(digest.counts.read, 2);
  assert.equal(digest.counts.run, 1);
  assert.equal(digest.counts.plan, 1);
  // File edits and recorded changes describe the same work; take the larger.
  assert.equal(digest.counts.write, 3);
  assert.equal(digest.files, 3);
  assert.equal(digest.steps, 5);
  assert.equal(digest.summary, '改代码 3 处 · 执行 1 次 · 读文件 2 次 · 更新计划 1 次 · 失败 1 次');

  const empty = turnDigest({ chain: [], deliverables: [] });
  assert.equal(empty.summary, '');
  assert.equal(empty.counts.write, 0);
  assert.equal(turnDigest(null).summary, '');
});

test('sessionBranches resolves parent and subagent children', () => {
  const entries = [
    { id: 'p', title: 'root' },
    { id: 'c1', title: 'child one', parentId: 'p' },
    { id: 'c2', title: 'child two', parentId: 'p' },
    { id: 'g', title: 'grandchild', parentId: 'c1' },
  ];
  const root = sessionBranches(entries, 'p');
  assert.equal(root.parent, null);
  assert.deepEqual(root.children.map(entry => entry.id), ['c1', 'c2']);
  const child = sessionBranches(entries, 'c1');
  assert.equal(child.parent.id, 'p');
  assert.deepEqual(child.children.map(entry => entry.id), ['g']);
  const leaf = sessionBranches(entries, 'c2');
  assert.equal(leaf.children.length, 0);
  assert.equal(sessionBranches(entries, 'missing').parent, null);
  assert.deepEqual(sessionBranches(null, 'p').children, []);
});test('activity tokens are clipped to the picked window instead of the session total', () => {
  const started = new Date(2026, 10, 7, 22, 0, 0, 0).getTime();
  const turn = { sessionId: 'a', title: '会话A', startedAt: started, durationMs: 4 * 60 * 60 * 1000, tokens: 1000, modelTokens: { 'model-x': 1000 }, day: '2026-11-07' };
  const turns = {};
  turns['a:1:' + started] = turn;
  const session = { title: '会话A', tokens: 1000, durationMs: 0, turns: 1, calls: 1, models: { 'model-x': 1 }, modelTokens: { 'model-x': 1000 }, spans: [[started, started + 4 * 60 * 60 * 1000]] };
  const dayRecord = { tokens: 1000, durationMs: 0, turns: 1, calls: 1, models: { 'model-x': 1 }, modelTokens: { 'model-x': 1000 }, spans: session.spans, sessions: { a: session } };
  const days = { '2026-11-07': dayRecord };

  // Without the turn ledger the whole turn sits on the day it started.
  assert.equal(activityRange(days, { from: '2026-11-07', to: '2026-11-07' }).totalTokens, 1000);
  assert.equal(activityRange(days, { from: '2026-11-08', to: '2026-11-08' }).totalTokens, 0);
  // With it, each day only reports the hours that actually ran inside it.
  assert.equal(activityRange(days, { from: '2026-11-07', to: '2026-11-07', turns }).totalTokens, 500);
  assert.equal(activityRange(days, { from: '2026-11-08', to: '2026-11-08', turns }).totalTokens, 500);
  assert.equal(activityRange(days, { from: '2026-11-07', to: '2026-11-08', turns }).totalTokens, 1000);
});

test('activity statistics honour a workspace or session scope', () => {
  const started = new Date(2026, 10, 7, 9, 0, 0, 0).getTime();
  const sessionA = { title: '会话A', tokens: 700, durationMs: 1000, turns: 2, calls: 3, models: { 'model-x': 3 }, modelTokens: { 'model-x': 700 }, spans: [[started, started + 1000]] };
  const sessionB = { title: '会话B', tokens: 300, durationMs: 500, turns: 1, calls: 1, models: { 'model-y': 1 }, modelTokens: { 'model-y': 300 }, spans: [[started, started + 500]] };
  const dayRecord = {
    tokens: 1000, durationMs: 1500, turns: 3, calls: 4,
    models: { 'model-x': 3, 'model-y': 1 }, modelTokens: { 'model-x': 700, 'model-y': 300 },
    spans: [[started, started + 1000]], sessions: { a: sessionA, b: sessionB },
  };
  const days = { '2026-11-07': dayRecord };
  const all = activityRange(days, { from: '2026-11-07', to: '2026-11-07' });
  assert.equal(all.totalTokens, 1000);
  assert.equal(all.sessionTotals.length, 2);

  const onlyB = activityRange(days, { from: '2026-11-07', to: '2026-11-07', scope: new Set(['b']) });
  assert.equal(onlyB.totalTokens, 300);
  assert.equal(onlyB.totalTurns, 1);
  assert.equal(onlyB.sessionTotals.length, 1);
  assert.equal(onlyB.sessionTotals[0].title, '会话B');
  assert.deepEqual(onlyB.modelTotals.map(item => item.name), ['model-y']);

  const wallAll = activityWall(days, started + 5_000, 8);
  const wallB = activityWall(days, started + 5_000, 8, null, new Set(['b']));
  assert.equal(wallAll.totalTokens, 1000);
  assert.equal(wallB.totalTokens, 300);

  const buckets = activityBuckets(days, 'day', started + 5_000, { scope: new Set(['a']) });
  assert.equal(buckets.totalTokens, 700);
});

test('links ordinary forks through the forkLineage projection, not parentId', () => {
  // DSH keeps ordinary forks out of parentId; the branch facts arrive in the row's
  // projection values. The tree has to follow that link or the panel shows nothing.
  const root = row({ id: 'a', title: '根会话', updatedAt: 3_000 });
  const fork = row({
    id: 'b',
    title: '分叉副本',
    origin: 'fork',
    parentId: undefined,
    projectionValues: { forkLineage: { origin: 'fork', sourceSessionId: 'a' } },
    updatedAt: 2_000,
  });
  const child = row({ id: 'c', title: '子代理', origin: 'subagent', parentId: 'a', updatedAt: 1_000 });
  const entries = [root, fork, child];

  const tree = sessionTree(entries, 'a', {});
  assert.equal(tree.rootId, 'a');
  // Children of the root are ordered newest first: the fork, then the subagent.
  assert.deepEqual(tree.rows.map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(tree.rows.map(item => item.kind), ['root', 'fork', 'subagent']);

  const fromFork = sessionTree(entries, 'b', {});
  assert.equal(fromFork.rootId, 'a');
  assert.equal(fromFork.rows.find(item => item.id === 'b').depth, 1);
  assert.equal(fromFork.rows.find(item => item.id === 'b').current, true);

  const lone = sessionTree(entries, 'a', {});
  const standalone = sessionTree([row({ id: 'solo' })], 'solo', {});
  assert.equal(standalone.rows.length, 1);
  assert.equal(standalone.rows[0].kind, 'root');
  assert.equal(lone.rows.length, 3);
});

test('a derived entry carries the session its fork was cut from', () => {
  const telemetry = createTelemetry();
  const plain = deriveEntry(row({ id: 'p' }), telemetry, { now: Date.now() });
  assert.equal(plain.forkSource, '');

  const forked = deriveEntry(row({
    id: 'f',
    origin: 'fork',
    projectionValues: { forkLineage: { origin: 'fork', sourceSessionId: 'p' } },
  }), createTelemetry(), { now: Date.now() });
  assert.equal(forked.forkSource, 'p');
  assert.equal(forked.origin, 'fork');
});
