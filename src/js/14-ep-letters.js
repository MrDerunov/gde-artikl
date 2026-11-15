/* 14-ep-letters.js — Эп4 «БУКВЕННЫЙ ЗАГОВОР». Роль: dev-arcade.
   3 раунда по 5 попаданий: найти настоящую букву (բ среди պ/փ, ռ среди ր, ձ среди ծ/ց).
   Буквы — живые паспорта: дрейфуют, меняются местами, телепортируются, носят маски,
   показывают фальшивые паспорта и обвиняют друг друга.
   Промах — забастовка профсоюза «ՏԱՌ» на 1.2 с (все замирают), errors+1, прогресс не теряется.
   Глифы — только реальные Unicode-символы через DOM (шрифтовой стек TECH §1). */
(function(){
'use strict';
var G = window.G = window.G || {};
var u = G.u;

var LETTER_W = 66, LETTER_H = 84;
var HITS_PER_ROUND = 5;
var CSS_ONCE = false;

var CSS = [
'.ep4-wrap{position:absolute;inset:0;display:flex;flex-direction:column;color:#f2ecd9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;overflow:hidden}',
'.ep4-arm{font-family:"Segoe UI","Noto Sans Armenian","DejaVu Sans","Arial Unicode MS",sans-serif}',
'.ep4-hud{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:6px 12px 2px;min-height:34px;z-index:3}',
'.ep4-title{font-weight:900;font-size:clamp(10px,2.4vw,16px);line-height:1;letter-spacing:.05em;color:#8fe3b0;text-shadow:0 2px 0 rgba(0,0,0,.55);white-space:nowrap}',
'.ep4-target{margin-left:auto;display:flex;align-items:center;gap:6px;background:rgba(6,16,13,.72);border:2px solid rgba(143,227,176,.55);border-radius:9px;padding:2px 9px 2px 10px}',
'.ep4-tcap{font-weight:800;font-size:clamp(8px,2vw,11px);letter-spacing:.12em;color:rgba(242,236,217,.62)}',
'.ep4-tglyph{font-weight:900;font-size:clamp(20px,5vw,30px);line-height:1.05;color:#ffd23f;text-shadow:0 2px 0 rgba(0,0,0,.6)}',
'.ep4-meta{font-weight:800;font-size:clamp(9px,2.2vw,12px);line-height:1;letter-spacing:.03em;color:rgba(242,236,217,.72);white-space:nowrap}',
'.ep4-meta b{color:#ffd23f;font-weight:900}',
'.ep4-field{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;touch-action:none;background:radial-gradient(72% 62% at 50% 45%, rgba(127,227,255,.06) 0%, rgba(127,227,255,.015) 48%, rgba(0,0,0,0) 74%)}',
'.ep4-pips{position:absolute;left:12px;top:10px;display:flex;gap:5px;z-index:6;pointer-events:none}',
'.ep4-pip{width:12px;height:12px;border-radius:3px;border:2px solid rgba(242,236,217,.4);background:transparent;transition:background .15s ease,border-color .15s ease}',
'.ep4-pip.on{background:#8fe3b0;border-color:#8fe3b0}',
'.ep4-pip.last{border-color:#fff}',
'.ep4-observer{position:absolute;right:18px;top:10px;z-index:6;display:none;align-items:center;gap:5px;pointer-events:none;white-space:nowrap;max-width:60%;overflow:hidden}',
'.ep4-observer.on{display:flex}',
'.ep4-observer i{display:block;width:10px;height:10px;border-radius:50%;background:#f2ecd9;box-shadow:0 0 8px rgba(242,236,217,.8)}',
'.ep4-observer span{font-weight:800;font-size:8px;letter-spacing:.1em;color:rgba(242,236,217,.55)}',
'.ep4-let{position:absolute;left:0;top:0;width:66px;height:84px;will-change:transform;z-index:3;touch-action:none;cursor:pointer;pointer-events:auto}',
'.ep4-card{position:absolute;left:0;top:0;width:66px;height:66px;background:linear-gradient(158deg,#fbf5e3 0%,#ecdfc0 100%);border:2.5px solid #1b1b1f;border-radius:7px;box-shadow:0 4px 0 rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center;pointer-events:none}',
'.ep4-glyph{font-weight:800;font-size:42px;line-height:1;color:#1b1b1f;transform:translateY(5px);pointer-events:none}',
'.ep4-eyes{position:absolute;left:50%;top:3px;transform:translateX(-50%);display:flex;gap:14px;pointer-events:none}',
'.ep4-eyes i{display:block;width:6px;height:7px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#fff 0 1.6px,#1b1b1f 2.2px)}',
'.ep4-barcode{position:absolute;left:9px;right:9px;bottom:5px;height:5px;background:repeating-linear-gradient(90deg,rgba(27,27,31,.55) 0 1px,rgba(27,27,31,0) 1px 3px);pointer-events:none;opacity:.55}',
'.ep4-legs{position:absolute;left:0;top:63px;width:66px;height:20px;pointer-events:none}',
'.ep4-legs i{position:absolute;top:0;width:4px;height:15px;background:#1b1b1f;border-radius:2px;transform-origin:top center;animation:ep4walk .42s ease-in-out infinite alternate}',
'.ep4-legs i.l{left:23px}',
'.ep4-legs i.r{left:39px;animation-delay:-.21s}',
'.ep4-let.ep4-frozen .ep4-legs i{animation-play-state:paused}',
'.ep4-let.ep4-hit{z-index:12;animation:ep4hit .3s ease-out forwards;pointer-events:none}',
'.ep4-let.ep4-morph .ep4-card{animation:ep4morph .45s cubic-bezier(.2,1.6,.4,1)}',
'.ep4-let.ep4-tele{transition:opacity .14s ease,transform .14s ease;opacity:.08}',
'.ep4-let.ep4-accused .ep4-card{animation:ep4accuse .45s linear}',
'.ep4-let.ep4-masked .ep4-card{box-shadow:0 0 0 3px #7fe3ff,0 4px 0 rgba(0,0,0,.38);animation:ep4shimmer .8s ease-in-out infinite}',
'.ep4-let.ep4-surrender{pointer-events:none}',
'.ep4-let.ep4-surrender .ep4-card::after{content:"⚑";position:absolute;right:-4px;top:-16px;font-size:16px;color:#f2ecd9;text-shadow:0 2px 0 rgba(0,0,0,.5)}',
'.ep4-let.ep4-clap .ep4-card{animation:ep4clap .4s ease-in-out 2}',
'.ep4-let.ep4-spawn .ep4-card{animation:ep4spawnin .42s cubic-bezier(.2,1.7,.4,1)}',
'.ep4-label{position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%) rotate(-3deg);background:#f7efdf;border:2px solid #1b1b1f;border-radius:4px;padding:2px 5px;font-weight:800;font-size:8.5px;line-height:1.15;color:#1b1b1f;white-space:nowrap;box-shadow:2px 2px 0 rgba(0,0,0,.32);pointer-events:none;z-index:7;animation:ep4label 1.9s ease-out forwards}',
'.ep4-label.ep4-accuse{background:#ffe9a8;transform:translateX(-50%) rotate(2deg);font-size:9px}',
'.ep4-strike{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%) rotate(-1.5deg);z-index:20;background:#f7efdf;color:#1b1b1f;border:4px solid #1b1b1f;border-radius:8px;padding:10px 16px;text-align:center;box-shadow:0 10px 0 rgba(0,0,0,.42);pointer-events:none;display:none;max-width:90%}',
'.ep4-strike.show{display:block;animation:ep4strikeIn .26s cubic-bezier(.2,1.6,.4,1)}',
'.ep4-strike h3{margin:0;font-weight:900;font-size:clamp(15px,4.6vw,26px);line-height:1;letter-spacing:.05em}',
'.ep4-strike p{margin:6px 0 0;font-weight:700;font-size:clamp(9px,2.3vw,12px);line-height:1.25;opacity:.72}',
'.ep4-strike .ep4-union{display:block;margin-top:4px;font-weight:900;font-size:10px;letter-spacing:.14em;opacity:.55}',
'.ep4-banner{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:21;text-align:center;pointer-events:none;opacity:0}',
'.ep4-banner.show{animation:ep4banner 1.15s ease-out forwards}',
'.ep4-banner .cap{font-weight:900;font-size:clamp(13px,3.4vw,20px);letter-spacing:.14em;color:#f2ecd9;text-shadow:0 3px 0 rgba(0,0,0,.6)}',
'.ep4-banner .glyph{font-weight:900;font-size:clamp(48px,14vw,96px);line-height:1;color:#ffd23f;text-shadow:0 5px 0 rgba(0,0,0,.55)}',
'.ep4-banner .sub{margin-top:12px;font-weight:800;font-size:clamp(9px,2.3vw,12px);letter-spacing:.12em;color:rgba(242,236,217,.62)}',
'.ep4-toast{position:absolute;left:50%;bottom:52px;transform:translateX(-50%);z-index:14;background:rgba(6,16,13,.88);color:#f2ecd9;border:2px solid rgba(143,227,176,.55);border-radius:9px;padding:4px 11px;font-weight:700;font-size:clamp(9px,2.3vw,12px);line-height:1.2;max-width:92%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;pointer-events:none}',
'.ep4-toast.show{animation:ep4toast 1.8s ease-out forwards}',
'.ep4-hint{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);z-index:9;background:rgba(6,16,13,.5);border-radius:8px;padding:3px 10px;max-width:95%;font-weight:700;font-size:clamp(9px,2.2vw,12px);line-height:1.25;color:rgba(242,236,217,.68);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}',
'.ep4-paper{position:absolute;left:50%;top:48%;width:min(88%,440px);height:200px;transform:translate(-50%,-50%);z-index:24;perspective:900px;display:none}',
'.ep4-paper.show{display:block}',
'.ep4-paper-in{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .65s cubic-bezier(.35,1.3,.4,1)}',
'.ep4-paper.flip .ep4-paper-in{transform:rotateY(180deg)}',
'.ep4-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#f7efdf;color:#1b1b1f;border:3px solid #1b1b1f;border-radius:6px;padding:10px 14px;box-shadow:0 10px 0 rgba(0,0,0,.4);overflow:hidden}',
'.ep4-face.back{transform:rotateY(180deg);display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff6cf}',
'.ep4-pcap{font-weight:900;font-size:9px;letter-spacing:.18em;color:rgba(27,27,31,.45)}',
'.ep4-ptext{margin-top:6px;font-weight:900;font-size:clamp(15px,4.2vw,24px);line-height:1.08;letter-spacing:.01em}',
'.ep4-psub{margin-top:7px;font-weight:700;font-size:clamp(9px,2.3vw,12px);line-height:1.25;opacity:.62}',
'.ep4-pstamp{position:absolute;right:10px;bottom:8px;transform:rotate(-9deg);border:3px solid #b3261e;border-radius:5px;color:#b3261e;padding:2px 6px;font-weight:900;font-size:clamp(8px,2.1vw,11px);letter-spacing:.06em;opacity:.85}',
'.ep4-backbig{font-weight:900;font-size:clamp(28px,8vw,52px);line-height:1;color:#1b1b1f}',
'.ep4-backsub{margin-top:8px;font-weight:800;font-size:clamp(9px,2.4vw,13px);letter-spacing:.16em;opacity:.5}',
'.ep4-auto{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(6,16,13,.85);border:2px solid #8fe3b0;border-radius:10px;padding:10px 16px;font:800 14px/1.2 -apple-system,"Segoe UI",sans-serif;color:#8fe3b0;letter-spacing:.08em}',
'@keyframes ep4walk{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}',
'@keyframes ep4hit{0%{opacity:1;transform:translate(var(--tx,0),var(--ty,0)) scale(1)}100%{opacity:0;transform:translate(var(--tx,0),calc(var(--ty,0) - 60px)) scale(.35) rotate(14deg)}}',
'@keyframes ep4morph{0%{transform:scale(.8) rotate(-8deg)}55%{transform:scale(1.18) rotate(5deg)}100%{transform:scale(1) rotate(0)}}',
'@keyframes ep4accuse{0%,100%{transform:translate(0,0) rotate(0)}15%{transform:translate(-4px,2px) rotate(-3deg)}35%{transform:translate(4px,-3px) rotate(2deg)}55%{transform:translate(-3px,-1px) rotate(-2deg)}75%{transform:translate(2px,2px) rotate(1deg)}}',
'@keyframes ep4shimmer{0%,100%{filter:none}50%{filter:hue-rotate(35deg) saturate(1.6) brightness(1.12)}}',
'@keyframes ep4clap{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px) rotate(-4deg)}}',
'@keyframes ep4label{0%{opacity:0;transform:translateX(-50%) translateY(6px) rotate(-3deg)}12%{opacity:1;transform:translateX(-50%) translateY(0) rotate(-3deg)}72%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-7px) rotate(-3deg)}}',
'@keyframes ep4strikeIn{0%{opacity:0;transform:translate(-50%,-50%) rotate(-7deg) scale(2.1)}55%{opacity:1;transform:translate(-50%,-50%) rotate(-1.5deg) scale(.94)}100%{opacity:1;transform:translate(-50%,-50%) rotate(-1.5deg) scale(1)}}',
'@keyframes ep4banner{0%{opacity:0;transform:translate(-50%,-50%) scale(1.35)}12%{opacity:1;transform:translate(-50%,-50%) scale(.97)}20%{transform:translate(-50%,-50%) scale(1)}76%{opacity:1}100%{opacity:0;transform:translate(-50%,-54%) scale(1.02)}}',
'@keyframes ep4spawnin{0%{transform:scale(0) rotate(-30deg);opacity:0}70%{transform:scale(1.12) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}',
'@keyframes ep4toast{0%{opacity:0;transform:translateX(-50%) translateY(6px)}10%{opacity:1;transform:translateX(-50%) translateY(0)}76%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-5px)}}'
];
function ensureCss(){
  if (CSS_ONCE) return;
  CSS_ONCE = true;
  u.css(CSS.join('\n'));
}

var ROUNDS = [
  { target:'բ', decoys:['պ','փ'], speed:38,
    hint:'Тапни настоящую բ. Похожие պ и փ тапаются так же. Это ловушка.' },
  { target:'ռ', decoys:['ր'], speed:54,
    hint:'Буквы меняются местами и обвиняют друг друга. Не верь паспорту.' },
  { target:'ձ', decoys:['ծ','ց'], speed:68,
    hint:'Буквы телепортируются и носят маски. Смотри на букву, а не на паспорт.' }
];

var ACCUSE_LINES = [
  'Это он притворяется!',
  'У него фальшивый паспорт!',
  'Я не պ. Я вообще փ.',
  'Проверьте его глиф!',
  'Он тут с прошлого вторника.',
  'Я всегда был ր. Просто устал.',
  'Не смотрите на меня. Смотрите на բ.',
  'Я профсоюзный. Меня нельзя.'
];
var PASSPORT_NAMES = { 'պ':'Պա', 'փ':'Փա', 'ր':'Րա', 'ծ':'Ծա', 'ց':'Ցա', 'բ':'Բա', 'ռ':'Ռա', 'ձ':'Ձա' };

G.scenes.letters = async function(c){
  ensureCss();
  var h = c.h;

  var wrap = c.add(h.el('div', 'ep4-wrap'));
  if (c.auto){
    wrap.appendChild(h.el('div', 'ep4-auto', 'ЭП4 · АВТОПРОХОД'));
    await c.wait(1100).catch(function(){});
    c.bump('lettersCaught', 15);
    c.bump('errors', 0);
    c.gag('ep4_auto');
    return;
  }

  /* ---------- HUD ---------- */
  var hud = h.el('div', 'ep4-hud');
  hud.appendChild(h.el('div', 'ep4-title', 'БУКВЕННЫЙ ЗАГОВОР'));
  var targetBox = h.el('div', 'ep4-target');
  targetBox.appendChild(h.el('span', 'ep4-tcap', 'ИЩЕМ'));
  var targetGlyphEl = h.el('span', 'ep4-tglyph ep4-arm', ROUNDS[0].target);
  targetBox.appendChild(targetGlyphEl);
  hud.appendChild(targetBox);
  var meta = h.el('div', 'ep4-meta');
  var progressEl = h.el('b', null, '0');
  var roundEl = h.el('span', null, '· 1/3');
  meta.appendChild(progressEl);
  meta.appendChild(document.createTextNode('/5 '));
  meta.appendChild(roundEl);
  hud.appendChild(meta);
  wrap.appendChild(hud);

  var field = h.el('div', 'ep4-field');
  wrap.appendChild(field);

  var pips = h.el('div', 'ep4-pips');
  var pipEls = [];
  for (var pi = 0; pi < HITS_PER_ROUND; pi++){
    var pip = h.el('i', 'ep4-pip');
    pips.appendChild(pip);
    pipEls.push(pip);
  }
  field.appendChild(pips);

  var observer = h.el('div', 'ep4-observer');
  observer.appendChild(h.el('i'));
  observer.appendChild(h.el('span', null, 'НАБЛЮДАТЕЛЬ · ՏԱՌ'));
  field.appendChild(observer);

  var strikeEl = h.el('div', 'ep4-strike');
  var strikeH = h.el('h3', null, 'ЗАБАСТОВКА');
  var strikeSub = h.el('p', null, 'ТРЕБОВАНИЯ: место в ООН, один выходной.');
  var strikeUnion = h.el('span', 'ep4-union', 'ПРОФСОЮЗ «ՏԱՌ»');
  strikeEl.appendChild(strikeH);
  strikeEl.appendChild(strikeSub);
  strikeEl.appendChild(strikeUnion);
  field.appendChild(strikeEl);

  var banner = h.el('div', 'ep4-banner');
  field.appendChild(banner);

  var toastEl = h.el('div', 'ep4-toast');
  field.appendChild(toastEl);

  var hintEl = h.el('div', 'ep4-hint', ROUNDS[0].hint);
  field.appendChild(hintEl);

  var paper = h.el('div', 'ep4-paper');
  var paperIn = h.el('div', 'ep4-paper-in');
  var faceFront = h.el('div', 'ep4-face');
  var faceBack = h.el('div', 'ep4-face back');
  paperIn.appendChild(faceFront);
  paperIn.appendChild(faceBack);
  paper.appendChild(paperIn);
  field.appendChild(paper);

  /* ---------- state ---------- */
  var letters = [];
  var roundIndex = 0, progress = 0, hitsTotal = 0, misses = 0, streak = 0, targetCount = 0;
  var strike = false, transitioning = false, busy = false;
  var speed = ROUNDS[0].speed;
  var passportTimer = 0, accuseTimer = 0, swapTimer = 0, maskTimer = 0, teleTimer = 0;
  var endResolve = null;
  var endPromise = new Promise(function(res){ endResolve = res; });

  function sfx(name){ try { if (G.audio && G.audio.sfx) G.audio.sfx(name); } catch(e){} }
  function sw(ms){ return c.wait(ms).catch(function(){}); }
  function runAsync(fn){
    try {
      var p = fn();
      if (p && p.catch) p.catch(function(e){ if (e && e.__skip) return; console.error('[ep4]', e); });
    } catch(e){ if (!(e && e.__skip)) console.error('[ep4]', e); }
  }
  function pickLine(arr, fallback){
    try { if (arr && arr.length) return u.choice(arr); } catch(e){}
    return fallback || '';
  }
  function fieldSize(){ return { W: field.clientWidth || 390, H: field.clientHeight || 400 }; }

  function updateHud(){
    progressEl.textContent = String(progress);
    roundEl.textContent = '· ' + (roundIndex + 1) + '/3';
    targetGlyphEl.textContent = ROUNDS[roundIndex].target;
    for (var i = 0; i < pipEls.length; i++){
      pipEls[i].classList.toggle('on', i < progress);
      pipEls[i].classList.toggle('last', i === progress);
    }
    observer.classList.toggle('on', roundIndex === 2);
  }

  function toast(text){
    if (!text) return;
    toastEl.textContent = text;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
  }

  function renderGlyph(l){
    l.display = l.masked ? l.maskGlyph : l.glyph;
    var g = l.el.querySelector('.ep4-glyph');
    if (g) g.textContent = l.display;
    l.el.dataset.glyph = l.display;
    if (l.isTarget) l.el.dataset.target = '1';
    else l.el.removeAttribute('data-target');
  }

  /* ---------- буквы ---------- */
  function clearLetters(){
    for (var i = 0; i < letters.length; i++){
      var l = letters[i];
      if (l.el && l.el.parentNode) l.el.parentNode.removeChild(l.el);
    }
    letters = [];
    targetCount = 0;
  }

  function placeGrid(){
    var s = fieldSize();
    var n = letters.length;
    var cols = Math.min(6, Math.max(3, Math.floor(s.W / 92)));
    var rows = Math.ceil(n / cols);
    var cellW = s.W / cols;
    var cellH = Math.max(96, (s.H - 96) / rows);
    for (var i = 0; i < n; i++){
      var col = i % cols, row = Math.floor(i / cols);
      var l = letters[i];
      l.x = u.clamp(col * cellW + (cellW - LETTER_W) / 2 + u.rand(-12, 12), 6, Math.max(6, s.W - LETTER_W - 6));
      l.y = u.clamp(38 + row * cellH + (cellH - LETTER_H) / 2 + u.rand(-10, 10), 34, Math.max(34, s.H - LETTER_H - 30));
      l.el.style.transform = tr(l.x, l.y);
    }
  }

  function createLetter(glyph, isTarget){
    var el = h.el('div', 'ep4-let');
    var card = h.el('div', 'ep4-card');
    card.appendChild(h.el('div', 'ep4-glyph ep4-arm', glyph));
    var eyes = h.el('div', 'ep4-eyes');
    eyes.appendChild(h.el('i'));
    eyes.appendChild(h.el('i'));
    card.appendChild(eyes);
    card.appendChild(h.el('div', 'ep4-barcode'));
    var legs = h.el('div', 'ep4-legs');
    legs.appendChild(h.el('i', 'l'));
    legs.appendChild(h.el('i', 'r'));
    el.appendChild(card);
    el.appendChild(legs);
    field.appendChild(el);
    var l = {
      el: el, glyph: glyph, display: glyph, isTarget: !!isTarget,
      masked: false, maskGlyph: '', maskUntil: 0,
      x: 0, y: 0, vx: 0, vy: 0, phase: u.rand(0, Math.PI * 2),
      speedMul: u.rand(0.86, 1.16), dead: false, labelBusy: false
    };
    el.dataset.glyph = glyph;
    if (isTarget){ el.dataset.target = '1'; targetCount++; }
    c.tap(el, function(){
      if (c.done || strike || transitioning || l.dead) return;
      if (l.isTarget) hitTarget(l);
      else missLetter(l);
    });
    letters.push(l);
    return l;
  }

  function spawnLetters(){
    clearLetters();
    var s = fieldSize();
    var count = s.W < 520 ? 8 : 10;
    var targetSlots = {};
    while (Object.keys(targetSlots).length < 2){
      targetSlots[u.randInt(0, count - 1)] = true;
    }
    var round = ROUNDS[roundIndex];
    for (var i = 0; i < count; i++){
      var isTarget = !!targetSlots[i];
      var glyph = isTarget ? round.target : u.choice(round.decoys);
      createLetter(glyph, isTarget);
    }
    placeGrid();
    updateHud();
  }

  function tr(x, y){ return 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; }

  function bounds(l, s){
    l.x = u.clamp(l.x, 6, Math.max(6, s.W - LETTER_W - 6));
    l.y = u.clamp(l.y, 34, Math.max(34, s.H - LETTER_H - 30));
  }

  function spawnOneDecoy(){
    var round = ROUNDS[roundIndex];
    var s = fieldSize();
    var l = createLetter(u.choice(round.decoys), false);
    var placed = false;
    for (var k = 0; k < 40; k++){
      var x = u.rand(8, Math.max(9, s.W - LETTER_W - 8));
      var y = u.rand(36, Math.max(37, s.H - LETTER_H - 30));
      var ok = true;
      for (var i = 0; i < letters.length; i++){
        var o = letters[i];
        if (o === l || o.dead) continue;
        if (u.dist(x, y, o.x, o.y) < 76){ ok = false; break; }
      }
      if (ok){ l.x = x; l.y = y; placed = true; break; }
    }
    if (!placed){
      l.x = u.rand(8, Math.max(9, s.W - LETTER_W - 8));
      l.y = u.rand(36, Math.max(37, s.H - LETTER_H - 30));
    }
    l.el.style.transform = tr(l.x, l.y);
    l.el.classList.add('ep4-spawn');
    l.el.addEventListener('animationend', function(){ l.el.classList.remove('ep4-spawn'); }, { once: true });
    return l;
  }

  function promoteTarget(){
    var cand = [];
    for (var i = 0; i < letters.length; i++){
      var l = letters[i];
      if (!l.isTarget && !l.dead) cand.push(l);
    }
    if (!cand.length) return;
    var l = u.choice(cand);
    l.isTarget = true;
    l.glyph = ROUNDS[roundIndex].target;
    if (l.masked){ l.masked = false; l.maskGlyph = ''; }
    l.el.classList.remove('ep4-masked');
    renderGlyph(l);
    l.el.classList.add('ep4-morph');
    l.el.addEventListener('animationend', function(){ l.el.classList.remove('ep4-morph'); }, { once: true });
    targetCount++;
    sfx('pop');
    burstAt(l, ROUNDS[roundIndex].target, ['#ffd23f', '#fff6cf', '#8fe3b0'], 7, 70);
  }

  function burstAt(l, text, colors, count, spread){
    var r = l.el.getBoundingClientRect();
    G.fx.burst(r.left + r.width / 2, r.top + 30, {
      text: text, count: count || 8, spread: spread || 90, size: 18,
      colors: colors || ['#ffd23f', '#fff6cf']
    });
  }

  function removeLetter(l){
    l.dead = true;
    var el = l.el;
    var idx = letters.indexOf(l);
    if (idx >= 0) letters.splice(idx, 1);
    c.wait(300).then(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, function(){});
  }

  function hitTarget(l){
    if (strike || transitioning || l.dead) return;
    hitsTotal++;
    progress++;
    streak++;
    c.bump('lettersCaught');
    if (hitsTotal === 1) c.achievement('polyglot');
    sfx('pop');
    sfx('correct');
    l.el.classList.add('ep4-hit');
    burstAt(l, ROUNDS[roundIndex].target, ['#ffd23f', '#fff6cf', '#8fe3b0'], 12, 140);
    targetCount = Math.max(0, targetCount - 1);
    removeLetter(l);
    spawnOneDecoy();
    promoteTarget();
    updateHud();
    if (progress >= HITS_PER_ROUND){
      runAsync(function(){ return roundComplete(); });
    }
  }

  function missLetter(l){
    if (strike || transitioning || c.done) return;
    misses++;
    streak = 0;
    c.bump('errors');
    strike = true;
    sfx('wrong');
    G.fx.shake(1.2, 380);
    G.fx.flash('rgba(255,90,95,.16)', 150);
    strikeSub.textContent = pickLine([
      'ТРЕБОВАНИЯ: место в ООН, один выходной.',
      'ТРЕБОВАНИЯ: перерыв. И ещё один перерыв.',
      'ТРЕБОВАНИЯ: уважение к глифам и личное дело.',
      'ТРЕБОВАНИЯ: проверить паспорт у всех.'
    ]);
    strikeEl.classList.remove('show');
    void strikeEl.offsetWidth;
    strikeEl.classList.add('show');
    if (l && !l.dead){ l.el.classList.add('ep4-accused'); }
    for (var i = 0; i < letters.length; i++) letters[i].el.classList.add('ep4-frozen');
    c.gag('letters_strike');
    c.say('system', 'ПРОФСОЮЗ «ՏԱՌ» ОБЪЯВЛЯЕТ ЗАБАСТОВКУ.', { ms: 1100 });
    if (misses === 3) c.say('tolya', 'Я не подписывался. Но подписал.', { mood: 'panic', ms: 1200 });
    c.wait(1250).then(function(){
      if (c.done) return;
      strike = false;
      strikeEl.classList.remove('show');
      for (var j = 0; j < letters.length; j++) letters[j].el.classList.remove('ep4-frozen', 'ep4-accused');
    }, function(){});
  }

  /* ---------- мини-гэги ---------- */
  function showPassport(){
    var cand = [];
    for (var i = 0; i < letters.length; i++){
      var l = letters[i];
      if (!l.dead && !l.labelBusy) cand.push(l);
    }
    if (!cand.length) return;
    var l = u.choice(cand);
    l.labelBusy = true;
    var name = PASSPORT_NAMES[l.display] || (l.display + 'ա');
    var lab = h.el('div', 'ep4-label', 'ПАСПОРТ: ' + name);
    l.el.appendChild(lab);
    c.gag('letters_passport');
    lab.addEventListener('animationend', function(){
      l.labelBusy = false;
      if (lab.parentNode) lab.parentNode.removeChild(lab);
    });
  }

  function showAccuse(){
    var cand = [];
    for (var i = 0; i < letters.length; i++){
      var l = letters[i];
      if (!l.dead && !l.labelBusy) cand.push(l);
    }
    if (!cand.length) return;
    var l = u.choice(cand);
    l.labelBusy = true;
    var lab = h.el('div', 'ep4-label ep4-accuse', pickLine(ACCUSE_LINES));
    l.el.appendChild(lab);
    c.gag('letters_accuse');
    lab.addEventListener('animationend', function(){
      l.labelBusy = false;
      if (lab.parentNode) lab.parentNode.removeChild(lab);
    });
  }

  function swapTwo(){
    if (letters.length < 2) return;
    var a = u.choice(letters), b = u.choice(letters);
    if (a === b){
      b = letters[(letters.indexOf(a) + 1) % letters.length];
    }
    if (!a || !b || a === b || a.dead || b.dead) return;
    var tx = a.x, ty = a.y;
    a.x = b.x; a.y = b.y;
    b.x = tx; b.y = ty;
    sfx('whoosh');
    burstAt(a, '↔', ['#7fe3ff'], 2, 40);
    burstAt(b, '↔', ['#7fe3ff'], 2, 40);
    c.gag('letters_swap');
  }

  function maskTarget(){
    var cand = [];
    for (var i = 0; i < letters.length; i++){
      var l = letters[i];
      if (l.isTarget && !l.dead && !l.masked) cand.push(l);
    }
    if (!cand.length) return;
    var l = u.choice(cand);
    l.masked = true;
    l.maskGlyph = u.choice(ROUNDS[roundIndex].decoys);
    l.maskUntil = u.now() + 0.85;
    l.el.classList.add('ep4-masked');
    renderGlyph(l);
    sfx('glitch');
    c.gag('letters_mask');
  }

  function unmask(l){
    l.masked = false;
    l.maskGlyph = '';
    l.el.classList.remove('ep4-masked');
    renderGlyph(l);
  }

  function relocate(l){
    var s = fieldSize();
    var wb = null;
    for (var k = 0; k < 30; k++){
      var x = u.rand(8, Math.max(9, s.W - LETTER_W - 8));
      var y = u.rand(36, Math.max(37, s.H - LETTER_H - 30));
      var ok = true;
      for (var i = 0; i < letters.length; i++){
        var o = letters[i];
        if (o === l || o.dead) continue;
        if (u.dist(x, y, o.x, o.y) < 78){ ok = false; break; }
      }
      if (ok){ l.x = x; l.y = y; return; }
    }
    l.x = u.rand(8, Math.max(9, s.W - LETTER_W - 8));
    l.y = u.rand(36, Math.max(37, s.H - LETTER_H - 30));
    void wb;
  }

  function teleportLetter(){
    var cand = [];
    for (var i = 0; i < letters.length; i++) if (!letters[i].dead) cand.push(letters[i]);
    if (!cand.length) return;
    var l = u.choice(cand);
    if (l.masked) unmask(l);
    l.el.classList.add('ep4-tele');
    sfx('whoosh');
    c.wait(150).then(function(){
      if (c.done || l.dead) return;
      relocate(l);
      l.el.style.transform = tr(l.x, l.y);
      l.el.classList.remove('ep4-tele');
      sfx('pop');
      burstAt(l, '✧', ['#7fe3ff', '#f2ecd9'], 5, 60);
    }, function(){});
    c.gag('letters_teleport');
  }

  /* ---------- баннеры и раунды ---------- */
  function showBanner(){
    banner.innerHTML = '';
    var round = ROUNDS[roundIndex];
    banner.appendChild(h.el('div', 'cap', 'РАУНД ' + (roundIndex + 1) + ' / 3'));
    banner.appendChild(h.el('div', 'glyph ep4-arm', round.target));
    banner.appendChild(h.el('div', 'sub', 'ИЩЕМ БУКВУ · 5 ШТУК'));
    banner.classList.remove('show');
    void banner.offsetWidth;
    banner.classList.add('show');
    var cleanup = function(){ banner.classList.remove('show'); };
    banner.addEventListener('animationend', cleanup, { once: true });
    sfx('chalk');
  }

  function applaud(){
    for (var i = 0; i < letters.length; i++){
      var l = letters[i];
      if (l.dead) continue;
      l.el.classList.add('ep4-clap');
      (function(node){ node.addEventListener('animationend', function(){ node.classList.remove('ep4-clap'); }, { once: true }); })(l.el);
    }
    c.gag('letters_applause');
    sfx('applause');
    toast('Пять из пяти. Буквы аплодируют. Иронично.');
  }

  async function roundComplete(){
    if (transitioning) return;
    transitioning = true;
    var clean = streak >= HITS_PER_ROUND;
    if (clean) applaud();
    sfx('sparkle');
    await sw(560);
    if (c.done) return;
    var okLines = (c.text && c.text.pools && c.text.pools.ep4 && c.text.pools.ep4.ok) || [];
    if (roundIndex >= ROUNDS.length - 1){
      await finale();
      return;
    }
    c.say('teacher', pickLine(okLines, 'Неплохо. Для урока.'), { mood: 'proud', ms: 1100 });
    roundIndex++;
    progress = 0;
    streak = 0;
    updateHud();
    hintEl.textContent = ROUNDS[roundIndex].hint;
    spawnLetters();
    showBanner();
    var esc = (c.text && c.text.pools && c.text.pools.ep4 && c.text.pools.ep4.esc) || [];
    var escLine = esc[roundIndex - 1];
    if (escLine) c.say('teacher', escLine, { mood: 'suspicious', ms: 1200 });
    await sw(1050);
    if (c.done) return;
    transitioning = false;
  }

  async function startRound(i){
    roundIndex = i;
    progress = 0;
    streak = 0;
    transitioning = true;
    updateHud();
    speed = ROUNDS[i].speed;
    hintEl.textContent = ROUNDS[i].hint;
    passportTimer = 0; accuseTimer = 0; swapTimer = 0; maskTimer = 0; teleTimer = 0;
    spawnLetters();
    showBanner();
    c.gag('letters_round_' + (i + 1));
    await sw(i === 0 ? 1000 : 900);
    if (c.done) return;
    transitioning = false;
  }

  /* ---------- апдейт ---------- */
  function update(dt, t){
    var s = fieldSize();
    var W = s.W, H = s.H;
    if (!W || !H) return;
    if (transitioning) return;

    if (!strike){
      passportTimer += dt;
      if (passportTimer > 3.4){ passportTimer = 0; showPassport(); }
      if (roundIndex >= 1){
        accuseTimer += dt;
        if (accuseTimer > 2.6){ accuseTimer = 0; showAccuse(); }
        swapTimer += dt;
        if (swapTimer > 3.3){ swapTimer = 0; swapTwo(); }
      }
      if (roundIndex === 2){
        maskTimer += dt;
        if (maskTimer > 2.8){ maskTimer = 0; maskTarget(); }
        teleTimer += dt;
        if (teleTimer > 2.2){ teleTimer = 0; teleportLetter(); }
      }
    }

    for (var i = 0; i < letters.length; i++){
      var l = letters[i];
      if (l.dead || l.el.classList.contains('ep4-tele')) continue;
      var bob = Math.sin(t * 5 + l.phase) * 2;
      if (strike){
        l.el.style.transform = tr(l.x, l.y + bob * 0.4);
        if (l.masked && t > l.maskUntil) unmask(l);
        continue;
      }
      if (l.masked && t > l.maskUntil) unmask(l);
      var ang = Math.atan2(l.vy, l.vx) + u.rand(-1, 1) * 1.2 * dt;
      var sp = speed * l.speedMul;
      l.vx = Math.cos(ang) * sp;
      l.vy = Math.sin(ang) * sp;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      if (l.x < 6){ l.x = 6; l.vx = Math.abs(l.vx); }
      if (l.x > W - LETTER_W - 6){ l.x = W - LETTER_W - 6; l.vx = -Math.abs(l.vx); }
      if (l.y < 36){ l.y = 36; l.vy = Math.abs(l.vy); }
      if (l.y > H - LETTER_H - 30){ l.y = H - LETTER_H - 30; l.vy = -Math.abs(l.vy); }
      l.el.style.transform = tr(l.x, l.y + bob);
    }

    // расталкивание, чтобы паспорта не слипались в один
    for (var a = 0; a < letters.length; a++){
      var A = letters[a];
      if (A.dead) continue;
      for (var b = a + 1; b < letters.length; b++){
        var B = letters[b];
        if (B.dead) continue;
        var dx = (A.x + LETTER_W / 2) - (B.x + LETTER_W / 2);
        var dy = (A.y + LETTER_H / 2) - (B.y + LETTER_H / 2);
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < 86){
          var push = (86 - d) / 2;
          var nx = dx / d, ny = dy / d;
          A.x += nx * push; A.y += ny * push;
          B.x -= nx * push; B.y -= ny * push;
          bounds(A, s); bounds(B, s);
          A.el.style.transform = tr(A.x, A.y);
          B.el.style.transform = tr(B.x, B.y);
        }
      }
    }
  }

  /* ---------- финал ---------- */
  async function finale(){
    transitioning = true;
    strike = false;
    strikeEl.classList.remove('show');
    sfx('paper');
    for (var i = 0; i < letters.length; i++){
      letters[i].el.classList.add('ep4-surrender');
    }
    await sw(500);
    if (c.done) return;
    // бумага
    faceFront.innerHTML = '';
    faceFront.appendChild(h.el('div', 'ep4-pcap', 'ПРОФСОЮЗ «ՏԱՌ» · БУМАГА'));
    faceFront.appendChild(h.el('div', 'ep4-ptext', 'АРТИКЛЬ ВИДЕЛИ У БУХГАЛТЕРИИ'));
    faceFront.appendChild(h.el('div', 'ep4-psub', 'Подпись: профсоюз. Печать: бухгалтерия.'));
    var stampText = 'ՀՈԴԸ ՏԵՂՈՒՄ Է';
    try { if (c.text && c.text.diploma && c.text.diploma.stamp) stampText = c.text.diploma.stamp; } catch(e){}
    faceFront.appendChild(h.el('div', 'ep4-pstamp', stampText));
    faceBack.innerHTML = '';
    faceBack.appendChild(h.el('div', 'ep4-backbig', 'И у вас.'));
    faceBack.appendChild(h.el('div', 'ep4-backsub', 'НА ОБОРОТЕ · ПРОВЕРЕНО'));
    paper.classList.add('show');
    c.gag('letters_confession');
    sfx('paper');
    await sw(900);
    if (c.done) return;
    paper.classList.add('flip');
    sfx('stamp');
    await sw(650);
    if (c.done) return;
    await c.say('teacher', 'Бухгалтерия. Конечно.', { mood: 'tired', ms: 1100 }).catch(function(){});
    if (c.done) return;
    c.say('system', 'ДЕЛО ПЕРЕДАНО В БУХГАЛТЕРИЮ.', { ms: 1500 });
    if (misses === 0){ c.gag('letters_perfect'); }
    await sw(1500);
    if (c.done) return;
    if (endResolve) endResolve();
  }

  /* ---------- старт ---------- */
  updateHud();
  try {
    c.mood('teacher', 'suspicious');
    c.say('teacher', 'Буквы видели артикль. Найди подозрительные.', { mood: 'suspicious', ms: 1500 });
    await sw(900);
    if (c.done) return;
    c.say('system', 'ПРОФСОЮЗ «ՏԱՌ»: НЕ ТРОГАЙТЕ ЧУЖИЕ ГЛИФЫ.', { ms: 1400 });
    await sw(1100);
    if (c.done) return;
    await startRound(0);
    if (c.done) return;
    c.raf(update);
    await endPromise;
  } catch(e){
    if (!(e && e.__skip)) console.error('[ep4]', e);
  }
};
})();
