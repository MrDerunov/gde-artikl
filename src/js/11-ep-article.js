/* 11-ep-article.js — Эп1 «ГДЕ АРТИКЛЬ?!». Роль: dev-arcade.
   6 раундов: поймать живой артикль ը/ն (тап или drag) и прикрепить к слову.
   Верно — слово поглощает артикль, ошибка — взрыв букв, крик, протокол.
   Эскалация: спящий артикль → смена мест → плакат → побег с экрана. */
(function(){
'use strict';
var G = window.G = window.G || {};
var u = G.u;

var ART_W = 92, ART_H = 92;
var ART_DPR = Math.min(window.devicePixelRatio || 1, 2);
var CSS_ONCE = false;

var CSS = [
'.ep1-wrap{position:absolute;inset:0;display:flex;flex-direction:column;color:#f2ecd9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden}',
'.ep1-arm{font-family:"Segoe UI","Noto Sans Armenian","DejaVu Sans","Arial Unicode MS",sans-serif}',
'.ep1-hud{flex:0 0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px;padding:6px 12px 2px;min-height:32px;z-index:2;row-gap:2px}',
'.ep1-title{font-weight:900;font-size:clamp(11px,2.6vw,17px);line-height:1;letter-spacing:.05em;color:#ffd23f;text-shadow:0 2px 0 rgba(0,0,0,.55);white-space:nowrap}',
'.ep1-dots{display:flex;gap:4px;margin-left:2px}',
'.ep1-dot{display:block;width:9px;height:9px;border-radius:50%;border:2px solid rgba(242,236,217,.4);background:transparent;transition:background .18s ease,transform .18s ease,border-color .18s ease}',
'.ep1-dot.on{background:#ffd23f;border-color:#ffd23f;transform:scale(1.12)}',
'.ep1-dot.now{border-color:#fff}',
'.ep1-score{margin-left:auto;font-weight:800;font-size:clamp(9px,2.2vw,12px);line-height:1;letter-spacing:.03em;color:rgba(242,236,217,.72);white-space:nowrap}',
'.ep1-score b{color:#ffd23f;font-weight:900}',
'.ep1-field{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;touch-action:none;background:radial-gradient(72% 62% at 50% 42%, rgba(255,210,63,.07) 0%, rgba(255,210,63,.02) 46%, rgba(0,0,0,0) 72%)}',
'.ep1-word{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:6;will-change:transform;cursor:pointer}',
'.ep1-card{position:relative;background:#f7efdf;color:#1b1b1f;border:3px solid #1b1b1f;border-radius:12px;padding:clamp(9px,2.2vw,16px) clamp(13px,3.2vw,24px);box-shadow:0 7px 0 rgba(0,0,0,.42);display:flex;flex-direction:column;align-items:center;gap:1px;transform:rotate(-1deg);transition:box-shadow .12s ease}',
'.ep1-wordline{display:flex;align-items:baseline;gap:3px}',
'.ep1-let{font-weight:700;font-size:clamp(30px,8vw,52px);line-height:1.05;letter-spacing:.01em}',
'.ep1-slot{display:inline-flex;align-items:center;justify-content:center;min-width:clamp(26px,6.4vw,42px);height:clamp(34px,8.6vw,54px);border:2px dashed rgba(27,27,31,.42);border-radius:8px;color:rgba(27,27,31,.28);font-weight:700;font-size:clamp(23px,6.4vw,42px);line-height:1;transform:translateY(-1px)}',
'.ep1-slot.ep1-filled{border:2px solid transparent;color:#1b1b1f;background:rgba(255,210,63,.42);animation:ep1slotpop .4s cubic-bezier(.2,1.7,.4,1)}',
'.ep1-ru{font-weight:800;font-size:clamp(9px,2.3vw,12px);line-height:1.1;letter-spacing:.09em;text-transform:uppercase;color:rgba(27,27,31,.52);margin-top:1px}',
'.ep1-word.ep1-armed .ep1-slot{animation:ep1slotpulse .9s ease-in-out infinite}',
'.ep1-word.ep1-word-target .ep1-card{box-shadow:0 0 0 5px #ffd23f,0 7px 0 rgba(0,0,0,.42)}',
'.ep1-word.ep1-defined .ep1-card{transform:rotate(0deg) scale(1.04)}',
'.ep1-word.ep1-hit .ep1-card{animation:ep1wordhit .38s linear}',
'.ep1-word.ep1-write .ep1-card{animation:ep1write .4s cubic-bezier(.2,1.2,.4,1)}',
'.ep1-word.ep1-word-fly{animation:ep1fly .75s cubic-bezier(.3,.1,.5,1) forwards;pointer-events:none}',
'.ep1-word-say{position:absolute;left:50%;bottom:calc(100% + 12px);transform:translateX(-50%) rotate(-1deg);background:#fff6cf;color:#1b1b1f;border:2.5px solid #1b1b1f;border-radius:10px;padding:6px 10px;font-weight:700;font-size:clamp(11px,2.6vw,15px);line-height:1.2;white-space:nowrap;max-width:82vw;overflow:hidden;text-overflow:ellipsis;opacity:0;pointer-events:none;box-shadow:3px 4px 0 rgba(0,0,0,.35);z-index:3}',
'.ep1-word-say.ep1-say-show{animation:ep1say 1.7s ease-out forwards}',
'.ep1-plus{position:absolute;left:50%;top:-4px;transform:translate(-50%,0);font-weight:900;font-size:clamp(16px,4vw,22px);line-height:1;color:#6fe08a;text-shadow:0 2px 0 #1b1b1f;pointer-events:none;opacity:0;z-index:4}',
'.ep1-plus.ep1-plus-show{animation:ep1plus .85s ease-out forwards}',
'.ep1-art{position:absolute;left:0;top:0;width:92px;height:92px;will-change:transform;z-index:3;touch-action:none;cursor:grab}',
'.ep1-art-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}',
'.ep1-art-fallback{position:absolute;left:14px;top:8px;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 34% 26%, #ffe887, #ffd23f 54%, #e7a51a 100%);border:3px solid #1b1b1f;display:flex;align-items:center;justify-content:center;font:900 38px/1 "Segoe UI","Noto Sans Armenian","DejaVu Sans",sans-serif;color:#1b1b1f;pointer-events:none}',
'.ep1-art.ep1-picked{z-index:9}',
'.ep1-art.ep1-picked .ep1-art-canvas{filter:drop-shadow(0 0 9px rgba(255,210,63,.95)) drop-shadow(0 0 2px #ffd23f);animation:ep1pickbob .55s ease-in-out infinite alternate}',
'.ep1-art.ep1-dragging{z-index:11;cursor:grabbing}',
'.ep1-art.ep1-dragging .ep1-art-canvas{filter:drop-shadow(0 0 9px rgba(255,210,63,.95))}',
'.ep1-art.ep1-asleep .ep1-art-canvas{filter:saturate(.62) brightness(.94)}',
'.ep1-art.ep1-spawn .ep1-art-canvas{animation:ep1spawn .42s cubic-bezier(.2,1.7,.4,1)}',
'.ep1-art-picket{display:none;position:absolute;left:50%;bottom:calc(100% - 6px);transform:translateX(-50%) rotate(-4deg);background:#f7efdf;border:2px solid #1b1b1f;border-radius:4px;padding:2px 5px;width:max-content;max-width:180px;font-weight:800;font-size:9px;line-height:1.1;color:#1b1b1f;text-align:center;z-index:4;box-shadow:2px 2px 0 rgba(0,0,0,.32);pointer-events:none}',
'.ep1-art.ep1-picket-on .ep1-art-picket{display:block}',
'.ep1-toast{position:absolute;left:50%;top:10px;transform:translate(-50%,-8px);z-index:13;background:rgba(6,16,13,.88);color:#f2ecd9;border:2px solid rgba(255,210,63,.55);border-radius:10px;padding:5px 12px;font-weight:700;font-size:clamp(10px,2.4vw,13px);line-height:1.2;max-width:92%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0;pointer-events:none}',
'.ep1-toast.ep1-toast-show{animation:ep1toast 1.7s ease-out forwards}',
'.ep1-whisper{position:absolute;left:50%;bottom:52px;transform:translateX(-50%) rotate(-.6deg);z-index:12;background:#fff6cf;color:#6b4a2f;border:2px dashed #8c6b3f;border-radius:8px;padding:4px 10px;max-width:92%;font-weight:700;font-style:italic;font-size:clamp(10px,2.4vw,13px);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .25s ease;pointer-events:none}',
'.ep1-whisper.ep1-whisper-show{opacity:1}',
'.ep1-hintbar{position:absolute;left:12px;right:12px;bottom:28px;margin:0 auto;width:max-content;max-width:calc(100% - 24px);z-index:8;background:rgba(6,16,13,.5);border-radius:8px;padding:3px 10px;font-weight:700;font-size:clamp(9px,2.2vw,12px);line-height:1.25;color:rgba(242,236,217,.66);text-align:center;white-space:normal;pointer-events:none}',
'.ep1-runaway{position:absolute;left:0;bottom:8px;width:124px;height:116px;z-index:14;pointer-events:none;animation:ep1runaway 2.4s linear forwards}',
'.ep1-runaway .ep1-art-canvas{left:16px;bottom:8px;top:auto;width:92px;height:92px}',
'.ep1-runaway .ep1-runaway-sign{position:absolute;left:34px;bottom:78px;background:#f7efdf;border:2px solid #1b1b1f;border-radius:3px;padding:2px 5px;font-weight:900;font-size:9px;color:#1b1b1f;white-space:nowrap;transform:rotate(-7deg);box-shadow:2px 2px 0 rgba(0,0,0,.35)}',
'.ep1-auto{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(6,16,13,.85);border:2px solid #ffd23f;border-radius:10px;padding:10px 16px;font:800 14px/1.2 -apple-system,"Segoe UI",sans-serif;color:#ffd23f;letter-spacing:.08em}',
'@media (max-width:380px){.ep1-title{font-size:10px}.ep1-dot{width:8px;height:8px}.ep1-score{font-size:9px;flex:0 0 100%;margin-left:0;text-align:right;line-height:1.1}.ep1-word{top:46%}.ep1-let{font-size:clamp(26px,9vw,40px)}.ep1-slot{min-width:24px;height:clamp(28px,8vw,44px);font-size:clamp(20px,7vw,34px)}.ep1-card{padding:8px 10px}.ep1-hintbar{font-size:9px}.ep1-whisper{font-size:9px;white-space:normal;text-align:center;max-width:90%}}',
'@keyframes ep1walk{from{transform:rotate(-16deg)}to{transform:rotate(16deg)}}',
'@keyframes ep1wordhit{0%,100%{transform:rotate(-1deg)}15%{transform:translate(-5px,3px) rotate(-3deg)}32%{transform:translate(5px,-4px) rotate(2deg)}48%{transform:translate(-4px,-2px) rotate(-2deg)}66%{transform:translate(4px,3px) rotate(1.5deg)}82%{transform:translate(-2px,-1px) rotate(-1.5deg)}}',
'@keyframes ep1slotpop{0%{transform:translateY(-1px) scale(.4)}60%{transform:translateY(-1px) scale(1.28)}100%{transform:translateY(-1px) scale(1)}}',
'@keyframes ep1slotpulse{0%,100%{box-shadow:0 0 0 0 rgba(255,210,63,0);border-color:rgba(27,27,31,.42)}50%{box-shadow:0 0 0 4px rgba(255,210,63,.5);border-color:#e7a51a}}',
'@keyframes ep1write{0%{opacity:0;transform:rotate(-7deg) scale(.88)}100%{opacity:1;transform:rotate(-1deg) scale(1)}}',
'@keyframes ep1fly{0%{transform:translate(-50%,-50%) rotate(0) scale(1);opacity:1}35%{transform:translate(-50%,-60%) rotate(-3deg) scale(1.06);opacity:1}100%{transform:translate(-50%,-190%) rotate(16deg) scale(.5);opacity:0}}',
'@keyframes ep1say{0%{opacity:0;transform:translateX(-50%) translateY(7px) scale(.9)}10%{opacity:1;transform:translateX(-50%) translateY(0) scale(1.02)}74%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-9px) scale(.98)}}',
'@keyframes ep1plus{0%{opacity:0;transform:translate(-50%,4px) scale(.8)}24%{opacity:1;transform:translate(-50%,-8px) scale(1.12)}100%{opacity:0;transform:translate(-50%,-30px) scale(1)}}',
'@keyframes ep1pickbob{from{transform:translateY(-3px)}to{transform:translateY(3px)}}',
'@keyframes ep1spawn{0%{transform:scale(0) rotate(-45deg);opacity:0}70%{transform:scale(1.15) rotate(6deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}',
'@keyframes ep1zzz{0%{opacity:.35;transform:translateY(2px)}50%{opacity:1;transform:translateY(-3px)}100%{opacity:.35;transform:translateY(2px)}}',
'@keyframes ep1toast{0%{opacity:0;transform:translate(-50%,-8px)}10%{opacity:1;transform:translate(-50%,0)}78%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-5px)}}',
'@keyframes ep1runaway{0%{transform:translate3d(-140px,0,0) rotate(-2deg)}100%{transform:translate3d(calc(100vw + 160px),0,0) rotate(2deg)}}'
];
function ensureCss(){
  if (CSS_ONCE) return;
  CSS_ONCE = true;
  u.css(CSS.join('\n'));
}

var WORDS = [
  { word:'տուն',  ru:'дом',     art:'ը', full:'տունը',  line:'Дом. Теперь определённый. Наконец-то.' },
  { word:'կատու', ru:'кот',     art:'ն', full:'կատուն', line:'Мяу. И теперь определённо мяу.' },
  { word:'գիրք',  ru:'книга',   art:'ը', full:'գիրքը',  line:'Книга. С артиклем. Как в библиотеке.' },
  { word:'տղա',   ru:'мальчик', art:'ն', full:'տղան',   line:'Мальчик определённый. Он согласен.' },
  { word:'հաց',   ru:'хлеб',    art:'ը', full:'հացը',   line:'Хлеб. Артикль прилип. Оба довольны.' },
  { word:'ջուր',  ru:'вода',    art:'ը', full:'ջուրը',  line:'Вода. Определённая. Мокрая. Мокрая.' }
];

var SPEEDS = [58, 76, 94, 112, 128, 150];
var ROUND_HINT = [
  'Поймай артикль тапом, потом тапни слово. Или перетащи его на слово.',
  'Он бегает быстрее. Он же артикль, он тренируется.',
  'Один артикль спит. Разбуди его тапом. Потом лови.',
  'Артикли меняются местами. Смотри на букву, не на место.',
  'Артикль вышел с плакатом. Уважай его позицию и лови.',
  'Артикли убегают с экрана. Они вернутся. Дождись.'
];
var ROUND_TOAST = [
  '', '', 'Артикль спит. Ему снится место в ООН.', 'Их двое. Они поменялись. Принципиально.',
  'АРТИКЛЬ — НЕ ПРИЛОЖЕНИЕ! (с)', 'Артикли вышли из класса. У них дождь.'
];

G.scenes.article = async function(c){
  ensureCss();
  var h = c.h;

  /* ---------- UI ---------- */
  var wrap = c.add(h.el('div', 'ep1-wrap'));
  if (c.auto){
    wrap.appendChild(h.el('div', 'ep1-auto', 'ЭП1 · АВТОПРОХОД'));
    await c.wait(1100).catch(function(){});
    c.bump('articlesSaved', 6);
    c.bump('protocols', 1);
    c.bump('screams', 1);
    c.gag('ep1_auto');
    return;
  }

  var hud = h.el('div', 'ep1-hud');
  hud.appendChild(h.el('div', 'ep1-title', 'ГДЕ АРТИКЛЬ?!'));
  var dots = h.el('div', 'ep1-dots');
  var dotEls = [];
  for (var d = 0; d < 6; d++){ var dot = h.el('i', 'ep1-dot'); dots.appendChild(dot); dotEls.push(dot); }
  hud.appendChild(dots);
  var score = h.el('div', 'ep1-score');
  var scoreSaved = h.el('b', null, '0');
  var scoreProt = h.el('b', null, '0');
  score.appendChild(document.createTextNode('СПАСЕНО '));
  score.appendChild(scoreSaved);
  score.appendChild(document.createTextNode('/6 · ПРОТОКОЛОВ '));
  score.appendChild(scoreProt);
  hud.appendChild(score);
  wrap.appendChild(hud);

  var field = h.el('div', 'ep1-field');
  wrap.appendChild(field);

  var wordEl = h.el('div', 'ep1-word');
  var card = h.el('div', 'ep1-card');
  var wordline = h.el('div', 'ep1-wordline');
  var wordLet = h.el('span', 'ep1-let ep1-arm');
  var slotEl = h.el('span', 'ep1-slot ep1-arm');
  var ruEl = h.el('div', 'ep1-ru');
  wordline.appendChild(wordLet); wordline.appendChild(slotEl);
  card.appendChild(wordline); card.appendChild(ruEl);
  wordEl.appendChild(card);
  var wordSay = h.el('div', 'ep1-word-say');
  wordEl.appendChild(wordSay);
  field.appendChild(wordEl);

  var toastEl = h.el('div', 'ep1-toast');
  field.appendChild(toastEl);
  var whisperEl = h.el('div', 'ep1-whisper');
  field.appendChild(whisperEl);
  var hintEl = h.el('div', 'ep1-hintbar');
  field.appendChild(hintEl);

  /* ---------- state ---------- */
  var busy = false, selected = null, arts = [];
  var roundIdx = 0, roundErrors = 0, errorsTotal = 0, saved = 0, protocols = 0;
  var speed = SPEEDS[0], swapTimer = 0, fleeTimer = 0;
  var lastScream = -99, swapTold = false, fleeBackTold = false;
  var pointer = { x: 0, y: 0, active: false };
  var endResolve = null;
  var endPromise = new Promise(function(res){ endResolve = res; });

  function sfx(name){ try { if (G.audio && G.audio.sfx) G.audio.sfx(name); } catch(e){} }
  function sw(ms){ return c.wait(ms).catch(function(){}); }
  function tr(x, y){ return 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; }
  function runAsync(fn){
    try {
      var p = fn();
      if (p && p.catch) p.catch(function(e){ if (e && e.__skip) return; console.error('[ep1]', e); });
    } catch(e){ if (!(e && e.__skip)) console.error('[ep1]', e); }
  }
  function pickLine(arr, fallback){
    try { if (arr && arr.length) return u.choice(arr); } catch(e){}
    return fallback || '';
  }

  function updateHud(){
    scoreSaved.textContent = String(saved);
    scoreProt.textContent = String(protocols);
    for (var i = 0; i < dotEls.length; i++){
      dotEls[i].classList.toggle('on', i < saved);
      dotEls[i].classList.toggle('now', i === saved);
    }
  }

  function toast(text){
    if (!text) return;
    toastEl.textContent = text;
    toastEl.classList.remove('ep1-toast-show');
    void toastEl.offsetWidth;
    toastEl.classList.add('ep1-toast-show');
  }

  function showWhisper(){
    var w = WORDS[roundIdx] || WORDS[0];
    whisperEl.textContent = w.art === 'ն'
      ? '...шёпот из-за доски: после гласной — Ն...'
      : '...шёпот из-за доски: после согласной — Ը...';
    whisperEl.classList.add('ep1-whisper-show');
    c.gag('ep1_whisper');
    c.wait(2900).then(function(){ if (!c.done) whisperEl.classList.remove('ep1-whisper-show'); }, function(){});
  }

  function wordHit(){
    wordEl.classList.remove('ep1-hit');
    void wordEl.offsetWidth;
    wordEl.classList.add('ep1-hit');
  }

  function plusPop(){
    var p = h.el('div', 'ep1-plus', '+1');
    wordEl.appendChild(p);
    void p.offsetWidth;
    p.classList.add('ep1-plus-show');
    p.addEventListener('animationend', function(){ if (p.parentNode) p.parentNode.removeChild(p); });
  }

  function showWordLine(text){
    if (!text) return;
    wordSay.textContent = text;
    wordSay.classList.remove('ep1-say-show');
    void wordSay.offsetWidth;
    wordSay.classList.add('ep1-say-show');
  }

  function setWord(i){
    var w = WORDS[i];
    wordSay.classList.remove('ep1-say-show');
    wordSay.textContent = '';
    wordLet.textContent = w.word;
    ruEl.textContent = w.ru;
    slotEl.textContent = '';
    slotEl.classList.remove('ep1-filled');
    wordEl.classList.remove('ep1-defined', 'ep1-armed', 'ep1-word-target', 'ep1-word-fly');
    wordEl.classList.remove('ep1-write');
    void wordEl.offsetWidth;
    wordEl.classList.add('ep1-write');
    wordEl.dataset.need = w.art;
    wordEl.dataset.word = w.word;
  }

  /* ---------- геометрия ---------- */
  function fieldSize(){ return { W: field.clientWidth || 390, H: field.clientHeight || 400 }; }
  function wordBox(W, H){
    var ww = wordEl.offsetWidth || 180, wh = wordEl.offsetHeight || 110;
    return { ww: ww, wh: wh, cx: W * 0.5, cy: H * 0.44 };
  }
  function isOverWord(p){
    var r = wordEl.getBoundingClientRect();
    return p.x > r.left - 20 && p.x < r.right + 20 && p.y > r.top - 20 && p.y < r.bottom + 20;
  }
  function clampArt(a){
    var s = fieldSize();
    a.x = u.clamp(a.x, 4, Math.max(4, s.W - ART_W - 4));
    a.y = u.clamp(a.y, 4, Math.max(4, s.H - ART_H - 4));
  }
  function randomSpot(a){
    var s = fieldSize();
    var wb = wordBox(s.W, s.H);
    for (var k = 0; k < 50; k++){
      var x = u.rand(8, Math.max(9, s.W - ART_W - 8));
      var y = u.rand(8, Math.max(9, s.H - ART_H - 8));
      if (Math.abs(x + ART_W * 0.5 - wb.cx) < wb.ww * 0.5 + 66 &&
          Math.abs(y + ART_H * 0.5 - wb.cy) < wb.wh * 0.5 + 66) continue;
      var ok = true;
      for (var j = 0; j < arts.length; j++){
        var o = arts[j];
        if (o === a) continue;
        if (u.dist(x, y, o.x, o.y) < 130){ ok = false; break; }
      }
      if (!ok) continue;
      a.x = x; a.y = y;
      return;
    }
    a.x = u.rand(8, Math.max(9, s.W - ART_W - 8));
    a.y = u.rand(8, Math.max(9, s.H - ART_H - 8));
  }
  function setVelocity(a, sp){
    var ang = u.rand(0, Math.PI * 2);
    a.vx = Math.cos(ang) * sp;
    a.vy = Math.sin(ang) * sp;
  }

  /* ---------- отрисовка артикля (G.art.drawArticle, fallback — CSS-круг) ---------- */
  function makeCreatureVis(){
    var canvas = null, ctx = null;
    if (G.art && typeof G.art.drawArticle === 'function'){
      canvas = document.createElement('canvas');
      canvas.className = 'ep1-art-canvas';
      canvas.width = Math.round(ART_W * ART_DPR);
      canvas.height = Math.round(ART_H * ART_DPR);
      ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(ART_DPR, 0, 0, ART_DPR, 0, 0);
      return { node: canvas, canvas: canvas, ctx: ctx };
    }
    var fb = h.el('div', 'ep1-art-fallback');
    return { node: fb, canvas: null, ctx: null };
  }

  function drawCreature(a, t){
    if (!a.canvas || !a.ctx) return;
    var mood = 'run';
    if (a.asleep) mood = 'sleep';
    else if (a.picket) mood = 'angry';
    else if (selected === a || a.state === 'picked' || a.state === 'dragging') mood = 'proud';
    else if (a.state === 'flee') mood = 'run';
    try {
      a.ctx.clearRect(0, 0, ART_W, ART_H);
      G.art.drawArticle(a.ctx, { x: 0, y: 0, w: ART_W, h: ART_H }, mood, t, { glyph: a.glyph });
    } catch(e){}
  }

  /* ---------- раунды ---------- */
  function removeAllArts(){
    for (var i = 0; i < arts.length; i++){
      var a = arts[i];
      if (a.el && a.el.parentNode) a.el.parentNode.removeChild(a.el);
    }
    arts = [];
    selected = null;
  }

  function spawnArts(){
    var s = fieldSize();
    var need = WORDS[roundIdx].art;
    var glyphs = u.shuffle(['ը', 'ն']);
    for (var i = 0; i < 2; i++){
      var glyph = glyphs[i];
      var el = h.el('div', 'ep1-art ep1-spawn');
      el.dataset.art = glyph;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Артикль ' + glyph);
      var vis = makeCreatureVis();
      el.appendChild(vis.node);
      var picket = h.el('div', 'ep1-art-picket', 'АРТИКЛЬ — НЕ ПРИЛОЖЕНИЕ!');
      el.appendChild(picket);
      field.appendChild(el);
      var a = {
        el: el, glyph: glyph, x: 0, y: 0, vx: 0, vy: 0,
        phase: u.rand(0, Math.PI * 2), speedMul: u.rand(0.9, 1.12),
        state: 'run', asleep: false, lockUntil: 0, picket: false,
        awayUntil: 0, lostCounted: false,
        canvas: vis.canvas, ctx: vis.ctx
      };
      a.speedMul = u.rand(0.92, 1.1);
      randomSpot(a);
      setVelocity(a, speed);
      a.el.style.transform = tr(a.x, a.y);
      arts.push(a);
      bindArt(a);
    }
    var correct = null;
    for (var k = 0; k < arts.length; k++){ if (arts[k].glyph === need) correct = arts[k]; }
    if (roundIdx === 2 && correct){
      correct.asleep = true;
      correct.state = 'sleep';
      correct.vx = 0; correct.vy = 0;
      correct.el.classList.add('ep1-asleep');
      var s2 = fieldSize();
      correct.x = u.clamp(s2.W * 0.2, 10, s2.W - ART_W - 10);
      correct.y = u.clamp(s2.H * 0.66, 10, s2.H - ART_H - 10);
      correct.el.style.transform = tr(correct.x, correct.y);
      c.gag('article_sleep');
    }
    if (roundIdx === 4 && correct){
      correct.picket = true;
      correct.el.classList.add('ep1-picket-on');
      c.gag('article_picket');
    }
    if (roundIdx === 3) c.gag('article_swap');
    if (roundIdx === 5) c.gag('article_flee_start');
    updateHud();
    // если артиклей стало меньше одного (на всякий случай) — обновим
    if (arts.length < 2) c.gag('ep1_short_round');
    return s;
  }

  function startRound(i){
    roundIdx = i;
    roundErrors = 0;
    busy = true;
    selected = null;
    swapTimer = 0; fleeTimer = 0; swapTold = false; fleeBackTold = false;
    setWord(i);
    hintEl.textContent = ROUND_HINT[i] || '';
    removeAllArts();
    updateHud();
    sfx('chalk');
    return sw(300).then(function(){
      if (c.done) return;
      spawnArts();
      speed = SPEEDS[i] || 100;
      busy = false;
      if (ROUND_TOAST[i]) toast(ROUND_TOAST[i]);
      var esc = (c.text && c.text.pools && c.text.pools.ep1 && c.text.pools.ep1.esc) || [];
      if (i >= 2){ var line = esc[i - 2]; if (line) c.say('teacher', line, { mood: 'suspicious', ms: 1250 }); }
      c.gag('ep1_round_' + (i + 1));
    });
  }

  /* ---------- выбор артикля ---------- */
  function wake(a){
    if (!a || !a.asleep || busy) return;
    a.asleep = false;
    a.state = 'run';
    a.lockUntil = u.now() + 0.45;
    a.el.classList.remove('ep1-asleep');
    sfx('ding');
    toast('Он проснулся. Недовольно.');
    c.gag('article_wake');
    setVelocity(a, speed * 1.1);
    var lines = (c.text && c.text.article && c.text.article.lines) || [];
    if (lines.length) c.say('article', u.choice(lines), { mood: 'angry', ms: 1200 });
  }

  function pick(a){
    if (busy || !a || c.done) return;
    if (u.now() < (a.lockUntil || 0)) return;
    if (a.asleep){ wake(a); return; }
    if (selected === a) return;
    if (selected){
      selected.state = 'run';
      selected.el.classList.remove('ep1-picked');
    }
    selected = a;
    a.state = 'picked';
    a.el.classList.add('ep1-picked');
    wordEl.classList.add('ep1-armed');
    sfx('click');
    if (a.picket){
      toast('Плакат: «АРТИКЛЬ — НЕ ПРИЛОЖЕНИЕ!»');
      c.gag('article_picket_pick');
    } else {
      toast('Тапни слово или перетащи артикль.');
    }
  }

  /* ---------- drag & drop ---------- */
  function bindArt(a){
    c.tap(a.el, function(){
      if (busy || c.done) return;
      pick(a);
    });
    var ds = { on: false, offX: 0, offY: 0 };
    c.drag(a.el, {
      canStart: function(){ return !busy && !c.done; },
      onStart: function(p){
        if (busy || c.done) return;
        if (selected !== a) pick(a);
        if (selected !== a){ ds.on = false; return; }
        var r = a.el.getBoundingClientRect();
        ds.on = true;
        ds.offX = p.x - r.left;
        ds.offY = p.y - r.top;
        a.state = 'dragging';
        a.el.classList.add('ep1-dragging');
        a.el.style.transition = 'none';
        sfx('whoosh');
      },
      onMove: function(p){
        if (!ds.on || busy) return;
        var f = field.getBoundingClientRect();
        a.x = p.x - f.left - ds.offX;
        a.y = p.y - f.top - ds.offY;
        a.el.style.transform = tr(a.x, a.y) + ' scale(1.12)';
        wordEl.classList.toggle('ep1-word-target', isOverWord(p));
      },
      onEnd: function(p){
        if (!ds.on) return;
        ds.on = false;
        a.el.classList.remove('ep1-dragging');
        a.el.style.transition = '';
        wordEl.classList.remove('ep1-word-target');
        if (busy || c.done) return;
        if (isOverWord(p)){
          if (selected !== a) pick(a);
          if (selected === a){
            selected = null;
            wordEl.classList.remove('ep1-armed');
            startAttach(a);
          }
        } else {
          clampArt(a);
          a.state = 'picked';
        }
      },
      onCancel: function(){
        ds.on = false;
        a.el.classList.remove('ep1-dragging');
        wordEl.classList.remove('ep1-word-target');
      }
    });
  }

  /* ---------- крепление ---------- */
  function startAttach(a){
    if (busy || c.done) return;
    if (a.glyph === WORDS[roundIdx].art) runAsync(function(){ return onCorrect(a); });
    else runAsync(function(){ return onFail(a); });
  }

  async function onCorrect(a){
    busy = true;
    selected = null;
    wordEl.classList.remove('ep1-armed');
    saved++;
    c.bump('articlesSaved');
    c.gag('article_ate');
    sfx('pop');
    hintEl.textContent = 'Артикль на месте. Слово стало определённым.';
    try {
      var slotR = slotEl.getBoundingClientRect();
      var aR = a.el.getBoundingClientRect();
      var dx = (slotR.left + slotR.width / 2) - (aR.left + aR.width / 2);
      var dy = (slotR.top + slotR.height / 2) - (aR.top + ART_H * 0.5);
      a.state = 'eaten';
      a.el.style.transition = 'transform .38s cubic-bezier(.25,.9,.3,1), opacity .38s ease';
      a.el.style.transform = tr(a.x + dx, a.y + dy) + ' scale(.45)';
      await sw(360);
      if (c.done) return;
      a.el.style.opacity = '0';
      if (a.el.parentNode) a.el.parentNode.removeChild(a.el);
      var idx = arts.indexOf(a);
      if (idx >= 0) arts.splice(idx, 1);
      slotEl.textContent = a.glyph;
      slotEl.classList.add('ep1-filled');
      wordEl.classList.add('ep1-defined');
      sfx('correct');
      var f = field.getBoundingClientRect();
      G.fx.burst(f.left + slotR.left + slotR.width / 2, f.top + slotR.top + slotR.height / 2, {
        text: a.glyph, count: 10, spread: 110, size: 20,
        colors: ['#ffd23f', '#fff6cf', '#6fe08a']
      });
      plusPop();
      showWordLine(WORDS[roundIdx].line);
      updateHud();
      if (saved === 3) c.say('teacher', 'Хорошо.', { mood: 'proud', ms: 950 });
      wordGag(roundIdx);
      c.wait(760).then(function(){
        if (c.done) return;
        if (roundIdx === WORDS.length - 1) runAsync(function(){ return finale(); });
        else runAsync(function(){ return startRound(roundIdx + 1); });
      }, function(){});
    } catch(e){
      if (!(e && e.__skip)) console.error('[ep1]', e);
    }
  }

  function wordGag(i){
    var article = (c.text && c.text.article && c.text.article.lines) || ['Я не приложение. Я личность.'];
    if (i === 0) c.say('teacher', 'Один. Осталось пять. Не расслабляйтесь.', { mood: 'tired', ms: 1000 });
    else if (i === 1) c.say('vika', 'Я это знала. Кот тоже.', { mood: 'smug', ms: 1000 });
    else if (i === 2) c.say('teacher', 'Галочка. Одна. Не радуйтесь.', { mood: 'tired', ms: 1000 });
    else if (i === 3) c.say('article', 'Я после гласной. Так положено.', { mood: 'proud', ms: 900 });
    else if (i === 4) c.say('teacher', 'Пятый. Я запомню. Я всё запоминаю.', { mood: 'suspicious', ms: 950 });
    else if (i === 5) c.say('tolya', 'Дождь. В классе. Нормально.', { mood: 'neutral', ms: 1100 });
    else if (u.chance(0.5)) c.say('article', u.choice(article), { mood: 'proud', ms: 900 });
  }

  async function onFail(a){
    busy = true;
    selected = null;
    wordEl.classList.remove('ep1-armed');
    wordEl.classList.remove('ep1-word-target');
    roundErrors++;
    errorsTotal++;
    c.bump('errors');
    sfx('wrong');
    hintEl.textContent = 'Мимо. Слово цело. Артикль тоже. Продолжаем.';
    try {
      var aR = a.el.getBoundingClientRect();
      var wR = wordEl.getBoundingClientRect();
      var dx = (wR.left + wR.width / 2) - (aR.left + aR.width / 2);
      var dy = (wR.top + wR.height / 2) - (aR.top + ART_H * 0.5);
      a.el.style.transition = 'transform .24s ease-out';
      a.el.style.transform = tr(a.x + dx, a.y + dy) + ' scale(1.05)';
      await sw(230);
      if (c.done) return;
      a.el.classList.remove('ep1-picked');
      G.fx.burst(wR.left + wR.width / 2, wR.top + wR.height / 2, {
        randomText: true, count: 18, spread: 230, size: 24
      });
      G.fx.shake(1.35, 400);
      G.fx.flash('rgba(255,90,95,.25)', 170);
      sfx('explosion');
      wordHit();
      a.el.style.transition = '';
      // вернуть артикли в игру
      for (var i = 0; i < arts.length; i++){
        var x = arts[i];
        x.el.classList.remove('ep1-picked');
        x.el.style.transition = '';
        if (x === a){
          x.state = 'run';
          randomSpot(x);
          setVelocity(x, speed);
        } else if (x.state !== 'away' && x.state !== 'sleep'){
          x.state = 'run';
        }
      }
      selected = null;
      c.bump('protocols');
      protocols++;
      updateHud();
      try { c.stage.prop('protocol', 'enter'); } catch(e){}
      await screamNow();
      var police = (c.text && c.text.police) || [];
      c.say('police', pickLine(police, 'Протокол номер сорок семь. Продолжаем.'), { ms: 1100 });
      c.wait(1300).then(function(){ if (!c.done){ try { c.stage.prop('protocol', 'exit'); } catch(e){} } }, function(){});
      if (roundErrors >= 2) showWhisper();
      if (protocols === 5){ c.gag('ep1_stack'); c.say('police', 'Стопка протоколов стала стулом. Я сяду.', { ms: 1300 }); }
      await sw(120);
    } catch(e){
      if (!(e && e.__skip)) console.error('[ep1]', e);
    }
    busy = false;
    hintEl.textContent = ROUND_HINT[roundIdx] || '';
  }

  function screamNow(){
    var now = u.now();
    if (now - lastScream > 2.4){
      lastScream = now;
      c.mood('teacher', 'scream');
      c.fx.shake(1.5, 420);
      return c.scream();
    }
    sfx('scream');
    c.fx.shake(1.1, 260);
    return c.say('teacher', pickLine((c.text && c.text.screams) || [], 'ГДЕ АРТИКЛЬ?!'), { mood: 'scream', urgent: true, ms: 850 });
  }

  /* ---------- движение ---------- */
  function swapArts(){
    if (busy || selected || arts.length < 2) return;
    var a = arts[0], b = arts[1];
    if (a.state !== 'run' || b.state !== 'run') return;
    var tx = a.x, ty = a.y;
    a.x = b.x; a.y = b.y;
    b.x = tx; b.y = ty;
    sfx('whoosh');
    var f = field.getBoundingClientRect();
    G.fx.burst(f.left + a.x + ART_W / 2, f.top + a.y + ART_H / 2, { text: '↔', count: 3, spread: 46, size: 16, colors: ['#ffd23f'] });
    G.fx.burst(f.left + b.x + ART_W / 2, f.top + b.y + ART_H / 2, { text: '↔', count: 3, spread: 46, size: 16, colors: ['#ffd23f'] });
    if (!swapTold){ swapTold = true; toast('Они поменялись местами. Принципиально.'); c.gag('article_swap_seen'); }
  }

  function startFlee(){
    if (busy || selected) return;
    var cand = [];
    for (var i = 0; i < arts.length; i++){
      if (arts[i].state === 'run' && !arts[i].asleep) cand.push(arts[i]);
    }
    if (!cand.length) return;
    var a = u.choice(cand);
    a.state = 'flee';
    a.vx = (u.chance(0.5) ? 1 : -1) * 620;
    a.vy = u.rand(-70, 70);
    sfx('whoosh');
    if (!fleeBackTold){
      fleeBackTold = true;
      toast('Артикль вышел из класса. У него дождь.');
      c.gag('article_flee');
    }
  }

  function returnFromAway(a){
    var s = fieldSize();
    a.state = 'run';
    var fromLeft = u.chance(0.5);
    a.x = fromLeft ? -ART_W * 0.55 : s.W - ART_W * 0.45;
    a.y = u.rand(20, Math.max(21, s.H - ART_H - 20));
    var ang = Math.atan2((s.H * 0.44) - (a.y + ART_H / 2), (s.W * 0.5) - (a.x + ART_W / 2));
    a.vx = Math.cos(ang) * speed;
    a.vy = Math.sin(ang) * speed;
    sfx('pop');
    toast('Вернулись. Из-за дождя.');
  }

  function update(dt, t){
    var s = fieldSize();
    var W = s.W, H = s.H;
    if (!W || !H) return;
    var wb = wordBox(W, H);
    var wx0 = wb.cx - wb.ww / 2 - 8, wx1 = wb.cx + wb.ww / 2 + 8;
    var wy0 = wb.cy - wb.wh / 2 - 8, wy1 = wb.cy + wb.wh / 2 + 8;

    if (!busy && roundIdx === 3){ swapTimer += dt; if (swapTimer > 2.1){ swapTimer = 0; swapArts(); } }
    if (!busy && roundIdx === 5){ fleeTimer += dt; if (fleeTimer > 3.0){ fleeTimer = 0; startFlee(); } }

    for (var i = 0; i < arts.length; i++){
      var a = arts[i];
      if (a.state === 'eaten') continue;
      drawCreature(a, t);
      if (a.state === 'dragging') continue;
      if (a.asleep){
        a.el.style.transform = tr(a.x, a.y + Math.sin(t * 1.4 + a.phase) * 1.6);
        continue;
      }
      if (selected === a && a.state === 'picked'){
        a.el.style.transform = tr(a.x, a.y + Math.sin(t * 6 + a.phase) * 2);
        continue;
      }
      if (busy){
        a.el.style.transform = tr(a.x, a.y + Math.sin(t * 5 + a.phase) * 2);
        continue;
      }
      if (a.state === 'away'){
        if (t > a.awayUntil) returnFromAway(a);
        else { a.el.style.transform = tr(a.x, a.y); continue; }
      }
      if (a.state === 'flee'){
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        var out = false;
        if (a.vx > 0 && a.x > W + 60) out = true;
        if (a.vx < 0 && a.x < -ART_W - 60) out = true;
        if (out){
          a.state = 'away';
          a.awayUntil = t + 0.75;
          a.x = a.vx > 0 ? W + 300 : -ART_W - 300;
          c.bump('articlesLost');
          toast('Артикль ушёл. С чемоданом.');
        }
        a.el.style.transform = tr(a.x, a.y);
        continue;
      }
      // обычное блуждание
      var ang = Math.atan2(a.vy, a.vx) + u.rand(-1, 1) * 1.3 * dt;
      var sp = speed * a.speedMul;
      if (pointer.active){
        var acx = a.x + ART_W / 2, acy = a.y + ART_H / 2;
        var pdx = acx - pointer.x, pdy = acy - pointer.y;
        var pd = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pd < 150 && pd > 0.5){
          ang = Math.atan2(pdy, pdx);
          sp = sp * 1.65;
        }
      }
      a.vx = Math.cos(ang) * sp;
      a.vy = Math.sin(ang) * sp;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.picket){
        if (a.x < 62){ a.x = 62; a.vx = Math.abs(a.vx); }
        if (a.x > W - ART_W - 62){ a.x = W - ART_W - 62; a.vx = -Math.abs(a.vx); }
      }
      if (a.x < 4){ a.x = 4; a.vx = Math.abs(a.vx); }
      if (a.x > W - ART_W - 4){ a.x = W - ART_W - 4; a.vx = -Math.abs(a.vx); }
      if (a.picket && a.y < 46){ a.y = 46; a.vy = Math.abs(a.vy); }
      if (a.y < 4){ a.y = 4; a.vy = Math.abs(a.vy); }
      if (a.y > H - ART_H - 56){ a.y = H - ART_H - 56; a.vy = -Math.abs(a.vy); }
      // не залезать на слово
      if (a.x + ART_W > wx0 && a.x < wx1 && a.y + ART_H > wy0 && a.y < wy1){
        var ox = Math.min(a.x + ART_W - wx0, wx1 - a.x);
        var oy = Math.min(a.y + ART_H - wy0, wy1 - a.y);
        if (ox < oy){
          if (a.x + ART_W / 2 < wb.cx){ a.x = wx0 - ART_W; a.vx = -Math.abs(a.vx); }
          else { a.x = wx1; a.vx = Math.abs(a.vx); }
        } else {
          if (a.y + ART_H / 2 < wb.cy){ a.y = wy0 - ART_H; a.vy = -Math.abs(a.vy); }
          else { a.y = wy1; a.vy = Math.abs(a.vy); }
        }
        a.x = u.clamp(a.x, 4, Math.max(4, W - ART_W - 4));
        a.y = u.clamp(a.y, 4, Math.max(4, H - ART_H - 4));
      }
      // расталкивание пары
      if (arts.length === 2){
        var o = arts[0] === a ? arts[1] : arts[0];
        if (o && o.state !== 'eaten'){
          var ddx = (a.x + ART_W / 2) - (o.x + ART_W / 2);
          var ddy = (a.y + ART_H / 2) - (o.y + ART_H / 2);
          var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          if (dd < 116){
            var push = (116 - dd) / 2;
            a.x += (ddx / dd) * push;
            a.y += (ddy / dd) * push;
            o.x -= (ddx / dd) * push;
            o.y -= (ddy / dd) * push;
            o.x = u.clamp(o.x, 4, Math.max(4, W - ART_W - 4));
            o.y = u.clamp(o.y, 4, Math.max(4, H - ART_H - 4));
          }
        }
      }
      a.el.style.transform = tr(a.x, a.y + Math.sin(t * 6 + a.phase) * 2.2);
    }
  }

  /* ---------- события ---------- */
  c.tap(wordEl, function(){
    if (busy || c.done) return;
    if (!selected){
      sfx('error');
      wordHit();
      toast('Сначала поймай артикль.');
      return;
    }
    var a = selected;
    selected = null;
    wordEl.classList.remove('ep1-armed');
    startAttach(a);
  });

  c.tap(field, function(ev){
    if (busy || c.done) return;
    var tgt = ev.target;
    if (tgt && tgt.closest && tgt.closest('.ep1-word, .ep1-art, .ep1-toast, .ep1-whisper, .ep1-hintbar, .ep1-runaway')) return;
    if (!arts.length) return;
    var f = field.getBoundingClientRect();
    for (var i = 0; i < arts.length; i++){
      var a = arts[i];
      if (!a.asleep) continue;
      var cx = f.left + a.x + ART_W / 2, cy = f.top + a.y + ART_H * 0.35;
      if (u.dist(ev.clientX, ev.clientY, cx, cy) < 130){ wake(a); return; }
    }
  });

  var offMove = u.on(field, 'pointermove', function(ev){
    if (ev.pointerType !== 'mouse') return;
    var f = field.getBoundingClientRect();
    pointer.x = ev.clientX - f.left;
    pointer.y = ev.clientY - f.top;
    pointer.active = true;
  }, { passive: true });
  var offLeave = u.on(field, 'pointerleave', function(){ pointer.active = false; }, { passive: true });
  c.cleanup(offMove);
  c.cleanup(offLeave);

  /* ---------- финал ---------- */
  function spawnRunaway(){
    var run = h.el('div', 'ep1-runaway');
    var vis = makeCreatureVis();
    run.appendChild(vis.node);
    if (vis.canvas && vis.ctx){
      try { G.art.drawArticle(vis.ctx, { x: 0, y: 0, w: ART_W, h: ART_H }, 'proud', 0, { glyph: 'ը' }); } catch(e){}
    }
    run.appendChild(h.el('div', 'ep1-runaway-sign', 'Я В ОТПУСКЕ!'));
    field.appendChild(run);
    sfx('whoosh');
  }

  async function finale(){
    busy = true;
    removeAllArts();
    wordEl.classList.remove('ep1-armed', 'ep1-hit');
    hintEl.textContent = 'Спасено 6 из 6. Урок почти спасён.';
    sfx('sparkle');
    await sw(420);
    if (c.done) return;
    wordEl.classList.add('ep1-word-fly');
    sfx('whoosh');
    await sw(700);
    if (c.done) return;
    await c.say('teacher', 'Ну наконец-то...', { mood: 'cosmic', ms: 1000 }).catch(function(){});
    if (c.done) return;
    spawnRunaway();
    c.fx.shake(1.5, 420);
    var sp = c.scream();
    try { await sp; } catch(e){ if (!(e && e.__skip)) console.error('[ep1]', e); }
    if (c.done) return;
    c.mood('teacher', 'cosmic');
    G.fx.stamp('АРТИКЛЬ СНОВА СБЕЖАЛ');
    c.say('system', pickLine((c.text && c.text.system) || [], 'ДЕЛО ПЕРЕДАНО В БУКВЕННЫЙ ОТДЕЛ.'), { ms: 1600 });
    await sw(1400);
    if (c.done) return;
    if (errorsTotal === 0){ c.achievement('article_friend'); c.gag('ep1_perfect'); }
    if (endResolve) endResolve();
  }

  /* ---------- старт ---------- */
  updateHud();
  setWord(0);
  hintEl.textContent = 'Готовим урок...';
  try {
    c.mood('teacher', 'scream');
    await c.scream();
    if (c.done) return;
    c.say('teacher', 'Ловим. Тапни артикль, потом слово.', { mood: 'calm', ms: 1500 });
    await sw(700);
    if (c.done) return;
    await startRound(0);
    if (c.done) return;
    c.raf(update);
    await endPromise;
  } catch(e){
    if (!(e && e.__skip)) console.error('[ep1]', e);
  }
};
})();
