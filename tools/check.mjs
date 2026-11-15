#!/usr/bin/env node
/* tools/check.mjs — QA static audit of the single-file build (gde-artikl.html).
   Роль: QA/Integration. Не правит игру: только читает и докладывает.
   Usage: node tools/check.mjs [--json <path>]
   Exit code 1, если есть FAIL. WARN не валит аудит.
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_PATH = path.join(ROOT, 'gde-artikl.html');
const SIZE_LIMIT = 1.5 * 1024 * 1024; // 1.5 MiB
const checks = [];

function add(status, id, message, details) {
  checks.push({ status, id, message, details: details || '' });
  const tag = status.padEnd(4);
  console.log('[' + tag + '] ' + id + ' — ' + message + (details ? ' :: ' + String(details).slice(0, 300) : ''));
}
const PASS = (id, m, d) => add('PASS', id, m, d);
const FAIL = (id, m, d) => add('FAIL', id, m, d);
const WARN = (id, m, d) => add('WARN', id, m, d);
const INFO = (id, m, d) => add('INFO', id, m, d);

function readSrc(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return null; }
}
function listFiles(dir) {
  try {
    return fs.readdirSync(path.join(ROOT, dir)).filter(f => /\.(css|js)$/.test(f)).sort();
  } catch (e) { return []; }
}
function occurrences(text, re) {
  const out = [];
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = r.exec(text)) !== null) {
    out.push({ index: m.index, match: m[0] });
    if (m[0] === '') r.lastIndex++;
    if (out.length > 200) break;
  }
  return out;
}
function contextAt(text, index, radius = 60) {
  return text.slice(Math.max(0, index - radius), index + radius).replace(/\s+/g, ' ').trim();
}

/* ---------- 0. build artifact ---------- */
if (!fs.existsSync(HTML_PATH)) {
  FAIL('artifact.exists', 'нет файла gde-artikl.html — сборка не запускалась (node tools/build.mjs)');
  finish();
}
const buf = fs.readFileSync(HTML_PATH);
const size = buf.length;
const sizeKb = (size / 1024).toFixed(1);
const limitKb = (SIZE_LIMIT / 1024).toFixed(0);

/* ---------- 1. encoding / structure ---------- */
let html = null;
try {
  html = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  PASS('encoding.utf8', 'файл — валидный UTF-8', sizeKb + ' KB');
} catch (e) {
  FAIL('encoding.utf8', 'файл не декодируется как UTF-8', e.message);
}
if (html === null) { FAIL('artifact.read', 'не удалось прочитать HTML как текст'); finish(); }

if (!/^<!doctype html>/i.test(html)) FAIL('html.doctype', 'нет <!doctype html> в начале файла');
else PASS('html.doctype', 'есть <!doctype html>');

