import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function arg(name, fallback) {
  const at = process.argv.indexOf('--' + name);
  return at === -1 || at === process.argv.length - 1 ? fallback : process.argv[at + 1];
}

const statePath = arg('state', 'test/visual-state.json');
const outPath = arg('out', 'test/visual-harness.html');

const styles = await import(pathToFileURL(path.join(root, 'src/styles.mjs')).href + '?t=' + Date.now());
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const js = read('test/visual-page.js').replace('__STATE__', () => read(statePath));
const html = read('test/visual-harness.template.html')
  .replace('__TOKENS__', () => read('test/visual-tokens.css'))
  .replace('__RADAR_CSS__', () => styles.RADAR_CSS)
  .replace('__HARNESS_CSS__', () => read('test/visual-harness.css'))
  .replace('__SCRIPT__', () => js);

fs.mkdirSync(path.dirname(path.join(root, outPath)), { recursive: true });
fs.writeFileSync(path.join(root, outPath), html, 'utf8');
console.log('built ' + outPath + ': ' + (html.length / 1024).toFixed(1) + ' KB from ' + statePath);
