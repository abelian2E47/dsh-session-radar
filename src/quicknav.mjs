/** Shared preferences and stable identities for the three quick-navigation surfaces. */
export const QUICK_NAV_MODES = [
  { value: 'mini', label: '小快捷栏' },
  { value: 'cards', label: '会话卡片' },
  { value: 'icons', label: '图标按钮' },
];
export const QUICK_NAV_DEFAULTS = {
  quickNavMode: 'mini',
  quickNavTrigger: 'both',
  quickNavShortcut: 'Alt+Q',
  quickNavCardPosition: 'right',
  quickNavIconPosition: 'top-left',
  quickNavIconLimit: 6,
  quickNavIconPos: null,
  quickNavLabels: {},
  quickNavCollapsed: {},
};

export function normalizeQuickNavPref(key, value) {
  const choices = {
    quickNavMode: ['mini', 'cards', 'icons'],
    quickNavTrigger: ['hover', 'shortcut', 'both'],
    quickNavShortcut: ['Alt+Q', 'Alt+Shift+Q', 'Control+Shift+Space'],
    quickNavCardPosition: ['right', 'sidebar-bottom'],
    quickNavIconPosition: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'custom'],
  };
  if (choices[key]) return choices[key].includes(value) ? value : QUICK_NAV_DEFAULTS[key];
  if (key === 'quickNavIconLimit') {
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(1, Math.min(20, Math.round(count))) : 6;
  }
  if (key === 'quickNavCollapsed') {
    const collapsed = {};
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [id, flag] of Object.entries(value).slice(0, 1000)) {
        if (flag === true && !['__proto__', 'constructor', 'prototype'].includes(id)) collapsed[id] = true;
      }
    }
    return collapsed;
  }
  if (key === 'quickNavLabels') {
    const labels = {};
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [id, text] of Object.entries(value).slice(0, 1000)) {
        if (typeof text !== 'string' || !text.trim() || ['__proto__', 'constructor', 'prototype'].includes(id)) continue;
        labels[id] = Array.from(text.trim()).slice(0, 2).join('');
      }
    }
    return labels;
  }
  return value;
}

/** Pin order stays stable when telemetry changes; archived pins never become shortcuts. */
export function quickNavSessions(entries) {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : []).filter(entry => {
    if (!entry || !entry.id || !entry.pinned || entry.archived || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function quickNavIdentity(entry, labels = {}) {
  const title = String(entry.title || '未命名会话');
  const custom = Object.hasOwn(labels, entry.id) ? labels[entry.id] : '';
  const words = title.match(/[\p{L}\p{N}]+/gu) || ['会话'];
  const latin = words.filter(word => /^[a-z][a-z0-9]*$/i.test(word));
  const short = custom || (latin.length > 1 && /^[a-z]/i.test(title)
    ? latin.slice(0, 2).map(word => word[0]).join('').toUpperCase()
    : Array.from(words.join('')).slice(0, 2).join(''));
  let hash = 0;
  for (const char of String(entry.id)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return { short, mark: (hash % 1296).toString(36).toUpperCase().padStart(2, '0') };
}

export function quickNavShortcutMatches(event, shortcut) {
  if (event.repeat || event.isComposing) return false;
  const chord = String(shortcut || 'Alt+Q').split('+');
  const key = chord.pop();
  return event.code === (key === 'Space' ? 'Space' : 'Key' + key) &&
    event.altKey === chord.includes('Alt') && event.ctrlKey === chord.includes('Control') &&
    event.shiftKey === chord.includes('Shift') && !event.metaKey;
}

/** Workspace ids are preferred; older snapshots carry the workspace path as their identity. */
export function quickNavGroups(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const title = entry.workspace || '未分组';
    const key = 'w:' + (entry.workspaceId || title);
    if (!groups.has(key)) groups.set(key, { key, title, entries: [] });
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()];
}
