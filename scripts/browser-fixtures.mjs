import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

/** Keep fixture checks in an owned browser, with cleanup on every outcome. */
export async function withFixtureBrowser(check) {
  const root = path.resolve(import.meta.dirname, '..');
  const temp = path.join(root, 'test/tmp');
  fs.mkdirSync(temp, { recursive: true });
  process.env.TEMP ||= temp;
  process.env.TMP ||= temp;
  const helper = process.env.DSH_BROWSER_HELPER || path.join(homedir(), '.dsh/profiles/desktop/node_modules/oh-my-dsh/vendor/opencu/src/browser/automation.mjs');
  const { withIsolatedBrowser } = await import(pathToFileURL(helper).href);
  const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  return withIsolatedBrowser(check, {
    directory: path.join(temp, 'browser-checks'), timeoutMs: 60000,
    launchOptions: { executablePath, args: ['--allow-file-access-from-files'], deviceScaleFactor: 2 },
  });
}

export const settle = async function (page) {
  await page.evaluate(async function () {
    await document.fonts.ready;
    await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
  });
};

export async function runShots(file, shots) {
  const root = path.resolve(import.meta.dirname, '..');
  const out = path.join(root, process.env.SHOT_OUT || 'docs/screenshots');
  fs.mkdirSync(out, { recursive: true });
  await withFixtureBrowser(async function ({ context }) {
    const page = context.pages()[0];
    const errors = [];
    page.on('pageerror', function (error) { errors.push(error.message); });
    await page.addInitScript(function () { localStorage.removeItem('dsr-tree-demo-prefs'); });
    for (const shot of shots) {
      await page.setViewportSize({ width: shot.width, height: shot.height });
      await page.goto(pathToFileURL(path.join(root, file)).href + '?' + shot.query);
      await page.locator('#root > *').first().waitFor();
      await settle(page);
      if (shot.act) { await shot.act(page); await settle(page); }
      if (shot.check) await shot.check(page);
      if (errors.length) throw new Error(errors.join('\n'));
      const target = shot.clip ? page.locator(shot.clip) : page;
      await target.screenshot({ path: path.join(out, shot.name + '.png'), animations: 'disabled' });
      console.log(shot.name + ': ' + JSON.stringify(await page.evaluate(function () {
        return { rounds: document.querySelectorAll('.dsr-cv__round').length,
          words: document.querySelectorAll('.dsr-cv__said').length,
          sessions: document.querySelectorAll('.dsr-cv__node').length,
          fab: document.querySelectorAll('.dsr-treefab').length,
          composer: document.querySelectorAll('.dsr-treetoggle').length,
          confirm: document.querySelectorAll('.dsr-cv__confirm').length };
      })));
    }
  });
}
