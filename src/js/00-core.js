/* 00-core.js — утилиты, состояние, FX, менеджер сцен, отладка. Lead. */
(function(){
'use strict';
var G = window.G = window.G || {};

/* ---------- params ---------- */
var params = {};
try {
  var q = new URLSearchParams(window.location.search);
  q.forEach(function(v, k){ params[k] = v; });
} catch(e) {}
G.params = params;

/* ---------- deterministic rng ---------- */
var seedNum = 0;
if (params.seed) { seedNum = (parseInt(params.seed, 10) || 1) >>> 0; }
var rng = Math.random;
if (seedNum) {
  rng = function(){
    seedNum |= 0; seedNum = (seedNum + 0x6D2B79F5) | 0;
    var t = Math.imul(seedNum ^ (seedNum >>> 15), 1 | seedNum);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
G.rng = rng;

/* ---------- utils ---------- */
var u = G.u = {};
u.rand = function(a, b){ if (b === undefined){ b = a; a = 0; } return a + rng() * (b - a); };
u.randInt = function(a, b){ return Math.floor(u.rand(a, b + 1)); };
u.choice = function(arr){ return arr[Math.floor(rng() * arr.length)]; };
u.chance = function(p){ return rng() < p; };
u.shuffle = function(arr){
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};
u.clamp = function(v, a, b){ return v < a ? a : (v > b ? b : v); };
u.lerp = function(a, b, t){ return a + (b - a) * t; };
u.dist = function(x1, y1, x2, y2){ var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); };
u.now = function(){ return performance.now() / 1000; };
u.isPortraitMobile = function(){ return window.innerWidth < 640 && window.innerHeight > window.innerWidth; };
u.$ = function(sel, root){ return (root || document).querySelector(sel); };
u.$$ = function(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
u.el = function(tag, cls, text){
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
};
u.on = function(el, ev, fn, opts){
  if (!el) return function(){};
  el.addEventListener(ev, fn, opts);
  return function(){ el.removeEventListener(ev, fn, opts); };
};
u.wait = function(ms){ return new Promise(function(res){ setTimeout(res, ms); }); };
u.css = function(cssText){
  if (!cssText) return null;
  var s = document.createElement('style');
  s.textContent = cssText;
  document.head.appendChild(s);
  return s;
};
u.point = function(ev){ return { x: ev.clientX, y: ev.clientY }; };
u.rect = function(el){ return el.getBoundingClientRect(); };
u.inRect = function(p, r){ return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom; };
u.onTap = function(el, fn, opts){
  if (!el) return function(){};
  opts = opts || {};
  var last = 0, removed = false;
  function handler(ev){
    if (removed) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    var now = Date.now();
    if (now - last < 70) return;
    last = now;
    if (opts.preventDefault !== false && ev.cancelable) ev.preventDefault();
    if (G.audio && G.audio.unlock){ try { G.audio.unlock(); } catch(e) {} }
    if (opts.once) off();
    try { fn(ev); } catch(e){ console.error(e); }
  }
  var off = u.on(el, 'pointerdown', handler, { passive: false });
  return function(){ removed = true; off(); };
};
u.drag = function(el, h){
  if (!el) return function(){};
  h = h || {};
  var active = false, pid = null;
  function down(ev){
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (h.canStart && h.canStart(ev) === false) return;
    if (ev.cancelable) ev.preventDefault();
    active = true; pid = ev.pointerId;
    var start = { x: ev.clientX, y: ev.clientY };
    try { el.setPointerCapture(pid); } catch(e) {}
    if (G.audio && G.audio.unlock){ try { G.audio.unlock(); } catch(e) {} }
    if (h.onStart) h.onStart(start, ev);
  }
  function move(ev){
    if (!active) return;
    var p = { x: ev.clientX, y: ev.clientY };
    if (h.onMove) h.onMove(p, ev);
  }
  function up(ev){
    if (!active) return;
    active = false;
    try { el.releasePointerCapture(pid); } catch(e) {}
    if (h.onEnd) h.onEnd({ x: ev.clientX, y: ev.clientY }, ev);
  }
  function cancel(ev){
    if (!active) return;
    active = false;
    if (h.onCancel) h.onCancel(ev);
  }
  var offs = [
    u.on(el, 'pointerdown', down, { passive: false }),
    u.on(el, 'pointermove', move, { passive: false }),
    u.on(el, 'pointerup', up, { passive: false }),
    u.on(el, 'pointercancel', cancel, { passive: false })
  ];
  return function(){ for (var i = 0; i < offs.length; i++){ try { offs[i](); } catch(e) {} } };
};

/* ---------- state ---------- */
var defaultStats = function(){
  return {
    errors: 0, articlesSaved: 0, articlesLost: 0, screams: 0,
    repeats: 0, lettersCaught: 0, memoryFinds: 0, loops: 0,
    bossHits: 0, protocols: 0, homeworkItems: 0, gagsFound: 0
  };
};
G.state = {
  running: false,
  sceneName: null,
  sceneLog: [],
  auto: params.auto === '1',
  startedAt: 0,
  muted: false,
  stats: defaultStats(),
  gags: {},
  achievements: {},
  flags: {}
};
try {
  var savedMute = window.localStorage.getItem('gde-artikl-muted');
  if (savedMute === null) savedMute = window.localStorage.getItem('gda-muted');
  if (savedMute === '1') G.state.muted = true;
} catch(e) {}
G.bump = function(key, n){
  var v = (n === undefined) ? 1 : n;
  G.state.stats[key] = (G.state.stats[key] || 0) + v;
};
G.gag = function(id){
  if (!id) return;
  if (!G.state.gags[id]){
    G.state.gags[id] = true;
    G.state.stats['gag:' + id] = 1;
    G.state.stats.gagsFound = (G.state.stats.gagsFound || 0) + 1;
  }
};
G.flag = function(name, val){ G.state.flags[name] = (val === undefined) ? true : val; return G.state.flags[name]; };
G.hasFlag = function(name){ return !!G.state.flags[name]; };

var FALLBACK_TEXT = {
  teacherName: 'Ануш Валерьевна',
  students: { tolya: 'Толя', vika: 'Вика', gosha: 'Гоша' },
  catchphrase: 'ГДЕ АРТИКЛЬ?!',
  screams: ['ГДЕ АРТИКЛЬ?!'],
  achievements: {},
  diploma: null
};

/* ---------- DOM refs ---------- */
var appEl, stageWrap, sceneWrap, fxLayerEl, hudEl, screamsEl, stageCanvas, bubblesEl;

G.buildUI = function(){
  appEl = document.getElementById('app');
  if (!appEl){ appEl = u.el('div'); appEl.id = 'app'; document.body.appendChild(appEl); }
  appEl.innerHTML = '';
  appEl.setAttribute('data-app', '');

  stageWrap = u.el('div', 'stage-wrap');
  stageWrap.id = 'stage-wrap';
  stageCanvas = document.createElement('canvas');
  stageCanvas.id = 'stage-canvas';
  bubblesEl = u.el('div');
  bubblesEl.id = 'stage-bubbles';
  stageWrap.appendChild(stageCanvas);
  stageWrap.appendChild(bubblesEl);

  sceneWrap = u.el('div');
  sceneWrap.id = 'scene-wrap';

  fxLayerEl = u.el('div');
  fxLayerEl.id = 'fx-layer';

  hudEl = u.el('div');
  hudEl.id = 'hud';

  appEl.appendChild(stageWrap);
  appEl.appendChild(sceneWrap);
  appEl.appendChild(fxLayerEl);
  appEl.appendChild(hudEl);

  screamsEl = u.el('div', 'hud-screams');
  screamsEl.id = 'hud-screams';
  appEl.appendChild(screamsEl);

  G.fx.init(appEl, fxLayerEl);
  G.hud.build(hudEl);

  G.stage.mount(stageWrap, stageCanvas, bubblesEl);

  if (G.audio && G.audio.setMuted){ try { G.audio.setMuted(G.state.muted); } catch(e) {} }
  G.hud.updateMute();
  G.hud.updateScreams(0);
};

/* ---------- HUD ---------- */
var hud = G.hud = {};
hud.build = function(parent){
  var sound = u.el('button', 'hud-btn');
  sound.id = 'hud-sound';
  sound.type = 'button';
  sound.setAttribute('aria-label', 'Звук');
  sound.textContent = '🔊';
  hud.sound = sound;
  parent.appendChild(sound);
  u.onTap(sound, function(){ hud.toggleMute(); });

  if (G.params.debug === '1'){
    var skip = u.el('button', 'hud-btn hud-skip', '⏭');
    skip.type = 'button';
    skip.setAttribute('aria-label', 'Пропустить сцену');
    hud.skip = skip;
    parent.appendChild(skip);
    u.onTap(skip, function(){ G.debug.skipCurrent(); });
  }
};
hud.toggleMute = function(){
  G.state.muted = !G.state.muted;
  if (G.audio && G.audio.setMuted){ try { G.audio.setMuted(G.state.muted); } catch(e) {} }
  try { window.localStorage.setItem('gde-artikl-muted', G.state.muted ? '1' : '0'); } catch(e) {}
  try { window.localStorage.setItem('gda-muted', G.state.muted ? '1' : '0'); } catch(e) {}
  hud.updateMute();
};
hud.updateMute = function(){
  if (!hud.sound) return;
  hud.sound.textContent = G.state.muted ? '🔇' : '🔊';
  hud.sound.classList.toggle('muted', !!G.state.muted);
};
hud.updateScreams = function(n){
  if (!screamsEl) return;
  n = n || 0;
  if (n <= 0){ screamsEl.style.display = 'none'; return; }
  screamsEl.style.display = 'block';
  screamsEl.textContent = '«' + ((G.text && G.text.catchphrase) || 'ГДЕ АРТИКЛЬ?!') + '» ×' + n;
};

/* ---------- FX ---------- */
var FX = G.fx = {};
var fxApp = null, fxLayer = null;
var fxNodes = [];
var fxPending = [];

FX.init = function(app, layer){ fxApp = app; fxLayer = layer; };
FX._add = function(node){ if (fxLayer) fxLayer.appendChild(node); fxNodes.push(node); return node; };
FX._remove = function(node){
  var i = fxNodes.indexOf(node);
  if (i >= 0) fxNodes.splice(i, 1);
  if (node && node.parentNode) node.parentNode.removeChild(node);
};
FX.reset = function(){
  for (var i = fxNodes.length - 1; i >= 0; i--){ try { FX._remove(fxNodes[i]); } catch(e) {} }
  fxNodes.length = 0;
  var pending = fxPending.slice();
  fxPending.length = 0;
  for (var j = 0; j < pending.length; j++){ try { pending[j](null); } catch(e) {} }
  if (fxApp){ fxApp.classList.remove('fx-glitch', 'fx-shake', 'fx-shake-hard'); }
};
FX.shake = function(power, ms){
  if (!fxApp) return;
  power = (power === undefined) ? 1 : power;
  ms = ms || 360;
  var cls = power >= 1.6 ? 'fx-shake-hard' : 'fx-shake';
  fxApp.classList.remove('fx-shake', 'fx-shake-hard');
  void fxApp.offsetWidth;
  fxApp.classList.add(cls);
  setTimeout(function(){ fxApp.classList.remove(cls); }, ms);
};
FX.flash = function(color, ms){
  if (!fxLayer) return;
  var el = u.el('div', 'fx-flash-el');
  el.style.background = color || '#ffffff';
  if (ms) el.style.animationDuration = (ms / 1000) + 's';
  FX._add(el);
  setTimeout(function(){ FX._remove(el); }, (ms || 240) + 40);
};
FX.glitch = function(ms){
  if (!fxApp) return;
  fxApp.classList.add('fx-glitch');
  setTimeout(function(){ fxApp.classList.remove('fx-glitch'); }, ms || 420);
};
FX.burst = function(x, y, opts){
  opts = opts || {};
  var count = opts.count || 12;
  var text = opts.text || 'Ը';
  var colors = opts.colors || ['#ffd23f', '#ff5a5f', '#6fe08a', '#f2ecd9', '#7cd4ff', '#f38bff'];
  if (!fxLayer) return;
  for (var i = 0; i < count; i++){
    var el = u.el('div', 'fx-burst-char');
    el.textContent = opts.randomText ? u.choice('ԸՆԲՊՓՁԾՑՋՃՉՐՌԱԵԻՈՒՏ') : text;
    el.style.color = u.choice(colors);
    el.style.left = (x - 8) + 'px';
    el.style.top = (y - 8) + 'px';
    el.style.fontSize = (opts.size || u.randInt(14, 26)) + 'px';
    FX._add(el);
    var ang = u.rand(0, Math.PI * 2), dist = u.rand(60, opts.spread || 180), dur = u.rand(480, 900);
    var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 40;
    if (el.animate){
      var anim = el.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + u.rand(-260, 260) + 'deg) scale(.7)', opacity: 0 }
      ], { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      (function(node){ anim.onfinish = function(){ FX._remove(node); }; })(el);
    } else {
      (function(node){ setTimeout(function(){ FX._remove(node); }, dur); })(el);
    }
  }
};
FX.stamp = function(text){
  if (!fxLayer) return Promise.resolve();
  var el = u.el('div', 'fx-stamp', text || 'ЗАЧЁТ');
  FX._add(el);
  if (G.audio && G.audio.sfx){ try { G.audio.sfx('stamp'); } catch(e) {} }
  return new Promise(function(res){
    setTimeout(function(){ FX._remove(el); res(); }, 1800);
  });
};
FX.card = function(text, sub, ms){
  ms = ms || 2200;
  return new Promise(function(resolve){
    var wrap = u.el('div', 'fx-card-wrap fx-interactive');
    var card = u.el('div', 'fx-card');
    var h = u.el('h2', null, text);
    card.appendChild(h);
    if (sub){ var p = u.el('p', 'sub', sub); card.appendChild(p); }
    wrap.appendChild(card);
    FX._add(wrap);
    var done = false;
    var offTap = function(){}, offKey = function(){};
    function fin(){
      if (done) return;
      done = true;
      wrap.classList.add('out');
      offTap(); offKey();
      clearTimeout(timer);
      var i = fxPending.indexOf(fin);
      if (i >= 0) fxPending.splice(i, 1);
      setTimeout(function(){ FX._remove(wrap); }, 210);
      resolve();
    }
    function onKey(e){ if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape'){ e.preventDefault(); fin(); } }
    var timer = setTimeout(fin, ms);
    offTap = u.on(wrap, 'pointerdown', function(ev){ ev.preventDefault(); fin(); }, { passive: false });
    offKey = u.on(document, 'keydown', onKey, true);
    fxPending.push(fin);
  });
};
FX.silence = function(ms){
  return new Promise(function(resolve){
    var el = u.el('div', 'fx-overlay silence fx-interactive');
    FX._add(el);
    setTimeout(function(){
      el.style.transition = 'opacity .4s ease';
      el.style.opacity = '0';
      setTimeout(function(){ FX._remove(el); resolve(); }, 420);
    }, ms || 1200);
  });
};
FX.confetti = function(){
  if (!fxLayer) return;
  var colors = ['#ffd23f', '#ff5a5f', '#6fe08a', '#7cd4ff', '#f38bff', '#f2ecd9'];
  for (var i = 0; i < 40; i++){
    var el = u.el('div');
    el.style.position = 'absolute';
    el.style.left = u.rand(0, 100) + '%';
    el.style.top = '-20px';
    el.style.width = u.randInt(6, 12) + 'px';
    el.style.height = u.randInt(8, 16) + 'px';
    el.style.background = u.choice(colors);
    el.style.borderRadius = '2px';
    el.style.pointerEvents = 'none';
    FX._add(el);
    var dur = u.randInt(1400, 2800), drift = u.rand(-120, 120), rot = u.rand(-540, 540);
    if (el.animate){
      var anim = el.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(' + drift + 'px,' + (window.innerHeight + 80) + 'px) rotate(' + rot + 'deg)', opacity: .9 }
      ], { duration: dur, easing: 'cubic-bezier(.2,.4,.6,1)', fill: 'forwards' });
      (function(node){ anim.onfinish = function(){ FX._remove(node); }; })(el);
    }
  }
};
FX.spotlight = function(ms){
  if (!fxLayer) return;
  var el = u.el('div');
  el.style.position = 'absolute';
  el.style.inset = '0';
  el.style.pointerEvents = 'none';
  el.style.background = 'radial-gradient(46% 60% at 50% 42%, rgba(255,240,190,.16) 0%, rgba(0,0,0,.62) 72%, rgba(0,0,0,.9) 100%)';
  el.style.opacity = '0';
  el.style.transition = 'opacity .22s ease';
  FX._add(el);
  requestAnimationFrame(function(){ el.style.opacity = '1'; });
  setTimeout(function(){
    el.style.opacity = '0';
    setTimeout(function(){ FX._remove(el); }, 260);
  }, ms || 600);
};
FX.fakeWindow = function(opts){
  opts = opts || {};
  return new Promise(function(resolve){
    var wrap = u.el('div', 'fx-wrap-window fx-interactive');
    var win = u.el('div', 'fx-window');
    var bar = u.el('div', 'fx-winbar');
    var title = u.el('span', null, opts.title || 'СИСТЕМА');
    var dots = u.el('span', 'dots');
    for (var d = 0; d < 3; d++) dots.appendChild(u.el('span', 'dot'));
    bar.appendChild(title); bar.appendChild(dots);
    var body = u.el('div', 'fx-winbody');
    body.textContent = opts.body || '';
    if (opts.html){ body.innerHTML = opts.html; }
    var btns = u.el('div', 'fx-winbtns');
    var done = false;
    function fin(id){
      if (done) return;
      done = true;
      var i = fxPending.indexOf(fin);
      if (i >= 0) fxPending.splice(i, 1);
      FX._remove(wrap);
      resolve(id === undefined ? null : id);
    }
    var btnList = opts.buttons || [{ id: 'ok', label: 'OK' }];
    var makeBtn = function(b){
      var el = u.el('button', 'fx-winbtn' + (b.primary ? ' primary' : ''), b.label);
      el.type = 'button';
      if (b.runaway){
        var dodged = false;
        var dodge = function(){
          if (dodged) return false;
          dodged = true;
          el.style.transform = 'translate(' + u.randInt(-130, 130) + 'px,' + u.randInt(-70, 70) + 'px)';
          if (G.audio && G.audio.sfx){ try { G.audio.sfx('whoosh'); } catch(e) {} }
          return true;
        };
        el.addEventListener('pointerover', function(){ dodge(); });
        u.onTap(el, function(){
          if (dodge()) return;
          if (G.audio && G.audio.sfx){ try { G.audio.sfx('click'); } catch(e) {} }
          fin(b.id);
        });
      } else {
        u.onTap(el, function(){
          if (G.audio && G.audio.sfx){ try { G.audio.sfx('click'); } catch(e) {} }
          fin(b.id);
        });
      }
      btns.appendChild(el);
    };
    for (var bi = 0; bi < btnList.length; bi++){ makeBtn(btnList[bi]); }
    win.appendChild(bar); win.appendChild(body); win.appendChild(btns);
    wrap.appendChild(win);
    FX._add(wrap);
    fxPending.push(function(){ fin(null); });
    if (G.audio && G.audio.sfx){ try { G.audio.sfx(opts.sfx || 'error'); } catch(e) {} }
    if (opts.ms){ setTimeout(function(){ fin(null); }, opts.ms); }
  });
};

/* ---------- achievement ---------- */
G.achievement = function(id){
  if (!id || G.state.achievements[id]) return;
  G.state.achievements[id] = true;
  G.gag(id);
  var label = id;
  try { if (G.text && G.text.achievements && G.text.achievements[id]) label = G.text.achievements[id]; } catch(e) {}
  FX.stamp('ДОСТИЖЕНИЕ: ' + label);
};

/* ---------- audio bootstrap ---------- */
u.on(document, 'pointerdown', function(){
  if (G.audio && G.audio.unlock){ try { G.audio.unlock(); } catch(e) {} }
}, { capture: true });
u.on(document, 'contextmenu', function(ev){
  if (appEl && appEl.contains(ev.target)) ev.preventDefault();
}, false);

/* ---------- scene manager ---------- */
var SkipError = function(){ var e = new Error('scene-skip'); e.__skip = true; return e; };
G.SkipError = SkipError;
G.scenes = G.scenes || {};

G.makeCtx = function(name, root, layer, resolveScene){
  var ctx = {
    name: name,
    root: root,
    layer: layer,
    done: false,
    auto: !!G.state.auto,
    h: u,
    fx: G.fx,
    audio: G.audio || null,
    stage: G.stage,
    state: G.state,
    text: G.text || FALLBACK_TEXT,
    params: G.params,
    _waits: new Set(),
    _rafs: new Set(),
    _cleanups: [],
    _finished: false
  };
  ctx.el = u.el;
  ctx.add = function(el){ root.appendChild(el); return el; };
  ctx.rect = u.rect;
  ctx.hit = function(p, el){ return u.inRect(p, el.getBoundingClientRect()); };
  ctx.isHit = ctx.hit;
  ctx.wait = function(ms){
    if (ctx.done) {
      var p0 = Promise.reject(SkipError());
      p0.catch(function(){});
      return p0;
    }
    var p = new Promise(function(resolve, reject){
      var entry = {};
      var timer = setTimeout(function(){
        ctx._waits.delete(entry);
        resolve();
      }, Math.max(0, ms || 0));
      entry.reject = function(){
        clearTimeout(timer);
        reject(SkipError());
      };
      ctx._waits.add(entry);
    });
    p.catch(function(){});
    return p;
  };
  ctx.raf = function(fn){
    var last = performance.now(), stopped = false, id = 0;
    function loop(now){
      if (stopped || ctx.done) return;
      var dt = Math.min(0.06, (now - last) / 1000);
      last = now;
      try { fn(dt, now / 1000); } catch(e){ console.error(e); }
      id = requestAnimationFrame(loop);
    }
    id = requestAnimationFrame(loop);
    var stop = function(){ stopped = true; cancelAnimationFrame(id); };
    ctx._rafs.add(stop);
    return function(){ ctx._rafs.delete(stop); stop(); };
  };
  ctx.tap = function(el, fn, opts){
    var off = u.onTap(el, function(ev){ if (!ctx.done) fn(ev); }, opts);
    ctx._cleanups.push(off);
    return off;
  };
  ctx.drag = function(el, h){
    var off = u.drag(el, h);
    ctx._cleanups.push(off);
    return off;
  };
  ctx.cleanup = function(fn){ if (typeof fn === 'function') ctx._cleanups.push(fn); };
  ctx.say = function(who, text, opts){
    if (ctx.done) return Promise.resolve();
    try { return G.stage.say(who, text, opts); } catch(e){ console.error(e); return Promise.resolve(); }
  };
  ctx.mood = function(who, mood){ try { G.stage.mood(who, mood); } catch(e) {} };
  ctx.scream = function(text){ try { return G.stage.scream(text); } catch(e){ return Promise.resolve(); } };
  ctx.bump = G.bump;
  ctx.gag = G.gag;
  ctx.stat = function(k){ return G.state.stats[k] || 0; };
  ctx.achievement = function(id){ G.achievement(id); };
  ctx.fullscreen = function(show){ layer.style.display = (show === false) ? 'none' : 'block'; };
  ctx.layerEl = layer;
  ctx._finish = function(kind, err){
    if (ctx._finished) return;
    ctx._finished = true;
    ctx.done = true;
    if (kind === 'error'){ console.error('[scene ' + name + ']', err); G.notifySceneError(); }
    ctx._rafs.forEach(function(stop){ try { stop(); } catch(e) {} });
    ctx._rafs.clear();
    var waits = Array.from(ctx._waits);
    ctx._waits.clear();
    for (var i = 0; i < waits.length; i++){
      try {
        if (kind === 'ok') { /* normally none pending */ }
        else { waits[i].reject(); }
      } catch(e) {}
    }
    var cleanups = ctx._cleanups.slice();
    ctx._cleanups.length = 0;
    for (var j = 0; j < cleanups.length; j++){ try { cleanups[j](); } catch(e){ console.error(e); } }
    try { FX.reset(); } catch(e) {}
    try { G.stage.clear(); } catch(e) {}
    if (root.parentNode) root.parentNode.removeChild(root);
    if (layer.parentNode) layer.parentNode.removeChild(layer);
    if (G.currentCtx === ctx) G.currentCtx = null;
    try { resolveScene(kind); } catch(e) {}
  };
  ctx._abort = function(){ ctx._finish('skip'); };
  return ctx;
};

G.runScene = function(name){
  return new Promise(function(resolve){
    var fn = G.scenes[name];
    if (typeof fn !== 'function'){ resolve(false); return; }
    G.state.sceneName = name;
    if (G.state.sceneLog.indexOf(name) < 0) G.state.sceneLog.push(name);
    var root = u.el('div', 'scene-root');
    root.setAttribute('data-scene', name);
    sceneWrap.appendChild(root);
    var layer = u.el('div', 'scene-layer');
    layer.style.display = 'none';
    fxLayerEl.appendChild(layer);
    var ctx = G.makeCtx(name, root, layer, resolve);
    G.currentCtx = ctx;
    var p;
    try { p = Promise.resolve(fn(ctx)); } catch(e){ p = Promise.reject(e); }
    p.then(function(){ ctx._finish('ok'); }, function(err){
      ctx._finish(err && err.__skip ? 'skip' : 'error', err);
    });
  });
};

G.notifySceneError = function(){
  try {
    var b = u.el('div', 'scene-error-badge', '⚠ СИСТЕМНАЯ ОШИБКА УРОКА — урок продолжается');
    document.body.appendChild(b);
    setTimeout(function(){ if (b.parentNode) b.parentNode.removeChild(b); }, 2400);
  } catch(e) {}
};

/* ---------- sequence ---------- */
G.sequence = ['intro','i1','article','i2','memory','i3','hear','i4','letters','i5','loop','i6','boss','finale'];
G.seqIndex = 0;
G.singleScene = null;
G._jump = null;
G._loopActive = false;

G.runSequence = async function(){
  while (G.state.running){
    if (G.singleScene){
      var single = G.singleScene;
      G.singleScene = null;
      await G.runScene(single);
      if (G._jump !== null){ G.seqIndex = G._jump; G._jump = null; continue; }
      break;
    }
    if (G.seqIndex >= G.sequence.length){ G.state.running = false; break; }
    var entryIndex = G.seqIndex;
    var name = G.sequence[entryIndex];
    if (!G.scenes[name]){ G.seqIndex = entryIndex + 1; continue; }
    await G.runScene(name);
    if (G._jump !== null){ G.seqIndex = G._jump; G._jump = null; continue; }
    G.seqIndex = entryIndex + 1;
  }
  G._loopActive = false;
};

G.debug = {
  start: function(name){
    if (!name) return false;
    var idx = G.sequence.indexOf(name);
    if (idx >= 0) G._jump = idx;
    else G.singleScene = name;
    if (G.currentCtx) G.currentCtx._abort();
    if (!G._loopActive){
      G._loopActive = true;
      G.state.running = true;
      G.runSequence();
    }
    return true;
  },
  skipCurrent: function(){
    if (G.currentCtx) G.currentCtx._abort();
  },
  listScenes: function(){ return { sequence: G.sequence.slice(), registered: Object.keys(G.scenes) }; },
  stats: function(){ return G.state.stats; }
};

G.resetState = function(){
  G.state.stats = defaultStats();
  G.state.gags = {};
  G.state.achievements = {};
  G.state.flags = {};
  G.state.sceneLog = [];
  G.state.startedAt = Date.now();
  G.seqIndex = 0;
  G._jump = null;
  G.hud.updateScreams(0);
};

G.restart = function(){
  G.resetState();
  G._jump = 0;
  if (G.currentCtx) G.currentCtx._abort();
  if (!G._loopActive){
    G._loopActive = true;
    G.state.running = true;
    G.runSequence();
  }
};

G.boot = function(){
  if (G._booted) return;
  G._booted = true;
  G.buildUI();
  G.state.startedAt = Date.now();
  if (G.params.scene){
    var idx = G.sequence.indexOf(G.params.scene);
    if (G.params.only === '1' || idx < 0){
      G.seqIndex = G.sequence.length;
      G.singleScene = G.params.scene;
    } else {
      G.seqIndex = idx;
    }
  }
  window.__GAME__ = {
    G: G,
    start: G.debug.start,
    skipCurrent: G.debug.skipCurrent,
    listScenes: G.debug.listScenes,
    stats: function(){ return JSON.parse(JSON.stringify(G.state.stats)); },
    state: G.state,
    restart: G.restart
  };
  G._loopActive = true;
  G.state.running = true;
  G.runSequence();
};

window.addEventListener('error', function(ev){
  try { console.error('[global]', ev.error || ev.message); } catch(e) {}
});
})();
