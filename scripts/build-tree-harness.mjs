import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

/** Round views the tree panel would have read for one session. */
function roundsOf(entry, turns) {
  return {
    status: 'ready',
    turns,
    error: '',
    truncated: false,
    at: Date.now(),
  };
}

const base = JSON.parse(read('test/visual-state.json'));
const entries = base.entries.map(entry => JSON.parse(JSON.stringify(entry)));
const byId = new Map(entries.map(entry => [entry.id, entry]));

const parent = byId.get('s2');
const source = byId.get('f2') || null;
const deep = JSON.parse(JSON.stringify(parent));
deep.id = 'f2';
deep.parentId = 's2';
deep.origin = 'fork';
deep.title = '登录页视觉回归 · 换对比度方案';
deep.turns = JSON.parse(JSON.stringify(parent.turns.slice(0, 1)));
deep.turn = deep.turns.length;
deep.pinned = false;
deep.unread = false;
deep.status = 'idle';
deep.statusLabel = '已完成';
deep.running = false;
deep.updatedAt = Date.now() - 1000 * 60 * 42;
deep.workspace = parent.workspace;
entries.push(deep);

const seqOf = (entry, index) => {
  const turn = entry.turns && entry.turns[index - 1];
  return turn ? Number(turn.lastSeq) || 0 : 0;
};

const state = JSON.parse(JSON.stringify(base));
state.entries = entries;
state.currentId = 's2';
state.selected = null;
state.branches = {
  s2: { parentId: 's1', atSeq: seqOf(byId.get('s1'), 2), turnIndex: 2, at: Date.now() - 1000 * 60 * 96 },
  f2: { parentId: 's2', atSeq: seqOf(byId.get('s2'), 1), turnIndex: 1, at: Date.now() - 1000 * 60 * 42 },
};
state.tree = {
  sessionId: 's2',
  busy: false,
  notice: null,
  rounds: {
    s1: roundsOf(byId.get('s1'), byId.get('s1').turns),
    s2: roundsOf(byId.get('s2'), byId.get('s2').turns),
    f2: roundsOf(deep, deep.turns),
    s7: roundsOf(byId.get('s7'), byId.get('s7').turns || []),
  },
};
state.counts.total = entries.length;
state.canFork = true;
state.fork = { status: 'idle', sessionId: '', atSeq: 0, turn: 0, childId: '', error: '' };

fs.writeFileSync(path.join(root, 'test/tree-state.json'), JSON.stringify(state, null, 2));

const styles = await import(pathToFileURL(path.join(root, 'src/styles.mjs')).href + '?t=' + Date.now());
const js = read('test/tree-harness.js').replace('__STATE__', () => read('test/tree-state.json'));
const html = read('test/visual-harness.template.html')
  .replace('__TOKENS__', () => read('test/visual-tokens.css'))
  .replace('__RADAR_CSS__', () => styles.RADAR_CSS)
  .replace('__HARNESS_CSS__', () => read('test/visual-harness.css') + read('test/tree-harness.css'))
  .replace('__SCRIPT__', () => js);

fs.writeFileSync(path.join(root, 'test/tree-harness.html'), html, 'utf8');
console.log('built test/tree-harness.html: ' + (html.length / 1024).toFixed(1) + ' KB, sessions ' + entries.length);
