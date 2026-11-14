import fs from 'node:fs';
import { RADAR_CSS } from '../src/styles.mjs';
import { QUICK_NAV_CSS } from '../src/quicknav-styles.mjs';
const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const html = read('test/visual-harness.template.html')
  .replace('__TOKENS__', () => read('test/visual-tokens.css'))
  .replace('__RADAR_CSS__', () => RADAR_CSS + QUICK_NAV_CSS)
  .replace('__HARNESS_CSS__', () => 'body{margin:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:14px Segoe UI,sans-serif}.fixture-regionArea{position:fixed;left:0;top:0;bottom:0;width:268px;background:var(--dsw-alias-bg-layer-2);border-right:1px solid var(--dsw-alias-border-l2)}.demo-copy{margin:160px 80px 0 320px;max-width:650px}.demo-copy h1{font-size:24px}.demo-copy p{line-height:1.8;color:var(--dsw-alias-label-secondary)}@media(max-width:720px){.fixture-regionArea{display:none}.demo-copy{margin:180px 24px 0}}')
  .replace('__SCRIPT__', () => read('test/quicknav-harness.js'));
fs.writeFileSync(new URL('../test/quicknav-harness.html', import.meta.url), html);
console.log('Built quicknav browser fixture from current bundle and styles');
