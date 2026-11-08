import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9335;
const PROFILE = path.join(root, 'test/tmp/chrome-shots');
const OUT = path.join(root, 'docs/screenshots');

const SHOTS = [
  { name: 'overview', query: 'mode=page', width: 1440, height: 980 },
  { name: 'radar', query: 'mode=dock', width: 1280, height: 900 },
  {
    name: 'conversation-tree',
    query: 'mode=page',
    width: 1600,
    height: 1240,
    steps: [
      "(function(){var cards=document.querySelectorAll('.dsr-card');for(var i=0;i<cards.length;i+=1){if(cards[i].textContent.indexOf('支付回调重试改造')>=0){cards[i].click();return;}}})()",
      "(function(){var b=document.querySelector('.dsr-page__detail .dsr-detail__body');var f=document.querySelector('.dsr-flow-section');if(b&&f){b.scrollTop=f.getBoundingClientRect().top-b.getBoundingClientRect().top-20;}})()",
    ],
  },
  {
    name: 'conversation-fullscreen',
    query: 'mode=page',
    width: 1600,
    height: 1000,
    steps: [
      "(function(){var cards=document.querySelectorAll('.dsr-card');for(var i=0;i<cards.length;i+=1){if(cards[i].textContent.indexOf('支付回调重试改造')>=0){cards[i].click();return;}}})()",
      "(function(){var btns=document.querySelectorAll('.dsr-detail__head button');for(var i=0;i<btns.length;i+=1){var l=btns[i].getAttribute('aria-label')||'';if(l.indexOf('全屏')>=0){btns[i].click();return;}}})()",
      "(function(){var chips=document.querySelectorAll('.dsr-flow__navchip');if(chips.length>1)chips[1].click();})()",
      "(function(){var b=document.querySelector('.dsr-detail.is-fullscreen .dsr-detail__body');var f=document.querySelector('.dsr-flow-section');if(b&&f){b.scrollTop=Math.max(0,f.getBoundingClientRect().top-b.getBoundingClientRect().top-16);}})()",
    ],
  },
  { name: 'statistics', query: 'mode=activity', width: 1320, height: 2100 },
  { name: 'workspaces', query: 'mode=workspaces', width: 1440, height: 940 },
];

fs.mkdirSync(PROFILE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + PROFILE,
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  '--force-device-scale-factor=2',
  'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function version() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (res.ok) return await res.json();
    } catch (err) { /* still booting */ }
    await sleep(250);
  }
  throw new Error('chrome did not expose the debugging port');
}

const info = await version();
const ws = new WebSocket(info.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let seq = 0;
const pending = new Map();
ws.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const entry = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) entry.reject(new Error(JSON.stringify(msg.error)));
    else entry.resolve(msg.result);
  }
};

function send(method, params, sessionId) {
  seq += 1;
  const id = seq;
  const payload = { id, method, params: params || {} };
  if (sessionId) payload.sessionId = sessionId;
  ws.send(JSON.stringify(payload));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const target = await send('Target.createTarget', { url: 'about:blank' });
const attached = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const session = attached.sessionId;
await send('Page.enable', {}, session);
await send('Runtime.enable', {}, session);

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session);
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text + ' ' + JSON.stringify(res.exceptionDetails.exception));
  return res.result.value;
}

const PROBE = [
  '(function(){',
  '  var root = document.getElementById("root");',
  '  var pick = function(sel){ var el = document.querySelector(sel); if(!el) return null; var r = el.getBoundingClientRect(); return [sel, Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };',
  '  return {',
  '    text: (document.body.innerText || "").length,',
  '    snippet: (document.body.innerText || "").replace(/\\s+/g, " ").slice(0, 150),',,
  '    nodes: root ? root.querySelectorAll("*").length : 0,',
  '    dock: pick(".dsr-dock"),',
  '    cards: document.querySelectorAll(".dsr-card").length,',
  '    flow: document.querySelectorAll(".dsr-turn").length,',
  '    nav: document.querySelectorAll(".dsr-flow__navchip").length,',
  '    branch: document.querySelectorAll(".dsr-branch").length,',
  '    full: document.querySelectorAll(".dsr-detail.is-fullscreen").length,',
  '    track: document.querySelectorAll(".dsr-time__seg").length,',
  '    err: (window.__harnessError || null)',
  '  };',
  '})()',
].join('');

for (const shot of SHOTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: shot.width, height: shot.height, deviceScaleFactor: 2, mobile: false }, session);
  const url = 'file:///' + path.join(root, 'test/demo.html').replace(/\\/g, '/') + '?' + shot.query;
  await send('Page.navigate', { url }, session);
  await sleep(1500);
  for (const step of shot.steps || []) { await evaluate(step + ';true'); await sleep(700); }
  const probe = await evaluate(PROBE);
  const shotData = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: shot.width, height: shot.height, scale: 1 },
  }, session);
  const file = path.join(OUT, shot.name + '.png');
  fs.writeFileSync(file, Buffer.from(shotData.data, 'base64'));
  const size = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(shot.name + '.png  ' + shot.width + 'x' + shot.height + '  ' + size + ' KB  textChars=' + probe.text + ' nodes=' + probe.nodes + ' cards=' + probe.cards + ' turns=' + probe.flow + ' segs=' + probe.track + (probe.dock ? ' dock=' + probe.dock.slice(1).join(',') : '') + ' nav=' + probe.nav + ' branch=' + probe.branch + ' full=' + probe.full);
  console.log('   text: ' + probe.snippet);
}

await send('Target.closeTarget', { targetId: target.targetId });
ws.close();
chrome.kill();
console.log('done');
