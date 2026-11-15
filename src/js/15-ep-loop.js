/* ============================================================================
   15-ep-loop.js — Эп5 «МЫ ЭТО УЖЕ ПРОХОДИЛИ!»   (роль: dev-boss)
   ----------------------------------------------------------------------------
   Петля: вопрос «Как будет “дом”?» → карточки տուն / գիրք / հաց → большая
   кнопка «Я ТОЧНО ЗАПОМНИЛ» → очистка памяти, счётчик занятий 47→247→447,
   тот же вопрос, UI деградирует. В каждом витке мелькает призрак артикля.
   3 пойманных призрака ломают петлю. Нажатие большой кнопки = c.bump('loops').
   Без game over. Всё — через c.wait / c.raf / c.tap. c.auto — быстрый выход.
   ========================================================================= */
(function () {
  'use strict';
  var G = window.G = window.G || {};
  var u = G.u;

  /* ------------------------------------------------------------------ CSS */
  u.css([
    '.ep5-root{position:absolute;inset:0;overflow:hidden;display:flex;justify-content:center;font-family:var(--font-ui);background:radial-gradient(120% 100% at 50% 0%,#1b3b31 0%,#0b1d17 62%,#060f0c 100%)}',
    '.ep5-root::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(143,240,184,.035) 0 1px,transparent 1px 4px);opacity:.8}',
    '.ep5-col{position:relative;z-index:2;width:100%;max-width:620px;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;gap:7px;padding:8px 10px 10px}',
    '.ep5-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:0 0 auto}',
    '.ep5-title{font:900 clamp(11px,3vw,14px)/1.1 var(--font-ui);letter-spacing:.07em;color:var(--accent);text-shadow:0 2px 0 rgba(0,0,0,.45)}',
    '.ep5-counter{font:700 11px/1 var(--font-mono);color:#9df0b6;background:rgba(5,18,13,.78);border:1px solid rgba(157,240,182,.38);border-radius:6px;padding:5px 8px;white-space:nowrap}',
    '.ep5-counter b{color:#fff;font-size:14px;letter-spacing:.02em}',
    '.ep5-counter.bump{animation:ep5Bump .34s ease}',
    '@keyframes ep5Bump{0%{transform:scale(1)}45%{transform:scale(1.14)}100%{transform:scale(1)}}',
    '.ep5-question{position:relative;flex:0 0 auto;padding:8px 11px 9px;transform:rotate(-.5deg);overflow:hidden}',
    '.ep5-question .qlabel{font:800 8.5px/1 var(--font-ui);letter-spacing:.14em;color:#8a7c64;text-transform:uppercase;margin-bottom:3px}',
    '.ep5-question .qtext{font:900 clamp(15px,4.2vw,20px)/1.14 var(--font-ui);color:#1b1b1f}',
    '.ep5-question .qhint{margin-top:4px;font:700 9.5px/1.25 var(--font-ui);color:#6d6353}',
    '.ep5-arena{position:relative;flex:1 1 auto;min-height:110px;border-radius:12px;border:1px dashed rgba(157,179,170,.22);overflow:hidden;background:radial-gradient(80% 90% at 50% 45%,rgba(255,210,63,.07),transparent 68%)}',
    '.ep5-arena::before{content:"47";position:absolute;inset:0;display:grid;place-items:center;font:900 clamp(64px,20vw,104px)/1 var(--font-mono);color:rgba(242,236,217,.045);pointer-events:none}',
    '.ep5-arena-tag{position:absolute;right:7px;top:5px;font:700 8px/1.2 var(--font-mono);letter-spacing:.06em;color:rgba(157,240,182,.45);pointer-events:none}',
    '.ep5-cards{display:flex;gap:8px;flex:0 0 auto}',
    '.ep5-card{position:relative;flex:1 1 0;min-height:78px;padding:7px 5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:9px;border:3px solid var(--ink);background:var(--paper);color:var(--ink);box-shadow:0 4px 0 rgba(0,0,0,.42);cursor:pointer;touch-action:manipulation;appearance:none;-webkit-appearance:none;transition:transform .12s ease,box-shadow .12s ease}',
    '.ep5-card .g{font:900 clamp(20px,6.2vw,27px)/1 var(--font-arm);letter-spacing:.01em}',
    '.ep5-card .r{font:800 9.5px/1 var(--font-ui);color:#7a6f5c;letter-spacing:.08em;text-transform:uppercase}',
    '.ep5-card.correct{background:#d9f7c9;border-color:#2f6d2a;box-shadow:0 4px 0 #2f6d2a}',
    '.ep5-card.wrong{background:#ffe2e2;border-color:#a02a24;animation:ep5Wiggle .3s ease}',
    '.ep5-card.picked{transform:translateY(3px) scale(.97);box-shadow:0 1px 0 rgba(0,0,0,.42)}',
    '.ep5-cards.locked .ep5-card{pointer-events:none;filter:grayscale(.35);opacity:.82}',
    '.ep5-cards.degraded{transform:rotate(-.8deg) scale(.995)}',
    '@keyframes ep5Wiggle{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px) rotate(-2deg)}75%{transform:translateX(6px) rotate(2deg)}}',
    '.ep5-big{margin-top:2px;flex:0 0 auto;position:relative;display:none;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:64px;padding:8px 14px;border-radius:12px;border:3px solid var(--ink);background:linear-gradient(180deg,#ffe066,#ffc61a);color:#241a04;font:900 clamp(15px,4.4vw,19px)/1.05 var(--font-ui);letter-spacing:.03em;box-shadow:0 6px 0 var(--ink);cursor:pointer;touch-action:manipulation;appearance:none;-webkit-appearance:none}',
    '.ep5-big .sub{font:800 8.5px/1 var(--font-ui);letter-spacing:.16em;text-transform:uppercase;opacity:.6}',
    '.ep5-big.show{display:flex;animation:ep5BigIn .26s cubic-bezier(.2,1.5,.4,1),ep5BigPulse 1.55s ease-in-out .3s infinite}',
    '.ep5-big:active{transform:translateY(4px);box-shadow:0 2px 0 var(--ink)}',
    '.ep5-big.runaway{transition:transform .18s ease}',
    '.ep5-big.cracked{display:flex;animation:none;background:#c9c3b2;color:#6b6354;box-shadow:0 3px 0 var(--ink);pointer-events:none;filter:saturate(.4)}',
    '.ep5-big.pressed{animation:none;transform:translateY(5px) scale(.985);box-shadow:0 1px 0 var(--ink)}',
    '@keyframes ep5BigIn{from{transform:scale(.72) rotate(-3deg);opacity:0}to{transform:none;opacity:1}}',
    '@keyframes ep5BigPulse{0%,100%{box-shadow:0 6px 0 var(--ink),0 0 0 0 rgba(255,210,63,.55)}50%{box-shadow:0 6px 0 var(--ink),0 0 0 13px rgba(255,210,63,0)}}',
    '.ep5-del{position:absolute;z-index:4;left:8px;right:8px;bottom:16px;max-width:100%;font:600 8.5px/1.4 var(--font-mono);color:#ff9c9c;text-align:right;opacity:0;transition:opacity .3s;pointer-events:none}',
    '.ep5-del.show{opacity:.8}',
    '.ep5-ghost{position:absolute;width:78px;height:78px;z-index:9;cursor:pointer;touch-action:manipulation;filter:drop-shadow(0 0 13px rgba(255,214,63,.85));animation:ep5GhostIn .24s ease-out,ep5GhostFloat 1.5s ease-in-out .24s infinite;will-change:transform}',
    '.ep5-ghost canvas{width:100%;height:100%;display:block;opacity:.9}',
    '.ep5-ghost .tag{position:absolute;left:50%;bottom:-3px;transform:translateX(-50%);font:800 7px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:rgba(255,224,120,.85);white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.8)}',
    '@keyframes ep5GhostIn{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}',
    '@keyframes ep5GhostFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-9px) rotate(3deg)}}',
    '.ep5-copy{position:absolute;z-index:1;font:800 9.5px/1 var(--font-mono);color:rgba(255,210,63,.5);white-space:nowrap;pointer-events:none;animation:ep5CopyFloat 3.6s linear forwards;text-shadow:0 1px 0 rgba(0,0,0,.5)}',
    '@keyframes ep5CopyFloat{0%{opacity:0;transform:translateY(14px) rotate(-5deg)}18%{opacity:.9}100%{opacity:0;transform:translateY(-88px) rotate(6deg)}}',
    '.ep5-float{position:absolute;z-index:12;font:900 14px/1 var(--font-mono);color:var(--accent);pointer-events:none;text-shadow:0 2px 0 rgba(0,0,0,.5);animation:ep5FloatUp 1.1s ease-out forwards}',
    '@keyframes ep5FloatUp{0%{opacity:0;transform:translateY(6px) scale(.8)}18%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-52px) scale(1.04)}}',
    '.ep5-wipe{position:absolute;inset:0;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;text-align:center;background:rgba(3,10,7,.94);overflow:hidden}',
    '.ep5-wipe.show{display:flex;animation:ep5FadeIn .12s ease-out}',
    '@keyframes ep5FadeIn{from{opacity:0}to{opacity:1}}',
    '.ep5-wipe .wt{font:900 clamp(13px,3.6vw,17px)/1.1 var(--font-mono);letter-spacing:.16em;color:#8ff0b8}',
    '.ep5-wipe .lines{margin-top:4px;font:600 clamp(9px,2.6vw,11px)/1.65 var(--font-mono);color:#9db3aa;white-space:pre-wrap;text-align:left;min-height:88px}',
    '.ep5-wipe .lines .bad{color:#ff7b7b}',
    '.ep5-wipe .big{font:900 clamp(20px,6vw,30px)/1 var(--font-mono);color:var(--accent);min-height:30px;letter-spacing:.04em}',
    '.ep5-wipe .scan{position:absolute;left:0;right:0;height:18%;background:linear-gradient(180deg,transparent,rgba(143,240,184,.22),transparent);animation:ep5Scan .85s linear infinite;pointer-events:none}',
    '@keyframes ep5Scan{from{top:-22%}to{top:106%}}'
  ].join('\n'));

  /* -------------------------------------------------------------- данные */
  var CARDS = [
    { id: 'tun', glyph: 'տուն', ru: 'дом', correct: true },
    { id: 'girk', glyph: 'գիրք', ru: 'книга' },
    { id: 'hac', glyph: 'հաց', ru: 'хлеб' }
  ];
  var HINTS = [
    'Занятие № 1. Ответь. Потом нажми большую кнопку.',
    'Занятие № 2. Ответь. Потом нажми большую кнопку. Опять.',
    'Занятие № 247. Кнопка всё ещё хочет, чтобы её нажали.',
    'Занятие № 447. Вопрос уже не вопрос. Привычка.',
    'Занятие № ???. Нажми. Нам обоим станет легче.'
  ];
  var QUESTIONS = [
    'Как будет «дом»?',
    'Как будет «дом»? (мы это уже проходили)',
    'Как будет «дом»? (это занятие № 247)',
    'Как будет «дом»? (отвечать необязательно)',
    'Как будет «дом»? (просто нажми кнопку)'
  ];
  var OK_ANSWER_LINES = ['Отлично. Продолжим.', 'Да. Это было несложно.', 'Совпало. Идём дальше.'];
  var BAD_ANSWER_LINES = ['Нет. Но это уже неважно.', 'Мимо. Память всё равно сотрётся.', 'Не то. Почти неважно.'];
  var GHOST_LIFE = 3200;
  var GHOST_GAP = 620;
  var IDLE_MS = 13000;
  var WIPE_LINES = [
    '> очистка памяти .............',
    '> «дом» ...................... СТЁРТО',
    '> шнурки .................... СТЁРТО',
    '> имя кота .................. СТЁРТО',
    '> «այո» ..................... ОШИБКА 404'
  ];

  /* ------------------------------------------------------------ утилиты */
  function noop() {}
  function rand(a, b) { return (G.u && G.u.rand ? G.u.rand(a, b) : a + Math.random() * (b - a)); }
  function pick(arr) { return arr[Math.floor(rand(0, arr.length - 0.0001))] || arr[0]; }
  function sfx(c, name) { try { if (c.audio && c.audio.sfx) c.audio.sfx(name); } catch (e) {} }
  function say(c, who, text, opts) {
    try {
      var p = c.say(who, text, opts);
      if (p && p.catch) p.catch(noop);
    } catch (e) {}
  }
  function pool(c, ep, kind) {
    try {
      var p = c.text && c.text.pools && c.text.pools[ep];
      var list = p && p[kind];
      if (list && list.length) return pick(list);
    } catch (e) {}
    return '';
  }
  function fmtN(n) { return String(Math.round(n)); }

  /* ---------------------------------------------------------------- UI */
  function buildUI(c) {
    var h = c.h;
    var root = c.add(h.el('div', 'ep5-root'));
    var col = h.el('div', 'ep5-col');
    root.appendChild(col);

    var top = h.el('div', 'ep5-top');
    top.appendChild(h.el('div', 'ep5-title', 'МЫ ЭТО УЖЕ ПРОХОДИЛИ!'));
    var counter = h.el('div', 'ep5-counter');
    counter.appendChild(h.el('span', 'k', 'ЗАНЯТИЙ: '));
    var counterVal = h.el('b', null, '47');
    counter.appendChild(counterVal);
    top.appendChild(counter);
    col.appendChild(top);

    var question = h.el('div', 'ep5-question paper');
    question.appendChild(h.el('div', 'qlabel', 'вопрос'));
    var qtext = h.el('div', 'qtext', QUESTIONS[0]);
    question.appendChild(qtext);
    var qhint = h.el('div', 'qhint', HINTS[0]);
    question.appendChild(qhint);
    col.appendChild(question);

    var arena = h.el('div', 'ep5-arena');
    var arenaTag = h.el('div', 'ep5-arena-tag', 'ПАМЯТЬ: 0 БАЙТ · ЗАНЯТИЙ: 47');
    arena.appendChild(arenaTag);
    col.appendChild(arena);

    var cardsRow = h.el('div', 'ep5-cards');
    var cards = CARDS.map(function (d) {
      var b = h.el('button', 'ep5-card');
      b.type = 'button';
      b.appendChild(h.el('span', 'g', d.glyph));
      b.appendChild(h.el('span', 'r', d.ru));
      cardsRow.appendChild(b);
      return b;
    });
    col.appendChild(cardsRow);

    var big = h.el('button', 'ep5-big');
    big.type = 'button';
    big.appendChild(h.el('span', 't', 'Я ТОЧНО ЗАПОМНИЛ'));
    big.appendChild(h.el('span', 'sub', 'нажми, чтобы точно забыть'));
    col.appendChild(big);

    var del = h.el('div', 'ep5-del');
    arena.appendChild(del);

    var wipe = h.el('div', 'ep5-wipe');
    wipe.appendChild(h.el('div', 'wt', 'ОЧИСТКА ПАМЯТИ'));
    wipe.appendChild(h.el('div', 'scan'));
    var wLines = h.el('div', 'lines');
    wipe.appendChild(wLines);
    var wBig = h.el('div', 'big');
    wipe.appendChild(wBig);
    root.appendChild(wipe);

    return {
      root: root, col: col, counter: counter, counterVal: counterVal,
      problem: question, qtext: qtext, qhint: qhint, arena: arena, arenaTag: arenaTag,
      cardsRow: cardsRow, cards: cards, big: big, del: del,
      wipe: wipe, wLines: wLines, wBig: wBig, ghosts: []
    };
  }

  function updateHint(ui, S) {
    ui.qtext.textContent = QUESTIONS[Math.min(S.level, QUESTIONS.length - 1)];
    ui.qhint.textContent = HINTS[Math.min(S.level, HINTS.length - 1)];
    ui.arenaTag.textContent = 'ПАМЯТЬ: 0 БАЙТ · ЗАНЯТИЙ: ' + fmtN(S.total);
  }
  function setCardsEnabled(ui, on) {
    if (on) ui.cardsRow.classList.remove('locked');
    else ui.cardsRow.classList.add('locked');
    for (var i = 0; i < ui.cards.length; i++) { ui.cards[i].disabled = !on; }
  }
  function resetCards(ui) {
    for (var i = 0; i < ui.cards.length; i++) {
      ui.cards[i].classList.remove('correct', 'wrong', 'picked');
    }
  }
  function showBig(ui) {
    ui.big.classList.add('show');
    ui.big.classList.remove('cracked', 'pressed');
    ui.big.style.transform = '';
  }
  function hideBig(ui) { ui.big.classList.remove('show'); }
  function addDel(ui, text) {
    var line = u.el('div', null, text);
    ui.del.appendChild(line);
    while (ui.del.childNodes.length > 4) ui.del.removeChild(ui.del.firstChild);
    ui.del.classList.add('show');
  }
  function floatText(c, ui, text) {
    var el = c.h.el('div', 'ep5-float', text);
    el.style.left = (35 + rand(0, 30)) + '%';
    el.style.bottom = '14px';
    ui.arena.appendChild(el);
    el.addEventListener('animationend', function () { if (el.parentNode) el.parentNode.removeChild(el); });
  }
  function bumpCounter(ui) {
    ui.counter.classList.remove('bump');
    void ui.counter.offsetWidth;
    ui.counter.classList.add('bump');
  }

  /* ------------------------------------------------------------ призраки */
  var GHOST_SIZE = 78;

  function paintGhost(canvas, mood, t) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, GHOST_SIZE, GHOST_SIZE);
    var A = G.art;
    var done = false;
    if (A && typeof A.drawArticle === 'function') {
      try {
        A.drawArticle(ctx, { x: 4, y: 4, w: 70, h: 70 }, mood || 'idle', t || 0, { ghost: true });
        done = true;
      } catch (e) { done = false; }
    }
    if (!done) {
      ctx.fillStyle = 'rgba(255,210,63,.92)';
      ctx.beginPath();
      ctx.arc(39, 40, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b1b1f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 24px "Segoe UI","Noto Sans Armenian",sans-serif';
      ctx.fillText('Ը', 39, 42);
    }
    try {
      if (A && typeof A.drawArticle === 'function') ctx.globalAlpha = 1;
    } catch (e) {}
  }

  function spawnGhost(c, S, ui, onTap, pos) {
    var el = c.h.el('div', 'ep5-ghost');
    var px = pos && pos.x !== undefined ? pos.x : rand(5, 72);
    var py = pos && pos.y !== undefined ? pos.y : rand(4, 56);
    el.style.left = px + '%';
    el.style.top = py + '%';
    var canvas = document.createElement('canvas');
    canvas.width = GHOST_SIZE * 2;
    canvas.height = GHOST_SIZE * 2;
    canvas.style.width = GHOST_SIZE + 'px';
    canvas.style.height = GHOST_SIZE + 'px';
    el.appendChild(canvas);
    el.appendChild(c.h.el('span', 'tag', 'призрак артикля'));
    ui.arena.appendChild(el);
    var g = { el: el, canvas: canvas, t0: performance.now() / 1000, dead: false };
    ui.ghosts.push(g);
    paintGhost(canvas, 'idle', 0);
    sfx(c, 'sparkle');
    c.tap(el, function () {
      if (g.dead || S.busy || !S.bigActive) return;
      if (S.ghostCaughtThisPhase) return;
      if (typeof onTap === 'function') onTap(g);
    });
    return g;
  }

  function killGhost(c, ui, g, burst) {
    if (!g || g.dead) return;
    g.dead = true;
    var i = ui.ghosts.indexOf(g);
    if (i >= 0) ui.ghosts.splice(i, 1);
    if (burst) {
      try {
        var r = c.rect(g.el);
        c.fx.burst(r.left + r.width / 2, r.top + r.height / 2, {
          text: 'Ը', count: 14, spread: 120,
          colors: ['#ffd23f', '#fff3b0', '#8ff0b8']
        });
      } catch (e) {}
    }
    if (g.el.parentNode) g.el.parentNode.removeChild(g.el);
  }
  function killAllGhosts(c, ui) {
    ui.ghosts.slice().forEach(function (g) { killGhost(c, ui, g, false); });
  }

  /* -------------------------------------------------------------- виток */
  async function askAndAnswer(c, S, ui) {
    resetCards(ui);
    setCardsEnabled(ui, true);
    updateHint(ui, S);
    hideBig(ui);
    ui.cardsRow.classList.toggle('degraded', S.level >= 3);
    S.busy = false;
    S.answering = true;

    var answer = await new Promise(function (resolve, reject) {
      var done = false;
      var offs = [];
      function finish(card, auto) {
        if (done) return;
        done = true;
        S.answering = false;
        for (var i = 0; i < offs.length; i++) { try { offs[i](); } catch (e) {} }
        resolve({ card: card, auto: auto });
      }
      for (var i = 0; i < ui.cards.length; i++) {
        (function (idx) {
          offs.push(c.tap(ui.cards[idx], function () { finish(ui.cardsData ? ui.cardsData[idx] : CARDS[idx], false); }));
        })(i);
      }
      c.wait(9000).then(function () { if (!done) say(c, 'teacher', 'Ну?', { ms: 900 }); }, noop);
      c.wait(20000).then(function () {
        if (!done) {
          say(c, 'system', 'ПАМЯТЬ ОТВЕТИЛА ЗА ТЕБЯ. НЕ БЛАГОДАРИ.');
          finish(CARDS[0], true);
        }
      }, function (err) { reject(err); }).catch(noop);
    });

    setCardsEnabled(ui, false);
    var correct = !!(answer.card && answer.card.correct);
    var idx = CARDS.indexOf(answer.card);
    if (idx < 0) idx = 0;
    var cardEl = ui.cards[idx];
    cardEl.classList.add('picked');
    await c.wait(120);

    if (correct) {
      cardEl.classList.add('correct');
      sfx(c, 'correct');
      try {
        var r = c.rect(cardEl);
        c.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { text: '✔', count: 8, spread: 70, colors: ['#6fe08a', '#d9f7c9'] });
      } catch (e) {}
      say(c, 'teacher', pick(OK_ANSWER_LINES), { mood: 'calm', ms: 1000 });
    } else {
      cardEl.classList.add('wrong');
      c.bump('errors');
      sfx(c, 'wrong');
      c.fx.shake(0.8, 260);
      say(c, 'system', 'ПАМЯТЬ: НЕ НАЙДЕНО. УСТАНОВИТЬ?', { ms: 1300 });
      await c.wait(500);
      say(c, 'teacher', pick(BAD_ANSWER_LINES), { mood: 'tired', ms: 1100 });
    }
    await c.wait(correct ? 620 : 780);
  }

  async function pressBig(c, S, ui) {
    if (S.busy) return;
    S.busy = true;
    S.presses += 1;
    c.bump('loops');
    c.gag('loop_bigbutton');
    ui.big.classList.add('pressed');
    sfx(c, 'click');
    sfx(c, 'thud');
    floatText(c, ui, '+47');
    addDel(ui, 'нажал «я точно запомнил» ×' + S.presses);
    if (S.presses === 3) say(c, 'system', 'АРИФМЕТИКА УСТАЛА. ПЛЮС СОРОК СЕМЬ.', { ms: 1100 });
    if (S.presses === 5) {
      c.achievement('loop_veteran');
      say(c, 'teacher', 'Ты уже ветеран. Это не комплимент.', { mood: 'tired', ms: 1300 });
    }
    await c.wait(430);
    ui.big.classList.remove('pressed');
  }

  function catchGhost(c, S, ui, g) {
    if (!g || g.dead) return;
    killGhost(c, ui, g, true);
    S.catches += 1;
    c.bump('articlesSaved');
    c.gag('loop_ghost_' + S.catches);
    sfx(c, 'correct');
    sfx(c, 'sparkle');
    c.mood('teacher', 'suspicious');
    c.fx.stamp('ПРИЗРАК ' + S.catches + '/3');
    say(c, 'article', pool(c, 'ep5', 'ok') || 'Я здесь. Между повторами.', { mood: 'run', ms: 1400 });
    addDel(ui, 'призрак артикля найден (' + S.catches + '/3)');
    updateHint(ui, S);
    if (S.catches >= 3) {
      c.fx.flash('#ffffff', 200);
      sfx(c, 'glitch');
    }
  }

  async function temptPhase(c, S, ui) {
    S.bigActive = true;
    S.ghostCaughtThisPhase = false;
    S.busy = false;
    showBig(ui);
    updateHint(ui, S);

    var kind = await new Promise(function (resolve, reject) {
      var done = false;
      function finish(k) {
        if (done) return;
        done = true;
        S.bigActive = false;
        S.busy = true;
        ghostStop = true;
        try { offBig(); } catch (e) {}
        killAllGhosts(c, ui);
        hideBig(ui);
        resolve(k);
      }
      var offBig = c.tap(ui.big, function () {
        if (done || S.busy) return;
        pressBig(c, S, ui).then(function () { finish('press'); }, noop);
      });

      var ghostStop = false;
      (function queueGhost() {
        if (done || ghostStop || S.ghostCaughtThisPhase || S.catches >= 3) return;
        var g = spawnGhost(c, S, ui, function (gg) {
          if (done) return;
          if (S.ghostCaughtThisPhase) return;
          S.ghostCaughtThisPhase = true;
          catchGhost(c, S, ui, gg);
          if (S.catches >= 3) finish('break');
        });
        c.wait(GHOST_LIFE).then(function () {
          killGhost(c, ui, g, false);
          if (!done && !ghostStop && !S.ghostCaughtThisPhase && S.catches < 3) {
            c.wait(GHOST_GAP).then(queueGhost, noop);
          }
        }, noop);
      })();

      c.wait(IDLE_MS).then(function () {
        if (done || S.busy) return;
        say(c, 'teacher', 'Петля нажала сама.', { mood: 'cosmic', ms: 1200 });
        finish('idle');
      }, function (err) { reject(err); }).catch(noop);
    });
    return kind;
  }

  function rollCounter(c, ui, from, to, ms) {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      var stop = null;
      var finished = false;
      stop = c.raf(function () {
        var k = Math.min(1, (performance.now() - t0) / ms);
        var eased = 1 - Math.pow(1 - k, 3);
        ui.counterVal.textContent = fmtN(from + (to - from) * eased);
        if (k >= 1 && !finished) {
          finished = true;
          try { stop(); } catch (e) {}
          ui.counterVal.textContent = fmtN(to);
          bumpCounter(ui);
          resolve();
        }
      });
    });
  }

  function appendWipeLine(ui, text, bad) {
    var line = u.el('div', bad ? 'bad' : null, text);
    ui.wLines.appendChild(line);
  }

  function spawnCopies(c, S, ui, n) {
    var q = 'Как будет «дом»?';
    for (var i = 0; i < n; i++) {
      (function (k) {
        var el = c.h.el('div', 'ep5-copy', q);
        el.style.left = rand(2, 68) + '%';
        el.style.bottom = rand(0, 42) + '%';
        el.style.animationDelay = rand(0, 1.5).toFixed(2) + 's';
        ui.arena.appendChild(el);
        el.addEventListener('animationend', function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        });
      })(i);
    }
  }
  function clearCopies(ui) {
    var list = ui.arena.querySelectorAll('.ep5-copy');
    for (var i = 0; i < list.length; i++) {
      if (list[i].parentNode) list[i].parentNode.removeChild(list[i]);
    }
  }

  function installRunaway(c, S, ui) {
    if (S.runaway) return;
    S.runaway = true;
    ui.big.classList.add('runaway');
    var last = 0;
    u.on(ui.big, 'pointerover', function () {
      var now = Date.now();
      if (now - last < 900) return;
      last = now;
      ui.big.style.transform = 'translate(' + Math.round(rand(-26, 26)) + 'px,' + Math.round(rand(-16, 16)) + 'px)';
      sfx(c, 'whoosh');
    });
  }

  async function degradePhase(c, S, ui) {
    updateHint(ui, S);
    if (S.level === 1) {
      say(c, 'teacher', 'Занятие двести сорок седьмое. Это не ошибка.', { mood: 'tired', ms: 1500 });
      addDel(ui, 'стёрто: шнурки, имя кота, «այո»');
      ui.del.classList.add('show');
      await c.wait(1250);
    } else if (S.level === 2) {
      say(c, 'system', pool(c, 'ep5', 'esc') || 'ПАМЯТЬ ОЧИЩЕНА. ОСВОБОЖДЕНО: 0 БАЙТ.', { ms: 1500 });
      spawnCopies(c, S, ui, 10);
      await c.wait(600);
      var pickId = await c.fx.fakeWindow({
        title: 'ОЧИСТКА ПАМЯТИ',
        body: 'Память очищена.\nОсвобождено: 0 байт.\n\nВосстановить память?',
        buttons: [{ id: 'yes', label: 'ДА' }, { id: 'more', label: 'ДА, НО УВЕРЕННЕЕ', primary: true }],
        ms: 3800
      });
      say(c, 'system', pickId === 'more' ? 'ПАМЯТЬ ВОССТАНОВЛЕНА. НЕ ПОЛНОСТЬЮ. НЕ ТВОЯ.' : 'ДА. ЗАПИСАНО. ПОЧТИ.', { ms: 1500 });
      await c.wait(1000);
    } else if (S.level === 3) {
      say(c, 'teacher', 'Операционная система, где артикль?', { mood: 'cosmic', ms: 1500 });
      await c.wait(1100);
      say(c, 'system', 'НЕ НАЙДЕНО. УСТАНОВИТЬ? КНОПКА «ДА» УБЕЖАЛА. КНОПКА «НЕТ» ТОЖЕ.', { ms: 1900 });
      spawnCopies(c, S, ui, 18);
      installRunaway(c, S, ui);
      c.fx.glitch(260);
      await c.wait(1300);
    } else {
      say(c, 'system', '404 УРОК НЕ НАЙДЕН. УРОК НАЙДЕН.', { ms: 1500 });
      c.fx.glitch(420);
      spawnCopies(c, S, ui, 24);
      say(c, 'tolya', 'Я нажал один раз. Или сорок семь. Я уже не уверен.', { mood: 'panic', ms: 1500 });
      await c.wait(1400);
    }
  }

  async function wipePhase(c, S, ui) {
    S.busy = true;
    S.bigActive = false;
    killAllGhosts(c, ui);
    hideBig(ui);
    clearCopies(ui);
    S.runaway = false;
    ui.big.classList.remove('runaway');
    ui.big.style.transform = '';
    ui.wLines.textContent = '';
    ui.wBig.textContent = '';
    ui.wipe.classList.add('show');
    sfx(c, 'glitch');
    sfx(c, 'static');
    addDel(ui, 'занятие ' + fmtN(S.iter) + ' → очистка');
    for (var i = 0; i < WIPE_LINES.length; i++) {
      appendWipeLine(ui, WIPE_LINES[i], WIPE_LINES[i].indexOf('404') >= 0);
      await c.wait(125);
    }
    ui.wBig.textContent = '+47 ЗАНЯТИЙ';
    sfx(c, 'whoosh');
    await c.wait(260);
    var from = S.total;
    var to = S.total + 200;
    S.total = to;
    S.iter += 1;
    S.level = Math.min(4, S.level + 1);
    ui.wBig.textContent = '';
    await rollCounter(c, ui, from, to, 540);
    ui.wipe.classList.remove('show');
    c.fx.flash('#ffffff', 200);
    c.fx.glitch(320);
    sfx(c, 'whoosh');
    c.stage.board('ԴԱՍ № ' + fmtN(S.total));
    c.mood('teacher', S.level >= 3 ? 'cosmic' : 'tired');
    await c.wait(220);
    await degradePhase(c, S, ui);
    S.busy = false;
  }

  async function ending(c, S, ui) {
    S.busy = true;
    S.bigActive = false;
    killAllGhosts(c, ui);
    clearCopies(ui);
    hideBig(ui);
    ui.big.classList.add('cracked');
    ui.big.style.transform = 'translateY(12px) rotate(-2deg)';
    setCardsEnabled(ui, false);
    c.fx.glitch(620);
    c.fx.shake(1.2, 420);
    sfx(c, 'glitch');
    sfx(c, 'crash');
    c.mood('teacher', 'calm');
    c.stage.board('');
    addDel(ui, 'ПЕТЛЯ РАЗОМКНУТА');
    ui.counterVal.textContent = '...';
    await c.wait(900);
    say(c, 'teacher', 'Стоп.', { mood: 'calm', ms: 900 });
    await c.wait(500);
    try { c.fx.stamp('ПЕТЛЯ РАЗОМКНУТА'); } catch (e) {}
    await c.wait(450);
    say(c, 'teacher', 'Мы это уже проходили. Но не так.', { mood: 'cosmic', ms: 1600 });
    await c.wait(1200);
    S.total = 1;
    ui.counterVal.textContent = '1';
    updateHint(ui, S);
    c.stage.board('ԴԱՍ № 1');
    say(c, 'system', 'ПЕТЛЯ РАЗОМКНУТА. ЗАНЯТИЙ: 1. НАСТОЯЩЕЕ: ОДНО.', { ms: 1800 });
    await c.wait(1400);
    var finalGhost = spawnGhost(c, S, ui, null, { x: 42, y: 18 });
    try { c.fx.spotlight(900); } catch (e) {}
    say(c, 'article', 'Я здесь. Между повторами.', { mood: 'proud', ms: 1800 });
    await c.wait(1700);
    killGhost(c, ui, finalGhost, true);
    c.gag('loop_resolved');
    say(c, 'teacher', 'Отлично. Продолжим.', { mood: 'cosmic', ms: 1400 });
    await c.wait(1300);
    say(c, 'system', 'СЛЕДУЮЩИЙ УРОК: ФИНАЛЬНЫЙ ЭКЗАМЕН. ОБЪЯВЛЕН БЕЗ УЧАСТИЯ УЧИТЕЛЯ.', { ms: 1900 });
    await c.wait(1500);
  }

  /* ------------------------------------------------------------ сцена */
  G.scenes.loop = async function (c) {
    if (c.auto) {
      await c.wait(1200);
      c.bump('loops', 3);
      c.bump('articlesSaved', 1);
      c.gag('loop_auto');
      return;
    }

    var S = {
      iter: 1, total: 47, level: 0, presses: 0, catches: 0,
      busy: false, broken: false, answering: false, bigActive: false,
      ghostCaughtThisPhase: false, runaway: false
    };
    var ui = buildUI(c);
    ui.cardsData = CARDS;

    /* ghost idle-анимация — единый rAF на сцену */
    c.raf(function (dt, t) {
      for (var i = 0; i < ui.ghosts.length; i++) {
        var g = ui.ghosts[i];
        try { paintGhost(g.canvas, 'idle', t - g.t0); } catch (e) {}
      }
    });

    c.mood('teacher', 'tired');
    c.stage.board('ԴԱՍ № 47');
    updateHint(ui, S);
    setCardsEnabled(ui, false);

    /* ---- интро ---- */
    say(c, 'system', 'ЗАНЯТИЕ № 47. ВСЕГО ЗАНЯТИЙ: 47.', { ms: 1600 });
    await c.wait(700);
    await c.say('teacher', 'Мы это уже проходили.', { mood: 'tired', ms: 1300 });
    await c.wait(200);
    say(c, 'tolya', 'Когда?', { mood: 'neutral', ms: 800 });
    await c.wait(650);
    await c.say('teacher', 'Сейчас.', { mood: 'calm', ms: 800 });
    await c.wait(250);
    say(c, 'vika', 'Помню. Но не скажу.', { mood: 'smug', ms: 1100 });
    await c.wait(800);
    say(c, 'system', 'ПРОДОЛЖИМ.', { ms: 900 });
    await c.wait(450);

    /* ---- основной цикл ---- */
    while (!S.broken) {
      await askAndAnswer(c, S, ui);
      if (S.broken) break;
      var kind = await temptPhase(c, S, ui);
      if (kind === 'break' || S.catches >= 3) {
        S.broken = true;
        break;
      }
      await wipePhase(c, S, ui);
    }

    /* ---- финал ---- */
    await ending(c, S, ui);
  };
})();
