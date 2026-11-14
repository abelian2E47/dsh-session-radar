/** Quick-navigation shares the radar's pins and telemetry, without owning a second store. */
function QuickNavOptions(props) {
  const prefs = { ...QUICK_NAV_DEFAULTS, ...props.prefs };
  const set = function (key, value) { props.controller.setPref(key, value); };
  const select = function (key, label, options) {
    return h('label', { className: 'dsr-qnav-field', key: key }, [
      h('span', { key: 'l' }, label),
      h('select', { key: 's', value: prefs[key], onChange: function (event) { set(key, event.target.value); } }, options.map(function (item) {
        return h('option', { value: item[0], key: item[0] }, item[1]);
      })),
    ]);
  };
  return h('div', { className: 'dsr-qnav-options' }, [
    h('div', { className: 'dsr-qnav-modes', key: 'modes', role: 'group', 'aria-label': '快捷栏形式' }, QUICK_NAV_MODES.map(function (item) {
      return h('button', { type: 'button', key: item.value, 'aria-pressed': prefs.quickNavMode === item.value,
        onClick: function () { set('quickNavMode', item.value); set('showQuickBar', true); } }, item.label);
    })),
    prefs.quickNavMode === 'cards' ? h(Fragment, { key: 'cards' }, [
      select('quickNavTrigger', '唤起方式', [['hover', '鼠标靠近'], ['shortcut', '快捷键'], ['both', '两者都可以']]),
      prefs.quickNavTrigger !== 'hover' ? select('quickNavShortcut', '唤起快捷键', [['Alt+Q', 'Alt+Q'], ['Alt+Shift+Q', 'Alt+Shift+Q'], ['Control+Shift+Space', 'Ctrl+Shift+空格']]) : null,
      select('quickNavCardPosition', '卡片位置', [['right', '窗口右侧'], ['sidebar-bottom', '工作区栏底下']]),
    ]) : null,
    prefs.quickNavMode === 'icons' ? h(Fragment, { key: 'icons' }, [
      select('quickNavIconPosition', '按钮位置', [['top-left', '左上 · 会话栏旁'], ['top-right', '右上'], ['bottom-left', '左下 · 会话栏旁'], ['bottom-right', '右下'], ['custom', '自由拖动']]),
      h('label', { className: 'dsr-qnav-field', key: 'limit' }, [h('span', { key: 'l' }, '最多显示图标'), h('input', {
        type: 'number', min: 1, max: 20, value: prefs.quickNavIconLimit, key: 'n',
        onChange: function (event) { if (event.target.value !== '') set('quickNavIconLimit', Number(event.target.value)); },
      })]),
      h('p', { className: 'dsr-qnav-hint', key: 'hint' }, '两字短名识别会话，右下角图标显示运行状态；重名时加小编号。悬停或聚焦查看全名。超过数量收进 +N；同工作区可折叠。'),
      props.currentId ? h('label', { className: 'dsr-qnav-field', key: 'alias' }, [h('span', { key: 'l' }, '当前会话短名'), h('input', { type: 'text', className: 'dsr-qnav-alias', key: 'a', maxLength: 4, placeholder: '自动', value: prefs.quickNavLabels[props.currentId] || '', onChange: function (event) { set('quickNavLabels', { ...prefs.quickNavLabels, [props.currentId]: event.target.value }); } })]) : null,
      prefs.quickNavIconPosition === 'custom' ? h('button', { className: 'dsr-qnav-link', type: 'button', key: 'reset', onClick: function () { set('quickNavIconPos', null); } }, '恢复默认坐标') : null,
    ]) : null,
    h('label', { className: 'dsr-qnav-field', key: 'visible' }, [h('span', { key: 'l' }, '显示快捷导航'), h('input', { key: 'v', type: 'checkbox', checked: prefs.showQuickBar !== false, onChange: function (event) { set('showQuickBar', event.target.checked); } })]),
    h('button', { type: 'button', className: 'dsr-qnav-link', key: 'pin', disabled: !props.currentId, onClick: function () { props.controller.togglePinnedCurrent(); } }, '固定 / 取消固定当前会话 · Alt+P'),
  ]);
}

