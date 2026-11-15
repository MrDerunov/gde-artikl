#!/usr/bin/env node
/* tools/playtest.mjs — QA/Integration playwright-прогон «ГДЕ АРТИКЛЬ?!».
   Не правит игру. Собирает доказательства в screenshots/qa-*.png, отчёт — в JSON (--report).
   Usage:
     node tools/playtest.mjs                 # полный прогон (matrix+auto+skip+diploma+touch+audio+offline)
     node tools/playtest.mjs --quick         # без долгого auto-прогона (промежуточный QA)
     node tools/playtest.mjs --only matrix|monkey|auto|skip|diploma|touch|audio|offline
     node tools/playtest.mjs --no-build      # не пересобирать игру
   Exit code 1, если есть FAIL.
*/
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

function sha256(file) { try { return createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } catch (e) { return null; } }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const HTML_PATH = path.join(ROOT, 'gde-artikl.html');
const SHOTS = path.join(ROOT, 'screenshots');

/* A — замороженный снимок сборки, по которому идут браузерные тесты (задаётся в main) */
let A = HTML_PATH;
const argv = process.argv.slice(2);
const flag = (n) => argv.indexOf('--' + n) >= 0;
function argVal(name, dflt) {
  const i = argv.indexOf('--' + name);
  if (i >= 0 && argv[i + 1] && argv[i + 1].slice(0, 2) !== '--') return argv[i + 1];
  return dflt;
}
const QUICK = flag('quick');
const NO_BUILD = flag('no-build');
const ONLY = argVal('only', null);
const REPORT_PATH = path.resolve(argVal('report', path.join(os.tmpdir(), 'gde-artikl-qa', 'qa-report.json')));
const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome'
].filter(Boolean);
const SIZES = [
  { name: '1280x800', w: 1280, h: 800, mobile: false },
  { name: '390x844', w: 390, h: 844, mobile: true },
  { name: '320x568', w: 320, h: 568, mobile: true }
];
const SCENES = ['intro', 'i1', 'article', 'i2', 'memory', 'i3', 'hear', 'i4', 'letters', 'i5', 'loop', 'i6', 'boss', 'finale'];
const SCENE_WAIT = {
  intro: 1600, i1: 2400, i2: 2400, i3: 2400, i4: 2400, i5: 2400, i6: 2400,
  article: 3500, memory: 3500, hear: 3500, letters: 3500, loop: 3200, boss: 3500, finale: 2600
};
const ARM_RE = /[\u0530-\u058F\uFB13-\uFB17]/g;

const report = {
  startedAt: new Date().toISOString(),
  mode: QUICK ? 'quick' : 'full',
  root: ROOT,
  checks: [],
  bugs: [],
  scenes: {},
  matrix: [],
  requests: { total: 0, external: [] },
  build: null,
  static: null,
  summary: null
};
const BUGS = [];

function rec(status, id, message, extra) {
  report.checks.push({ status, id, message: message || '', extra: extra === undefined ? null : extra });
  let suffix = '';
  if (extra !== undefined && extra !== null) {
    try { suffix = ' :: ' + JSON.stringify(extra).slice(0, 500); } catch (e) { suffix = ' :: [unserializable]'; }
  }
  console.log('[' + status + '] ' + id + ' — ' + message + suffix);
}
const pass = (id, m, e) => rec('PASS', id, m, e);
const fail = (id, m, e) => rec('FAIL', id, m, e);
const warn = (id, m, e) => rec('WARN', id, m, e);
const info = (id, m, e) => rec('INFO', id, m, e);

function bug(severity, title, steps, expected, actual, evidence) {
  const b = { severity, title, steps, expected, actual, evidence: evidence || [] };
  BUGS.push(b);
  console.log('  >>> BUG [' + severity + '] ' + title + ' (ожидалось: ' + expected + '; факт: ' + actual + ')');
  return b;
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function rel(p) { return path.relative(ROOT, p).split(path.sep).join('/'); }
function shotPath(name) { fs.mkdirSync(SHOTS, { recursive: true }); return path.join(SHOTS, name); }
async function shot(page, name) {
  try { const p = shotPath(name); await page.screenshot({ path: p }); return rel(p); } catch (e) { return null; }
}
function fileUrl(file, params) {
  let u = pathToFileURL(file).href;
  if (params && Object.keys(params).length) u += '?' + new URLSearchParams(params).toString();
  return u;
}

/* ---------------- browser / page helpers ---------------- */
async function launchBrowser() {
  let lastErr = null;
  for (const exe of CHROME_CANDIDATES) {
    try {
      const b = await chromium.launch({
        executablePath: exe,
        args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--disable-features=Translate', '--disable-background-timer-throttling']
      });
      console.log('BROWSER: ' + exe);
      return b;
    } catch (e) { lastErr = e; }
  }
  throw new Error('cannot launch Chrome: ' + (lastErr && lastErr.message));
}

const contexts = new Map();
async function ctxFor(browser, size) {
  const key = size.name;
  if (!contexts.has(key)) {
    const ctx = await browser.newContext({
      viewport: { width: size.w, height: size.h },
      deviceScaleFactor: size.mobile ? 2 : 1,
      isMobile: size.mobile,
      hasTouch: size.mobile,
      locale: 'ru-RU'
    });
    contexts.set(key, ctx);
  }
  return contexts.get(key);
}

function track(page, tag) {
  const st = { tag, errors: [], requests: [] };
  page.on('console', (m) => { if (m.type() === 'error') st.errors.push('console.error: ' + m.text()); });
  page.on('pageerror', (e) => st.errors.push('pageerror: ' + ((e && e.message) || e)));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    st.errors.push('requestfailed: ' + r.url() + ' ' + ((f && f.errorText) || ''));
  });
  page.on('request', (r) => {
    const u = r.url();
    st.requests.push(u);
    report.requests.total++;
    if (!/^(file|data|blob):/i.test(u)) report.requests.external.push({ tag, url: u, type: r.resourceType() });
  });
  return st;
}

async function newPage(browser, size, tag) {
  const ctx = await ctxFor(browser, size);
  const page = await ctx.newPage();
  const net = track(page, tag);
  return { page, net };
}

async function waitGame(page, timeout) {
  await page.waitForFunction(() => !!window.__GAME__, null, { timeout: timeout || 10000 });
}

async function stateInfo(page) {
  return await page.evaluate(() => {
    var G = window.G || {};
    var st = G.state || {};
    var vw = window.innerWidth, vh = window.innerHeight;
    var arm = (document.body.innerText || '').match(/[\u0530-\u058F]/g) || [];
    var canvas = document.getElementById('stage-canvas');
    var canvasPixels = false;
    try {
      if (canvas && canvas.width && canvas.height) {
        var c2 = canvas.getContext('2d');
        var d = c2.getImageData(0, 0, Math.min(canvas.width, 64), Math.min(canvas.height, 64)).data;
        for (var i = 0; i < d.length; i += 4) { if (d[i] || d[i + 1] || d[i + 2] || d[i + 3]) { canvasPixels = true; break; } }
      }
    } catch (e) {}
    var btns = [];
    var els = document.querySelectorAll('button');
    for (var bi = 0; bi < els.length; bi++) {
      var b = els[bi];
      var r = b.getBoundingClientRect();
      var s = getComputedStyle(b);
      if (r.width < 2 || r.height < 2 || s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) < 0.05) continue;
      var off = r.right > vw + 2 || r.left < -2 || r.bottom > vh + 2 || r.top < -2;
      btns.push({ label: String(b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32), w: Math.round(r.width), h: Math.round(r.height), off: off });
    }
    var hscroll = document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1;
    var glyph = null;
    try {
      var cv = document.createElement('canvas');
      var g = cv.getContext('2d');
      g.font = '700 40px "Segoe UI","Noto Sans Armenian","DejaVu Sans","Arial Unicode MS",sans-serif';
      glyph = { armWidth: Math.round(g.measureText('ԸըՆն').width * 10) / 10, puaWidth: Math.round(g.measureText('\uE000\uE001').width * 10) / 10 };
    } catch (e) {}
    var rootEl = document.querySelector('.scene-root');
    return {
      scene: st.sceneName || null,
      running: !!st.running,
      sceneLog: (st.sceneLog || []).slice(),
      stats: JSON.parse(JSON.stringify(st.stats || {})),
      sceneRoot: !!rootEl,
      sceneData: rootEl ? rootEl.getAttribute('data-scene') : null,
      cutLayer: !!document.querySelector('.cut-layer'),
      introLayer: !!document.querySelector('.intro-layer'),
      diploma: !!document.querySelector('.fin-diploma'),
      armenianDom: arm.length,
      canvasPixels: canvasPixels,
      hscroll: hscroll,
      buttons: btns,
      buttonsOffscreen: btns.filter(function (x) { return x.off; }).length,
      smallTargets: btns.filter(function (x) { return x.w < 44 || x.h < 44; }).length,
      glyph: glyph,
      innerTextLen: (document.body.innerText || '').length,
      title: document.title,
      url: location.href
    };
  });
}

