/* 13-ep-hear.js — Эп3 «ПОВТОРИТЕ, ПОЖАЛУЙСТА» (dev-chase).
   Акустический кошмар: повторы, мутирующие субтитры, убегающая кнопка «Я ПОНЯЛ».
   Контракт сцены: docs/TECH.md §3. Зона dev-chase: только этот файл. */
(function(){
'use strict';
var G = window.G = window.G || {};
var u = G.u;

u.css([
'.ep3-wrap{position:absolute;inset:0;overflow:hidden;font-family:var(--font-ui);color:#f2ecd9;transition:opacity .5s ease,filter .5s ease}',
'.ep3-wrap.dim{opacity:.4;filter:grayscale(.55) saturate(.5)}',
'.ep3-head{position:absolute;left:12px;right:12px;top:6px;display:flex;justify-content:space-between;align-items:center;gap:8px;z-index:9;pointer-events:none}',
'.ep3-tag{font:800 9px/1.2 var(--font-ui);letter-spacing:.18em;color:#9db3aa;text-transform:uppercase}',
'.ep3-count{font:800 9.5px/1 var(--font-ui);letter-spacing:.1em;color:#cfe6dc;background:rgba(6,16,13,.6);border:1px solid rgba(242,236,217,.22);border-radius:7px;padding:5px 7px;white-space:nowrap;transition:color .2s,border-color .2s}',
'.ep3-count.on{color:#c6ffd6;border-color:#6fe08a}',
'.ep3-sys{position:absolute;left:50%;transform:translateX(-50%) translateY(-8px);top:22px;width:min(94%,600px);background:#06110d;border:2px solid #2c6c4a;border-radius:8px;color:#8ff0b8;font:600 10.5px/1.3 var(--font-mono);padding:6px 9px;opacity:0;transition:opacity .16s ease,transform .16s ease;z-index:26;pointer-events:none;text-align:center}',
'.ep3-sys.show{opacity:1;transform:translateX(-50%) translateY(0)}',
'.ep3-sub{position:absolute;left:50%;top:60px;transform:translateX(-50%);width:min(94%,760px);padding:8px 12px 10px;border-radius:11px;border:2px solid rgba(242,236,217,.3);background:rgba(6,14,11,.85);box-shadow:0 8px 22px rgba(0,0,0,.45);z-index:8;transition:border-color .2s,box-shadow .2s}',
'.ep3-who{font:800 8.5px/1 var(--font-ui);letter-spacing:.2em;color:#8ff0b8;text-transform:uppercase;margin-bottom:6px}',
'.ep3-arm{font-family:var(--font-arm);font-weight:800;font-size:clamp(15px,4.4vw,25px);line-height:1.22;color:#f2ecd9;transition:transform .12s ease,color .12s ease;overflow-wrap:break-word}',
'.ep3-ru{font:700 clamp(10.5px,2.8vw,14px)/1.3 var(--font-ui);color:#f2ecd9;opacity:.62;margin-top:5px;transition:opacity .2s}',
'.ep3-sub.mut1{border-color:rgba(255,210,63,.5)}',
'.ep3-sub.mut1 .ep3-arm{transform:skewX(-2deg)}',
'.ep3-sub.mut2 .ep3-arm{transform:skewX(3deg) scaleY(1.05);color:#ffe07a}',
'.ep3-sub.mut2 .ep3-ru{opacity:.45}',
'.ep3-sub.mut3 .ep3-arm{color:#ffd23f;text-shadow:2px 0 #ff5a5f,-2px 0 #7cd4ff;letter-spacing:-.01em}',
'.ep3-sub.mut3 .ep3-ru{opacity:.32}',
'.ep3-sub.mut4 .ep3-arm{color:#ff9b4a;text-shadow:2px 0 #ff5a5f,-2px 0 #7cd4ff,0 0 14px rgba(255,90,95,.55);transform:skewX(-3deg)}',
'.ep3-sub.mut4 .ep3-ru{opacity:.22}',
'.ep3-sub.mut5 .ep3-arm{color:#ff6a6f;text-shadow:2px 0 #ffd23f,-2px 0 #7cd4ff,0 0 16px rgba(255,90,95,.7);animation:ep3jit .11s steps(2) infinite}',
'.ep3-sub.mut5 .ep3-ru{opacity:.16}',
'.ep3-sub.mut5{border-color:rgba(255,90,95,.6);box-shadow:0 0 0 2px rgba(255,90,95,.22),0 8px 22px rgba(0,0,0,.45)}',
'@keyframes ep3jit{0%{transform:translateX(-1px) skewX(-3deg)}50%{transform:translateX(1px) skewX(3deg)}100%{transform:translateX(0) skewX(-2deg)}}',
'.ep3-meter{position:absolute;left:50%;top:172px;transform:translateX(-50%);width:min(94%,760px);z-index:8;pointer-events:none}',
'.ep3-meter .row{display:flex;justify-content:space-between;align-items:baseline;font:800 9px/1 var(--font-ui);letter-spacing:.15em;color:#9db3aa;margin-bottom:5px}',
'.ep3-meter .val{font:900 12px/1 var(--font-mono);letter-spacing:.02em;color:#8ff0b8;transition:color .2s}',
'.ep3-meter .val.neg{color:#ff9b4a}',
'.ep3-meter .val.bad{color:#ff5a5f;animation:ep3shake .12s steps(2) infinite}',
'@keyframes ep3shake{0%{transform:translate(-1px,0)}50%{transform:translate(1px,0)}100%{transform:translate(0,0)}}',
'.ep3-bar{position:relative;height:13px;border:2px solid rgba(242,236,217,.32);border-radius:8px;overflow:hidden;background:rgba(6,14,11,.72)}',
'.ep3-bar i{position:absolute;left:0;top:0;bottom:0;width:8%;border-radius:6px;background:linear-gradient(90deg,#6fe08a,#ffd23f);transition:width .3s ease,background .3s ease}',
'.ep3-bar i.neg{background:linear-gradient(90deg,#ff8a3f,#ff5a5f)}',
'.ep3-wave{position:absolute;left:50%;top:214px;transform:translateX(-50%);width:min(94%,760px);height:76px;display:flex;align-items:center;justify-content:center;gap:3px;z-index:6;pointer-events:none;opacity:.85}',
'.ep3-wave i{flex:1 1 0;height:6px;border-radius:2px;background:linear-gradient(180deg,#6fe08a,#2e8c58);transition:height .1s linear,background .3s ease}',
'.ep3-wave.hot i{background:linear-gradient(180deg,#ffd23f,#ff5a5f)}',
'.ep3-arena{position:absolute;left:50%;top:300px;transform:translateX(-50%);width:min(92%,820px);height:132px;border:2px dashed rgba(143,240,184,.22);border-radius:18px;background:radial-gradient(60% 85% at 50% 50%,rgba(111,224,138,.07),transparent 72%);z-index:4;pointer-events:none}',
'.ep3-arena span{position:absolute;left:9px;top:-9px;padding:0 7px;background:#0a1f18;font:800 8px/1.4 var(--font-ui);letter-spacing:.2em;color:rgba(143,240,184,.5)}',
'.ep3-arena b{position:absolute;right:9px;bottom:-9px;padding:0 7px;background:#0a1f18;font:800 8px/1.4 var(--font-ui);letter-spacing:.2em;color:rgba(143,240,184,.5);font-weight:800}',
'.ep3-ticker{position:absolute;left:50%;transform:translateX(-50%);bottom:92px;width:min(94%,760px);min-height:34px;padding:5px 10px;border-radius:9px;background:rgba(6,16,13,.55);text-align:center;font:700 clamp(12px,3vw,15px)/1.32 var(--font-ui);color:#f2ecd9;text-shadow:0 2px 0 rgba(0,0,0,.65);z-index:45;opacity:0;transition:opacity .18s ease;pointer-events:none}',
'.ep3-ticker.show{opacity:1}',
'.ep3-big{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);transform-origin:50% 100%;width:min(86%,560px);min-height:60px;padding:10px 16px;border:4px solid #1b1b1f;border-radius:14px;background:var(--accent);color:#1b1b1f;font:900 clamp(15px,3.8vw,21px)/1.1 var(--font-ui);letter-spacing:.005em;display:flex;align-items:center;justify-content:center;text-align:center;box-shadow:0 6px 0 #1b1b1f;cursor:pointer;touch-action:manipulation;z-index:10;will-change:transform;transition:background .2s ease,box-shadow .12s ease,filter .2s ease;-webkit-tap-highlight-color:transparent}',
'.ep3-big.hot{background:#ff9b4a}',
'.ep3-big.dead{background:#9db3aa;filter:grayscale(.7);box-shadow:0 3px 0 #1b1b1f}',
'.ep3-big.hit{box-shadow:0 2px 0 #1b1b1f}',
'.ep3-big .t{pointer-events:none}',
'.ep3-tiny{position:absolute;left:0;top:0;width:86px;height:34px;border:2px solid #1b1b1f;border-radius:8px;background:#7cd4ff;color:#0d2029;font:900 9px/1.05 var(--font-ui);letter-spacing:.03em;display:flex;align-items:center;justify-content:center;text-align:center;box-shadow:0 4px 0 #1b1b1f;cursor:pointer;touch-action:manipulation;z-index:50;will-change:transform;pointer-events:auto;-webkit-tap-highlight-color:transparent;opacity:0;transition:opacity .16s ease,background .15s ease,box-shadow .15s ease}',
'.ep3-tiny .t{transform:rotate(-4deg);pointer-events:none}',
'.ep3-tiny.show{opacity:1}',
'.ep3-tiny.hidden{opacity:0;pointer-events:none}',
'.ep3-tiny.stun{background:#6fe08a;box-shadow:0 0 0 6px rgba(111,224,138,.4),0 4px 0 #1b1b1f;opacity:1;pointer-events:auto}',
'.ep3-tiny.locked{background:#9db3aa;color:#243027}',
'.ep3-tiny.locked::after{content:"🔒";position:absolute;top:-11px;right:-7px;font-size:13px;line-height:1}',
'.ep3-tiny.refuse{animation:ep3refuse .3s ease}',
'@keyframes ep3refuse{0%,100%{transform:translate(var(--tx),var(--ty)) rotate(0)}25%{transform:translate(calc(var(--tx) - 5px),var(--ty)) rotate(-5deg)}75%{transform:translate(calc(var(--tx) + 5px),var(--ty)) rotate(5deg)}}',
'.ep3-tiny.pop{animation:ep3pop .26s cubic-bezier(.2,1.7,.5,1)}',
'@keyframes ep3pop{0%{filter:brightness(1.9)}100%{filter:brightness(1)}}',
'.ep3-pip{position:absolute;z-index:41;transform:translate(-50%,-100%);background:#fff8e8;color:#241729;border:2px solid #241729;border-radius:8px;padding:3px 6px;font:900 10px/1 var(--font-ui);pointer-events:none;animation:ep3pip .7s ease-out forwards}',
'@keyframes ep3pip{0%{opacity:0;transform:translate(-50%,-100%) scale(.6)}25%{opacity:1;transform:translate(-50%,-140%) scale(1)}100%{opacity:0;transform:translate(-50%,-240%) scale(1)}}',
'.ep3-dup{position:absolute;z-index:2;padding:6px 10px;border-radius:9px;border:3px solid #1b1b1f;background:rgba(255,210,63,.55);color:#1b1b1f;font:900 11px/1 var(--font-ui);pointer-events:none;will-change:transform,opacity;white-space:nowrap}',
'.ep3-layer{pointer-events:none;overflow:hidden;z-index:80}',
'.ep3-word{position:absolute;font-family:var(--font-arm);font-weight:800;white-space:nowrap;pointer-events:none;text-shadow:0 2px 0 rgba(0,0,0,.65);will-change:transform,opacity}',
'.ep3-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}',
'@media (max-height:650px){.ep3-sub{padding:6px 9px 8px}.ep3-who{font-size:7.5px;margin-bottom:4px}.ep3-arm{font-size:14.5px}.ep3-ru{font-size:10px;margin-top:3px}.ep3-tag{font-size:8px}.ep3-count{font-size:8px;padding:4px 5px}.ep3-sys{font-size:9px;padding:5px 7px;top:20px}.ep3-ticker{font-size:11.5px;bottom:84px;padding:4px 8px}.ep3-big{min-height:52px;font-size:14px;bottom:8px}.ep3-arena{height:96px}.ep3-tiny{width:78px;height:32px;font-size:8.5px}}'
].join('\n'));


/* --- армянский материал ------------------------------------------------- */
var PHRASE = 'Ես այսօր տանը հաց եմ ուտում';
var PHRASE_RU = '«Я сегодня дома ем хлеб»';
var ARM_WORDS = ['Ես', 'այսօր', 'տանը', 'հաց', 'եմ', 'ուտում'];
var DECOY_WORDS = ['ջուր', 'տուն', 'այո', 'շատ', 'վաղը', 'լավ'];
var GLYPHS = 'ԸՆԲՊՓՁԾՑՋՃՉՐՌԱԵԻՈՒՏ';
var BIG_LABELS = [
  'ПОВТОРИТЕ, ПОЖАЛУЙСТА',
  'ПОВТОРИТЕ ПОЖАЛУЙСТА!',
  'ПОВТОРИТЕ! ПОЖАЛУЙСТА!!',
  'ПОВТОРИТЕ ПОЖАЛУЙСТА ПОВТОРИТЕ',
  'ПОВТОРИТЕ... ПОЖАЛУЙСТА...',
  'ПОВТОРИТЕ'
];
var RU_LEVELS = [
  PHRASE_RU,
  '«Я сегодня дома ем хлеб…»',
  '«Я сегодня дома ем...»',
  '«Я сегод...»',
  '«...»',
  '«ПОВТОРИТЕ»',
  '«ПОВТОРИТЕ ГЛАЗАМИ»'
];
var UNDERSTAND = [6, -12, -58, -142, -142, -142, -142];

G.scenes.hear = async function(c){
  if (c.auto){
    await c.wait(1200);
    c.bump('repeats', 2);
    return;
  }

  var T = c.text || {};
  var POOL = (T.pools && T.pools.ep3) || { ok: [], bad: [], esc: [] };
  function pick(list, i){
    if (!list || !list.length) return '';
    var n = list.length;
    return String(list[((i % n) + n) % n]);
  }
  function sfx(name){ try { if (c.audio && c.audio.sfx) c.audio.sfx(name); } catch(e){} }
  function mood(who, m){ try { c.stage.mood(who, m); } catch(e){} }

  /* ---------- системные реплики (данные Comedy, G.text.system) --------- */
  var SYS = [];
  var sysKeys = ['ЗВУК', 'ГРОМКОСТЬ', 'ПОНИМАНИЕ', 'УВЕДОМЛЕНИЕ', 'СВЯЗЬ', 'ОБНОВЛЕНИЕ', 'КНОПКА'];
  var sysAll = T.system || [];
  for (var si = 0; si < sysAll.length; si++){
    var line = String(sysAll[si]);
    for (var kj = 0; kj < sysKeys.length; kj++){
      if (line.indexOf(sysKeys[kj]) >= 0 && SYS.indexOf(line) < 0){ SYS.push(line); break; }
    }
  }
  function findSys(sub){
    var all = T.system || [];
    for (var i = 0; i < all.length; i++){
      if (String(all[i]).indexOf(sub) >= 0) return String(all[i]);
    }
    return '';
  }
  var sysIdx = 0;
  function nextSys(){
    if (!SYS.length) return '';
    var s = SYS[sysIdx % SYS.length];
    sysIdx++;
    return s;
  }

  var layer = c.layer;
  layer.className = 'scene-layer ep3-layer';
  c.fullscreen(true);
  var flashEl = u.el('div', 'ep3-flash');
  layer.appendChild(flashEl);

  var stageCanvas = (G.stage && G.stage.canvas) ? G.stage.canvas : null;
  try { c.stage.show(); } catch(e){}
  mood('teacher', 'calm');

  /* ---------------------------------------------------------------- DOM */
  var wrap = c.add(u.el('div', 'ep3-wrap'));

  var head = u.el('div', 'ep3-head');
  var tag = u.el('div', 'ep3-tag', 'ПОВТОРЕНИЕ');
  var count = u.el('div', 'ep3-count', 'ПОЙМАНО 0 / 3 · ПОВТОРОВ 0');
  head.appendChild(tag); head.appendChild(count);
  wrap.appendChild(head);

  var sysEl = u.el('div', 'ep3-sys', '');
  wrap.appendChild(sysEl);

  var sub = u.el('div', 'ep3-sub mut0');
  var subWho = u.el('div', 'ep3-who', '');
  var subArm = u.el('div', 'ep3-arm', PHRASE);
  var subRu = u.el('div', 'ep3-ru', PHRASE_RU);
  sub.appendChild(subWho); sub.appendChild(subArm); sub.appendChild(subRu);
  wrap.appendChild(sub);

  var meter = u.el('div', 'ep3-meter');
  var mRow = u.el('div', 'row');
  mRow.appendChild(u.el('span', null, 'ИНДИКАТОР ПОНИМАНИЯ'));
  var meterVal = u.el('span', 'val', '+6%');
  mRow.appendChild(meterVal);
  var bar = u.el('div', 'ep3-bar');
  var barFill = u.el('i');
  bar.appendChild(barFill);
  meter.appendChild(mRow); meter.appendChild(bar);
  wrap.appendChild(meter);

  var wave = u.el('div', 'ep3-wave');
  var bars = [];
  for (var bi = 0; bi < 28; bi++){
    var bEl = u.el('i');
    wave.appendChild(bEl);
    bars.push(bEl);
  }
  wrap.appendChild(wave);

  var arena = u.el('div', 'ep3-arena');
  arena.appendChild(u.el('span', null, 'ЗОНА СЛЫШИМОСТИ'));
  arena.appendChild(u.el('b', null, 'НЕ ВЫХОДИТЕ'));
  wrap.appendChild(arena);

  var tickerEl = u.el('div', 'ep3-ticker');
  wrap.appendChild(tickerEl);

  var big = u.el('div', 'ep3-big');
  big.setAttribute('role', 'button');
  big.setAttribute('aria-label', 'Повторите, пожалуйста');
  var bigLabel = u.el('span', 't', BIG_LABELS[0]);
  big.appendChild(bigLabel);
  wrap.appendChild(big);
  c.tap(big, function(){ onRepeat(); });

  var tinyEl = u.el('div', 'ep3-tiny hidden locked');
  tinyEl.setAttribute('role', 'button');
  tinyEl.setAttribute('aria-label', 'Я понял');
  var tinyLabel = u.el('span', 't', 'Я ПОНЯЛ');
  tinyEl.appendChild(tinyLabel);
  wrap.appendChild(tinyEl);
  c.tap(tinyEl, function(){ onTinyTap(); });

  /* ------------------------------------------------------------- state */
  var presses = 0, catches = 0, understanding = 6, chaos = 0;
  var ended = false;
  var tNow = 0, bigScale = 1;
  var timers = [];
  var lastCatchT = -99, lastPressT = -99;
  var tiny = { on: false, hidden: true, locked: true, x: 0, y: 0, stunUntil: -99, fleeAt: 0, teleAt: 1e9 };
  var pointer = { x: -9999, y: -9999 };
  var dupEls = [];
  var finish = null;
  var finaleDone = false;

  function later(ms, fn){
    var id = setTimeout(function(){
      var i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1);
      try { fn(); } catch(e){ console.error(e); }
    }, ms);
    timers.push(id);
    return id;
  }
  c.cleanup(function(){
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers.length = 0;
  });

  function rootRect(){ return wrap.getBoundingClientRect(); }

  function ticker(text){
    if (!text) return;
    tickerEl.textContent = text;
    tickerEl.classList.add('show');
  }

  function sysToast(text){
    if (!text) return;
    sysEl.textContent = text;
    sysEl.classList.add('show');
    later(2300, function(){ sysEl.classList.remove('show'); });
  }

  function bigFlash(){
    big.classList.add('hit');
    later(130, function(){ big.classList.remove('hit'); });
  }

  function updateMeter(){
    var v = understanding;
    meterVal.textContent = (v > 0 ? '+' : '') + v + '%';
    meterVal.className = 'val' + (v < 0 ? ' neg' : '') + (v <= -100 ? ' bad' : '');
    var w = Math.min(100, Math.abs(v));
    barFill.style.width = Math.max(6, w) + '%';
    barFill.className = (v < 0 ? 'neg' : '');
  }

  function updateCount(){
    count.textContent = 'ПОЙМАНО ' + catches + ' / 3 · ПОВТОРОВ ' + presses;
    if (catches > 0){
      count.classList.add('on');
      later(500, function(){ count.classList.remove('on'); });
    }
  }

  function mutateArm(level){
    if (level <= 0) return PHRASE;
    if (level === 1) return PHRASE + ' հաց';
    if (level === 2) return 'Ես այսօր տանը տանը հաց հաց եմ ուտում ուտում';
    if (level === 3) return 'Եսս այսօրօ տանըը հացց եմմ ուտումմ';
    if (level === 4) return 'հաց Ես ուտում այսօր եմ տանը';
    if (level === 5) return 'Ես այսօր տանը ջուր եմ ուտում ՜՞';
    var chars = PHRASE.split('');
    var n = Math.min(16, level * 3);
    for (var i = 0; i < n; i++){
      var idx = u.randInt(0, chars.length - 1);
      if (chars[idx] === ' ') continue;
      chars[idx] = GLYPHS.charAt(u.randInt(0, GLYPHS.length - 1));
    }
    return chars.join('');
  }

  function relayout(){
    var h = (wrap.getBoundingClientRect().height) || 400;
    var compact = h < 470;
    var subTop = compact ? 44 : 60;
    sub.style.top = subTop + 'px';
    var top = subTop + (sub.offsetHeight || 96) + (compact ? 8 : 12);
    meter.style.top = top + 'px';
    wave.style.top = (top + (compact ? 34 : 40)) + 'px';
    wave.style.height = (compact ? 52 : 76) + 'px';
    if (compact){
      arena.style.display = 'none';
    } else {
      arena.style.display = '';
      arena.style.top = (top + 128) + 'px';
    }
  }

  function updateSub(level){
    var lv = Math.min(7, level);
    subArm.textContent = mutateArm(lv);
    subRu.textContent = RU_LEVELS[Math.min(RU_LEVELS.length - 1, lv)];
    sub.className = 'ep3-sub mut' + Math.min(5, lv);
    subWho.textContent = (T.teacherName || 'Ануш Валерьевна').toUpperCase() +
      ' · ПОВТОРЕНИЕ №' + (lv + 1) + (lv >= 3 ? ' · ОНА УСКОРЯЕТСЯ' : '');
    relayout();
  }

  /* ------------------------------------------------------------ particles */
  function pipBubble(el, text){
    var r = el.getBoundingClientRect();
    var rr = rootRect();
    var p = u.el('div', 'ep3-pip', text || 'ПИ!');
    p.style.left = (r.left - rr.left + r.width / 2) + 'px';
    p.style.top = (r.top - rr.top) + 'px';
    wrap.appendChild(p);
    (function(node){ later(760, function(){ if (node.parentNode) node.parentNode.removeChild(node); }); })(p);
  }

  function spawnDup(){
    var rr = rootRect();
    var el = u.el('div', 'ep3-dup', 'ПОВТОРИТЕ');
    el.style.left = u.rand(10, Math.max(20, rr.width - 130)) + 'px';
    el.style.top = u.rand(170, Math.max(200, rr.height - 220)) + 'px';
    wrap.appendChild(el);
    dupEls.push(el);
    if (dupEls.length > 6){
      var dead = dupEls.shift();
      if (dead && dead.parentNode) dead.parentNode.removeChild(dead);
    }
    var dx = u.rand(-60, 60), dy = u.rand(-70, -20), rot = u.rand(-30, 30);
    if (el.animate){
      var anim = el.animate([
        { transform: 'translate(0,0) rotate(0) scale(.7)', opacity: 0 },
        { transform: 'translate(' + dx * .6 + 'px,' + dy * .6 + 'px) rotate(' + rot * .5 + 'deg) scale(1)', opacity: .85, offset: .25 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(.9)', opacity: 0 }
      ], { duration: u.randInt(1500, 2300), easing: 'ease-out', fill: 'forwards' });
      anim.onfinish = function(){
        var i = dupEls.indexOf(el);
        if (i >= 0) dupEls.splice(i, 1);
        if (el.parentNode) el.parentNode.removeChild(el);
      };
    } else {
      later(1900, function(){ if (el.parentNode) el.parentNode.removeChild(el); });
    }
  }

  function sprayWords(level){
    var rr = rootRect();
    var originX = rr.width * 0.17, originY = rr.height * 0.30;
    if (stageCanvas){
      var sc = stageCanvas.getBoundingClientRect();
      originX = sc.width * 0.17;
      originY = sc.height * 0.52;
    }
    var n = Math.min(14, 3 + level * 2);
    for (var i = 0; i < n; i++){
      var word = (i % 3 === 0) ? u.choice(DECOY_WORDS) : u.choice(ARM_WORDS);
      var el = u.el('div', 'ep3-word', word);
      el.style.left = originX + 'px';
      el.style.top = originY + 'px';
      el.style.fontSize = u.randInt(12, 21 + Math.min(10, level * 2)) + 'px';
      el.style.color = u.choice(['#f2ecd9', '#ffd23f', '#8ff0b8', '#ff9b4a', '#7cd4ff']);
      layer.appendChild(el);
      var dx = u.rand(-140, rr.width * 0.7);
      var dy = u.rand(rr.height * 0.35, rr.height * 0.95);
      var rot = u.rand(-70, 70);
      var dur = u.randInt(900, 1500) - Math.min(600, level * 110);
      if (el.animate){
        var anim = el.animate([
          { transform: 'translate(-50%,-50%) translate(0,0) rotate(0) scale(.85)', opacity: .2 },
          { transform: 'translate(-50%,-50%) translate(' + dx * .35 + 'px,' + dy * .35 + 'px) rotate(' + rot * .4 + 'deg) scale(1.1)', opacity: 1, offset: .18 },
          { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(.8)', opacity: 0 }
        ], { duration: Math.max(420, dur), easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
        anim.onfinish = function(){ if (el.parentNode) el.parentNode.removeChild(el); };
      } else {
        later(1200, function(){ if (el.parentNode) el.parentNode.removeChild(el); });
      }
    }
  }

  function layerFlash(color, ms){
    flashEl.style.transition = 'none';
    flashEl.style.background = color;
    flashEl.style.opacity = '1';
    requestAnimationFrame(function(){
      flashEl.style.transition = 'opacity ' + ((ms || 200) / 1000) + 's ease-out';
      flashEl.style.opacity = '0';
    });
  }

  /* --------------------------------------------------------------- tiny */
  function placeTinyNearBig(){
    var rr = rootRect();
    var br = big.getBoundingClientRect();
    var maxY = Math.max(150, rr.height - 172);
    var x = u.clamp(br.left - rr.left + br.width * u.rand(.1, .8) - 43, 8, Math.max(8, rr.width - 94));
    var y = u.clamp(br.top - rr.top - u.rand(62, 100), 150, maxY);
    applyTinyPos(x, y);
  }

  function applyTinyPos(x, y){
    tiny.x = x; tiny.y = y;
    tinyEl.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    tinyEl.style.setProperty('--tx', Math.round(x) + 'px');
    tinyEl.style.setProperty('--ty', Math.round(y) + 'px');
  }

  function teleportTiny(force){
    if (!tiny.on || ended) return;
    var rr = rootRect();
    var maxX = Math.max(10, rr.width - 94);
    var maxY = Math.max(10, rr.height - 44);
    var best = { x: 20, y: 200, d: -1 };
    for (var i = 0; i < 7; i++){
      var x = u.rand(8, maxX);
      var y = u.rand(150, maxY);
      var cx = rr.left + x + 43, cy = rr.top + y + 17;
      var d = u.dist(pointer.x, pointer.y, cx, cy);
      if (d > best.d){ best = { x: x, y: y, d: d }; }
    }
    applyTinyPos(best.x, best.y);
    tinyEl.classList.remove('pop');
    void tinyEl.offsetWidth;
    tinyEl.classList.add('pop');
    tiny.teleAt = tNow + u.rand(2.2, 3.2) - Math.min(1.2, presses * 0.18);
    if (!force){
      sfx('whoosh');
      if (u.chance(0.35)) pipBubble(tinyEl, 'пи!');
    }
  }

  function showTiny(){
    tiny.on = true;
    tiny.hidden = false;
    tinyEl.classList.remove('hidden');
    tinyEl.classList.add('show');
    applyTinyPos(20, 200);
    placeTinyNearBig();
    tiny.teleAt = tNow + 2.6;
    ticker('ПОЯВИЛАСЬ КНОПКА «Я ПОНЯЛ». ОНА НЕ ХОЧЕТ, ЧТОБЫ ЕЁ НАЖАЛИ.');
    sfx('pop');
  }

  function unlockTiny(){
    if (!tiny.on || ended) return;
    tiny.locked = false;
    tinyEl.classList.remove('locked');
    tinyEl.classList.add('stun');
    tiny.stunUntil = tNow + 1.05;
    tiny.teleAt = tNow + 1.4;
    placeTinyNearBig();
    tinyEl.classList.add('pop');
    later(1080, function(){ tinyEl.classList.remove('stun'); });
    later(1200, function(){ if (!tiny.locked) tinyEl.classList.remove('pop'); });
  }

  function lockTiny(){
    tiny.locked = true;
    tinyEl.classList.add('locked');
    tinyEl.classList.remove('stun');
  }

  function onTinyTap(){
    if (ended || !tiny.on || tiny.hidden) return;
    if (tiny.locked){
      tinyEl.classList.remove('refuse');
      void tinyEl.offsetWidth;
      tinyEl.classList.add('refuse');
      sfx('error');
      sysToast(findSys('КНОПКА «Я ПОНЯЛ»') || 'КНОПКА «Я ПОНЯЛ» НЕДОСТУПНА. ПРИЧИНА: САМООЦЕНКА.');
      return;
    }
    catchTiny();
  }

  function catchTiny(){
    catches++;
    lastCatchT = tNow;
    c.gag(catches === 1 ? 'ep3_catch' : 'ep3_catch_' + catches);
    sfx('pop');
    pipBubble(tinyEl, 'ПИ!');
    tinyEl.classList.remove('stun');
    tinyEl.classList.add('hidden');
    tiny.hidden = true;
    updateCount();
    ticker(pick(POOL.ok, catches - 1));
    layerFlash('rgba(255,255,255,.5)', 180);
    c.fx.shake(0.55, 220);
    if (catches >= 3){
      finale();
      return;
    }
    if (catches === 2) later(500, muteWindowGag);
    later(420, function(){
      if (ended) return;
      tiny.hidden = false;
      tinyEl.classList.remove('hidden');
      lockTiny();
      teleportTiny(true);
      sysToast(findSys('КНОПКА «Я ПОНЯЛ»') || 'КНОПКА «Я ПОНЯЛ» НЕДОСТУПНА. ПРИЧИНА: САМООЦЕНКА.');
      ticker('Кнопка заблокирована. Повторите — откроется.');
    });
  }

  /* ------------------------------------------------------------- repeat */
  function onRepeat(){
    if (ended) return;
    presses++;
    lastPressT = tNow;
    chaos = presses + catches * 0.6;
    understanding = UNDERSTAND[Math.min(UNDERSTAND.length - 1, presses)];
    c.bump('repeats');
    c.gag('ep3_repeat');
    bigFlash();
    updateSub(presses);
    updateMeter();
    bigLabel.textContent = BIG_LABELS[Math.min(BIG_LABELS.length - 1, presses)];
    if (presses >= 2) big.classList.add('hot');
    sprayWords(presses);
    if (presses >= 2) spawnDup();
    if (presses >= 3) spawnDup();
    if (presses >= 4) layerFlash('rgba(255,90,95,.22)', 240);
    sfx(presses >= 4 ? 'glitch' : (presses >= 2 ? 'static' : 'click'));
    c.fx.shake(0.5 + Math.min(1.1, presses * 0.22), 240);
    mood('teacher', presses >= 4 ? 'scream' : (presses >= 3 ? 'cosmic' : (presses >= 2 ? 'suspicious' : 'calm')));
    try { c.say('teacher', PHRASE, { mood: presses >= 3 ? 'suspicious' : 'calm', ms: Math.max(460, 1400 - presses * 170) }); } catch(e){}
    if (presses === 1) showTiny();
    if (presses === 2) sysToast(findSys('ГРОМКОСТЬ') || nextSys());
    if (presses >= 3 && presses < 7) ticker(pick(POOL.esc, presses - 1));
    if (presses === 3) sysToast(findSys('ПОНИМАНИЕ') || findSys('ЗВУК') || nextSys());
    unlockTiny();
    updateCount();
  }

  /* -------------------------------------------------------------- finale */
  function finale(){
    ended = true;
    try { stopLoop(); } catch(e){}
    c.gag('ep3_finale');
    bigLabel.textContent = 'ПОВТОРИТЕ';
    big.classList.add('dead');
    wrap.classList.add('dim');
    tinyEl.classList.add('hidden');
    ticker('· · ·');
    sysEl.classList.remove('show');
    layerFlash('rgba(255,255,255,.35)', 260);
    c.fx.shake(0.8, 300);
    mood('teacher', 'calm');
    (async function(){
      await c.wait(420);
      try { await c.fx.silence(820); } catch(e){}
      mood('teacher', 'cosmic');
      await c.wait(160);
      mood('teacher', 'calm');
      try { await c.say('teacher', 'Что ты понял?', { mood: 'calm', ms: 1500 }); } catch(e){}
      await c.wait(1200);
      mood('teacher', 'tired');
      tickerEl.classList.remove('show');
      await c.wait(600);
      finaleDone = true;
      if (finish) finish();
    })().catch(function(){});
  }

  /* --------------------------------------------------------------- loop */
  var stopLoop = c.raf(function(dt){
    if (ended) return;
    tNow += dt;
    var hot = chaos >= 2;
    if (hot) wave.classList.add('hot'); else wave.classList.remove('hot');
    var speed = 1 + chaos * 0.5;
    for (var i = 0; i < bars.length; i++){
      var n1 = Math.sin(tNow * (3 + i * 0.21) * speed + i * 1.7) * 0.5 + 0.5;
      var n2 = Math.sin(tNow * (7.3 + i * 0.33) * speed + i * 0.9) * 0.5 + 0.5;
      var h = 4 + (n1 * 0.62 + n2 * 0.38) * (8 + chaos * 10);
      bars[i].style.height = Math.min(74, h) + 'px';
    }
    var goalScale = 1 + Math.min(0.10, presses * 0.024);
    bigScale += (goalScale - bigScale) * Math.min(1, dt * 6);
    var pulse = 1 + 0.016 * Math.sin(tNow * 3.1);
    big.style.transform = 'translateX(-50%) scale(' + (bigScale * pulse) + ')';
    if (tiny.on && !ended && !tiny.hidden){
      if (tNow > tiny.teleAt && tNow > tiny.stunUntil && !tiny.locked) teleportTiny(false);
    }
    if (understanding <= -100){
      sub.style.filter = (Math.floor(tNow * 9) % 2) ? 'saturate(1.25)' : 'saturate(1)';
    }
  });

  /* ------------------------------------------------------------- handlers */
  function onMove(ev){
    pointer.x = ev.clientX; pointer.y = ev.clientY;
    if (ended || !tiny.on || tiny.hidden || tiny.locked) return;
    if (tNow < tiny.stunUntil || tNow < tiny.fleeAt) return;
    var r = tinyEl.getBoundingClientRect();
    var d = u.dist(ev.clientX, ev.clientY, r.left + r.width / 2, r.top + r.height / 2);
    if (d < 74){
      tiny.fleeAt = tNow + 0.3;
      teleportTiny(false);
      pipBubble(tinyEl, 'пи!');
    }
  }
  c.cleanup(u.on(window, 'pointermove', onMove));

  var muteWindowShown = false;
  function muteWindowGag(){
    if (muteWindowShown) return;
    muteWindowShown = true;
    c.gag('ep3_sound_not_found');
    sysToast(findSys('ЗВУК НЕ НАЙДЕН') || 'ЗВУК НЕ НАЙДЕН. ПОВТОРИТЕ ГЛАЗАМИ.');
    try {
      c.fx.fakeWindow({
        title: 'СИСТЕМА ЗВУКА',
        body: 'ЗВУК НЕ НАЙДЕН. ПОВТОРИТЕ ГЛАЗАМИ.',
        buttons: [
          { id: 'eyes', label: 'ПОВТОРИТЬ ГЛАЗАМИ', primary: true, runaway: true },
          { id: 'no', label: 'Я И ТАК СЛЫШУ' }
        ],
        ms: 2600,
        sfx: 'error'
      }).then(function(){}, function(){});
    } catch(e){}
  }

  /* ------------------------------------------------------------- watchdog */
  function watchdog(){
    c.wait(2600).then(function(){
      if (ended) return;
      if (presses === 0 && tNow > 14){

        sysToast(pick(POOL.esc, 0) || 'ФРАЗА УСКОРИЛАСЬ. АБСОЛЮТНО НЕ ВАША ВИНА.');
        onRepeat();
        ticker('Учительница повторила сама. Она умеет.');
      } else if (tiny.on && catches < 3 && tNow > 30 + catches * 18){
        tiny.locked = false;
        tinyEl.classList.remove('locked');
        catchTiny();
        sysToast('СИСТЕМА: КНОПКА «Я ПОНЯЛ» НАЖАТА БЕЗ ВАС. ТАК ТОЖЕ БЫВАЕТ.');
      } else if (tiny.on && !tiny.locked && tNow - lastCatchT > 9 && tNow > tiny.stunUntil){
        unlockTiny();
        ticker('Кнопка устала ждать. Повторите — или ловите.');

      } else if (tiny.on && tiny.locked && tNow - lastPressT > 14 && catches < 3){
        sysToast(pick(POOL.esc, 1) || 'СИСТЕМА: ЗВУК НЕ НАЙДЕН. ПОВТОРИТЕ ГЛАЗАМИ.');
        onRepeat();
      }
      watchdog();
    }, function(){});
  }

  /* ---------------------------------------------------------------- start */
  subWho.textContent = (T.teacherName || 'Ануш Валерьевна').toUpperCase() + ' · ПОВТОРЕНИЕ №1';
  relayout();
  updateMeter();
  updateCount();
  sfx('chalk');
  await c.wait(420);
  ticker('Слушайте. Потом повторите. Пожалуйста.');
  try { c.say('teacher', 'Повторите, пожалуйста.', { mood: 'calm', ms: 1400 }); } catch(e){}
  await c.wait(1050);
  ticker('');
  watchdog();

  await new Promise(function(resolve, reject){
    finish = resolve;
    (function poll(){
      c.wait(500).then(function(){
        if (finaleDone) resolve();
        else poll();
      }, reject);
    })();
  });
};
})();
