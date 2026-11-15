/* 12-ep-memory.js — Эп2 «Я ЖЕ ЗНАЛ ЭТО СЛОВО!» (dev-chase).
   Внутри памяти: полки, живые карточки, туман. Найди հաց, потом ջուր.
   Контракт сцены: docs/TECH.md §3. Зона dev-chase: только этот файл. */
(function(){
'use strict';
var G = window.G = window.G || {};
var u = G.u;

u.css([
'.ep2-layer{pointer-events:auto;overflow:hidden;font-family:var(--font-ui);color:#efe6ff;background:radial-gradient(115% 76% at 50% -6%,#4a2560 0%,#2b1440 40%,#150a22 70%,#08040e 100%)}',
'.ep2-wrap{position:absolute;inset:0;overflow:hidden}',
'.ep2-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(58% 32% at 50% 6%,rgba(255,214,255,.14),transparent 72%),radial-gradient(40% 26% at 16% 64%,rgba(150,110,255,.12),transparent 72%),radial-gradient(46% 30% at 86% 42%,rgba(255,140,220,.10),transparent 72%)}',
'.ep2-vign{position:absolute;inset:0;pointer-events:none;background:radial-gradient(72% 56% at 50% 46%,transparent 38%,rgba(4,0,10,.74) 100%)}',
'.ep2-fog{position:absolute;left:-25%;right:-25%;height:52%;bottom:-10%;pointer-events:none;filter:blur(18px);opacity:0;will-change:transform,opacity}',
'.ep2-fog.a{background:radial-gradient(60% 72% at 32% 74%,rgba(216,198,255,.55),transparent 72%)}',
'.ep2-fog.b{background:radial-gradient(70% 80% at 70% 82%,rgba(186,146,255,.46),transparent 74%)}',
'.ep2-top{position:absolute;left:12px;right:12px;top:8px;z-index:8;pointer-events:none}',
'.ep2-name{font:800 10px/1.2 var(--font-ui);letter-spacing:.2em;color:#c8b2ff;text-transform:uppercase;text-shadow:0 0 14px rgba(190,140,255,.7)}',
'.ep2-name b{display:block;margin-top:3px;font:800 8.5px/1.3 var(--font-ui);letter-spacing:.1em;color:#8e77b8}',
'.ep2-score{position:absolute;right:10px;top:57px;z-index:8;display:flex;flex-direction:row;align-items:center;gap:5px;pointer-events:none}',
'.ep2-chip{font:800 10px/1 var(--font-ui);letter-spacing:.08em;padding:5px 8px;border-radius:7px;border:2px solid rgba(198,170,255,.42);background:rgba(24,10,40,.72);color:#e9dcff;white-space:nowrap;transition:border-color .2s,box-shadow .2s,color .2s}',
'.ep2-chip.on{border-color:#6fe08a;color:#c6ffd6;box-shadow:0 0 16px rgba(111,224,138,.45)}',
'.ep2-field{position:absolute;left:0;right:0;top:100px;bottom:84px;z-index:5;transition:opacity .25s ease,filter .25s ease}',
'.ep2-field.sleep{opacity:.14;filter:blur(6px) saturate(.55)}',
'.ep2-field.frozen .ep2-card{filter:saturate(.35) brightness(.8)}',
'.ep2-plank{position:absolute;height:13px;border-radius:3px;background:linear-gradient(180deg,#7c5837,#3d2618 70%,#25150a);box-shadow:0 9px 18px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,214,170,.35);pointer-events:none}',
'.ep2-plank i{position:absolute;right:5px;top:-12px;font:800 8px/1 var(--font-ui);letter-spacing:.16em;color:rgba(235,220,255,.42);font-style:normal}',
'.ep2-card{position:absolute;left:0;top:0;pointer-events:auto;touch-action:manipulation;cursor:pointer;will-change:transform;perspective:640px;-webkit-tap-highlight-color:transparent}',
'.ep2-card .in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .3s cubic-bezier(.3,1.25,.5,1)}',
'.ep2-card.flip .in{transform:rotateY(180deg)}',
'.ep2-f{position:absolute;inset:0;border-radius:11px;border:3px solid #221436;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 5px 0 rgba(0,0,0,.5),0 12px 20px rgba(0,0,0,.4);overflow:hidden}',
'.ep2-f .w{font-family:var(--font-arm);font-weight:800;font-size:calc(var(--cw)*.235);line-height:1.02;letter-spacing:.01em}',
'.ep2-f .r{font-weight:700;font-size:calc(var(--cw)*.107);line-height:1.1;opacity:.5;letter-spacing:.02em}',
'.ep2-f.front{color:#22162e;background:linear-gradient(178deg,#fdf6e6,#efdfc0 78%,#e3cfab)}',
'.ep2-card.p2 .front{background:linear-gradient(178deg,#f5f1ff,#e6dcf8 78%,#d8c9f0)}',
'.ep2-card.p3 .front{background:linear-gradient(178deg,#fff2f2,#f7dfe6 78%,#eacdd8)}',
'.ep2-f.back{transform:rotateY(180deg);background:linear-gradient(178deg,#3d2358,#241338);border-color:#5f3d86;color:#b98dff;font:900 calc(var(--cw)*.34)/1 var(--font-arm);align-items:center;justify-content:center}',
'.ep2-card.angry .front{border-color:#ff5a5f;box-shadow:0 5px 0 #6a1b1f,0 0 24px rgba(255,90,95,.6)}',
'.ep2-goal{position:absolute;left:50%;top:43%;transform:translate(-50%,-50%) scale(.86);z-index:9;pointer-events:none;opacity:0;width:min(86vw,400px);text-align:center;transition:opacity .16s ease,transform .26s cubic-bezier(.2,1.5,.5,1)}',
'.ep2-goal.show{opacity:1;transform:translate(-50%,-50%) scale(1)}',
'.ep2-goal .k{font:800 9.5px/1 var(--font-ui);letter-spacing:.22em;color:#a48bd0;margin-bottom:9px}',
'.ep2-goal .card{background:var(--paper);color:#22162e;border:4px solid #221436;border-radius:14px;padding:14px 18px 12px;box-shadow:0 12px 0 rgba(0,0,0,.45),0 0 44px rgba(190,140,255,.4);transform:rotate(-1.2deg)}',
'.ep2-goal .w{font-family:var(--font-arm);font-weight:800;font-size:clamp(30px,8.6vw,54px);line-height:1}',
'.ep2-goal .r{font:700 clamp(12px,3.2vw,16px)/1.2 var(--font-ui);opacity:.55;margin-top:3px}',
'.ep2-goal .hint{font:800 9px/1.3 var(--font-ui);letter-spacing:.16em;color:#b9a3e6;margin-top:11px}',
'.ep2-caption{position:absolute;left:10px;right:10px;bottom:46px;z-index:8;text-align:center;pointer-events:none;padding:7px 10px;border-radius:10px;background:rgba(14,5,24,.66);border:1px solid rgba(190,160,255,.18);font:700 clamp(12px,2.9vw,15px)/1.3 var(--font-ui);color:#f2e9ff;opacity:0;transition:opacity .18s ease;min-height:18px}',
'.ep2-caption.show{opacity:1}',
'.ep2-tray{position:absolute;left:12px;right:44px;bottom:8px;display:flex;align-items:center;gap:6px;z-index:8;pointer-events:none;flex-wrap:wrap}',
'.ep2-tray .lbl{font:800 8.5px/1 var(--font-ui);letter-spacing:.16em;color:#9c86c5}',
'.ep2-tray .slot{min-width:54px;height:24px;padding:0 6px;border:2px dashed rgba(198,170,255,.35);border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:var(--font-arm);font-weight:800;font-size:13px;color:#cbb6ff}',
'.ep2-tray .slot.filled{border-style:solid;border-color:#6fe08a;background:rgba(20,60,36,.6);color:#c9ffd9}',
'.ep2-voice{position:absolute;left:50%;top:31%;transform:translate(-50%,-50%);z-index:10;width:min(90vw,540px);text-align:center;padding:14px 16px;border-radius:12px;background:rgba(8,2,16,.86);border:2px solid rgba(190,160,255,.5);opacity:0;transition:opacity .2s ease;pointer-events:none}',
'.ep2-voice.show{opacity:1}',
'.ep2-voice .who{font:800 9px/1 var(--font-ui);letter-spacing:.2em;color:#9c86c5;margin-bottom:9px}',
'.ep2-voice .txt{font:700 clamp(15px,4.1vw,22px)/1.25 var(--font-ui);color:#fff}',
'.ep2-voice .sys{font:700 clamp(11px,3vw,14px)/1.35 var(--font-mono);color:#8ff0b8;margin-top:9px}',
'.ep2-quip{position:absolute;z-index:12;max-width:min(70vw,280px);transform:translate(-50%,-100%) scale(.92);background:#fff8e8;color:#241729;border:3px solid #241729;border-radius:10px;padding:7px 10px;font:700 11px/1.25 var(--font-ui);box-shadow:0 4px 0 rgba(0,0,0,.45);opacity:0;transition:opacity .14s ease,transform .18s cubic-bezier(.2,1.5,.5,1);pointer-events:none}',
'.ep2-quip.show{opacity:1;transform:translate(-50%,-100%) scale(1)}',
'.ep2-p{position:absolute;font-family:var(--font-arm);font-weight:900;font-size:16px;line-height:1;pointer-events:none;text-shadow:0 2px 0 rgba(0,0,0,.5);will-change:transform,opacity}',
'.ep2-flash{position:absolute;inset:0;z-index:11;pointer-events:none;background:#fff;opacity:0}',
'.ep2-down{position:absolute;inset:0;z-index:13;pointer-events:none;background:#05010a;opacity:0;transition:opacity .55s ease}',
'@media (max-width:380px){.ep2-name{font-size:9px;letter-spacing:.14em}.ep2-name b{font-size:7.5px;letter-spacing:.07em}.ep2-score{top:52px;gap:4px}.ep2-chip{font-size:8.5px;padding:4px 6px;border-width:1.5px}.ep2-caption{font-size:11.5px;bottom:44px;padding:6px 8px}.ep2-tray .lbl{font-size:7.5px}.ep2-tray .slot{min-width:46px;height:22px;font-size:12px}.ep2-tray{right:36px}.ep2-goal .w{font-size:28px}.ep2-goal .hint{font-size:8px;letter-spacing:.1em}}'
].join('\n'));

/* --- армянский материал (проверено, docs/DESIGN.md §8) ------------------ */
var ROUNDS = [
  {
    word: 'հաց', ru: 'хлеб',
    decoys: [
      ['տուն', 'дом'], ['գիրք', 'книга'], ['կատու', 'кот'], ['տղա', 'мальчик'],
      ['դաս', 'урок'], ['սեղան', 'стол'], ['ծով', 'море'], ['սար', 'гора']
    ]
  },
  {
    word: 'ջուր', ru: 'вода',
    decoys: [
      ['տուն', 'дом'], ['այո', 'да'], ['վաղը', 'завтра'], ['մարդ', 'человек'],
      ['դպրոց', 'школа'], ['քաղաք', 'город'], ['լավ', 'хорошо'], ['շատ', 'много']
    ]
  }
];

var GLYPHS = 'ԸՆԲՊՓՁԾՑՋՃՉՐՌԱԵԻՈՒՏ';

G.scenes.memory = async function(c){
  /* --- debug auto-pass ------------------------------------------------ */
  if (c.auto){
    await c.wait(1200);
    c.bump('memoryFinds', 2);
    return;
  }

  var T = c.text || {};
  var POOL = (T.pools && T.pools.ep2) || { ok: [], bad: [], esc: [] };
  function pick(list, i){
    if (!list || !list.length) return '';
    var n = list.length;
    return String(list[((i % n) + n) % n]);
  }
  function sfx(name){ try { if (c.audio && c.audio.sfx) c.audio.sfx(name); } catch(e){} }

  var layer = c.layer;
  layer.className = 'scene-layer ep2-layer';
  layer.style.opacity = '0';
  layer.style.transition = 'opacity .35s ease';
  c.fullscreen(true);

  /* ---------------------------------------------------------------- DOM */
  var wrap = u.el('div', 'ep2-wrap');
  layer.appendChild(wrap);
  wrap.appendChild(u.el('div', 'ep2-bg'));
  wrap.appendChild(u.el('div', 'ep2-vign'));
  var fogA = u.el('div', 'ep2-fog a'); wrap.appendChild(fogA);
  var fogB = u.el('div', 'ep2-fog b'); wrap.appendChild(fogB);

  var top = u.el('div', 'ep2-top');
  var nameEl = u.el('div', 'ep2-name', 'ВНУТРИ ПАМЯТИ');
  nameEl.appendChild(u.el('b', null, 'ПОЛОК: МНОГО · СЛОВА ПРЯЧУТСЯ'));
  top.appendChild(nameEl);
  wrap.appendChild(top);

  var score = u.el('div', 'ep2-score');
  var chipFind = u.el('div', 'ep2-chip', 'НАЙДЕНО 0 / 2');
  var chipFog = u.el('div', 'ep2-chip', 'ТУМАН: 1');
  score.appendChild(chipFind); score.appendChild(chipFog);
  wrap.appendChild(score);

  var field = u.el('div', 'ep2-field');
  wrap.appendChild(field);

  var caption = u.el('div', 'ep2-caption');
  wrap.appendChild(caption);

  var tray = u.el('div', 'ep2-tray');
  tray.appendChild(u.el('span', 'lbl', 'НАЙДЕНО:'));
  var slot0 = u.el('div', 'slot', '?');
  var slot1 = u.el('div', 'slot', '?');
  tray.appendChild(slot0); tray.appendChild(slot1);
  wrap.appendChild(tray);

  var goal = u.el('div', 'ep2-goal');
  goal.appendChild(u.el('div', 'k', 'ЗАДАНИЕ ИЗВНЕ: НАЙДИ СЛОВО'));
  var goalCard = u.el('div', 'card');
  var goalW = u.el('div', 'w', '');
  var goalR = u.el('div', 'r', '');
  goalCard.appendChild(goalW); goalCard.appendChild(goalR);
  goal.appendChild(goalCard);
  goal.appendChild(u.el('div', 'hint', 'СМОТРИ · ЗАПОМИНАЙ · ОНО СПРЯЧЕТСЯ'));
  wrap.appendChild(goal);

  var voice = u.el('div', 'ep2-voice');
  var voiceWho = u.el('div', 'who', '');
  var voiceTxt = u.el('div', 'txt', '');
  var voiceSys = u.el('div', 'sys', '');
  voice.appendChild(voiceWho); voice.appendChild(voiceTxt); voice.appendChild(voiceSys);
  wrap.appendChild(voice);

  var flash = u.el('div', 'ep2-flash'); wrap.appendChild(flash);
  var down = u.el('div', 'ep2-down'); wrap.appendChild(down);

  var planks = [];
  for (var s = 0; s < 3; s++){
    var pl = u.el('div', 'ep2-plank');
    pl.appendChild(u.el('i', null, '0' + (s + 1)));
    field.appendChild(pl);
    planks.push(pl);
  }

  /* ------------------------------------------------------------- state */
  var cards = [], slots = [], target = null;
  var L = { W: 320, H: 480, cardW: 96, cardH: 76, gapX: 10, offX: 12, rowH: 150, startY: 0 };
  var tNow = 0, fog = 0, finds = 0, errors = 0;
  var roundIdx = 0, ready = false, ended = false;
  var nextHop = 0, nextFlip = 0, hopIv = 4.2, flipIv = 3.0, hintAt = 1e9;
  var pendingFind = null;
  var gagFog = false, gagShuffle = false, gagHop = false;
  var timers = [];

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

  function measure(){
    var r = field.getBoundingClientRect();
    var W = Math.max(220, Math.round(r.width));
    var H = Math.max(200, Math.round(r.height));
    var cols = 3, rows = 3;
    var padX = Math.max(12, W * 0.045);
    var gapX = Math.max(9, W * 0.035);
    var cardW = Math.min(172, (W - padX * 2 - gapX * (cols - 1)) / cols);
    var cardH = Math.max(52, Math.min(cardW * 1.18, H * 0.253));
    var gapY = Math.max(24, cardH * 0.32);
    var totalH = cardH * rows + gapY * (rows - 1);
    var startY = Math.max(0, (H - totalH) / 2);
    var gridW = cardW * cols + gapX * (cols - 1);
    var offX = (W - gridW) / 2;
    L = { W: W, H: H, cardW: cardW, cardH: cardH, gapX: gapX, offX: offX, rowH: cardH + gapY, startY: startY };
    slots = [];
    for (var rI = 0; rI < rows; rI++){
      for (var cI = 0; cI < cols; cI++){
        slots.push({
          x: offX + cI * (cardW + gapX) + cardW / 2,
          y: startY + rI * (cardH + gapY) + cardH / 2
        });
      }
    }
    for (var p = 0; p < planks.length; p++){
      planks[p].style.left = (offX - 10) + 'px';
      planks[p].style.width = (gridW + 20) + 'px';
      planks[p].style.top = (startY + p * (cardH + gapY) + cardH + 6) + 'px';
    }
    for (var i = 0; i < cards.length; i++){
      cards[i].el.style.width = cardW + 'px';
      cards[i].el.style.height = cardH + 'px';
      cards[i].el.style.setProperty('--cw', cardW + 'px');
    }
  }
  c.cleanup(u.on(window, 'resize', function(){ try { measure(); } catch(e){} }));

  /* ------------------------------------------------------------ helpers */
  function flashNow(color, ms){
    flash.style.transition = 'none';
    flash.style.background = color;
    flash.style.opacity = '1';
    requestAnimationFrame(function(){
      flash.style.transition = 'opacity ' + ((ms || 260) / 1000) + 's ease-out';
      flash.style.opacity = '0';
    });
  }
  function setCaption(text){
    if (!text) return;
    caption.textContent = text;
    caption.classList.add('show');
  }
  function updateFog(){
    chipFog.textContent = 'ТУМАН: ' + (1 + Math.round(fog * 4));
    if (fog >= 0.3 && !gagFog){ gagFog = true; c.gag('ep2_fog'); }
  }

  function burstAt(x, y, word){
    for (var i = 0; i < 10; i++){
      var g = (i === 0 && word) ? word : GLYPHS.charAt(u.randInt(0, GLYPHS.length - 1));
      var sp = u.el('i', 'ep2-p', g);
      sp.style.left = x + 'px';
      sp.style.top = y + 'px';
      sp.style.color = u.choice(['#ffd23f', '#ff8ad0', '#8ef0b0', '#c9a7ff', '#fff2c9']);
      sp.style.fontSize = (i === 0 ? 22 : u.randInt(13, 20)) + 'px';
      wrap.appendChild(sp);
      var dx = u.rand(-100, 100), dy = u.rand(-120, 60), rot = u.rand(-220, 220);
      if (sp.animate){
        var anim = sp.animate([
          { transform: 'translate(-50%,-50%) translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
          { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(.6)', opacity: 0 }
        ], { duration: u.randInt(520, 920), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        (function(node, a){ a.onfinish = function(){ if (node.parentNode) node.parentNode.removeChild(node); }; })(sp, anim);
      } else {
        (function(node){ later(760, function(){ if (node.parentNode) node.parentNode.removeChild(node); }); })(sp);
      }
    }
  }

  function quip(cd, text){
    var q = u.el('div', 'ep2-quip', text);
    q.style.left = Math.max(80, Math.min(L.W - 80, cd.cx)) + 'px';
    q.style.top = Math.max(58, cd.cy - L.cardH / 2 - 8) + 'px';
    field.appendChild(q);
    requestAnimationFrame(function(){ q.classList.add('show'); });
    later(1650, function(){
      q.classList.remove('show');
      later(220, function(){ if (q.parentNode) q.parentNode.removeChild(q); });
    });
  }

  /* -------------------------------------------------------------- cards */
  function makeCard(item, idx){
    var el = u.el('div', 'ep2-card p' + (1 + idx % 3));
    var inn = u.el('div', 'in');
    var front = u.el('div', 'ep2-f front');
    front.appendChild(u.el('div', 'w', item.w));
    front.appendChild(u.el('div', 'r', item.r));
    var back = u.el('div', 'ep2-f back', '?');
    inn.appendChild(front); inn.appendChild(back);
    el.appendChild(inn);
    el.style.width = L.cardW + 'px';
    el.style.height = L.cardH + 'px';
    el.style.setProperty('--cw', L.cardW + 'px');
    field.appendChild(el);
    var cd = {
      el: el, w: item.w, r: item.r, isTarget: !!item.t, slot: idx,
      cx: L.W / 2 + u.rand(-70, 70), cy: L.H * 0.46 + u.rand(-50, 50),
      ph: u.rand(0, 6.28), amp: u.rand(2.0, 4.4),
      state: 'idle', angryUntil: 0, foundT: 0, dead: false, off: null
    };
    cd.off = c.tap(el, function(){ onCardTap(cd); });
    return cd;
  }

  function clearCards(){
    for (var i = 0; i < cards.length; i++){
      var cd = cards[i];
      if (cd.off) { try { cd.off(); } catch(e){} }
      if (cd.el.parentNode) cd.el.parentNode.removeChild(cd.el);
    }
    cards = []; target = null;
  }

  function shuffleSlots(){
    var live = [];
    for (var i = 0; i < cards.length; i++){
      var cd = cards[i];
      if (cd.state !== 'found' && !cd.dead) live.push(cd);
    }
    var idxs = [];
    for (var j = 0; j < live.length; j++) idxs.push(live[j].slot);
    idxs = u.shuffle(idxs);
    for (var k = 0; k < live.length; k++) live[k].slot = idxs[k];
  }

  function hopTarget(){
    if (!target || ended || target.state !== 'idle') return;
    var others = [];
    for (var i = 0; i < cards.length; i++){
      var cd = cards[i];
      if (cd !== target && cd.state === 'idle' && !cd.dead) others.push(cd);
    }
    if (!others.length) return;
    var other = u.choice(others);
    var tmp = target.slot;
    target.slot = other.slot;
    other.slot = tmp;
    if (!gagHop){ gagHop = true; c.gag('ep2_target_hop'); }
    sfx('whoosh');
  }

  function flipSome(){
    var cand = [];
    for (var i = 0; i < cards.length; i++){
      var cd = cards[i];
      if (cd.state === 'idle' && !cd.isTarget && !cd.dead) cand.push(cd);
    }
    if (!cand.length) return;
    var n = u.randInt(1, 2);
    for (var j = 0; j < n; j++){
      (function(cdx){
        cdx.el.classList.add('flip');
        later(u.randInt(340, 620), function(){ cdx.el.classList.remove('flip'); });
      })(u.choice(cand));
    }
  }

  /* ---------------------------------------------------------- game logic */
  function onCardTap(cd){
    if (ended || !ready || !cd || cd.state !== 'idle') return;
    if (cd.isTarget) foundCard(cd);
    else missCard(cd);
  }

  function foundCard(cd){
    if (cd.state !== 'idle') return;
    cd.state = 'found';
    cd.foundT = tNow;
    cd.el.style.pointerEvents = 'none';
    finds++;
    c.bump('memoryFinds');
    sfx('correct');
    setCaption(pick(POOL.ok, finds - 1));
    var fr = cd.el.getBoundingClientRect();
    var lr = layer.getBoundingClientRect();
    burstAt(fr.left - lr.left + fr.width / 2, fr.top - lr.top + fr.height / 2, cd.w);
    flashNow('rgba(255,225,140,.5)', 260);
    chipFind.textContent = 'НАЙДЕНО ' + finds + ' / 2';
    chipFind.classList.add('on');
    later(760, function(){ chipFind.classList.remove('on'); });
    var slotEl = (finds === 1) ? slot0 : slot1;
    slotEl.textContent = cd.w;
    slotEl.classList.add('filled');
    if (pendingFind){
      var p = pendingFind;
      pendingFind = null;
      p('tap');
    }
  }

  function missCard(cd){
    cd.state = 'angry';
    cd.angryUntil = tNow + 0.55;
    errors++;
    c.bump('errors');
    quip(cd, pick(POOL.bad, errors - 1));
    fog = Math.min(1, fog + 0.16);
    updateFog();
    shuffleSlots();
    if (u.chance(0.55)) hopTarget();
    if (errors === 1) c.achievement('anki47');
    if (!gagShuffle){ gagShuffle = true; c.gag('ep2_shuffle'); }
    if (errors === 2 || errors === 4) setCaption(pick(POOL.esc, 0));
    sfx('wrong');
    c.fx.shake(0.85, 280);
    flashNow('rgba(255,70,80,.32)', 240);
    later(580, function(){ if (cd.state === 'angry') cd.state = 'idle'; });
  }

  /* -------------------------------------------------------------- render */
  var stopAnim = c.raf(function(dt){
    if (ended) return;
    tNow += dt;
    if (ready){
      if (tNow > nextHop){ hopTarget(); nextHop = tNow + hopIv; }
      if (tNow > nextFlip){ flipSome(); nextFlip = tNow + flipIv; }
    }
    for (var i = 0; i < cards.length; i++) renderCard(cards[i], dt);
    var fo = 0.16 + fog * 0.62;
    fogA.style.opacity = String(fo);
    fogB.style.opacity = String(fo * 0.85);
    fogA.style.transform = 'translate3d(' + (Math.sin(tNow * 0.23) * 4) + '%,' + (Math.sin(tNow * 0.17) * 8) + 'px,0)';
    fogB.style.transform = 'translate3d(' + (Math.cos(tNow * 0.19) * -5) + '%,' + (Math.cos(tNow * 0.21) * 6) + 'px,0)';
  });

  function renderCard(cd, dt){
    if (cd.dead) return;
    if (cd.state === 'found'){
      var p = (tNow - cd.foundT) / 0.62;
      if (p >= 1){
        cd.dead = true;
        if (cd.el.parentNode) cd.el.parentNode.removeChild(cd.el);
        return;
      }
      var sc = p < 0.35 ? 1 + 0.34 * Math.sin((p / 0.35) * Math.PI) : 1.34 - 0.95 * ((p - 0.35) / 0.65);
      var op = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
      cd.el.style.transform = 'translate3d(' + (cd.cx - L.cardW / 2) + 'px,' + (cd.cy - L.cardH / 2) + 'px,0) rotate(' + Math.sin(tNow * 20) * 6 + 'deg) scale(' + sc + ')';
      cd.el.style.opacity = String(Math.max(0, op));
      return;
    }
    var sl = slots[cd.slot] || { x: L.W / 2, y: L.H / 2 };
    var k = cd.isTarget ? 13 : 6.2;
    var f = Math.min(1, dt * k);
    cd.cx += (sl.x - cd.cx) * f;
    cd.cy += (sl.y - cd.cy) * f;
    var wx = Math.sin(tNow * 1.7 + cd.ph) * cd.amp;
    var wy = Math.cos(tNow * 1.35 + cd.ph) * cd.amp * 0.55;
    var tilt = Math.sin(tNow * 0.9 + cd.ph) * 2.4;
    var sc = 1;
    if (cd.isTarget && tNow > hintAt){
      sc = 1 + 0.04 * (0.5 + 0.5 * Math.sin(tNow * 4.4));
      wy -= 2 + Math.sin(tNow * 3) * 2;
    }
    if (cd.state === 'angry'){
      var rem = Math.max(0, cd.angryUntil - tNow) / 0.55;
      wx += Math.sin(tNow * 58) * 5 * rem;
      tilt += Math.sin(tNow * 47) * 6 * rem;
    }
    cd.el.style.transform = 'translate3d(' + (cd.cx + wx - L.cardW / 2) + 'px,' + (cd.cy + wy - L.cardH / 2) + 'px,0) rotate(' + tilt + 'deg) scale(' + sc + ')';
  }

  /* --------------------------------------------------------------- rounds */
  function startRound(idx){
    roundIdx = idx;
    clearCards();
    var R = ROUNDS[idx];
    var items = [{ w: R.word, r: R.ru, t: true }];
    for (var i = 0; i < R.decoys.length; i++){
      items.push({ w: R.decoys[i][0], r: R.decoys[i][1], t: false });
    }
    items = u.shuffle(items);
    for (var j = 0; j < items.length; j++){
      var cd = makeCard(items[j], j);
      cards.push(cd);
      if (items[j].t) target = cd;
    }
    chipFind.textContent = 'НАЙДЕНО ' + finds + ' / 2';
    field.classList.add('sleep');
    ready = false;
  }

  function waitFind(){
    return new Promise(function(resolve, reject){
      pendingFind = resolve;
      c.wait(40000).then(function(){
        if (pendingFind){
          var p = pendingFind;
          pendingFind = null;
          p('timeout');
        }
      }, function(err){
        pendingFind = null;
        reject(err);
      });
    });
  }

  async function showGoal(word, ru, ms){
    goalW.textContent = word;
    goalR.textContent = ru;
    goal.classList.add('show');
    flashNow('rgba(220,190,255,.34)', 320);
    sfx('riser');
    await c.wait(ms || 1400);
    goal.classList.remove('show');
    sfx('thud');
  }

  async function runRound(idx){
    startRound(idx);
    var R = ROUNDS[idx];
    await showGoal(R.word, R.ru, idx === 0 ? 1400 : 1150);
    field.classList.remove('sleep');
    ready = true;
    hintAt = tNow + 13;
    nextHop = tNow + (idx === 0 ? 3.8 : 2.6);
    nextFlip = tNow + 2.0;
    hopIv = idx === 0 ? 4.4 : 2.9;
    flipIv = idx === 0 ? 3.2 : 2.2;
    setCaption(idx === 0 ? pick(POOL.esc, 1) : pick(POOL.esc, 0));
    var how = await waitFind();
    ready = false;
    if (how === 'timeout' && target && target.state === 'idle'){
      setCaption('МОЗГ УСТАЛ И ОТДАЛ СЛОВО ДОБРОВОЛЬНО.');
      foundCard(target);
    }
    await c.wait(820);
  }

  async function finale(){
    ended = true;
    ready = false;
    try { stopAnim(); } catch(e){}
    field.classList.add('frozen');
    c.gag('ep2_brain_freeze');
    var tn = (T.teacherName || 'Ануш Валерьевна');
    voiceWho.textContent = tn.toUpperCase() + ' · ИЗВНЕ';
    voiceTxt.textContent = 'А как будет «дом»?';
    voiceSys.textContent = '';
    voice.classList.add('show');
    sfx('heartbeat');
    await c.wait(1050);
    var sysMem = '';
    var sysList = T.system || [];
    for (var i = 0; i < sysList.length; i++){
      if (String(sysList[i]).indexOf('ПАМЯТЬ') === 0){ sysMem = sysList[i]; break; }
    }
    voiceTxt.textContent = '...';
    voiceSys.textContent = sysMem || 'ПАМЯТЬ НЕ ОТВЕЧАЕТ.';
    sfx('static');
    c.fx.glitch(430);
    await c.wait(950);
    setCaption(pick(POOL.esc, 3) || pick(POOL.esc, 0));
    c.gag('ep2_third_question');
    await c.wait(750);
    voice.classList.remove('show');
    down.style.opacity = '1';
    flashNow('rgba(255,255,255,.85)', 440);
    c.fx.shake(1.2, 430);
    sfx('thud');
    await c.wait(760);
  }

  /* ---------------------------------------------------------------- run */
  try { c.stage.hide(); } catch(e){}
  measure();
  updateFog();
  requestAnimationFrame(function(){ layer.style.opacity = '1'; });
  var teacherName = (T.teacherName || 'Ануш Валерьевна');
  voiceWho.textContent = teacherName.toUpperCase() + ' · ИЗВНЕ';
  voiceTxt.textContent = 'Как будет «хлеб»?';
  voice.classList.add('show');
  await c.wait(1100);
  voice.classList.remove('show');
  setCaption('ПАМЯТЬ. ТУТ ПАХНЕТ ХЛЕБОМ. ЭТО ЛОВУШКА.');
  sfx('static');
  await c.wait(800);

  await runRound(0);
  fog = Math.min(1, fog + 0.12);
  updateFog();
  c.gag('ep2_reindex');
  setCaption('ПАМЯТЬ ПЕРЕСТРАИВАЕТ ПОЛКИ. БЕЗ ПРЕДУПРЕЖДЕНИЯ.');
  sfx('glitch');
  c.fx.glitch(380);
  c.fx.shake(0.6, 300);
  await c.wait(1000);
  setCaption(pick(POOL.esc, 2));
  await c.wait(700);

  await runRound(1);
  await finale();
};
})();