/* ---------------- discover ---------------- */
async function discover(browser) {
  const p = await newPage(browser, SIZES[0], 'discover');
  try {
    await p.page.goto(fileUrl(A, { scene: 'intro', only: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await waitGame(p.page, 10000);
    await p.page.waitForTimeout(500);
    const d = await p.page.evaluate(() => {
      var G = window.G || {};
      return {
        list: window.__GAME__.listScenes(),
        text: G.text ? {
          teacherName: G.text.teacherName,
          catchphrase: G.text.catchphrase,
          achievements: G.text.achievements ? Object.keys(G.text.achievements).length : 0,
          homework: G.text.homework ? G.text.homework.length : 0,
          diploma: !!G.text.diploma,
          cutscenes: G.cutscenes ? Object.keys(G.cutscenes) : [],
          students: G.text.students ? G.text.students.length : 0
        } : null,
        audio: G.audio ? { names: G.audio.SFX_NAMES ? G.audio.SFX_NAMES.length : 0, muted: G.audio.muted } : null,
        artKeys: G.art ? Object.keys(G.art) : [],
        params: G.params,
        dpr: window.devicePixelRatio
      };
    });
    report.info = d;
    const seq = d.list.sequence || [];
    const reg = d.list.registered || [];
    const registered = seq.filter((s) => reg.indexOf(s) >= 0);
    const missing = seq.filter((s) => reg.indexOf(s) < 0);
    report.registered = registered;
    report.missingScenes = missing;
    pass('discover.scenes', 'зарегистрировано ' + registered.length + '/' + seq.length + ': ' + registered.join(', '), { missing });
    if (missing.length) warn('discover.missing', 'сцены ещё не реализованы и пропускаются sequence: ' + missing.join(', '));
    if (!d.text) warn('discover.text', 'нет G.text (контент не загружен?)');
    else pass('discover.text', 'G.text: званий/достижений ' + d.text.achievements + ', ДЗ пунктов ' + d.text.homework + ', катсцен ' + d.text.cutscenes.length + ', студентов ' + d.text.students);
    if (d.audio) pass('discover.audio', 'G.audio: ' + d.audio.names + ' SFX, muted=' + d.audio.muted);
    if (d.artKeys.length) pass('discover.art', 'G.art: ' + d.artKeys.length + ' методов');
    const dbg = await p.page.evaluate(() => ({
      start: typeof window.__GAME__.start, skip: typeof window.__GAME__.skipCurrent,
      list: typeof window.__GAME__.listScenes, restart: typeof window.__GAME__.restart,
      hasState: !!window.__GAME__.state
    }));
    if (dbg.start === 'function' && dbg.skip === 'function' && dbg.list === 'function' && dbg.restart === 'function') pass('debug.api', '__GAME__: start/skipCurrent/listScenes/restart/state доступны');
    else fail('debug.api', 'не все debug-функции доступны', dbg);
    return registered;
  } finally { await p.page.close(); }
}

/* ---------------- scene matrix ---------------- */
async function runMatrix(browser, registered) {
  pass('matrix.start', 'матрица: ' + registered.length + ' сцен × ' + SIZES.length + ' размеров, только=1, seed=1');
  await Promise.all(SIZES.map(async (size) => {
    for (const scene of registered) {
      const tag = 'matrix:' + scene + '@' + size.name;
      const p = await newPage(browser, size, tag);
      const wait = SCENE_WAIT[scene] || 2600;
      try {
        await p.page.goto(fileUrl(A, { scene, only: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
        await waitGame(p.page, 8000).catch(() => {});
        await p.page.waitForTimeout(wait);
        const inf = await stateInfo(p.page);
        const sp = await shot(p.page, 'qa-scene-' + scene + '-' + size.name + '.png');
        const started = inf.sceneRoot || inf.introLayer || inf.diploma || inf.sceneLog.indexOf(scene) >= 0;
        report.matrix.push({ scene, size: size.name, started, errors: p.net.errors.slice(), info: inf, shot: sp });
        report.scenes[scene] = report.scenes[scene] || {};
        report.scenes[scene].started = started;
        report.scenes[scene][size.name] = { shot: sp, armenianDom: inf.armenianDom, hscroll: inf.hscroll, buttonsOffscreen: inf.buttonsOffscreen };
        if (p.net.errors.length) {
          fail('matrix.' + scene + '.' + size.name, 'ошибки консоли/страницы в сцене ' + scene, p.net.errors.slice(0, 5));
          bug('critical', 'Сцена ' + scene + ' (' + size.name + '): ошибки в консоли', 'node tools/playtest.mjs; открыть ?scene=' + scene + '&only=1&seed=1. ' + tag, '0 ошибок console/pageerror', p.net.errors.slice(0, 5).join(' | '), [sp]);
        } else if (!started) {
          fail('matrix.' + scene + '.' + size.name, 'сцена ' + scene + ' не появилась в DOM за ' + wait + ' мс');
          bug('major', 'Сцена ' + scene + ' не стартует (' + size.name + ')', '?scene=' + scene + '&only=1&seed=1', 'DOM .scene-root/screen', JSON.stringify({ scene: inf.scene, log: inf.sceneLog, intro: inf.introLayer }), [sp]);
        } else {
          const issues = [];
          if (inf.hscroll) issues.push('горизонтальный скролл');
          if (size.mobile && inf.buttonsOffscreen) issues.push('кнопок вне экрана: ' + inf.buttonsOffscreen);
          if (issues.length) warn('matrix.' + scene + '.' + size.name, 'лейаут: ' + issues.join('; '), inf.buttons.filter((b) => b.off).slice(0, 6));
          else pass('matrix.' + scene + '.' + size.name, 'OK' + (inf.sceneRoot ? '' : ' (сцена уже завершилась, DOM пуст — ок'));
        }
        if (inf.hscroll) bug('major', 'Горизонтальный скролл в сцене ' + scene + ' на ' + size.name, '?scene=' + scene + '&only=1', 'document.scrollWidth <= viewport', 'scrollWidth=' + '>' + size.w, [sp]);
        if (inf.buttonsOffscreen) bug('minor', 'Кнопки вне экрана в сцене ' + scene + ' на ' + size.name, '?scene=' + scene + '&only=1', 'все кнопки в viewport', JSON.stringify(inf.buttons.filter((b) => b.off).slice(0, 5)), [sp]);
      } catch (e) {
        fail('matrix.' + scene + '.' + size.name, 'исключение QA: ' + ((e && e.message) || e));
      } finally { await p.page.close(); }
    }
  }));
}

/* ---------------- auto run ---------------- */
async function autoRun(browser, opts) {
  const file = (opts && opts.file) || A;
  const label = (opts && opts.label) || 'auto';
  const maxMs = (opts && opts.maxMs) || 10 * 60 * 1000;
  const stuckMs = (opts && opts.stuckMs) || 30000;
  const p = await newPage(browser, SIZES[0], label);
  const seen = {};
  const transitions = [];
  const stuck = [];
  const t0 = Date.now();
  let result = null;
  try {
    await p.page.goto(fileUrl(file, { auto: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await waitGame(p.page, 10000);
    pass(label + '.start', '?auto=1&seed=1 запущен: ' + rel(file));
    let lastScene = null, sceneSince = Date.now();
    while (Date.now() - t0 < maxMs) {
      let st;
      try {
        st = await p.page.evaluate(() => {
          var G = window.G || {};
          var s = G.state || {};
          return { running: !!s.running, scene: s.sceneName || null, log: (s.sceneLog || []).slice(), stats: JSON.parse(JSON.stringify(s.stats || {})) };
        });
      } catch (e) {
        result = { ok: false, error: 'evaluate: ' + ((e && e.message) || e), lastScene, transitions, stuck };
        break;
      }
      if (st.scene && st.scene !== lastScene) {
        if (lastScene) transitions.push({ scene: lastScene, ms: Date.now() - sceneSince });
        lastScene = st.scene;
        sceneSince = Date.now();
        if (!seen[st.scene]) {
          seen[st.scene] = true;
          await shot(p.page, 'qa-auto-' + label + '-' + st.scene + '.png');
        }
      }
      if (!st.running) {
        if (lastScene) transitions.push({ scene: lastScene, ms: Date.now() - sceneSince });
        result = { ok: true, elapsed: Date.now() - t0, log: st.log, stats: st.stats, scene: st.scene, transitions, stuck };
        break;
      }
      if (lastScene && Date.now() - sceneSince > stuckMs) {
        stuck.push({ scene: lastScene, ms: Date.now() - sceneSince });
        try { await p.page.evaluate(() => window.__GAME__.skipCurrent()); } catch (e) {}
        sceneSince = Date.now();
      }
      await sleep(200);
    }
    if (!result) result = { ok: false, timeout: true, elapsed: Date.now() - t0, lastScene, transitions, stuck, log: [] };
    await p.page.waitForTimeout(1000);
    const endShot = await shot(p.page, 'qa-auto-' + label + '-end.png');
    const endInfo = await stateInfo(p.page).catch(() => null);
    report[label] = { result, seen: Object.keys(seen), errors: p.net.errors.slice(), endShot, endInfo };
    if (p.net.errors.length) {
      fail(label + '.console', 'auto-прогон: ' + p.net.errors.length + ' ошибок консоли/страницы', p.net.errors.slice(0, 6));
      bug('critical', 'auto-прогон: ошибки консоли', 'открыть ' + rel(file) + '?auto=1&seed=1', '0 console/pageerror', p.net.errors.slice(0, 6).join(' | '), [endShot]);
    } else {
      pass(label + '.console', 'auto-прогон без ошибок консоли/страницы');
    }
    if (result.ok) {
      const log = result.log || [];
      pass(label + '.finish', 'sequence завершилась за ' + Math.round(result.elapsed / 1000) + ' c; сцен в логе ' + log.length + ': ' + log.join(', '));
      if (log.indexOf('finale') < 0) {
        fail(label + '.finale', 'sequence завершилась, но finale не проиграна', log);
        bug('critical', 'auto-прогон не дошёл до финала', rel(file) + '?auto=1', 'G.state.sceneLog содержит finale', log.join(','), [endShot]);
      }
      const seq = (report.info && report.info.list.sequence) || [];
      const reg = report.registered || [];
      const skipped = seq.filter((s) => reg.indexOf(s) >= 0 && log.indexOf(s) < 0);
      if (skipped.length) fail(label + '.coverage', 'в auto-прогоне пропущены сцены: ' + skipped.join(', '));
      else pass(label + '.coverage', 'все зарегистрированные сцены проиграны');
      const playedOrder = log.filter((s) => reg.indexOf(s) >= 0);
      const expectedOrder = reg.filter((s) => seq.indexOf(s) >= 0);
      if (playedOrder.join(',') === expectedOrder.join(',')) pass(label + '.order', 'порядок сцен в sequence верный: ' + playedOrder.join('→'));
      else warn(label + '.order', 'порядок/состав сцен отличается от G.sequence', { played: playedOrder, expected: expectedOrder });
      const totalStats = Object.keys(result.stats || {}).reduce((a, k) => a + (Number(result.stats[k]) || 0), 0);
      if (totalStats > 0) pass(label + '.stats', 'статистика за auto-прогон накоплена (сумма счётчиков ' + totalStats + ')', { articlesSaved: result.stats.articlesSaved, lettersCaught: result.stats.lettersCaught, memoryFinds: result.stats.memoryFinds, bossHits: result.stats.bossHits, loops: result.stats.loops, repeats: result.stats.repeats, errors: result.stats.errors });
      else fail(label + '.stats', 'в auto-прогоне не начислена статистика (все счётчики 0)', result.stats);
    } else {
      fail(label + '.timeout', 'auto-прогон не завершился за ' + Math.round(maxMs / 1000) + ' c', { lastScene: result.lastScene, stuck: result.stuck, timeout: result.timeout, error: result.error });
      bug('critical', 'auto-прогон завис/не дошёл до конца', rel(file) + '?auto=1', 'sequence завершается сама', 'последняя сцена: ' + result.lastScene + ', зависания: ' + JSON.stringify(result.stuck || []), [endShot]);
    }
    if (result.transitions && result.transitions.length) {
      const slow = result.transitions.filter((x) => x.ms > 6000);
      if (slow.length) warn(label + '.durations', 'сцены дольше 6 c в auto-режиме (TECH §3: авто-финиш 1-2 c): ' + slow.map((x) => x.scene + ' ' + Math.round(x.ms / 1000) + 'c').join(', '), result.transitions);
      else info(label + '.durations', 'длительности сцен: ' + result.transitions.map((x) => x.scene + ' ' + (x.ms / 1000).toFixed(1) + 'c').join(', '));
    }
    if (stuck.length) warn(label + '.stuck', 'зависания, принудительно пропущены: ' + JSON.stringify(stuck));
    return result;
  } catch (e) {
    fail(label + '.exception', 'исключение auto-прогона: ' + ((e && e.message) || e));
    return null;
  } finally { await p.page.close(); }
}

/* ---------------- skip run ---------------- */
async function runSkip(browser, registered) {
  const p = await newPage(browser, SIZES[0], 'skip');
  try {
    await p.page.goto(fileUrl(A, { debug: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await waitGame(p.page, 8000);
    await p.page.waitForTimeout(700);
    const hudSkip = await p.page.evaluate(() => {
      var b = document.querySelector('.hud-skip');
      if (!b) return null;
      var r = b.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    if (hudSkip) pass('skip.hud-button', 'кнопка SKIP в HUD есть при ?debug=1', hudSkip);
    else fail('skip.hud-button', 'нет кнопки .hud-skip при ?debug=1');
    const played = [];
    for (const scene of registered) {
      try {
        await p.page.evaluate((name) => { window.__GAME__.start(name); }, scene);
        let started = false;
        for (let i = 0; i < 50; i++) {
          const st = await p.page.evaluate(() => {
            var G = window.G || {};
            return { scene: (G.state || {}).sceneName, log: ((G.state || {}).sceneLog || []).slice() };
          });
          if (st.scene === scene || st.log.indexOf(scene) >= 0) { started = true; break; }
          await sleep(120);
        }
        if (!started) { fail('skip.' + scene, 'сцена не стартовала через __GAME__.start()'); continue; }
        await p.page.waitForTimeout(700);
        const errBefore = p.net.errors.length;
        await p.page.evaluate(() => window.__GAME__.skipCurrent());
        await p.page.waitForTimeout(500);
        const after = await p.page.evaluate(() => {
          var G = window.G || {};
          return { scene: (G.state || {}).sceneName, log: ((G.state || {}).sceneLog || []).slice(), running: !!(G.state || {}).running };
        });
        played.push(scene);
        if (p.net.errors.length > errBefore) {
          fail('skip.' + scene, 'ошибки после __GAME__.skipCurrent()');
          bug('critical', 'skipCurrent оставляет ошибки в сцене ' + scene, '?debug=1, __GAME__.start("' + scene + '"), skipCurrent()', '0 ошибок', p.net.errors.slice(errBefore, errBefore + 4).join(' | '), []);
        } else {
          pass('skip.' + scene, 'start→skip OK, следующая сцена: ' + (after.scene || '—'));
        }
      } catch (e) { fail('skip.' + scene, 'исключение: ' + ((e && e.message) || e)); }
    }
    const notPlayed = registered.filter((s) => played.indexOf(s) < 0);
    if (!notPlayed.length) pass('skip.sequence', 'все ' + registered.length + ' сцен запускаются и пропускаются через __GAME__');
    else fail('skip.sequence', 'не удалось запустить/пропустить: ' + notPlayed.join(', '));
    if (p.net.errors.length) {
      fail('skip.console', 'skip-прогон: ' + p.net.errors.length + ' ошибок консоли', p.net.errors.slice(0, 6));
      bug('critical', 'Ошибки в skip-прогоне', '?debug=1, __GAME__.start/skipCurrent по всем сценам', '0 ошибок', p.net.errors.slice(0, 6).join(' | '), []);
    } else pass('skip.console', 'skip-прогон без ошибок консоли');
    const sp = await shot(p.page, 'qa-skip-end-1280x800.png');
    report.skip = { played, errors: p.net.errors.slice(), shot: sp };
  } catch (e) { fail('skip.exception', 'исключение skip-прогона: ' + ((e && e.message) || e)); }
  finally { await p.page.close(); }
}

/* ---------------- diploma ---------------- */
async function diplomaText(page) {
  return await page.evaluate(() => {
    function txt(sel) { var e = document.querySelector(sel); return e ? String(e.textContent || '').trim() : null; }
    function all(sel) { var out = []; var els = document.querySelectorAll(sel); for (var i = 0; i < els.length; i++) out.push(String(els[i].textContent || '').trim()); return out; }
    var G = window.G || {};
    var stats = JSON.parse(JSON.stringify((G.state || {}).stats || {}));
    var d = (G.text && G.text.diploma) || {};
    var share = '';
    try { if (typeof d.shareText === 'function') share = d.shareText(stats); } catch (e) { share = 'ERROR: ' + e.message; }
    var ranks = {};
    if (typeof d.rankFor === 'function') {
      try {
        ranks.zero = d.rankFor({});
        ranks.rich = d.rankFor({ articlesSaved: 12, loops: 2, protocols: 2, errors: 5, screams: 4, lettersCaught: 6, memoryFinds: 2, bossHits: 5, homeworkItems: 47, repeats: 3, gagsFound: 8 });
        ranks.empty = d.rankFor(null);
      } catch (e) { ranks.error = e.message; }
    }
    var rect = document.querySelector('.fin-diploma') ? document.querySelector('.fin-diploma').getBoundingClientRect() : null;
    return {
      ministry: txt('.fin-min'), title: txt('.fin-title'), sub: txt('.fin-sub'), intro: txt('.fin-intro'),
      rank: txt('.fin-rank'), rankLabel: txt('.fin-rank-label'), statsLines: all('.fin-stats li'),
      seal: txt('.fin-seal .big'), sealSmall: txt('.fin-seal .small'), footnote: txt('.fin-foot'),
      buttons: all('.fin-actions button'), note: txt('.fin-copynote'),
      shareText: share, shareLength: share.length, ranks: ranks, stats: stats,
      vw: window.innerWidth, vh: window.innerHeight,
      cardRect: rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      clipboardType: typeof navigator.clipboard, secure: !!window.isSecureContext,
      manual: !!document.getElementById('fin-manual')
    };
  });
}

async function runDiplomaDesktop(browser) {
  const p = await newPage(browser, SIZES[0], 'diploma-desktop');
  try {
    await p.page.goto(fileUrl(A, { scene: 'finale', only: '1', diploma: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await p.page.waitForSelector('.fin-diploma', { timeout: 15000 });
    await p.page.waitForTimeout(700);
    const d = await diplomaText(p.page);
    report.diploma = report.diploma || {};
    report.diploma.desktop = d;
    const sp = await shot(p.page, 'qa-diploma-1280x800.png');
    if (d.ministry && /Министер/i.test(d.ministry)) pass('diploma.ministry', 'министерство: ' + d.ministry); else fail('diploma.ministry', 'нет министерства в дипломе', { ministry: d.ministry });
    if (d.title && /СВИДЕТЕЛЬСТВО/i.test(d.title)) pass('diploma.title', 'титул: ' + d.title); else fail('diploma.title', 'нет титула «СВИДЕТЕЛЬСТВО»', { title: d.title });
    if (d.rank && d.rank.length > 3) pass('diploma.rank', 'звание: ' + d.rank); else fail('diploma.rank', 'пустое звание', { rank: d.rank });
    if (d.statsLines && d.statsLines.length >= 5) pass('diploma.stats', 'строк статистики: ' + d.statsLines.length, d.statsLines.slice(0, 4)); else fail('diploma.stats', 'мало строк статистики', { lines: d.statsLines });
    if (d.seal && ARM_RE.test(d.seal)) { ARM_RE.lastIndex = 0; pass('diploma.seal', 'печать по-армянски: ' + d.seal + ' (' + d.sealSmall + ')'); } else fail('diploma.seal', 'печать без армянских глифов', { seal: d.seal });
    if (d.shareLength > 80) pass('diploma.share', 'shareText: ' + d.shareLength + ' симв.', d.shareText.slice(0, 120)); else fail('diploma.share', 'shareText пустой/короткий', { shareText: d.shareText });
    if (d.ranks && d.ranks.zero && d.ranks.rich && d.ranks.zero !== d.ranks.rich) pass('diploma.rankFor', 'звание зависит от статистики: пусто="' + d.ranks.zero + '", богато="' + d.ranks.rich + '", null="' + d.ranks.empty + '"'); else fail('diploma.rankFor', 'rankFor не различает статистику / падает', d.ranks);
    if (d.cardRect && d.cardRect.right <= d.vw + 2 && d.cardRect.left >= -2) pass('diploma.layout.1280x800', 'карточка диплома целиком в viewport', d.cardRect); else warn('diploma.layout.1280x800', 'карточка выходит за viewport', d.cardRect);
    if (d.clipboardType !== 'undefined') info('diploma.clipboard-env', 'navigator.clipboard=' + d.clipboardType + ', isSecureContext=' + d.secure + ' (file://)');

    /* копирование */
    const copyLoc = p.page.locator('.fin-actions button', { hasText: 'СКОПИРОВАТЬ' }).first();
    await copyLoc.click();
    await p.page.waitForTimeout(1000);
    const c1 = await p.page.evaluate(() => {
      var note = document.querySelector('.fin-copynote');
      var ta = document.querySelector('#fin-manual textarea');
      return { note: note ? note.textContent : '', manual: !!document.getElementById('fin-manual'), taLen: ta ? ta.value.length : 0, taHead: ta ? ta.value.slice(0, 100) : '' };
    });
    if (c1.manual) {
      pass('diploma.copy', 'clipboard недоступен → fallback .fin-manual с textarea (' + c1.taLen + ' симв.)');
      report.diploma.copyPath = 'manual-fallback';
      await shot(p.page, 'qa-diploma-manual-1280x800.png');
      await p.page.locator('#fin-manual button').first().click().catch(() => {});
      await p.page.waitForTimeout(300);
    } else if (c1.note && /СКОПИРОВАНО/i.test(c1.note)) {
      pass('diploma.copy', 'копирование сработало: «' + c1.note.trim() + '»');
      report.diploma.copyPath = 'clipboard/execCommand';
    } else {
      fail('diploma.copy', 'после клика «Скопировать» нет ни подтверждения, ни fallback', c1);
      bug('major', 'Кнопка «Скопировать результат» ничего не делает', '?scene=finale&only=1&diploma=1, клик «СКОПИРОВАТЬ РЕЗУЛЬТАТ»', 'note «СКОПИРОВАНО…» или .fin-manual textarea', JSON.stringify(c1), [sp]);
    }
    /* ручное копирование отдельной кнопкой */
    const manualLoc = p.page.locator('.fin-actions button', { hasText: 'показать текст вручную' }).first();
    if (await manualLoc.count()) {
      await manualLoc.click();
      await p.page.waitForTimeout(500);
      const m = await p.page.evaluate(() => {
        var ta = document.querySelector('#fin-manual textarea');
        return { manual: !!document.getElementById('fin-manual'), len: ta ? ta.value.length : 0, readonly: ta ? ta.readOnly : null, hasRank: ta ? ta.value.indexOf('зван') >= 0 || ta.value.length > 100 : false };
      });
      if (m.manual && m.len > 80) { pass('diploma.manual', 'кнопка «показать текст вручную»: textarea ' + m.len + ' симв., readOnly=' + m.readonly); report.diploma.manualShot = await shot(p.page, 'qa-diploma-manual.png'); }
      else fail('diploma.manual', 'fallback textarea пустой или не открылся', m);
      await p.page.locator('#fin-manual button').first().click().catch(() => {});
      await p.page.waitForTimeout(250);
    } else fail('diploma.manual-button', 'нет кнопки «показать текст вручную»');
    /* реплей */
    const preset = await p.page.evaluate(() => { var G = window.G; G.state.stats.errors = 7; G.state.stats.articlesSaved = 9; return JSON.parse(JSON.stringify(G.state.stats)); });
    const againLoc = p.page.locator('.fin-actions button', { hasText: 'СЫГРАТЬ' }).first();
    await againLoc.click();
    await p.page.waitForTimeout(1800);
    const after = await p.page.evaluate(() => {
      var G = window.G;
      var s = G.state.stats;
      var nonzero = {};
      for (var k in s) { if (s[k] !== 0) nonzero[k] = s[k]; }
      return {
        nonzero, stats: JSON.parse(JSON.stringify(s)), running: G.state.running, scene: G.state.sceneName,
        log: G.state.sceneLog.slice(), diploma: !!document.querySelector('.fin-diploma-wrap'),
        intro: !!document.querySelector('.intro-layer'), root: !!document.querySelector('.scene-root')
      };
    });
    const restartShot = await shot(p.page, 'qa-diploma-restart-1280x800.png');
    if (!after.diploma && Object.keys(after.nonzero).length === 0 && after.running) pass('diploma.restart', '«Сыграть ещё раз»: диплом закрыт, статистика сброшена в 0, sequence перезапущена (scene=' + after.scene + ', log=' + after.log.join(',') + ')');
    else fail('diploma.restart', 'реплей не сбросил состояние', after);
    report.diploma.restartShot = restartShot;
    report.diploma.restart = after;
  } catch (e) { fail('diploma.desktop.exception', 'исключение: ' + ((e && e.message) || e)); }
  finally { await p.page.close(); }
}

async function runDiplomaSizes(browser) {
  for (const size of [SIZES[1], SIZES[2]]) {
    const p = await newPage(browser, size, 'diploma:' + size.name);
    try {
      await p.page.goto(fileUrl(A, { scene: 'finale', only: '1', diploma: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
      await p.page.waitForSelector('.fin-diploma', { timeout: 15000 });
      await p.page.waitForTimeout(700);
      const d = await diplomaText(p.page);
      report.diploma = report.diploma || {};
      report.diploma[size.name] = d;
      const sp = await shot(p.page, 'qa-diploma-' + size.name + '.png');
      if (d.hscroll) fail('diploma.layout.' + size.name, 'горизонтальный скролл диплома на ' + size.name);
      else pass('diploma.layout.' + size.name, 'диплом на ' + size.name + ': без горизонтального скролла, карточка ' + JSON.stringify(d.cardRect));
      if (d.cardRect && d.cardRect.right > d.vw + 2) fail('diploma.overflow.' + size.name, 'карточка диплома шире viewport (' + d.cardRect.right + ' > ' + d.vw + ')', d.cardRect);
      const actions = await p.page.evaluate(() => {
        var out = [];
        var els = document.querySelectorAll('.fin-actions button');
        for (var i = 0; i < els.length; i++) { var r = els[i].getBoundingClientRect(); out.push({ label: String(els[i].textContent).trim(), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), off: r.right > innerWidth + 2 || r.left < -2 }); }
        return out;
      });
      const bad = actions.filter((a) => a.off || a.w < 44 || a.h < 44);
      if (!bad.length) pass('diploma.buttons.' + size.name, 'кнопки диплома на ' + size.name + ' в viewport и >=44px');
      else warn('diploma.buttons.' + size.name, 'кнопки диплома на ' + size.name + ': ' + JSON.stringify(bad));
      report.diploma[size.name].buttonsMeasured = actions;
      report.diploma[size.name].shot = sp;
      if (size.name === '390x844') {
        /* копирование на мобильном тапом */
        await p.page.locator('.fin-actions button', { hasText: 'СКОПИРОВАТЬ' }).first().tap().catch(async () => {
          await p.page.locator('.fin-actions button', { hasText: 'СКОПИРОВАТЬ' }).first().click();
        });
        await p.page.waitForTimeout(900);
        const mob = await p.page.evaluate(() => ({ note: (document.querySelector('.fin-copynote') || {}).textContent || '', manual: !!document.getElementById('fin-manual'), taLen: (document.querySelector('#fin-manual textarea') || {}).value ? document.querySelector('#fin-manual textarea').value.length : 0 }));
        if (mob.manual) pass('diploma.copy.' + size.name, 'копирование на 390px: fallback .fin-manual (' + mob.taLen + ' симв.)');
        else if (/СКОПИРОВАНО/i.test(mob.note)) pass('diploma.copy.' + size.name, 'копирование на 390px: «' + mob.note.trim() + '»');
        else fail('diploma.copy.' + size.name, 'копирование на 390px не сработало', mob);
        if (mob.manual) { await shot(p.page, 'qa-diploma-manual-390x844.png'); await p.page.locator('#fin-manual button').first().click().catch(() => {}); }
      }
    } catch (e) { fail('diploma.' + size.name + '.exception', 'исключение: ' + ((e && e.message) || e)); }
    finally { await p.page.close(); }
  }
}

async function runDiplomaCopyFallback(browser) {
  const p = await newPage(browser, SIZES[0], 'diploma-copyfallback');
  try {
    await p.page.addInitScript(() => {
      try { Object.defineProperty(navigator, 'clipboard', { configurable: true, get: function () { return undefined; } }); } catch (e) {}
      try {
        var orig = Document.prototype.execCommand;
        Document.prototype.execCommand = function () { return false; };
      } catch (e) {}
    });
    await p.page.goto(fileUrl(A, { scene: 'finale', only: '1', diploma: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await p.page.waitForSelector('.fin-diploma', { timeout: 15000 });
    await p.page.waitForTimeout(500);
    await p.page.locator('.fin-actions button', { hasText: 'СКОПИРОВАТЬ' }).first().click();
    await p.page.waitForTimeout(1000);
    const r = await p.page.evaluate(() => {
      var ta = document.querySelector('#fin-manual textarea');
      return { manual: !!document.getElementById('fin-manual'), len: ta ? ta.value.length : 0, title: (document.querySelector('.fin-manual-title') || {}).textContent || '' };
    });
    const sp = await shot(p.page, 'qa-diploma-copyfallback-1280x800.png');
    if (r.manual && r.len > 80) pass('diploma.copy-fallback', 'при принудительно недоступном clipboard кнопка «Скопировать» открывает .fin-manual textarea (' + r.len + ' симв.): «' + r.title + '»');
    else { fail('diploma.copy-fallback', 'fallback copy не открыл textarea', r); bug('major', 'Fallback копирования диплома не работает', 'переопределить navigator.clipboard=undefined и document.execCommand=()=>false; клик «Скопировать»', '.fin-manual с textarea', JSON.stringify(r), [sp]); }
    report.diploma.copyFallback = r;
  } catch (e) { fail('diploma.copy-fallback.exception', 'исключение: ' + ((e && e.message) || e)); }
  finally { await p.page.close(); }
}

async function runDiploma(browser) {
  pass('diploma.start', 'диплом: ?scene=finale&only=1&diploma=1');
  await runDiplomaDesktop(browser);
  await runDiplomaSizes(browser);
  await runDiplomaCopyFallback(browser);
}

/* ---------------- touch ---------------- */
async function runTouch(browser) {
  const size = SIZES[1];
  pass('touch.start', 'тач-прогон 390x844 (isMobile+hasTouch)');
  const p = await newPage(browser, size, 'touch');
  try {
    /* 1. интро */
    await p.page.goto(fileUrl(A, { seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await waitGame(p.page, 8000);
    await p.page.waitForTimeout(1400);
    const intro = await p.page.evaluate(() => ({ layer: !!document.querySelector('.intro-layer'), btn: !!document.querySelector('.intro-start'), btnRect: (function () { var b = document.querySelector('.intro-start'); if (!b) return null; var r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), off: r.right > innerWidth + 2 || r.left < -2 || r.bottom > innerHeight + 2 }; })() }));
    if (intro.layer && intro.btn) pass('touch.intro', 'интро на 390px: кнопка «НАЧАТЬ УРОК» ' + JSON.stringify(intro.btnRect)); else fail('touch.intro', 'интро не отрисовалось', intro);
    const introShot = await shot(p.page, 'qa-touch-intro-390x844.png');
    /* 2. start через фейковое окно (кнопка анимирована — тапаем по координатам) */
    const startBox = await p.page.$eval('.intro-start', (el) => { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.page.touchscreen.tap(Math.round(startBox.x), Math.round(startBox.y));
    await p.page.waitForSelector('.fx-window', { timeout: 8000 });
    await p.page.waitForTimeout(400);
    const fake1 = await p.page.evaluate(() => ({ title: String((document.querySelector('.fx-window') || {}).textContent || '').slice(0, 140), buttons: Array.prototype.map.call(document.querySelectorAll('.fx-winbtn'), function (b) { return String(b.textContent).trim(); }) }));
    const fakeShot = await shot(p.page, 'qa-touch-fakewin-390x844.png');
    if (fake1.buttons.length >= 2) pass('touch.fakewin', 'фейковое окно после тапа: ' + fake1.buttons.join(' / '), fake1.title.slice(0, 60));
    else fail('touch.fakewin', 'после тапа «Начать» нет фейкового окна', fake1);
    await p.page.locator('.fx-winbtn', { hasText: 'СДАТЬ' }).first().tap();
    await p.page.waitForTimeout(800);
    const win2 = await p.page.evaluate(() => (document.querySelector('.fx-window') ? String(document.querySelector('.fx-window').textContent).slice(0, 140) : null));
    if (win2) {
      await p.page.locator('.fx-winbtn', { hasText: 'НАЧАТЬ' }).first().tap();
      await p.page.waitForTimeout(700);
      pass('touch.start', 'два фейковых окна пройдены тапом (второе: ' + win2.slice(0, 60) + ')');
    } else warn('touch.start', 'второе фейковое окно не появилось');
    /* 3. переход intro → i1 */
    let cur = null;
    for (let i = 0; i < 100; i++) {
      cur = await p.page.evaluate(() => { var G = window.G || {}; return { scene: (G.state || {}).sceneName, root: !!document.querySelector('.scene-root'), cut: !!document.querySelector('.cut-layer'), intro: !!document.querySelector('.intro-layer') }; });
      if (cur.scene && cur.scene !== 'intro') break;
      await p.page.waitForTimeout(150);
    }
    const i1Shot = await shot(p.page, 'qa-touch-i1-390x844.png');
    if (cur && cur.scene === 'i1') pass('touch.transition', 'после интро началась сцена i1 (катсцена)'); else fail('touch.transition', 'нет перехода intro→i1', cur);
    /* 4. пролистать i1 тапами до Эп1 */
    let reachedArticle = false;
    const taps0 = Date.now();
    for (let i = 0; i < 130; i++) {
      await p.page.touchscreen.tap(Math.floor(size.w / 2), Math.floor(size.h / 2));
      await p.page.waitForTimeout(140);
      const sc = await p.page.evaluate(() => ((window.G || {}).state || {}).sceneName);
      if (sc === 'article') { reachedArticle = true; break; }
    }
    if (reachedArticle) pass('touch.cutscene', 'i1 протапана тач-тапами до Эп1 за ' + Math.round((Date.now() - taps0) / 1000) + ' c');
    else { fail('touch.cutscene', 'тапами не удалось пройти i1 до Эп1 за 130 тапов'); bug('major', 'Тап не ускоряет катсцену i1', '390x844, интро→старт→i1, тапы по центру', 'переход в article за ~20 c', 'не дошли за 130 тапов', [i1Shot]); }
    /* 5. мини-игра Эп1 на тач */
    if (reachedArticle) {
      let artsReady = false;
      for (let i = 0; i < 90; i++) {
        const n = await p.page.evaluate(() => document.querySelectorAll('.ep1-art').length);
        if (n >= 2) { artsReady = true; break; }
        await p.page.waitForTimeout(250);
      }
      const artShot = await shot(p.page, 'qa-touch-article-390x844.png');
      const inf1 = await stateInfo(p.page);
      if (inf1.hscroll) fail('touch.article-layout', 'Эп1 на 390px: горизонтальный скролл'); else pass('touch.article-layout', 'Эп1 на 390px: без горизонтального скролла, кнопок вне экрана ' + inf1.buttonsOffscreen + ', мелких тач-целей ' + inf1.smallTargets);
      if (artsReady) {
        let saved = 0, errors = 0;
        for (let attempt = 0; attempt < 3 && !saved; attempt++) {
          const need = await p.page.$eval('.ep1-word', (el) => el.dataset.need).catch(() => null);
          const box = need ? await p.page.$eval('.ep1-art[data-art="' + need + '"]', (el) => { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).catch(() => null) : null;
          if (box) { await p.page.touchscreen.tap(Math.round(box.x), Math.round(box.y)); await p.page.waitForTimeout(450); }
          const wb = await p.page.$eval('.ep1-word', (el) => { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).catch(() => null);
          if (wb) { await p.page.touchscreen.tap(Math.round(wb.x), Math.round(wb.y)); await p.page.waitForTimeout(1500); }
          const st = await p.page.evaluate(() => JSON.parse(JSON.stringify((window.__GAME__ && window.__GAME__.state.stats) || {})));
          saved = st.articlesSaved || 0;
          errors = st.errors || 0;
        }
        const attachShot = await shot(p.page, 'qa-touch-article-attach-390x844.png');
        if (saved >= 1) pass('touch.article-interaction', 'Эп1 тач: тап артикля ը/ն + тап слова = артикль прикреплён (articlesSaved=' + saved + ')', { errors });
        else {
          fail('touch.article-interaction', 'Эп1 тач: не удалось прикрепить артикль тапами', { saved, errors });
          bug('major', 'Тач-механика Эп1 не срабатывает', '390x844, ?scene=article, тап по нужному артиклю, затем по слову', 'articlesSaved >= 1', 'articlesSaved=' + saved + ', errors=' + errors, [attachShot]);
        }
        report.touch = { introShot, fakeShot, i1Shot, artShot, attachShot, saved, errors };
      } else {
        fail('touch.article-state', 'Эп1: артикли не появились за ~22 c', { scene: (await p.page.evaluate(() => window.G.state.sceneName)) });
        bug('major', 'Эп1 на 390px не доходит до раунда', '?scene=article&only=1 на 390x844', '.ep1-art в DOM', 'нет артиклей', [artShot]);
      }
    }
  } catch (e) { fail('touch.exception', 'исключение touch-прогона: ' + ((e && e.message) || e)); }
  finally { await p.page.close(); }

  /* 6. SKIP-кнопка в HUD тапом */
  const sp = await newPage(browser, size, 'touch-skip');
  try {
    await sp.page.goto(fileUrl(A, { debug: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await waitGame(sp.page, 8000);
    await sp.page.waitForTimeout(1200);
    await sp.page.tap('.hud-skip');
    await sp.page.waitForTimeout(900);
    const afterSkip = await sp.page.evaluate(() => { var G = window.G || {}; return { scene: (G.state || {}).sceneName, log: ((G.state || {}).sceneLog || []).slice() }; });
    const skipShot = await shot(sp.page, 'qa-touch-skip-390x844.png');
    if (afterSkip.scene && afterSkip.scene !== 'intro') pass('touch.skip', 'тап по HUD SKIP на 390px: intro→' + afterSkip.scene); else fail('touch.skip', 'SKIP-кнопка тапом не переключает сцену', afterSkip);
    await sp.page.tap('.hud-skip');
    await sp.page.waitForTimeout(900);
    const afterSkip2 = await sp.page.evaluate(() => { var G = window.G || {}; return { scene: (G.state || {}).sceneName, log: ((G.state || {}).sceneLog || []).slice() }; });
    if (afterSkip2.log.length > afterSkip.log.length) pass('touch.skip2', 'повторный SKIP: i1→' + afterSkip2.scene + ' (log: ' + afterSkip2.log.join(',') + ')'); else warn('touch.skip2', 'повторный SKIP не продвинул sequence', afterSkip2);
    report.touch = Object.assign(report.touch || {}, { skipShot });
  } catch (e) { fail('touch.skip.exception', 'исключение skip-тача: ' + ((e && e.message) || e)); }
  finally { await sp.page.close(); }

  /* 7. mute тапом + персистентность */
  const mp = await newPage(browser, size, 'touch-mute');
  try {
    await mp.page.goto(fileUrl(A, { seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await waitGame(mp.page, 8000);
    await mp.page.waitForTimeout(900);
    await mp.page.tap('#hud-sound');
    await mp.page.waitForTimeout(400);
    const m1 = await mp.page.evaluate(() => ({
      stateMuted: !!window.G.state.muted,
      audioMuted: window.G.audio ? !!window.G.audio.muted : null,
      ls: localStorage.getItem('gde-artikl-muted'),
      lsAudio: localStorage.getItem('gda-muted'),
      icon: (document.getElementById('hud-sound') || {}).textContent
    }));
    if (m1.stateMuted && m1.icon === '🔇') pass('audio.mute-touch', 'mute тапом: state.muted=' + m1.stateMuted + ', иконка ' + m1.icon + ', localStorage gde-artikl-muted=' + m1.ls + ', gda-muted=' + m1.lsAudio);
    else fail('audio.mute-touch', 'mute не переключился тапом', m1);
    await mp.page.reload({ waitUntil: 'load' });
    await waitGame(mp.page, 8000);
    await mp.page.waitForTimeout(900);
    const m2 = await mp.page.evaluate(() => ({
      stateMuted: !!window.G.state.muted,
      audioMuted: window.G.audio ? !!window.G.audio.muted : null,
      ls: localStorage.getItem('gde-artikl-muted'),
      icon: (document.getElementById('hud-sound') || {}).textContent
    }));
    if (m2.stateMuted && m2.icon === '🔇' && m2.audioMuted) pass('audio.mute-persist', 'mute сохранился после reload: state=' + m2.stateMuted + ', icon=' + m2.icon + ', audio.muted=' + m2.audioMuted);
    else fail('audio.mute-persist', 'mute не сохранился после reload', m2);
    await mp.page.tap('#hud-sound');
    await mp.page.waitForTimeout(400);
    const m3 = await mp.page.evaluate(() => ({ stateMuted: !!window.G.state.muted, ls: localStorage.getItem('gde-artikl-muted'), icon: (document.getElementById('hud-sound') || {}).textContent }));
    if (!m3.stateMuted && m3.icon === '🔊' && m3.ls === '0') pass('audio.unmute', 'повторный тап: звук включён, localStorage gde-artikl-muted=0');
    else fail('audio.unmute', 'включение звука не сохранилось', m3);
    report.audio = { mute: m1, persist: m2, unmute: m3 };
  } catch (e) { fail('audio.mute.exception', 'исключение mute-теста: ' + ((e && e.message) || e)); }
  finally { await mp.page.close(); }
}

/* ---------------- audio ---------------- */
async function runAudio(browser) {
  const p = await newPage(browser, SIZES[0], 'audio');
  try {
    await p.page.addInitScript(() => {
      window.__AUDIO_LOG__ = [];
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { window.__AUDIO_LOG__.push({ event: 'no-audiocontext' }); return; }
        function Wrapped() {
          try {
            var c = new AC();
            window.__AUDIO_LOG__.push({ event: 'create', state: c.state });
            if (c.addEventListener) c.addEventListener('statechange', function () { window.__AUDIO_LOG__.push({ event: 'state', state: c.state }); });
            return c;
          } catch (e) {
            window.__AUDIO_LOG__.push({ event: 'create-error', message: String((e && e.message) || e) });
            throw e;
          }
        }
        Wrapped.prototype = AC.prototype;
        window.AudioContext = Wrapped;
        if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
      } catch (e) { window.__AUDIO_LOG__.push({ event: 'wrap-error', message: String(e) }); }
    });
    await p.page.goto(fileUrl(A, { scene: 'article', only: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
    await waitGame(p.page, 8000);
    await p.page.waitForTimeout(500);
    await p.page.mouse.click(640, 400);
    await p.page.waitForTimeout(700);
    const pre = await p.page.evaluate(() => ({
      log: (window.__AUDIO_LOG__ || []).slice(),
      muted: window.G.audio ? window.G.audio.muted : null,
      names: window.G.audio && window.G.audio.SFX_NAMES ? window.G.audio.SFX_NAMES.length : -1,
      hasAPI: !!(window.G.audio && window.G.audio.unlock && window.G.audio.sfx && window.G.audio.tone && window.G.audio.setMuted && window.G.audio.toggle)
    }));
    await p.page.evaluate(() => {
      try {
        Window_audio_test();
        function Window_audio_test() {
          var A = window.G.audio;
          A.sfx('correct'); A.sfx('scream'); A.sfx('whoosh'); A.sfx('stamp'); A.sfx('nonexistent-sfx');
          A.tone(440, 0.15, 'sine', 0.2);
          A.unlock();
        }
      } catch (e) { window.__AUDIO_LOG__.push({ event: 'call-error', message: String(e) }); }
    });
    await p.page.waitForTimeout(700);
    const post = await p.page.evaluate(() => ({ log: (window.__AUDIO_LOG__ || []).slice(), muted: window.G.audio ? window.G.audio.muted : null }));
    report.audio = Object.assign(report.audio || {}, { api: pre, log: post.log, errors: p.net.errors.slice() });
    if (!pre.hasAPI) fail('audio.api', 'G.audio API неполный (нужны unlock/sfx/tone/setMuted/toggle)', pre);
    else pass('audio.api', 'G.audio API есть, SFX-имён: ' + pre.names);
    const created = post.log.filter((x) => x.event === 'create');
    const createErr = post.log.filter((x) => x.event === 'create-error' || x.event === 'call-error');
    if (createErr.length) {
      fail('audio.context', 'ошибки AudioContext: ' + JSON.stringify(createErr));
      bug('major', 'Создание AudioContext бросает ошибку', 'клик по странице → G.audio.sfx()', 'AudioContext создаётся молча', JSON.stringify(createErr), []);
    } else if (created.length) pass('audio.context', 'AudioContext создан, state=' + created.map((c) => c.state).join('/') + ', ошибок нет');
    else warn('audio.context', 'AudioContext не создавался (headless может блокировать autoplay) — ошибок нет', post.log.slice(0, 8));
    if (p.net.errors.length) { fail('audio.errors', 'ошибки страницы в audio-тесте: ' + p.net.errors.length, p.net.errors.slice(0, 6)); bug('minor', 'Ошибки при работе со звуком', 'article + G.audio.sfx', '0 ошибок', p.net.errors.slice(0, 6).join(' | '), []); }
    else pass('audio.errors', 'звук: ни одной ошибки страницы/консоли');
    const names = pre.names;
    if (names >= 30) pass('audio.names', 'SFX-библиотека: ' + names + ' имён'); else warn('audio.names', 'SFX-библиотека маленькая: ' + names);
  } catch (e) { fail('audio.exception', 'исключение audio-теста: ' + ((e && e.message) || e)); }
  finally { await p.page.close(); }
}

/* ---------------- offline ---------------- */
async function runOffline(browser) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-artikl-offline-'));
  const copy = path.join(tmp, 'gde-artikl.html');
  fs.copyFileSync(A, copy);
  report.offline = { dir: tmp, copy, bytes: fs.statSync(copy).size };
  pass('offline.copy', 'gde-artikl.html скопирован в пустую папку вне проекта: ' + tmp + ' (' + (report.offline.bytes / 1024).toFixed(1) + ' KB)');
  if (!QUICK) {
    const res = await autoRun(browser, { file: copy, label: 'offline-auto', maxMs: 10 * 60 * 1000, stuckMs: 30000 });
    report.offline.auto = res;
    if (res && res.ok) pass('offline.auto', 'из пустой папки file:// auto-прогон дошёл до finale');
  } else {
    const p = await newPage(browser, SIZES[0], 'offline-smoke');
    try {
      await p.page.goto(fileUrl(copy, { scene: 'article', only: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
      await waitGame(p.page, 8000);
      await p.page.waitForTimeout(3500);
      const inf = await stateInfo(p.page);
      const sp = await shot(p.page, 'qa-offline-scene.png');
      const ext = p.net.requests.filter((u) => !/^(file|data|blob):/i.test(u));
      if (!ext.length && !p.net.errors.length) pass('offline.smoke', 'копия в пустой папке: file:// запускается, внешних запросов 0, ошибок 0 (сцена ' + (inf.scene || '—') + ')', { shot: sp });
      else fail('offline.smoke', 'проблемы в офлайн-копии', { external: ext.slice(0, 5), errors: p.net.errors.slice(0, 5) });
      report.offline.smoke = { scene: inf.scene, shot: sp, external: ext };
    } catch (e) { fail('offline.smoke.exception', 'исключение: ' + ((e && e.message) || e)); }
    finally { await p.page.close(); }
  }
  const extAll = report.requests.external;
  if (extAll.length) {
    fail('offline.global', 'за весь прогон были внешние сетевые запросы: ' + extAll.length, extAll.slice(0, 8));
    bug('critical', 'Внешние сетевые запросы', 'любой прогон', 'только file:/data:/blob:', JSON.stringify(extAll.slice(0, 6)), []);
  } else {
    pass('offline.global', 'за весь прогон 0 внешних запросов (всего перехвачено запросов: ' + report.requests.total + ')');
  }
}

/* ---------------- monkey (интерактивный тач-стресс) ---------------- */
async function runMonkey(browser, registered) {
  const size = SIZES[1];
  const scenes = ['article', 'memory', 'hear', 'letters', 'loop', 'boss'];
  pass('monkey.start', 'интерактивный monkey-тест тапом 390x844: ' + scenes.join(', '));
  for (const scene of scenes) {
    if (registered.indexOf(scene) < 0) continue;
    const p = await newPage(browser, size, 'monkey:' + scene);
    try {
      await p.page.goto(fileUrl(A, { scene, only: '1', seed: '1' }), { waitUntil: 'load', timeout: 30000 });
      await waitGame(p.page, 8000);
      await p.page.waitForTimeout(3200);
      const before = await p.page.evaluate(() => ({ stats: JSON.parse(JSON.stringify((window.G && window.G.state.stats) || {})), scene: (window.G && window.G.state.sceneName) }));
      const w = size.w, h = size.h;
      const pts = [];
      for (let i = 0; i < 16; i++) {
        pts.push({ x: Math.round(w * (0.10 + 0.80 * (((i * 37 + 11) % 100) / 100))), y: Math.round(h * (0.30 + 0.60 * (((i * 53 + 7) % 100) / 100))) });
      }
      for (const pt of pts) {
        try { await p.page.touchscreen.tap(pt.x, pt.y); } catch (e) {}
        await p.page.waitForTimeout(200);
      }
      const after = await p.page.evaluate(() => ({
        stats: JSON.parse(JSON.stringify((window.G && window.G.state.stats) || {})),
        scene: (window.G && window.G.state.sceneName),
        errBadge: !!document.querySelector('.scene-error-badge'),
        root: !!document.querySelector('.scene-root'),
        running: !!(window.G && window.G.state.running)
      }));
      const sp = await shot(p.page, 'qa-monkey-' + scene + '-390x844.png');
      const errors = p.net.errors;
      const delta = Object.keys(after.stats).filter((k) => after.stats[k] !== before.stats[k]).map((k) => k + ' ' + before.stats[k] + '→' + after.stats[k]);
      report.monkey = report.monkey || {};
      report.monkey[scene] = { before: before.stats, after: after.stats, delta, errors: errors.slice(0, 6), scene: after.scene, running: after.running, shot: sp };
      if (errors.length) {
        fail('monkey.' + scene, 'monkey-тапы вызвали ошибки (' + errors.length + ')', errors.slice(0, 4));
        bug('major', 'Monkey-тапы ломают сцену ' + scene, '390x844, ?scene=' + scene + '&only=1&seed=1, 16 тапов тачем по игровой зоне', '0 console/pageerror', errors.slice(0, 4).join(' | '), [sp]);
      } else if (after.errBadge) {
        fail('monkey.' + scene, 'появился бейдж «СИСТЕМНАЯ ОШИБКА УРОКА»');
        bug('major', 'Системная ошибка урока в сцене ' + scene + ' при тапах', '?scene=' + scene + '&only=1, тапы тачем', 'без ошибок', 'бейдж .scene-error-badge', [sp]);
      } else {
        pass('monkey.' + scene, '16 тапов тачем без ошибок; статистика: ' + (delta.join(', ') || 'без изменений (не попали по интерактиву)'), { scene: after.scene, running: after.running });
      }
    } catch (e) { fail('monkey.' + scene + '.exception', 'исключение: ' + ((e && e.message) || e)); }
    finally { await p.page.close(); }
  }
}

/* ---------------- summary ---------------- */
function countShots() {
  try { return fs.readdirSync(SHOTS).filter((f) => /^qa-.*\.png$/.test(f)).length; } catch (e) { return 0; }
}
function finish() {
  const passes = report.checks.filter((c) => c.status === 'PASS').length;
  const fails = report.checks.filter((c) => c.status === 'FAIL').length;
  const warns = report.checks.filter((c) => c.status === 'WARN').length;
  const infos = report.checks.filter((c) => c.status === 'INFO').length;
  report.bugs = BUGS;
  report.summary = {
    mode: QUICK ? 'quick' : 'full',
    pass: passes, fail: fails, warn: warns, info: infos,
    bugs: BUGS.length,
    screenshots: countShots(),
    externalRequests: report.requests.external.length,
    totalRequests: report.requests.total,
    finishedAt: new Date().toISOString()
  };
  try {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  } catch (e) { console.error('cannot write report:', e.message); }
  console.log('');
  console.log('======== SUITE SUMMARY (' + (QUICK ? 'quick' : 'full') + ') ========');
  console.log('PASS=' + passes + ' FAIL=' + fails + ' WARN=' + warns + ' INFO=' + infos + ' BUGS=' + BUGS.length);
  console.log('screenshots qa-*.png: ' + report.summary.screenshots);
  console.log('requests total=' + report.requests.total + ' external=' + report.requests.external.length);
  if (BUGS.length) {
    console.log('');
    console.log('BUGS:');
    BUGS.forEach((b, i) => console.log(' ' + (i + 1) + '. [' + b.severity + '] ' + b.title));
  }
  console.log('REPORT: ' + REPORT_PATH);
  process.exit(fails > 0 ? 1 : 0);
}

/* ---------------- main ---------------- */
async function main() {
  const t0 = Date.now();
  console.log('=== GDE-ARTIKL QA PLAYTEST === mode=' + (QUICK ? 'quick' : 'full') + ' only=' + (ONLY || 'all') + ' root=' + ROOT);
  if (!fs.existsSync(HTML_PATH)) { fail('artifact', 'нет gde-artikl.html: сначала node tools/build.mjs'); finish(); return; }
  if (!NO_BUILD) {
    const b = spawnSync(process.execPath, ['tools/build.mjs'], { cwd: ROOT, encoding: 'utf8' });
    report.build = { status: b.status, stdout: String(b.stdout || '').trim(), stderr: String(b.stderr || '').trim() };
    if (b.status === 0) pass('build', 'сборка OK: ' + String(b.stdout || '').trim().split('\n')[0]);
    else fail('build', 'сборка упала', String(b.stderr || b.stdout).slice(0, 500));
  } else info('build', '--no-build: использую существующий gde-artikl.html');
  const chk = spawnSync(process.execPath, ['tools/check.mjs', '--json', path.join(os.tmpdir(), 'gde-artikl-qa', 'check.json')], { cwd: ROOT, encoding: 'utf8' });
  const out = String(chk.stdout || '');
  const line = out.split('\n').filter((l) => l.indexOf('CHECK_JSON:') === 0)[0];
  let st = null;
  try { st = JSON.parse(line.slice('CHECK_JSON:'.length)); } catch (e) {}
  report.static = st || { status: chk.status, raw: out.slice(-3000) };
  if (chk.status === 0) pass('static', 'статика: PASS=' + (st ? st.pass : '?') + ' WARN=' + (st ? st.warn : '?') + ' FAIL=0');
  else fail('static', 'статика: есть FAIL', st ? st.checks.filter((c) => c.status === 'FAIL') : out.slice(-1000));
  if (st) st.checks.filter((c) => c.status !== 'PASS').forEach((c) => console.log('   static ' + c.status + ': ' + c.id + ' — ' + c.message + (c.details ? ' :: ' + c.details : '')));

  const hashBefore = sha256(HTML_PATH);
  /* замороженный снимок сборки: все браузерные тесты идут по нему, чтобы чужая пересборка посреди прогона не смешала две версии */
  const snapshot = path.join(os.tmpdir(), 'gde-artikl-qa', 'artifact-' + String(hashBefore || 'x').slice(0, 12) + '.html');
  fs.mkdirSync(path.dirname(snapshot), { recursive: true });
  fs.copyFileSync(HTML_PATH, snapshot);
  A = snapshot;
  report.artifact = { project: HTML_PATH, snapshot, sha256: hashBefore };
  pass('artifact.snapshot', 'замороженный снимок сборки для прогона: ' + path.basename(snapshot) + ' (sha256 ' + String(hashBefore || '').slice(0, 12) + ')');
  const browser = await launchBrowser();
  try {
    const registered = await discover(browser);
    if ((!ONLY || ONLY === 'matrix') && registered.length) await runMatrix(browser, registered);
    if (!ONLY || ONLY === 'monkey') await runMonkey(browser, registered);
    if ((!ONLY && !QUICK) || ONLY === 'auto') await autoRun(browser, { label: 'auto' });
    if (!ONLY || ONLY === 'skip') await runSkip(browser, registered);
    if (!ONLY || ONLY === 'diploma') await runDiploma(browser);
    if (!ONLY || ONLY === 'touch') await runTouch(browser);
    if (!ONLY || ONLY === 'audio') await runAudio(browser);
    if (!ONLY || ONLY === 'offline') await runOffline(browser);
  } finally {
    try { await browser.close(); } catch (e) {}
  }
  const hashAfter = sha256(HTML_PATH);
  if (hashBefore && hashAfter && hashBefore !== hashAfter) {
    warn('artifact.stable', 'gde-artikl.html в проекте пересобрали во время прогона; браузерные тесты шли по замороженному снимку, поэтому они консистентны', { before: hashBefore.slice(0, 12), after: hashAfter.slice(0, 12) });
  } else {
    pass('artifact.stable', 'сборка не менялась во время прогона (sha256 ' + String(hashBefore || '').slice(0, 12) + ')');
  }
  console.log('duration: ' + Math.round((Date.now() - t0) / 1000) + 's');
  finish();
}
main().catch((e) => { console.error('FATAL:', e && e.stack || e); process.exit(2); });
