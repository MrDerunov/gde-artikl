// Screenshot a local HTML file with the installed Chrome/Edge.
// usage: node tools/shot.mjs <file.html|url> [out.png] [width] [height] [waitMs]
import { chromium } from 'playwright-core';
import path from 'node:path';

const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
].filter(Boolean);

const [, , urlArg, outArg = 'screenshots/shot.png', wArg = '1280', hArg = '800', waitArg = '800', ...rest] = process.argv;
if (!urlArg) {
  console.error('usage: node tools/shot.mjs <file.html|url> [out.png] [width] [height] [waitMs]');
  process.exit(2);
}
let target = urlArg;
if (!/^[a-z][a-z0-9+.-]*:/i.test(target)) {
  target = 'file:///' + path.resolve(target).replace(/\\/g, '/');
}
const mobile = rest.includes('--mobile');

let browser = null, lastErr = null;
for (const exe of CHROME_CANDIDATES) {
  try {
    browser = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
    break;
  } catch (e) { lastErr = e; }
}
if (!browser) { console.error('could not launch browser:', lastErr && lastErr.message); process.exit(3); }

const page = await browser.newPage({
  viewport: { width: parseInt(wArg, 10), height: parseInt(hArg, 10) },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
});
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
await page.goto(target, { waitUntil: 'load', timeout: 30000 }).catch(e => errors.push('goto: ' + e.message));
await page.waitForTimeout(parseInt(waitArg, 10));
fsMkdir(path.dirname(outArg));
await page.screenshot({ path: outArg, fullPage: false });
console.log('saved ' + outArg);
if (errors.length) {
  console.log('--- page errors ---');
  for (const e of errors) console.log(e);
  process.exitCode = 1;
}
await browser.close();

function fsMkdir(dir) {
  try { (globalThis.process.getBuiltinModule ? globalThis.process.getBuiltinModule('node:fs') : null)?.mkdirSync(dir, { recursive: true }); } catch {}
}
