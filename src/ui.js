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
      onClick: function () { props.onSelect(entry.id); },
      onDoubleClick: function () { if (typeof props.onOpenFull === 'function') props.onOpenFull(entry.id); },
      title: '查看详情：' + entry.title + '（双击全屏）',
      'aria-label': '查看会话详情 ' + entry.title + (entry.unread ? '（最近完成，尚未验收）' : ''),
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
        'aria-label': '切换到会话：' + sessionTitle + (entry.id === state.currentId ? '，当前会话' : '') + (entry.unread ? '，最近完成，待验收' : ''),
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
      // Escape leaves the full-screen dialog first; the detail panel handles that
      // and stops the event, so this only runs when there is nothing to leave.
      if (state.detailFull === true) return;
      event.preventDefault();
      if (state.ui.selectedId !== null) controller.back();
      else controller.close();
    };
    window.addEventListener('keydown', keydown, true);
    return function () { window.removeEventListener('keydown', keydown, true); };
  }, [open, state.ui.selectedId, state.detailFull, controller]);
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
    body = h(DetailPanel, {
      key: 'detail',
      entry: selected,
      controller: controller,
      now: now,
      variant: 'dock',
      entries: dockPool,
      fork: state.fork,
      canFork: state.canFork !== false,
      full: state.detailFull === true,
      onFull: function (value) { controller.setDetailFull(value); },
      onSelect: function (id) { controller.select(id); },
      onOpenFull: function (id) { controller.openFullDetail(id); },
      onBack: function () { controller.back(); },
    });
  } else {
    const items = [];
    if (state.error) items.push(h('div', { className: 'dsr-banner is-error', key: 'error' }, [h(Icon, { name: 'warning', size: 13 }), h('span', null, state.error), h('button', { type: 'button', className: 'dsr-banner__action', onClick: function () { controller.refresh(); } }, '重试')]));
    if (state.streaming === 'reconnecting') items.push(h('div', { className: 'dsr-banner', key: 'reconnect' }, [h(Icon, { name: 'warning', size: 13 }), h('span', null, '事件流正在重连，数字可能滞后几秒。')]));
    if (state.ui.searchStatus !== 'idle') items.push(h(SearchResultsPanel, { key: 'search', state: state, onOpen: function (id) { controller.openSession(id); } }));
    if (state.phase !== 'ready' && state.entries.length === 0) items.push(h(SkeletonRows, { key: 'skeleton', count: 4 }));
    else if (state.ui.tab === 'live') items.push(h('section', { className: 'dsr-section', key: 'live' }, [
      h(SectionHeader, { key: 'head', title: '进行中', count: live.length }),
      live.length === 0 ? h(EmptyRadar, { key: 'empty', compact: true, onRecent: function () { controller.setTab('recent'); } }) : live.map(function (entry) {
        return h(SessionRow, { key: entry.id, entry: entry, now: now, compact: state.prefs.compact, onSelect: function (id) { controller.openDetail(id); }, onOpenFull: function (id) { controller.openFullDetail(id); }, onOpen: function (id) { controller.openSession(id); }, onPin: function (id) { controller.togglePin(id); } });
      }),
    ]));
    if (state.ui.tab === 'live' && recentTail.length > 0) items.push(h('section', { className: 'dsr-section', key: 'recent' }, [
      h(SectionHeader, { key: 'head', title: '最近', count: recentTailSource.length }),
      ...recentTail.map(function (entry) {
        return h(SessionRow, { key: entry.id, entry: entry, now: now, compact: true, onSelect: function (id) { controller.openDetail(id); }, onOpenFull: function (id) { controller.openFullDetail(id); }, onOpen: function (id) { controller.openSession(id); }, onPin: function (id) { controller.togglePin(id); } });
      }),
    ]));
    if (state.ui.tab === 'recent') items.push(h('section', { className: 'dsr-section', key: 'recent' }, [
      h(SectionHeader, { key: 'head', title: '最近会话', count: recentTailSource.length }),
      recentTailSource.length === 0 ? h(EmptyRadar, { key: 'empty', compact: true }) : recentTailSource.map(function (entry) {
        return h(SessionRow, { key: entry.id, entry: entry, now: now, compact: state.prefs.compact, onSelect: function (id) { controller.openDetail(id); }, onOpenFull: function (id) { controller.openFullDetail(id); }, onOpen: function (id) { controller.openSession(id); }, onPin: function (id) { controller.togglePin(id); } });
      }),
    ]));
    if (state.ui.tab === 'pinned') items.push(h('section', { className: 'dsr-section', key: 'pinned' }, [
      h(SectionHeader, { key: 'head', title: '正在跟踪', count: pinned.length }),
      pinned.length === 0 ? h('div', { className: 'dsr-banner' }, '点会话卡片上的图钉把它固定到右侧快捷栏，同时会移到「正在跟踪的会话」。') : pinned.map(function (entry) {
        return h(SessionRow, { key: entry.id, entry: entry, now: now, compact: state.prefs.compact, onSelect: function (id) { controller.openDetail(id); }, onOpenFull: function (id) { controller.openFullDetail(id); }, onOpen: function (id) { controller.openSession(id); }, onPin: function (id) { controller.togglePin(id); } });
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
/**
 * A block of text that shows a readable slice and unfolds to the whole thing.
 * Prompts, replies and reasoning are kept verbatim by the ledger, so a long
 * message is only ever one click away from its full body.
 */
function ExpandableText(props) {
  const text = typeof props.text === 'string' ? props.text : '';
  const limit = Number(props.limit) > 0 ? Number(props.limit) : 640;
  const [open, setOpen] = useState(false);
  if (text === '') return null;
  const long = text.length > limit;
  const shown = long && !open ? text.slice(0, limit).replace(/\s+$/, '') + '…' : text;
  return h('div', { className: cx('dsr-turn__expand', open && 'is-open') }, [
    h('p', { className: 'dsr-turn__text', key: 'text' }, shown),
    long ? h('button', {
      type: 'button',
      className: 'dsr-turn__more',
      key: 'more',
      'aria-expanded': open ? 'true' : 'false',
      onClick: function () { setOpen(!open); },
    }, open ? '收起' : '展开全文 · ' + text.length + ' 字') : null,
  ]);
}

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
  const canFork = props.canFork !== false && Number(turn.lastSeq) > 0 && typeof props.onFork === 'function';
  const forking = props.forking === true;
  const forkAction = expanded ? h('div', { className: 'dsr-turn__actions', key: 'fork' }, [
    canFork ? h('button', {
      type: 'button',
      className: 'dsr-turn__fork',
      title: turn.state === 'running'
        ? '从这一轮目前的进度分叉：新会话继承到这一轮此刻为止的对话'
        : '从这一轮之后分叉：新会话继承到这里为止的对话，可以接着换一条路走',
      'aria-label': '从第 ' + turn.index + ' 轮分叉出一条新会话',
      disabled: forking,
      onClick: function () { props.onFork(turn); },
    }, [
      h(Icon, { name: 'branch', size: 11, key: 'icon' }),
      h('span', { key: 'label' }, forking ? '正在分叉…' : '从这一轮分叉'),
    ]) : h('span', { className: 'dsr-turn__forknote', key: 'note' }, '这一轮还没有记录到日志位置，等宿主补上事件后才能分叉'),
  ]) : null;
  const panel = expanded ? h('div', { className: 'dsr-turn__panel', key: 'panel' }, [
    turn.prompt ? h('div', { className: 'dsr-turn__block', key: 'ask' }, [
      h('span', { className: 'dsr-turn__blocktitle', key: 'title' }, '用户指令 · ' + turn.prompt.length + ' 字'),
      h(ExpandableText, { key: 'text', text: turn.prompt, limit: 800 }),
    ]) : null,
    turn.text ? h('div', { className: 'dsr-turn__block', key: 'say' }, [
      h('span', { className: 'dsr-turn__blocktitle', key: 'title' }, 'AI 回复 · ' + turn.text.length + ' 字'),
      h(ExpandableText, { key: 'text', text: turn.text, limit: 640 }),
    ]) : null,
    turn.reasoning ? h('div', { className: 'dsr-turn__block', key: 'why' }, [
      h('span', { className: 'dsr-turn__blocktitle', key: 'title' }, 'thinking · ' + turn.reasoning.length + ' 字'),
      h(ExpandableText, { key: 'text', text: turn.reasoning, limit: 520 }),
    ]) : null,
    files.length > 0 ? h('div', { className: 'dsr-turn__block', key: 'files' }, [
      h('span', { className: 'dsr-turn__blocktitle', key: 'title' }, '改动的文件 · ' + files.length + ' 个'),
      h('div', { className: 'dsr-turn__files', key: 'list' }, files.map(function (item) {
        return h(TurnFilePill, { key: item.path, item: item, onPreview: props.onPreview });
      })),
    ]) : null,
    forkAction,
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
  const [active, setActive] = useState(-1);
  useEffect(function () {
    setOpenSet(null);
    setActive(-1);
  }, [entryId]);
  if (turns.length === 0) return null;
  // The whole transcript is always on screen: a tree that hides rounds is not a
  // tree you can read.
  const visible = turns;
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
  const fork = props.fork && props.fork.sessionId === entryId ? props.fork : null;
  const forkBusy = fork !== null && fork.status === 'running';
  const forkNotice = fork === null || fork.status === 'idle' ? null : h('div', {
    className: cx('dsr-forknote', fork.status === 'done' && 'is-done', fork.status === 'error' && 'is-error'),
    key: 'forknote',
    role: 'status',
  }, [
    h(Icon, { name: fork.status === 'error' ? 'warning' : fork.status === 'done' ? 'check' : 'branch', size: 12, key: 'icon' }),
    h('span', { className: 'dsr-forknote__text', key: 'text' }, fork.status === 'running'
      ? (fork.turn > 0 ? '正在从第 ' + fork.turn + ' 轮分叉…' : '正在分叉…')
      : fork.status === 'done'
        ? (fork.turn > 0 ? '已从第 ' + fork.turn + ' 轮分叉出新会话，下面会话树里就能看到' : '已分叉出新会话，下面会话树里就能看到')
        : (fork.error || '分叉失败')),
    fork.status === 'done' && fork.childId && typeof props.onOpenFork === 'function' ? h('button', {
      type: 'button', key: 'open', className: 'dsr-forknote__open',
      onClick: function () { props.onOpenFork(fork.childId); },
    }, '打开新会话') : null,
    props.onDismissFork ? h('button', {
      type: 'button', key: 'close', className: 'dsr-forknote__close',
      title: '关闭提示', 'aria-label': '关闭分叉提示',
      onClick: props.onDismissFork,
    }, h(Icon, { name: 'close', size: 10 })) : null,
  ]);
  return h('section', { className: 'dsr-detail__section dsr-flow-section' }, [
    h('div', { className: 'dsr-detail__section-head', key: 'head' }, [
      h('h3', { className: 'dsr-detail__section-title', key: 'title' }, [
        h(Icon, { name: 'flow', size: 12, key: 'i' }),
        h('span', { key: 't' }, '对话树'),
      ]),
      h('button', { type: 'button', className: 'dsr-flow__tool', key: 'all', onClick: expandAll }, allOpen ? '全部收起' : '全部展开'),
      h('span', { className: 'dsr-detail__section-meta', key: 'meta' }, turns.length + ' 轮 · ' + totalFiles + ' 个文件改动'),
    ]),
    forkNotice,
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
        canFork: props.canFork,
        forking: forkBusy && fork !== null && fork.turn === turn.index,
        onFork: props.onFork,
      });
    })),
  ]);
}

/**
 * The lineage tree around this session: the topmost ancestor at the root, then
 * every fork and subagent child nested underneath. Nodes with children fold
 * away, and the session being read is marked so the branch is easy to place.
 */
function SessionTreeSection(props) {
  const entry = props.entry;
  const entries = Array.isArray(props.entries) ? props.entries : [];
  const [collapsed, setCollapsed] = useState([]);
  const entryId = entry.id;
  useEffect(function () { setCollapsed([]); }, [entryId]);
  const tree = sessionTree(entries, entryId, { collapsed: collapsed });
  if (tree.rows.length === 0) return null;
  const self = tree.rows.find(function (row) { return row.id === entryId; });
  const hasLineage = tree.rows.length > 1;
  if (!hasLineage && !(self && self.children > 0)) return null;
  const forks = tree.rows.filter(function (row) { return row.kind === 'fork'; }).length;
  const subagents = tree.rows.filter(function (row) { return row.kind === 'subagent'; }).length;
  const toggle = function (id) {
    setCollapsed(function (prev) {
      return prev.indexOf(id) >= 0 ? prev.filter(function (item) { return item !== id; }) : prev.concat([id]);
    });
  };
  const meta = [];
  if (forks > 0) meta.push(forks + ' 个分叉');
  if (subagents > 0) meta.push(subagents + ' 个子代理');
  if (meta.length === 0) meta.push('单条会话');
  const highlightId = typeof props.highlightId === 'string' ? props.highlightId : '';
  const rows = tree.rows.map(function (row) {
    const target = row.entry;
    const label = target.title || target.id;
    const isCurrent = row.current;
    const isNew = highlightId !== '' && row.id === highlightId;
    return h('div', {
      className: cx('dsr-tree__row', isCurrent && 'is-current', isNew && 'is-new', 'is-' + row.kind),
      key: 'tree-' + row.id,
      'data-depth': String(row.depth),
      'data-kind': row.kind,
      'data-session': row.id,
      style: { paddingLeft: 2 + row.depth * 14 + 'px' },
    }, [
      row.children > 0 ? h('button', {
        type: 'button', key: 'chev', className: cx('dsr-tree__chev', row.collapsed && 'is-collapsed'),
        'aria-expanded': row.collapsed ? 'false' : 'true',
        title: (row.collapsed ? '展开' : '收起') + row.children + ' 个下游会话',
        onClick: function () { toggle(row.id); },
      }, h(Icon, { name: row.collapsed ? 'chevron-right' : 'chevron-down', size: 10 })) : h('span', { className: 'dsr-tree__bullet', key: 'bullet', 'aria-hidden': 'true' }),
      h('button', {
        type: 'button', key: 'open', className: 'dsr-tree__open',
        title: '查看 ' + label,
        'aria-current': isCurrent ? 'true' : undefined,
        onClick: function () { if (props.onSelect) props.onSelect(row.id); },
      }, [
        h('span', { className: cx('dsr-tree__kind', 'is-' + row.kind), key: 'kind' }, TREE_KIND_TEXT[row.kind] || row.kind),
        h('span', { className: 'dsr-tree__title', key: 'title' }, label),
        isNew ? h('span', { className: 'dsr-tree__new', key: 'new', title: '刚刚从这一轮分叉出的会话' }, '新') : null,
        h('span', { className: 'dsr-tree__meta', key: 'meta' }, [
          target.statusLabel || target.status || '',
          target.turn > 0 ? ' · ' + target.turn + ' 轮' : '',
          row.children > 0 ? ' · ' + row.children + ' 分支' : '',
        ].join('')),
      ]),
      h('button', {
        type: 'button', key: 'pin', className: cx('dsr-tree__pin', target.pinned && 'is-active'),
        title: target.pinned ? '取消固定' : '固定到快捷栏',
        'aria-label': (target.pinned ? '取消固定 ' : '固定到快捷栏 ') + label,
        'aria-pressed': target.pinned ? 'true' : 'false',
        onClick: function () { props.controller.togglePin(row.id); },
      }, h(Icon, { name: target.pinned ? 'pin-filled' : 'pin', size: 11 })),
    ]);
  });
  return h('section', { className: 'dsr-detail__section dsr-tree-section', key: 'tree' }, [
    h('div', { className: 'dsr-detail__section-head', key: 'head' }, [
      h('h3', { className: 'dsr-detail__section-title', key: 'title' }, [
        h(Icon, { name: 'branch', size: 12, key: 'i' }),
        h('span', { key: 't' }, '会话树'),
      ]),
      h('span', { className: 'dsr-detail__section-meta', key: 'meta' }, meta.join(' · ')),
    ]),
    h('div', { className: 'dsr-tree', key: 'tree', role: 'tree', 'aria-label': '会话谱系' }, rows),
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
  const [feedback, setFeedback] = useState('');
  const full = props.full === true;
  const setFull = function (value) {
    const next = value === true;
    if (typeof props.onFull === 'function') props.onFull(next);
    else if (typeof controller.setDetailFull === 'function') controller.setDetailFull(next);
  };
  useEffect(function () {
    setConfirmStop(false);
    setRenaming(false);
    setDraft(entry ? entry.title : '');
    setFeedback('');
    setCopied(false);
    setReportCopied(false);
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
  const forkRound = async function (turn) {
    if (typeof controller.forkFromTurn !== 'function') { setFeedback('当前宿主没有提供分叉能力'); return; }
    setFeedback('');
    try { await controller.forkFromTurn(entry.id, turn.lastSeq, turn.index); }
    catch (error) { setFeedback(error instanceof Error ? error.message : String(error)); }
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
      h(SessionFlow, {
        key: 'flow',
        entry: entry,
        onPreview: function (item) { controller.previewFile(entry.id, item); },
        canFork: props.canFork !== false,
        fork: props.fork,
        onFork: function (turn) { forkRound(turn); },
        onOpenFork: function (childId) { if (typeof props.onSelect === 'function') props.onSelect(childId); },
        onDismissFork: function () { if (typeof controller.clearForkNotice === 'function') controller.clearForkNotice(); },
      }),
      h(PlanSection, { key: 'plan', entry: entry }),
      h(SessionTreeSection, {
        key: 'tree',
        entry: entry,
        entries: props.entries,
        onSelect: props.onSelect,
        controller: controller,
        highlightId: props.fork && props.fork.status === 'done' ? props.fork.childId : '',
      }),
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
    onDoubleClick: function (event) {
      const target = event.target;
      if (target && target.closest && target.closest('button')) return;
      if (typeof props.onOpenFull === 'function') props.onOpenFull(entry.id);
      else props.onSelect(entry.id);
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
        return h(SessionCard, { key: entry.id, entry: entry, now: props.now, compact: state.prefs.compact, selected: props.selectedId === entry.id, onSelect: props.onSelect, onOpenFull: props.onOpenFull, onOpen: props.onOpen, onPin: props.onPin });
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
          return h(SessionCard, { key: entry.id, entry: entry, now: props.now, compact: state.prefs.compact, selected: props.selectedId === entry.id, onSelect: props.onSelect, onOpenFull: props.onOpenFull, onOpen: props.onOpen, onPin: props.onPin });
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
          return h(SessionCard, { key: entry.id, entry: entry, now: props.now, compact: state.prefs.compact, selected: props.selectedId === entry.id, onSelect: props.onSelect, onOpenFull: props.onOpenFull, onOpen: props.onOpen, onPin: props.onPin });
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
      onDoubleClick: function () { if (typeof props.onOpenFull === 'function') props.onOpenFull(entry.id); },
      title: '查看详情' + (typeof props.onOpenFull === 'function' ? '（双击全屏）' : ''),
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
            onToggle: toggle, onSelect: props.onSelect, onOpenFull: props.onOpenFull, onOpen: props.onOpen,
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
            onToggle: toggleArchived, onSelect: props.onSelect, onOpenFull: props.onOpenFull, onOpen: undefined,
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
      return h('button', {
        type: 'button',
        className: 'dsr-usage-card',
        key: entry.id,
        title: entry.title + ' · ' + formatExactNumber(entry.tokenTotal) + ' token · 本轮 ' + formatExactDuration(entry.turnTimeMs) + ' · 总计 ' + formatExactDuration(entry.totalTimeMs),
        onClick: function () { props.onSelect(entry.id); },
        onDoubleClick: function () { if (typeof props.onOpenFull === 'function') props.onOpenFull(entry.id); },
      }, [
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
  // A double click always means "blow this session up": bring it into the side
  // panel first when it is not the one on show, then open the dialog.
  const onOpenFull = function (id) { onSelect(id); controller.setDetailFull(true); };
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
          onSelect: onSelect, onOpenFull: onOpenFull, onOpen: onOpen, onPin: onPin,
          onNew: function () { controller.startSession(); },
          onFilter: function (key, value) { controller.setFilter(key, value); },
          onClearFilters: function () { controller.clearFilters(); },
        }) : null,
        view === 'workspaces' ? h(WorkspaceBoard, {
          key: 'workspaces', state: state, controller: controller, now: now,
          focusId: state.ui.workspaceFocus, focusAt: state.ui.workspaceFocusAt,
          onSelect: onSelect, onOpenFull: onOpenFull, onOpen: onOpen, onPin: onPin,
          onShowStats: function (scope) { if (typeof controller.showStatisticsFor === 'function') controller.showStatisticsFor(scope); },
        }) : null,
        view === 'usage' ? h(UsageView, { key: 'usage', entries: filterEntries(state.entries, state.ui.query), state: state, controller: controller, now: now, onSelect: onSelect, onOpenFull: onOpenFull }) : null,
        view === 'activity' ? h(ActivityView, { key: 'activity', state: state, controller: controller, now: now, onSelect: onSelect }) : null,
        view === 'search' ? h(PageSearchView, { key: 'search', state: state, controller: controller, onOpen: onOpen }) : null,
      ]),
      settingsOpen ? h('aside', { className: 'dsr-page__settings', key: 'settings', 'aria-label': '雷达设置' },
        h(PrefsSidebar, { controller: controller, prefs: state.prefs, state: state, variant: 'page', onClose: function () { controller.togglePrefs(); } })
      ) : null,
      selected && !settingsOpen ? h('aside', { className: 'dsr-page__detail', key: 'detail', 'aria-label': '会话详情' },
        h(DetailPanel, { key: selected.id, entry: selected, controller: controller, now: now, variant: 'page', entries: selectedPool, fork: state.fork, canFork: state.canFork !== false, full: state.detailFull === true, onFull: function (value) { controller.setDetailFull(value); }, onSelect: function (id) { setSelectedId(id); }, onBack: function () { setSelectedId(null); } })
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
