/* 01-stage.js — классная сцена, бабблы, пропсы. Lead. */
(function(){
'use strict';
var G = window.G = window.G || {};
var u = G.u;

var S = G.stage = {
  mounted: false,
  canvas: null, ctx: null, wrap: null, bubblesEl: null,
  W: 0, H: 0,
  chars: null,
  props: {},
  boardText: '',
  visible: true,
  presentingMode: false,
  _bubbles: {},
  t0: 0,
  dim: 0
};

var ALIASES = {
  teacher: 'teacher', 'учитель': 'teacher', 'учительница': 'teacher', 'аnуш': 'teacher', 'ануш': 'teacher', 'преподавательница': 'teacher',
  tolya: 'tolya', 'толя': 'tolya',
  vika: 'vika', 'вика': 'vika',
  gosha: 'gosha', 'гоша': 'gosha',
  article: 'article', 'артикль': 'article', 'ը': 'article', 'ն': 'article',
  police: 'police', 'полицейский': 'police', 'полиция': 'police',
  system: 'system', 'система': 'system'
};
function normWho(who){
  if (who === undefined || who === null) return 'teacher';
  if (typeof who === 'number') return ['tolya', 'vika', 'gosha'][who] || 'teacher';
  var k = String(who).toLowerCase().trim();
  return ALIASES[k] || k;
}
function teacherName(){ return (G.text && G.text.teacherName) || 'Ануш Валерьевна'; }
function studentName(who){
  var def = { tolya: 'Толя', vika: 'Вика', gosha: 'Гоша' };
  if (G.text && G.text.studentById && G.text.studentById[who] && G.text.studentById[who].name) return G.text.studentById[who].name;
  if (G.text && G.text.students && G.text.students[who]){
    var v = G.text.students[who];
    if (typeof v === 'string') return v;
    if (v && v.name) return v.name;
  }
  return def[who] || who;
}
function labelFor(who){
  if (who === 'teacher') return teacherName();
  if (who === 'article') return (G.text && G.text.article && G.text.article.name) || 'Артикль Ը';
  if (who === 'police') return 'Полицейский';
  if (who === 'system') return 'СИСТЕМА';
  return studentName(who);
}

var PROP_DEFS = {
  police:  { x: 0.685, y: 0.05, w: 0.255, h: 0.93 },
  article: { x: 0.445, y: 0.30, w: 0.105, h: 0.21 },
  pigeon:  { x: 0.86,  y: 0.00, w: 0.075, h: 0.10 },
  homework:{ x: 0.50,  y: 0.30, w: 0.42,  h: 0.58 },
  protocol:{ x: 0.585, y: 0.44, w: 0.17,  h: 0.24 },
  clock:   { x: 0.78,  y: 0.02, w: 0.09,  h: 0.13 },
  cap:     { x: 0.50,  y: 0.05, w: 0.11,  h: 0.12 },
  stamp:   { x: 0.50,  y: 0.30, w: 0.20,  h: 0.20 }
};

S.mount = function(wrap, canvas, bubblesEl){
  S.wrap = wrap;
  S.canvas = canvas;
  S.ctx = canvas.getContext('2d');
  S.bubblesEl = bubblesEl;
  S.t0 = performance.now();
  S.chars = {
    teacher: { visible: true, mood: 'neutral' },
    tolya: { visible: true, mood: 'neutral' },
    vika: { visible: true, mood: 'neutral' },
    gosha: { visible: true, mood: 'neutral' }
  };
  S.resize();
  window.addEventListener('resize', S.resize);
  window.addEventListener('orientationchange', function(){ setTimeout(S.resize, 180); });
  if (window.ResizeObserver){
    try { new ResizeObserver(function(){ S.resize(); }).observe(wrap); } catch(e) {}
  }
  S.mounted = true;
  loop();
};

S.resize = function(){
  if (!S.canvas) return;
  var r = S.canvas.getBoundingClientRect();
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  S.W = Math.max(1, Math.round(r.width));
  S.H = Math.max(1, Math.round(r.height));
  S.canvas.width = Math.round(S.W * dpr);
  S.canvas.height = Math.round(S.H * dpr);
  S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S.layout();
};

S.layout = function(){
  var W = S.W, H = S.H;
  if (!W || !H) return;
  S.rects = {
    teacher: { x: W * 0.012, y: H * 0.02, w: Math.min(W * 0.32, H * 0.62), h: H * 0.96 }
  };
  var cw = (W * 0.60) / 3;
  var startX = W * 0.40;
  var arr = ['tolya', 'vika', 'gosha'];
  for (var i = 0; i < 3; i++){
    S.rects[arr[i]] = { x: startX + cw * i + cw * 0.06, y: H * 0.33, w: cw * 0.88, h: H * 0.66 };
  }
  for (var name in S.props){
    if (!Object.prototype.hasOwnProperty.call(S.props, name)) continue;
    var def = PROP_DEFS[name] || { x: 0.5, y: 0.3, w: 0.2, h: 0.3 };
    var p = S.props[name];
    if (!p.placed){
      p.w = W * def.w; p.h = H * def.h;
      p.tx = W * def.x; p.ty = H * def.y;
      p.x = p.tx; p.y = p.ty;
    }
  }
};

function loop(){
  var last = performance.now();
  function frame(now){
    var dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    if (S.mounted){ try { S.draw(dt, now); } catch(e){ console.error(e); } }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

S.draw = function(dt, now){
  var ctx = S.ctx;
  if (!ctx) return;
  var W = S.W, H = S.H;
  if (!W || !H) return;
  var t = (now - S.t0) / 1000;
  ctx.clearRect(0, 0, W, H);
  var art = (G.art && typeof G.art === 'object') ? G.art : {};
  if (S.visible){
    if (art.drawClassroom) { try { art.drawClassroom(ctx, W, H, t, { boardText: S.boardText }); } catch(e){ console.error(e); } }
    else fbClassroom(ctx, W, H, t, S.boardText);
    if (art.drawTeacher){ try { art.drawTeacher(ctx, S.rects.teacher, S.chars.teacher.mood, t); } catch(e){ console.error(e); } }
    else fbTeacher(ctx, S.rects.teacher, S.chars.teacher.mood, t);
    var arr = ['tolya', 'vika', 'gosha'];
    for (var i = 0; i < 3; i++){
      var name = arr[i];
      var ch = S.chars[name];
      if (!ch.visible) continue;
      var r = S.rects[name];
      if (art.drawStudent){ try { art.drawStudent(ctx, r, i, ch.mood, t); } catch(e){ console.error(e); } }
      else fbStudent(ctx, r, i, ch.mood, t);
    }
    drawProps(ctx, dt, t, art);
  }
};

function drawProps(ctx, dt, t, art){
  for (var name in S.props){
    if (!Object.prototype.hasOwnProperty.call(S.props, name)) continue;
    var p = S.props[name];
    if (!p.visible) continue;
    p.x += (p.tx - p.x) * Math.min(1, dt * 9);
    p.y += (p.ty - p.y) * Math.min(1, dt * 9);
    if (p.alpha < 1) p.alpha = Math.min(1, p.alpha + dt * 4);
    var r = { x: p.x, y: p.y, w: p.w, h: p.h };
    ctx.save();
    ctx.globalAlpha = p.alpha;
    if (art.drawProp){ try { art.drawProp(ctx, name, r, t, { mood: p.mood }); } catch(e){ console.error(e); } }
    else fbProp(ctx, name, r, t);
    ctx.restore();
  }
}

/* ---------- bubbles ---------- */
S.say = function(who, text, opts){
  opts = opts || {};
  who = normWho(who);
  if (!S.bubblesEl) return Promise.resolve();
  var prev = S._bubbles[who];
  if (prev) prev.kill();
  var el = u.el('div', 'bubble ' + who + (opts.urgent ? ' urgent' : ''));
  var nameEl = u.el('span', 'who', labelFor(who));
  var txt = u.el('span', 'txt', String(text === undefined ? '' : text));
  el.appendChild(nameEl);
  el.appendChild(txt);
  S.bubblesEl.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add('show'); });
  var ms = opts.ms;
  if (ms === undefined){
    ms = opts.urgent ? 1400 : Math.max(1100, Math.min(4300, 900 + String(text || '').length * 46));
  }
  var rec = { el: el };
  var promise = new Promise(function(resolve){
    var timer = null;
    rec.kill = function(){
      if (rec.dead) return;
      rec.dead = true;
      if (timer) clearTimeout(timer);
      el.classList.remove('show');
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 200);
      if (S._bubbles[who] === rec) delete S._bubbles[who];
      resolve();
    };
    timer = setTimeout(rec.kill, ms);
  });
  S._bubbles[who] = rec;
  return promise;
};

S.mood = function(who, mood){
  who = normWho(who);
  if (who === 'article'){
    if (S.props.article) S.props.article.mood = mood;
    return;
  }
  if (S.chars && S.chars[who]) S.chars[who].mood = mood;
};

S.scream = function(text, opts){
  opts = opts || {};
  text = text || (G.text && G.text.catchphrase) || 'ГДЕ АРТИКЛЬ?!';
  S.mood('teacher', 'scream');
  G.bump('screams');
  if (G.hud) G.hud.updateScreams(G.state.stats.screams);
  if (G.fx) G.fx.shake(1.55, 430);
  if (G.audio && G.audio.sfx){ try { G.audio.sfx('scream'); } catch(e) {} }
  var p = (opts.bubble === false) ? Promise.resolve() : S.say('teacher', text, { urgent: true, ms: 1300 });
  setTimeout(function(){ if (S.chars.teacher.mood === 'scream') S.mood('teacher', 'calm'); }, 1500);
  return p;
};

S.board = function(text){
  S.boardText = String(text === undefined || text === null ? '' : text);
};

S.prop = function(name, action, opts){
  opts = opts || {};
  if (!name) return;
  action = action || 'enter';
  var def = PROP_DEFS[name] || { x: 0.5, y: 0.3, w: 0.2, h: 0.3 };
  var W = S.W, H = S.H;
  var p = S.props[name];
  if (!p){
    p = S.props[name] = { visible: false, alpha: 0, placed: false, x: 0, y: 0, tx: 0, ty: 0, w: 0, h: 0, mood: opts.mood || 'idle' };
  }
  if (!p.placed){
    p.w = W * def.w; p.h = H * def.h;
    p.tx = W * def.x; p.ty = H * def.y;
    p.x = W * 1.2; p.y = p.ty;
    p.placed = true;
  }
  if (action === 'enter'){
    p.visible = true;
    p.alpha = 0;
    p.tx = W * def.x; p.ty = H * def.y;
    p.x = W * 1.25; p.y = p.ty;
    if (opts.mood) p.mood = opts.mood;
  } else if (action === 'exit'){
    p.tx = W * 1.3;
    if (opts.mood) p.mood = opts.mood;
    setTimeout(function(){ if (p) p.visible = false; }, 700);
  } else {
    p.visible = true;
    p.alpha = 1;
    if (opts.mood) p.mood = opts.mood;
    if (opts.x !== undefined) p.tx = W * opts.x;
    if (opts.y !== undefined) p.ty = H * opts.y;
  }
};

S.hideProp = function(name){ if (S.props[name]) S.props[name].visible = false; };
S.setPropMood = function(name, mood){ if (S.props[name]) S.props[name].mood = mood; };

S.visible = true;
S.show = function(){ S.visible = true; };
S.hide = function(){ S.visible = false; };
S.setVisible = function(v){ S.visible = !!v; };
S.presenting = function(v){
  S.presentingMode = !!v;
  var app = document.getElementById('app');
  if (app){
    app.classList.toggle('presenting', S.presentingMode && !u.isPortraitMobile());
    app.classList.toggle('presenting-mobile', S.presentingMode && u.isPortraitMobile());
  }
  setTimeout(S.resize, 60);
};

S.clear = function(){
  for (var who in S._bubbles){
    if (Object.prototype.hasOwnProperty.call(S._bubbles, who)) S._bubbles[who].kill();
  }
  S._bubbles = {};
  S.boardText = '';
  S.props = {};
  S.visible = true;
  S.presentingMode = false;
  try { S.presenting(false); } catch(e) {}
  if (S.chars){
    for (var k in S.chars){
      if (Object.prototype.hasOwnProperty.call(S.chars, k)) S.chars[k].mood = 'neutral';
    }
  }
};

/* ---------- fallback art (до появления 02-art.js) ---------- */
function fbRound(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fbClassroom(ctx, W, H, t, boardText){
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1c3f35'); g.addColorStop(1, '#0d241e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#4a3423'; ctx.fillRect(0, H * 0.84, W, H * 0.16);
  var bx = W * 0.30, by = H * 0.06, bw = W * 0.44, bh = H * 0.64;
  ctx.fillStyle = '#12332a'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#8a6a3f'; ctx.lineWidth = Math.max(3, H * 0.03); ctx.strokeRect(bx, by, bw, bh);
  if (boardText){
    ctx.fillStyle = '#f2ecd9';
    ctx.font = '700 ' + Math.round(bh * 0.2) + 'px "Segoe UI","Noto Sans Armenian",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(boardText, bx + bw / 2, by + bh / 2);
  }
}
function fbTeacher(ctx, r, mood, t){
  var cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.5;
  var s = Math.min(r.w, r.h) * 0.5;
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(cx - s * 0.42, cy + s * 0.2, s * 0.84, s * 1.1);
  ctx.fillStyle = '#f0c9a0'; ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(cx, cy - s * 0.45, s * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#151515'; ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.12, s * 0.09, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.12, s * 0.09, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#151515';
  var mouth = mood === 'scream' ? s * 0.13 : s * 0.04;
  ctx.beginPath(); ctx.arc(cx, cy + s * 0.14, mouth, 0, Math.PI * 2); ctx.fill();
}
function fbStudent(ctx, r, idx, mood, t){
  var cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.42;
  var s = Math.min(r.w, r.h) * 0.5;
  var colors = ['#4d7fb8', '#c56a9c', '#8a9b7d'];
  ctx.fillStyle = colors[idx] || '#888';
  ctx.fillRect(cx - s * 0.4, cy + s * 0.1, s * 0.8, s * 0.8);
  ctx.fillStyle = '#f0c9a0'; ctx.beginPath(); ctx.arc(cx, cy - s * 0.12, s * 0.36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#151515';
  ctx.beginPath(); ctx.arc(cx - s * 0.12, cy - s * 0.16, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.12, cy - s * 0.16, s * 0.05, 0, Math.PI * 2); ctx.fill();
}
function fbProp(ctx, name, r, t){
  var x = r.x, y = r.y, w = r.w, h = r.h;
  if (name === 'police'){
    ctx.fillStyle = '#2b3a63'; ctx.fillRect(x + w * 0.15, y + h * 0.3, w * 0.7, h * 0.7);
    ctx.fillStyle = '#f0c9a0'; ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.22, w * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b2340'; ctx.fillRect(x + w * 0.22, y + h * 0.03, w * 0.56, h * 0.1);
  } else if (name === 'article'){
    var s = Math.min(w, h) * 0.5;
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.5, s * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#151515';
    ctx.beginPath(); ctx.arc(x + w * 0.4, y + h * 0.45, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.6, y + h * 0.45, s * 0.14, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(247,239,223,.9)';
    fbRound(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = '#1b1b1f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1b1b1f'; ctx.font = '700 ' + Math.max(9, Math.round(h * 0.16)) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(name).toUpperCase(), x + w / 2, y + h / 2);
  }
}
})();