if (/<html[^>]*\blang\s*=\s*["']ru["']/i.test(html)) PASS('html.lang', 'lang="ru"');
else WARN('html.lang', 'у <html> нет lang="ru"');

const headChunk = html.slice(0, 2048);
if (/<meta[^>]+charset\s*=\s*["']?utf-8/i.test(headChunk)) PASS('meta.charset', '<meta charset="utf-8"> в первых 2КБ');
else FAIL('meta.charset', 'нет <meta charset="utf-8"> в первых 2КБ');

const title = html.match(/<title>([^<]*)<\/title>/i);
if (title && title[1].trim()) PASS('meta.title', 'title: ' + title[1].trim());
else FAIL('meta.title', 'пустой или отсутствующий <title>');

const viewport = html.match(/<meta[^>]+name\s*=\s*["']viewport["'][^>]*>/i);
if (viewport) PASS('meta.viewport', 'viewport meta есть', viewport[0].slice(0, 160));
else WARN('meta.viewport', 'нет viewport meta (мобильный лейаут может поехать)');

if (/<noscript>/i.test(html)) PASS('html.noscript', 'есть <noscript>-заглушка');
else WARN('html.noscript', 'нет <noscript>-заглушки');

/* ---------- 2. size ---------- */
if (size <= SIZE_LIMIT) PASS('size.limit', 'размер ' + sizeKb + ' KB <= ' + limitKb + ' KB');
else FAIL('size.limit', 'размер ' + sizeKb + ' KB > лимита ' + limitKb + ' KB');
if (size > SIZE_LIMIT * 0.93) WARN('size.headroom', 'размер близок к лимиту: ' + sizeKb + ' KB');

/* ---------- 3. self-containment: external resources / network APIs ---------- */
const externalUrls = occurrences(html, /https?:\/\/[^\s"'<>()]+/gi);
if (!externalUrls.length) PASS('offline.http', 'нет http(s)-URL в файле');
else FAIL('offline.http', 'найдено ' + externalUrls.length + ' http(s)-URL', externalUrls.slice(0, 5).map(u => u.match).join(' | '));

const importCss = occurrences(html, /@import/gi);
if (!importCss.length) PASS('offline.import-css', 'нет @import');
else FAIL('offline.import-css', 'найден @import', importCss.length + ' шт.');

const links = occurrences(html, /<link\b[^>]*>/gi);
if (!links.length) PASS('offline.link', 'нет <link> (никаких внешних css/шрифтов)');
else FAIL('offline.link', 'найден <link>', links.slice(0, 3).map(l => l.match).join(' | '));

const scriptSrc = occurrences(html, /<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/gi);
if (!scriptSrc.length) PASS('offline.script-src', 'нет <script src=...>: JS инлайн');
else FAIL('offline.script-src', 'найден внешний <script src>', scriptSrc.map(s => s.match).join(' | '));

const moduleSyntax = occurrences(html, /<script\b[^>]*\btype\s*=\s*["']module["']/gi);
if (!moduleSyntax.length) PASS('offline.module', 'нет <script type="module">');
else FAIL('offline.module', 'найден <script type="module"> (file:// его блокирует)');

const dynamicImport = occurrences(html, /\bimport\s*\(/g);
const staticImport = occurrences(html, /^\s*(?:import|export)\s+/gm);
const importMeta = occurrences(html, /\bimport\.meta\b/g);
if (!dynamicImport.length && !staticImport.length && !importMeta.length) PASS('offline.esm', 'нет import/export/import.meta');
else FAIL('offline.esm', 'найден ESM-синтаксис', 'import(): ' + dynamicImport.length + ', import/export: ' + staticImport.length + ', import.meta: ' + importMeta.length);

const fetchCalls = occurrences(html, /\bfetch\s*\(/g);
if (!fetchCalls.length) PASS('offline.fetch', 'нет fetch()');
else FAIL('offline.fetch', 'найден fetch()', fetchCalls.length + ' шт.');

const xhr = occurrences(html, /\bXMLHttpRequest\b/g);
if (!xhr.length) PASS('offline.xhr', 'нет XMLHttpRequest');
else FAIL('offline.xhr', 'найден XMLHttpRequest', xhr.length + ' шт.');

const netApis = occurrences(html, /\b(?:WebSocket|EventSource|sendBeacon|serviceWorker|RTCPeerConnection|WebTransport)\b/g);
if (!netApis.length) PASS('offline.net-apis', 'нет WebSocket/EventSource/sendBeacon/serviceWorker');
else FAIL('offline.net-apis', 'найдены сетевые API', [...new Set(netApis.map(n => n.match))].join(', '));

const iframes = occurrences(html, /<(?:iframe|embed|object|base)\b/gi);
if (!iframes.length) PASS('offline.embeds', 'нет iframe/embed/object/base');
else FAIL('offline.embeds', 'найдены встраиваемые/базовые теги', iframes.map(i => i.match).join(' | '));

const cssUrls = occurrences(html, /url\(\s*["']?([^)"']+)["']?\s*\)/gi)
  .filter(u => !/^url\(\s*["']?(?:data:|blob:|#)/i.test(u.match));
if (!cssUrls.length) PASS('offline.css-url', 'в CSS нет внешних url(...)');
else FAIL('offline.css-url', 'в CSS есть url(...) с внешней ссылкой', cssUrls.slice(0, 5).map(u => u.match).join(' | '));

const resourceAttrs = occurrences(html, /\b(?:src|href|srcset|poster)\s*=\s*["']([^"']+)["']/gi)
  .filter(a => !/^\b(?:src|href|srcset|poster)\s*=\s*["'](?:data:|blob:|#)/i.test(a.match) && !/^\b(?:src|href)\s*=\s*["']\s*["']/i.test(a.match));
if (!resourceAttrs.length) PASS('offline.attrs', 'нет внешних src/href/srcset/poster');
else FAIL('offline.attrs', 'найдены внешние src/href', resourceAttrs.slice(0, 5).map(a => contextAt(html, a.index)).join(' | '));

const anchorLinks = occurrences(html, /<a\b[^>]*\bhref\s*=/gi);
if (!anchorLinks.length) PASS('offline.anchor', 'нет <a href> (не нужны офлайн)');
else INFO('offline.anchor', 'есть <a href>: ' + anchorLinks.length + ' шт.', 'проверить, что не ведут наружу');

/* ---------- 4. inline completeness ---------- */
const cssFiles = listFiles('src/css');
const jsFiles = listFiles('src/js');
let missingInline = [];
for (const f of cssFiles.concat(jsFiles)) {
  if (!html.includes('/* ===== ' + f + ' ===== */')) missingInline.push(f);
}
if (!missingInline.length) PASS('build.inline', 'все src-файлы проинлайнены', cssFiles.length + ' css + ' + jsFiles.length + ' js');
else FAIL('build.inline', 'не инлайнены файлы', missingInline.join(', '));

const styleTagCount = (html.match(/<style\b/gi) || []).length;
const scriptTagCount = (html.match(/<script\b/gi) || []).length;
if (styleTagCount === 1) PASS('build.style-tags', 'ровно 1 инлайновый <style>');
else WARN('build.style-tags', 'ожидался 1 <style>, найдено ' + styleTagCount);
if (scriptTagCount === 1) PASS('build.script-tags', 'ровно 1 инлайновый <script>');
else WARN('build.script-tags', 'ожидался 1 <script>, найдено ' + scriptTagCount);

/* ---------- 5. Armenian glyphs ---------- */
const armRe = /[\u0530-\u058F\uFB13-\uFB17]/gu;
const armMatches = html.match(armRe) || [];
const armDistinct = new Set(armMatches);
if (armMatches.length >= 200) PASS('arm.content', 'армянские глифы в файле: ' + armMatches.length + ' симв., уникальных ' + armDistinct.size);
else FAIL('arm.content', 'слишком мало армянских глифов: ' + armMatches.length);

const neededLetters = ['Ը', 'ը', 'Ն', 'ն'];
const missingLetters = neededLetters.filter(ch => !armDistinct.has(ch));
if (!missingLetters.length) PASS('arm.articles', 'ключевые буквы артиклей Ը/ը/Ն/ն присутствуют');
else FAIL('arm.articles', 'не хватает букв артиклей', missingLetters.join(' '));

const designWords = ['տուն', 'գիրք', 'ջուր', 'հաց', 'կատու', 'տղա', 'մարդ', 'խանութ', 'դպրոց', 'փողոց', 'քաղաք', 'դաս', 'սեղան', 'գետ', 'ծով', 'սար'];
const foundWords = designWords.filter(w => html.includes(w));
if (foundWords.length >= 10) PASS('arm.words', 'слова из DESIGN.md §8 в контенте: ' + foundWords.length + '/16', foundWords.slice(0, 8).join(' '));
else if (foundWords.length > 0) WARN('arm.words', 'мало слов из DESIGN.md §8: ' + foundWords.length + '/16', foundWords.join(' '));
else WARN('arm.words', 'ни одного слова из DESIGN.md §8 не найдено (контент ещё не влит?)');

const phrase = 'Ես այսօր տանը հաց եմ ուտում';
if (html.includes(phrase)) PASS('arm.phrase', 'фраза Эп3 из DESIGN.md присутствует');
else WARN('arm.phrase', 'фразы «' + phrase + '» нет в файле (Эп3/контент?)');

const fonts = ['Segoe UI', 'Noto Sans Armenian', 'DejaVu Sans', 'Arial Unicode MS'];
const fontsFound = fonts.filter(f => html.includes(f));
if (fontsFound.length >= 2) PASS('arm.fontstack', 'армянский font-stack: ' + fontsFound.join(', '));
else FAIL('arm.fontstack', 'в файле нет армянских fallback-шрифтов', 'найдено: ' + fontsFound.join(', '));

const fffd = (html.match(/\uFFFD/g) || []).length;
if (!fffd) PASS('encoding.no-replacement', 'нет U+FFFD (битых символов)');
else FAIL('encoding.no-replacement', 'есть ' + fffd + ' символов U+FFFD');

/* ---------- 6. source syntax + source-side offline audit ---------- */
let syntaxFails = [];
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', 'src/js/' + f], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) syntaxFails.push(f + ': ' + String(r.stderr || r.stdout).split('\n').slice(0, 3).join(' '));
}
if (!syntaxFails.length) PASS('js.syntax', 'node --check: все ' + jsFiles.length + ' src/js валидны');
else FAIL('js.syntax', 'синтаксические ошибки: ' + syntaxFails.length, syntaxFails.join(' | '));

const srcExternal = [];
const srcNetwork = [];
for (const f of jsFiles.concat(cssFiles)) {
  const rel = (f.endsWith('.css') ? 'src/css/' : 'src/js/') + f;
  const text = readSrc(rel);
  if (!text) { WARN('src.read', 'не читается ' + rel); continue; }
  for (const m of occurrences(text, /https?:\/\//gi)) srcExternal.push(rel + '@' + m.index);
  for (const re of [/\bfetch\s*\(/g, /\bXMLHttpRequest\b/g, /@import/gi, /\bimport\s*\(/g]) {
    for (const m of occurrences(text, re)) srcNetwork.push(rel + ': ' + m.match);
  }
}
if (!srcExternal.length) PASS('src.offline', 'в src нет http(s)-URL');
else FAIL('src.offline', 'в src есть URL', srcExternal.slice(0, 5).join(', '));
if (!srcNetwork.length) PASS('src.network', 'в src нет fetch/XHR/@import/dynamic import');
else FAIL('src.network', 'в src найдены сетевые вызовы', srcNetwork.slice(0, 5).join(', '));

/* ---------- 7. scenes / debug API / audio names ---------- */
const allSrc = jsFiles.map(f => readSrc('src/js/' + f) || '').join('\n');
const registered = [...new Set([...allSrc.matchAll(/G\.scenes\.([A-Za-z0-9_]+)\s*=/g)].map(m => m[1]))];
// катсцены регистрируются динамически: ['i1',...,'i6'].forEach(register)
if (/\[\s*['"]i1['"]\s*,/.test(allSrc) && /\.forEach\(\s*register\s*\)/.test(allSrc)) {
  for (const s of ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']) if (!registered.includes(s)) registered.push(s);
}
const expectedScenes = ['intro', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'article', 'memory', 'hear', 'letters', 'loop', 'boss', 'finale'];
const missingScenes = expectedScenes.filter(s => !registered.includes(s));
if (!missingScenes.length) PASS('scenes.registered', 'зарегистрированы все сцены: ' + registered.length);
else WARN('scenes.registered', 'нет регистрации сцен (ещё в работе): ' + missingScenes.join(', '), 'есть: ' + registered.join(', '));
if (html.includes('G.sequence = [\'intro\',\'i1\',\'article\'') || /G\.sequence\s*=\s*\[/.test(html)) PASS('scenes.sequence', 'G.sequence объявлена');
else WARN('scenes.sequence', 'не найдена G.sequence');

const debugBits = ['__GAME__', 'skipCurrent', 'listScenes', 'restart'];
const missingDebug = debugBits.filter(b => !html.includes(b));
if (!missingDebug.length) PASS('debug.api', '__GAME__: start/skipCurrent/listScenes/stats/restart + URL-параметры');
else FAIL('debug.api', 'в сборке нет debug-частей', missingDebug.join(', '));
const urlParams = ['params.scene', 'params.only', 'params.auto', 'params.seed', 'params.diploma', 'params.debug'];
const missingParams = urlParams.filter(p => !html.includes(p));
if (!missingParams.length) PASS('debug.params', 'URL-параметры scene/only/auto/seed/diploma/debug обрабатываются');
else WARN('debug.params', 'нет обработки параметров', missingParams.join(', '));

const audioSrc = readSrc('src/js/03-audio.js') || '';
const sfxDefined = [...new Set([...audioSrc.matchAll(/^\s{4}([A-Za-z_][A-Za-z0-9_]*):\s*function\s*\(t\)/gm)].map(m => m[1]))];
const sfxUsed = [...new Set([...allSrc.matchAll(/\bsfx\(\s*['"]([A-Za-z0-9_]+)['"]/g)].map(m => m[1]))];
const sfxMissing = sfxUsed.filter(n => n !== 'sfx' && !sfxDefined.includes(n));
if (!sfxMissing.length) PASS('audio.names', 'все вызываемые SFX определены: ' + sfxDefined.length);
else WARN('audio.names', 'вызываются неопределённые SFX (тишина): ' + sfxMissing.join(', '), 'определены: ' + sfxDefined.join(', '));

const muteKeys = [...new Set([...allSrc.matchAll(/localStorage\.(?:getItem|setItem)\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]))];
if (muteKeys.length) INFO('audio.storage', 'ключи localStorage в src: ' + muteKeys.join(', '));
if (muteKeys.includes('gde-artikl-muted') && muteKeys.includes('gda-muted')) {
  WARN('audio.mute-keys', 'два разных ключа mute: gde-artikl-muted (core) и gda-muted (audio) — синхронизируются только при buildUI; возможен рассинхрон при прямом setMuted');
}

const tryLocalStorage = (allSrc.match(/localStorage/g) || []).length;
INFO('audio.localstorage-uses', 'обращений к localStorage в src: ' + tryLocalStorage + ' (все должны быть в try/catch — см. TECH.md §1)');

/* ---------- 8. misc quality signals ---------- */
if (/touch-action\s*:\s*manipulation/.test(html)) PASS('css.touch-action', 'есть touch-action: manipulation');
else WARN('css.touch-action', 'нет touch-action: manipulation');
if (/@media[^{]*max-width/.test(html) || /clamp\(/.test(html)) PASS('css.responsive', 'есть media-queries/clamp для мобильного лейаута');
else WARN('css.responsive', 'не найдено адаптивных приёмов CSS');

/* ---------- summary ---------- */
function finish() {
  const summary = {
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length,
    warn: checks.filter(c => c.status === 'WARN').length,
    info: checks.filter(c => c.status === 'INFO').length,
    sizeKb: typeof sizeKb !== 'undefined' ? sizeKb : null,
    checks
  };
  console.log('');
  console.log('SUMMARY: PASS=' + summary.pass + ' FAIL=' + summary.fail + ' WARN=' + summary.warn + ' INFO=' + summary.info);
  console.log('CHECK_JSON:' + JSON.stringify(summary));
  const jsonIdx = process.argv.indexOf('--json');
  if (jsonIdx >= 0 && process.argv[jsonIdx + 1]) {
    fs.mkdirSync(path.dirname(path.resolve(process.argv[jsonIdx + 1])), { recursive: true });
    fs.writeFileSync(path.resolve(process.argv[jsonIdx + 1]), JSON.stringify(summary, null, 2), 'utf8');
    console.log('JSON: ' + path.resolve(process.argv[jsonIdx + 1]));
  }
  process.exit(summary.fail > 0 ? 1 : 0);
}
finish();