/** Follow the existing workspace column when it resizes or folds away. */
function useQuickNavGeometry() {
  const [geometry, setGeometry] = useState({ left: 292, width: 268, top: 90 });
  useEffect(function () {
    let frame = 0;
    let observed = null;
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    function measure() {
      frame = 0;
      const region = document.querySelector(SIDEBAR_REGION_SELECTOR);
      const rect = region && region.getBoundingClientRect();
      const edge = rect && rect.width > 0 ? rect.right : 0;
      const clear = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dsh-frame-top-clearance')) || 0;
      const next = { left: Math.max(12, edge + 14), width: Math.max(200, Math.min(320, (rect && rect.width) || 268)), top: Math.max(64, clear + 90) };
      setGeometry(function (old) { return old.left === next.left && old.width === next.width && old.top === next.top ? old : next; });
      if (resize && observed !== region) {
        if (observed) resize.unobserve(observed);
        if (region) resize.observe(region);
        observed = region;
      }
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(measure); }
    measure();
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.body, { subtree: true, childList: true });
    window.addEventListener('resize', schedule);
    return function () { mutation.disconnect(); if (resize) resize.disconnect(); window.removeEventListener('resize', schedule); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return geometry;
}

function QuickNavCard(props) {
  const entry = props.entry;
  const identity = quickNavIdentity(entry, props.prefs.quickNavLabels);
  const status = sidebarPinStatus(entry);
  return h('div', { className: cx('dsr-qnav-card', entry.id === props.currentId && 'is-current'), 'data-status': entry.status, 'data-stalled': entry.stalled ? 'true' : undefined }, [
    h('button', { type: 'button', className: 'dsr-qnav-card__main', key: 'main',
      'aria-current': entry.id === props.currentId ? 'true' : undefined,
      'aria-label': '切换到会话：' + entry.title + '（' + status + '）', onClick: function () { props.onOpen(entry.id); } }, [
      h('span', { className: 'dsr-qnav-card__identity', key: 'identity' }, identity.short),
      h('span', { className: 'dsr-qnav-card__copy', key: 'copy' }, [
        h('strong', { key: 'title', title: entry.title }, entry.title || '未命名会话'),
        h('span', { className: 'dsr-qnav-status', key: 'status' }, [h(Icon, { name: quickBarIcon(entry), size: 12, key: 'i' }), status, entry.unread ? ' · 待验收' : '']),
        h('span', { className: 'dsr-qnav-card__meta', key: 'meta' }, entry.workspace || '未分组'),
      ]),
    ]),
    h(IconButton, { key: 'pin', name: 'pin-filled', label: '取消固定会话：' + entry.title, onClick: function () { props.controller.togglePin(entry.id); } }),
  ]);
}

function QuickNavigation(props) {
  const controller = props.controller;
  const state = useRadar(controller);
  const prefs = { ...QUICK_NAV_DEFAULTS, ...state.prefs };
  const mode = prefs.quickNavMode;
  const enabled = prefs.showQuickBar !== false && !state.ui.open && !state.ui.prefsOpen;
  const [settings, setSettings] = useState(false);
  const [opened, setOpened] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const geometry = useQuickNavGeometry();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const iconRef = useRef(null);
  const previousFocus = useRef(null);
  const keyboardOpen = useRef(false);
  const previousMode = useRef(null);
  const drag = useSurfaceDrag('quickNavIconPos', controller, prefs.quickNavIconPosition === 'custom' ? prefs : {}, iconRef);
  const entries = quickNavSessions(state.entries);
  const groups = quickNavGroups(entries);
  const close = function (restore) {
    setOpened(false); setOverflow(false); setSettings(false);
    if (restore && previousFocus.current && previousFocus.current.isConnected) previousFocus.current.focus({ preventScroll: true });
    keyboardOpen.current = false;
  };
  useEffect(function () {
    const enteringCards = mode === 'cards' && previousMode.current !== mode;
    previousMode.current = mode;
    setOpened(enabled && enteringCards);
    setOverflow(false);
    keyboardOpen.current = enabled && enteringCards;
    if (!enabled) setSettings(false);
  }, [mode, prefs.quickNavCardPosition, prefs.quickNavIconPosition, prefs.quickNavTrigger, enabled]);
  useEffect(function () {
    if (!enabled) return;
    const down = function (event) {
      if (rootRef.current && rootRef.current.contains(event.target)) return;
      close(false);
    };
    const key = function (event) {
      if (mode === 'cards' && prefs.quickNavTrigger !== 'hover' && quickNavShortcutMatches(event, prefs.quickNavShortcut)) {
        event.preventDefault(); event.stopPropagation();
        if (opened) close(true);
        else { previousFocus.current = document.activeElement; keyboardOpen.current = true; setOpened(true); }
      } else if (event.key === 'Escape' && (opened || settings || overflow)) {
        event.preventDefault(); event.stopPropagation(); close(true);
      }
    };
    document.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key, true);
    return function () { document.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key, true); };
  }, [enabled, opened, settings, overflow, mode, prefs.quickNavTrigger, prefs.quickNavShortcut]);
  useEffect(function () {
    if (!opened || !keyboardOpen.current || !panelRef.current) return;
    const first = panelRef.current.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }, [opened]);
  useEffect(function () {
    if (!enabled || mode !== 'cards' || prefs.quickNavTrigger === 'shortcut') return;
    let frame = 0, enter = 0, leave = 0;
    let pointer = null;
    const move = function (event) {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        const x = pointer.x, y = pointer.y;
        const trigger = triggerRef.current;
        if (!trigger) return;
        const r = trigger.getBoundingClientRect();
        const panel = panelRef.current && panelRef.current.getBoundingClientRect();
        const nearTrigger = x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 24 && y <= r.bottom + 24;
        const nearEdge = prefs.quickNavCardPosition === 'right' && x >= window.innerWidth - 28 && y >= 80 && y <= window.innerHeight - 32;
        const near = nearTrigger || nearEdge;
        const inside = panel && x >= panel.left - 24 && x <= panel.right + 24 && y >= panel.top - 24 && y <= panel.bottom + 24;
        if (near || inside) {
          clearTimeout(leave); leave = 0;
          if (!enter && !panelRef.current) enter = setTimeout(function () { enter = 0; setOpened(true); }, 140);
        } else {
          clearTimeout(enter); enter = 0;
          if (!leave && !keyboardOpen.current && !(rootRef.current && rootRef.current.contains(document.activeElement))) leave = setTimeout(function () { leave = 0; setOpened(false); }, 360);
        }
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return function () { window.removeEventListener('pointermove', move); if (frame) cancelAnimationFrame(frame); clearTimeout(enter); clearTimeout(leave); };
  }, [enabled, mode, prefs.quickNavTrigger, prefs.quickNavCardPosition]);
  useEffect(function () {
    const surface = iconRef.current;
    if (!surface || prefs.quickNavIconPosition !== 'custom') return;
    const fit = function () { applySurfacePosition(surface, readSurfacePos(prefs, 'quickNavIconPos')); };
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    if (resize) resize.observe(surface);
    window.addEventListener('resize', fit);
    return function () { if (resize) resize.disconnect(); window.removeEventListener('resize', fit); };
  }, [mode, prefs.quickNavIconPosition, prefs.quickNavIconPos]);
  useEffect(function () {
    if (!settings && !overflow) return;
    const fit = function () {
      const popup = rootRef.current && rootRef.current.querySelector('.dsr-qnav-popover');
      if (!popup) return;
      popup.style.position = 'fixed';
      const anchorRect = iconRef.current.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const x = anchorRect.left + popupRect.width > window.innerWidth - 12 ? anchorRect.right - popupRect.width : anchorRect.left;
      const top = anchorRect.bottom + 10;
      const y = top + popupRect.height <= window.innerHeight - 12 ? top : anchorRect.top - popupRect.height - 10;
      popup.style.left = Math.max(12, Math.min(x, window.innerWidth - popupRect.width - 12)) + 'px';
      popup.style.top = Math.max(12, Math.min(y, window.innerHeight - popupRect.height - 12)) + 'px';
      popup.style.right = 'auto'; popup.style.bottom = 'auto';
    };
    fit();
    window.addEventListener('resize', fit);
    return function () { window.removeEventListener('resize', fit); };
  }, [settings, overflow, mode, prefs.quickNavIconPosition, prefs.quickNavIconPos, prefs.quickNavCardPosition, prefs.quickNavTrigger]);
  if (!enabled) return null;
  const toggleGroup = function (group) {
    const next = { ...prefs.quickNavCollapsed };
    if (next[group.key]) delete next[group.key]; else next[group.key] = true;
    controller.setPref('quickNavCollapsed', next);
  };
  const openSession = function (id) { close(false); controller.openSession(id); };
  const card = function (entry) { return h(QuickNavCard, { key: entry.id, entry: entry, prefs: prefs, currentId: state.currentId, controller: controller, onOpen: openSession }); };
  const groupButton = function (group, compact) {
    const collapsed = !!prefs.quickNavCollapsed[group.key];
    const live = group.entries.filter(isLiveEntry).length;
    const waiting = group.entries.filter(function (entry) { return entry.stalled || entry.status === 'approval' || entry.status === 'question' || entry.unread; }).length;
    return h('button', { type: 'button', className: cx('dsr-qnav-group', compact && 'is-compact'), key: 'group:' + group.key,
      'data-group': group.key, 'aria-expanded': !collapsed,
      'aria-label': (collapsed ? '展开工作区：' : '折叠工作区：') + group.title + '，' + group.entries.length + ' 个固定会话' + (waiting ? '，' + waiting + ' 个待处理' : ''),
      title: group.title + ' · ' + group.entries.length + ' 个会话' + (live ? ' · ' + live + ' 个运行中' : '') + (waiting ? ' · ' + waiting + ' 个待处理' : ''),
      onClick: function () { toggleGroup(group); } }, [
      h(Icon, { name: compact ? 'folder' : collapsed ? 'chevron-right' : 'chevron-down', size: 13, key: 'i' }),
      h('span', { key: 't' }, group.title), h('span', { className: 'dsr-qnav-group__count', key: 'n' }, String(group.entries.length)),
      waiting ? h('span', { className: 'dsr-qnav-group__signal is-waiting', key: 'w' }, '!') : live ? h('span', { className: 'dsr-qnav-group__signal', key: 'r' }, String(live)) : null,
    ]);
  };
  const cards = groups.map(function (group) {
    return h('section', { className: 'dsr-qnav-workspace', key: group.key }, [
      group.entries.length > 1 ? groupButton(group, false) : null,
      !prefs.quickNavCollapsed[group.key] || group.entries.length === 1 ? group.entries.map(card) : null,
    ]);
  });
  const empty = h('div', { className: 'dsr-qnav-empty' }, [h('strong', { key: 't' }, '把常用会话放在这里'), h('p', { key: 'p' }, '按 Alt+P 固定当前会话，或在雷达中点击图钉。'), h('button', { type: 'button', className: 'dsr-qnav-link', key: 'b', onClick: function () { controller.open(); } }, '打开会话雷达')]);
  const iconItems = [];
  const shorts = new Map();
  entries.forEach(function (entry) { const s = quickNavIdentity(entry, prefs.quickNavLabels).short; shorts.set(s, (shorts.get(s) || 0) + 1); });
  groups.forEach(function (group) {
    if (group.entries.length > 1) iconItems.push({ key: 'group:' + group.key, node: groupButton(group, true) });
    if (group.entries.length > 1 && prefs.quickNavCollapsed[group.key]) return;
    group.entries.forEach(function (entry) {
      const identity = quickNavIdentity(entry, prefs.quickNavLabels);
      iconItems.push({ key: entry.id, node: h('span', { className: 'dsr-qnav-iconwrap', key: entry.id }, [
        h('button', { type: 'button', className: cx('dsr-qnav-icon', state.currentId === entry.id && 'is-current'), key: 'b', 'data-session-id': entry.id,
          'data-status': entry.status, 'data-stalled': entry.stalled ? 'true' : undefined, 'aria-current': state.currentId === entry.id ? 'true' : undefined,
          'aria-label': '切换到会话：' + entry.title + '（' + sidebarPinStatus(entry) + '）', title: entry.title + ' · ' + (entry.workspace || '') + ' · ' + sidebarPinStatus(entry),
          onClick: function () { openSession(entry.id); } }, [
          h('span', { className: 'dsr-qnav-icon__name', key: 'n' }, identity.short),
          shorts.get(identity.short) > 1 ? h('small', { className: 'dsr-qnav-icon__mark', key: 'm' }, identity.mark) : null,
          h('span', { className: 'dsr-qnav-icon__status', key: 's' }, h(Icon, { name: quickBarIcon(entry), size: 11 })),
          entry.unread ? h('span', { className: 'dsr-qnav-icon__unread', key: 'u' }) : null,
        ]),
        h('span', { className: 'dsr-qnav-tooltip', key: 'tip', role: 'tooltip' }, [h('strong', { key: 't' }, entry.title), h('span', { key: 'm' }, (entry.workspace || '未分组') + ' · ' + sidebarPinStatus(entry) + (entry.unread ? ' · 待验收' : ''))]),
      ]) });
    });
  });
  const limit = normalizeQuickNavPref('quickNavIconLimit', prefs.quickNavIconLimit);
  const control = h('button', { type: 'button', className: 'dsr-qnav-control', key: 'control', title: '快捷栏形式与设置',
    'aria-label': '快捷栏形式与设置', 'aria-expanded': settings, onClick: function () { previousFocus.current = document.activeElement; setOverflow(false); setSettings(!settings); } }, h(Icon, { name: 'settings', size: 15 }));
  const anchor = mode === 'icons' ? prefs.quickNavIconPosition : 'top-left';
  const icons = mode === 'icons' ? iconItems.slice(0, limit).map(function (item) { return item.node; }) : [];
  const hidden = iconItems.length - icons.length;
  return h('div', { ref: rootRef, className: 'dsr-qnav', style: { '--dsr-qnav-left': geometry.left + 'px', '--dsr-qnav-top': geometry.top + 'px', '--dsr-qnav-sidebar-width': geometry.width + 'px' } }, [
    h('nav', { ref: drag.attach, className: cx('dsr-qnav-buttons', 'is-' + anchor), key: 'buttons', 'aria-label': '固定会话快捷按钮' }, [
      control,
      mode === 'icons' && anchor === 'custom' ? h('span', { className: 'dsr-qnav-grip', key: 'drag', title: '拖动图标按钮组', onPointerDown: drag.onPointerDown, onPointerMove: drag.onPointerMove, onPointerUp: drag.onPointerUp, onPointerCancel: drag.onPointerCancel }, h(Icon, { name: 'move', size: 13 })) : null,
      ...icons,
      mode === 'icons' && entries.length === 0 ? h('button', { className: 'dsr-qnav-control', type: 'button', title: '固定当前会话', 'aria-label': '固定当前会话', key: 'empty-pin', disabled: !state.currentId, onClick: function () { controller.togglePinnedCurrent(); } }, h(Icon, { name: 'pin', size: 15 })) : null,
      mode === 'icons' && hidden > 0 ? h('button', { className: 'dsr-qnav-more', type: 'button', key: 'more', 'aria-expanded': overflow, 'aria-label': '展开其余 ' + hidden + ' 个快捷项', onClick: function () { previousFocus.current = document.activeElement; setSettings(false); setOverflow(!overflow); } }, '+' + hidden) : null,
      settings ? h('section', { className: 'dsr-qnav-popover', key: 'options', 'aria-label': '快捷栏设置' }, [h('div', { className: 'dsr-qnav-head', key: 'h' }, [h('strong', { key: 't' }, '会话快捷栏'), h(IconButton, { name: 'close', key: 'x', label: '关闭快捷栏设置', onClick: function () { setSettings(false); } })]), h(QuickNavOptions, { prefs: prefs, controller: controller, currentId: state.currentId, key: 'o' })]) : null,
      overflow && mode === 'icons' ? h('section', { className: 'dsr-qnav-popover dsr-qnav-overflow', key: 'overflow', 'aria-label': '其余固定会话' }, [h('div', { className: 'dsr-qnav-head', key: 'h' }, [h('strong', { key: 't' }, '固定会话 · ' + entries.length), h(IconButton, { name: 'close', label: '关闭折叠会话', key: 'c', onClick: function () { setOverflow(false); } })]), ...cards]) : null,
    ]),
    mode === 'cards' ? h('button', { type: 'button', ref: triggerRef, className: cx('dsr-qnav-trigger', 'is-' + prefs.quickNavCardPosition, opened && 'is-open'), key: 'trigger',
      'aria-label': '唤起固定会话卡片', 'aria-expanded': opened, 'aria-controls': 'dsr-qnav-panel',
      title: '固定会话 · ' + (prefs.quickNavTrigger === 'hover' ? '鼠标靠近唤起' : prefs.quickNavShortcut),
      onClick: function () { previousFocus.current = document.activeElement; keyboardOpen.current = true; setSettings(false); setOpened(!opened); } }, [h(Icon, { name: 'pin', size: 14, key: 'i' }), h('span', { className: 'dsr-qnav-trigger__label', key: 'label' }, '固定会话'), h('span', { key: 'n' }, String(entries.length))]) : null,
    mode === 'cards' && opened ? h('section', { id: 'dsr-qnav-panel', ref: panelRef, className: cx('dsr-qnav-panel', 'is-' + prefs.quickNavCardPosition), key: 'panel', role: 'region', 'aria-label': '固定会话卡片' }, [
      h('header', { className: 'dsr-qnav-head', key: 'head' }, [h('strong', { key: 't' }, '固定会话'), h('span', { key: 'n', className: 'dsr-qnav-hint' }, entries.length + ' 个'), h(IconButton, { name: 'close', key: 'x', label: '收起固定会话卡片', onClick: function () { close(true); } })]),
      h('div', { className: 'dsr-qnav-panel__body', key: 'body' }, entries.length ? cards : empty),
      h('footer', { className: 'dsr-qnav-foot', key: 'foot' }, [h('span', { key: 'k' }, (prefs.quickNavTrigger === 'hover' ? '鼠标靠近唤起' : prefs.quickNavShortcut) + ' · Esc 收起'), h('button', { type: 'button', className: 'dsr-qnav-link', key: 'settings', onClick: function () { setOpened(false); setSettings(true); } }, '切换形式')]),
    ]) : null,
  ]);
}
