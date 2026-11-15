/* ============================================================================
   16-ep-boss.js — Эп6 «ФИНАЛЬНЫЙ ЭКЗАМЕН»   (роль: dev-boss)
   ----------------------------------------------------------------------------
   Арена в зоне сцены (классная сцена остаётся сверху — учительница и ученики
   реагируют). Босс «ПЕДАГОГИЧЕСКИЙ ХАОС» = доска с лицом.
   Фазы:
     1 «Артиклевая буря»      — падающие слова + крепление артиклей Ը/Ն, 4 шт.
     2 «Мы это уже проходили» — позиции/подписи артиклей и кнопок меняются,
                                огромная фальшивая кнопка откатывает фазу,
                                фальшивое системное окно с паролем «տունը», 3 шт.
     3 «Последний артикль»    — погоня за артиклем в короне, 5 тапов, маскировки,
                                экран заливает ДЗ.
   Победа: слоу-мо, тишина 1.5 с (c.fx.silence), resolve. Без game over.
   Всё через c.wait/c.raf/c.tap/c.drag. c.auto — быстрый выход.
   ========================================================================= */
(function () {
  'use strict';
  var G = window.G = window.G || {};
  var u = G.u;

  /* ------------------------------------------------------------------ CSS */
  u.css([
    '.ep6-root{position:absolute;inset:0;overflow:hidden;font-family:var(--font-ui);background:#0a1411}',
    '.ep6-bg{position:absolute;inset:0;z-index:1;display:block}',
    '.ep6-hud{position:absolute;z-index:25;left:8px;right:8px;top:5px;display:flex;align-items:center;justify-content:space-between;gap:8px;pointer-events:none}',
    '.ep6-phase{font:900 clamp(8px,2.3vw,11px)/1.15 var(--font-ui);letter-spacing:.07em;color:#ffd23f;text-shadow:0 2px 0 rgba(0,0,0,.55);max-width:62%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ep6-saved{font:700 clamp(8px,2.3vw,10px)/1 var(--font-mono);letter-spacing:.03em;color:#8ff0b8;background:rgba(5,18,13,.72);border:1px solid rgba(143,240,184,.35);border-radius:6px;padding:4px 6px;white-space:nowrap}',
    '.ep6-bossline{position:absolute;z-index:3;left:50%;top:41%;transform:translateX(-50%);width:88%;max-width:620px;text-align:center;font:800 clamp(9px,2.7vw,12px)/1.35 var(--font-mono);letter-spacing:.06em;color:#ff9db0;text-shadow:0 2px 0 rgba(0,0,0,.75);pointer-events:none;min-height:16px;opacity:0;transition:opacity .18s}',
    '.ep6-bossline.show{opacity:1}',
    '.ep6-field{position:absolute;inset:0;z-index:12;pointer-events:none}',
    '.ep6-word{position:absolute;left:0;top:0;pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:96px;padding:7px 10px 6px;border-radius:10px;border:3px solid var(--ink);background:var(--paper);color:var(--ink);box-shadow:0 5px 0 rgba(0,0,0,.38);cursor:pointer;touch-action:manipulation;appearance:none;-webkit-appearance:none;will-change:transform;transition:opacity .25s}',
    '.ep6-word .w{font:900 clamp(17px,5.2vw,24px)/1 var(--font-arm);white-space:nowrap}',
    '.ep6-word .w i{font-style:normal;color:#b23a2a;text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:2px}',
    '.ep6-word .w em{font-style:normal;color:#2e7d4f}',
    '.ep6-word .r{font:800 9px/1 var(--font-ui);letter-spacing:.08em;color:#7a6f5c;text-transform:uppercase}',
    '.ep6-word.bad .w{animation:ep6WordBad .3s ease}',
    '@keyframes ep6WordBad{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px) rotate(-2deg)}70%{transform:translateX(6px) rotate(2deg)}}',
    '.ep6-word.ok{border-color:#2f6d2a;background:#d9f7c9}',
    '.ep6-word.fade{opacity:0}',
    '.ep6-tokens{position:absolute;inset:0;z-index:20;pointer-events:none}',
    '.ep6-token{position:absolute;bottom:8px;width:84px;height:96px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:1px;padding:0;background:transparent;border:0;cursor:pointer;touch-action:none;pointer-events:auto;appearance:none;-webkit-appearance:none;transition:left .34s cubic-bezier(.3,1.2,.5,1),transform .16s ease}',
    '.ep6-token canvas{width:74px;height:74px;display:block;filter:drop-shadow(0 4px 0 rgba(0,0,0,.4));transition:transform .16s ease}',
    '.ep6-token .hint{font:800 8px/1 var(--font-ui);letter-spacing:.08em;color:#9db3aa;text-shadow:0 1px 2px rgba(0,0,0,.8);white-space:nowrap}',
    '.ep6-token.armed canvas{transform:scale(1.16) translateY(-4px);filter:drop-shadow(0 0 12px rgba(255,210,63,.9))}',
    '.ep6-token.armed .hint{color:#ffd23f}',
    '.ep6-token.dim canvas{opacity:.6}',
    '.ep6-token.nudge canvas{animation:ep6Nudge .45s ease 2}',
    '@keyframes ep6Nudge{0%,100%{transform:translateY(0)}40%{transform:translateY(-9px) rotate(-4deg)}}',
    '.ep6-fakebtn{position:absolute;z-index:6;display:none;left:50%;top:62%;transform:translate(-50%,-50%);min-width:min(74vw,340px);min-height:58px;padding:9px 16px;border-radius:12px;border:3px solid var(--ink);background:linear-gradient(180deg,#ff9bb7,#ff5a80);color:#2a0710;font:900 clamp(13px,3.7vw,17px)/1.05 var(--font-ui);letter-spacing:.02em;box-shadow:0 6px 0 var(--ink);cursor:pointer;touch-action:manipulation;appearance:none;-webkit-appearance:none;transition:left .22s ease,top .22s ease,transform .16s ease;animation:ep6FakePulse 1.5s ease-in-out infinite}',
    '.ep6-fakebtn.show{display:flex;align-items:center;justify-content:center;text-align:center}',
    '.ep6-fakebtn:active{transform:translate(-50%,-50%) translateY(4px);box-shadow:0 2px 0 var(--ink)}',
    '.ep6-fakebtn.tired{filter:grayscale(.75);opacity:.6;animation:none}',
    '@keyframes ep6FakePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.14)}}',
    '.ep6-flood{position:absolute;inset:0;z-index:7;pointer-events:none;overflow:hidden}',
    '.ep6-hw{position:absolute;width:92px;min-height:40px;background:#f7efdf;color:#4a4336;border:1px solid #b6a070;border-radius:2px;padding:3px 4px;font:600 7px/1.18 var(--font-ui);overflow:hidden;box-shadow:0 2px 5px rgba(0,0,0,.3);pointer-events:none;opacity:0;transform:translateY(-26px) rotate(0);animation:ep6HwIn 1.15s cubic-bezier(.2,.65,.35,1) forwards}',
    '.ep6-hw.slow{animation-duration:3.2s}',
    '@keyframes ep6HwIn{0%{opacity:0;transform:translateY(-30px) rotate(0) scale(1.05)}100%{opacity:.97;transform:translateY(0) rotate(var(--rot,0deg)) scale(1)}}',
    '.ep6-chase{position:absolute;left:0;top:0;z-index:30;width:96px;height:96px;padding:0;background:transparent;border:0;cursor:pointer;touch-action:manipulation;appearance:none;-webkit-appearance:none;display:none;will-change:transform}',
    '.ep6-chase.show{display:block}',
    '.ep6-chase canvas{width:96px;height:96px;display:block;filter:drop-shadow(0 0 14px rgba(255,214,63,.85))}',
    '.ep6-chase .mask{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);font:900 8px/1 var(--font-ui);letter-spacing:.06em;color:#ffd23f;background:rgba(5,18,13,.8);border:1px solid rgba(255,210,63,.5);border-radius:5px;padding:3px 6px;white-space:nowrap;text-shadow:0 1px 2px #000}',
    '.ep6-chase.caught{animation:ep6Caught .5s ease forwards}',
    '@keyframes ep6Caught{0%{transform:scale(1)}60%{transform:scale(1.25)}100%{transform:scale(.7);opacity:0}}',
    '.ep6-shock{position:absolute;z-index:35;transform:translate(-50%,-50%);font:900 clamp(12px,3.6vw,18px)/1 var(--font-ui);letter-spacing:.02em;color:#ff5a5f;text-shadow:0 2px 0 #000;pointer-events:none;white-space:nowrap;animation:ep6Shock .6s ease-out forwards}',
    '@keyframes ep6Shock{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}30%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.6)}}',
    '.ep6-toasts{position:absolute;z-index:45;left:0;right:0;top:22%;display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none}',
    '.ep6-toast{font:800 9px/1.1 var(--font-mono);letter-spacing:.08em;color:#ffb4b4;background:rgba(46,8,10,.85);border:1px solid #ff8a8a;border-radius:5px;padding:4px 8px;animation:ep6Toast 1.8s ease-out forwards}',
    '@keyframes ep6Toast{0%{opacity:0;transform:translateY(6px)}15%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}',
    '.ep6-banner{position:absolute;z-index:50;left:0;right:0;top:44%;transform:translateY(-50%);display:none;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;background:rgba(3,10,7,.92);border-top:3px solid var(--ink);border-bottom:3px solid var(--ink);text-align:center;pointer-events:none}',
    '.ep6-banner.show{display:flex;animation:ep6BannerIn .28s cubic-bezier(.2,1.4,.4,1)}',
    '.ep6-banner .t{font:900 clamp(16px,5vw,28px)/1.05 var(--font-ui);letter-spacing:.03em;color:var(--chalk);text-shadow:0 3px 0 rgba(0,0,0,.6)}',
    '.ep6-banner .s{font:700 clamp(10px,2.9vw,13px)/1.3 var(--font-ui);color:#9db3aa}',
    '@keyframes ep6BannerIn{from{opacity:0;transform:translateY(-50%) scale(.94)}to{opacity:1;transform:translateY(-50%) scale(1)}}',
    '.ep6-hint{position:absolute;z-index:40;left:50%;bottom:118px;transform:translateX(-50%);max-width:88%;padding:6px 10px;border-radius:8px;background:rgba(6,18,14,.88);border:1px solid rgba(242,236,217,.35);font:700 clamp(9px,2.7vw,11px)/1.35 var(--font-ui);color:#dfe8d8;text-align:center;opacity:0;transition:opacity .25s;pointer-events:none}',
    '.ep6-hint.show{opacity:1}',
    '.ep6-pile{position:absolute;z-index:5;left:0;right:0;bottom:0;height:20px;pointer-events:none}',
    '.ep6-pile i{position:absolute;bottom:0;width:16px;height:8px;background:#f7efdf;border:1px solid #b6a070;border-radius:1px;opacity:.85}',
    '.ep6-pile b{position:absolute;right:8px;bottom:12px;font:700 8px/1 var(--font-mono);color:#d9c9a2;letter-spacing:.06em;opacity:.7}'
  ].join('\n'));

  /* --------------------------------------------------------------- данные */
  var WORDS_C = [
    { w: 'տուն', ru: 'дом' }, { w: 'գիրք', ru: 'книга' }, { w: 'հաց', ru: 'хлеб' },
    { w: 'ջուր', ru: 'вода' }, { w: 'քաղաք', ru: 'город' }, { w: 'դաս', ru: 'урок' },
    { w: 'սեղան', ru: 'стол' }, { w: 'փողոց', ru: 'улица' }, { w: 'դպրոց', ru: 'школа' },
    { w: 'խանութ', ru: 'магазин' }, { w: 'ծով', ru: 'море' }, { w: 'սար', ru: 'гора' },
    { w: 'մարդ', ru: 'человек' }, { w: 'գետ', ru: 'река' }
  ];
  var WORDS_V = [
    { w: 'կատու', ru: 'кот' }, { w: 'տղա', ru: 'мальчик' },
    { w: 'երեխա', ru: 'ребёнок' }, { w: 'ձի', ru: 'конь' }
  ];
  var NEED = { c: 'ը', v: 'ն' };
  var MASKS = ['ВИКА', 'ДОМАШНЕЕ ЗАДАНИЕ', 'ПРОТОКОЛ № 47', 'ПЕДАГОГИЧЕСКИЙ ХАОС'];
  var BOSS_LINES_IDLE = [
    'АРТИКЛЕВАЯ БУРЯ. ПРИКРЕПИ АРТИКЛИ. Я ПОДОЖДУ.',
    'СЛОВО БЕЗ АРТИКЛЯ — ЭТО ОБЛОЖКА.',
    'ВЫ УЧИЛИ. Я ЗАПОМНИЛ. ВСЁ.',
    'ГДЕ АРТИКЛЬ? ВОТ ОН. В КОРОНЕ.',
    'МЫ ЭТО УЖЕ ПРОХОДИЛИ. Я — ДА.',
    'ДОМАШНЕЕ ЗАДАНИЕ: СМОТРЕТЬ И НЕ МОРГАТЬ.'
  ];
  var TEACHER_LINES = {
    p1: ['Это было быстро.', 'Артикли возвращаются. Часть.', 'Неплохо. Для взрослых.'],
    p2: ['Мы это уже проходили.', 'Не нажимай большую кнопку. Нажми нормальную.', 'Кнопки здесь не главные.'],
    p3: ['Артикль в короне. Тот же, что сбежал с доски.', 'Держи его. Он ещё в короне.', 'Он не хаос. Он артикль.']
  };

  /* ------------------------------------------------------------- утилиты */
  function noop() {}
  function rand(a, b) { return G.u.rand(a, b); }
  function randInt(a, b) { return G.u.randInt(a, b); }
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
  function isVowelWord(w) {
    if (w.length >= 2 && w.slice(-2) === 'ու') return true;
    var last = w.slice(-1);
    return 'աեէըիո'.indexOf(last) >= 0;
  }
  function needFor(w) { return isVowelWord(w) ? NEED.v : NEED.c; }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ================================================================== UI */
  function buildUI(c) {
    var h = c.h;
    var root = c.add(h.el('div', 'ep6-root'));
    var canvas = document.createElement('canvas');
    canvas.className = 'ep6-bg';
    root.appendChild(canvas);
    var hud = h.el('div', 'ep6-hud');
    var phaseEl = h.el('span', 'ep6-phase', 'ФИНАЛЬНЫЙ ЭКЗАМЕН');
    var savedEl = h.el('span', 'ep6-saved', 'СПАСЕНО: 0');
    hud.appendChild(phaseEl); hud.appendChild(savedEl);
    root.appendChild(hud);
    var lineEl = h.el('div', 'ep6-bossline');
    root.appendChild(lineEl);
    var field = h.el('div', 'ep6-field');
    root.appendChild(field);
    var pile = h.el('div', 'ep6-pile');
    root.appendChild(pile);
    var flood = h.el('div', 'ep6-flood');
    root.appendChild(flood);
    var tokensWrap = h.el('div', 'ep6-tokens');
    root.appendChild(tokensWrap);
    var fake = h.el('button', 'ep6-fakebtn');
    fake.type = 'button';
    fake.textContent = 'МЫ ЭТО УЖЕ ПРОХОДИЛИ!';
    root.appendChild(fake);
    var hint = h.el('div', 'ep6-hint');
    root.appendChild(hint);
    var toasts = h.el('div', 'ep6-toasts');
    root.appendChild(toasts);
    var banner = h.el('div', 'ep6-banner');
    root.appendChild(banner);
    var chase = h.el('button', 'ep6-chase');
    chase.type = 'button';
    root.appendChild(chase);
    return {
      h: h, root: root, canvas: canvas, ctx: canvas.getContext('2d'),
      hud: hud, phaseEl: phaseEl, savedEl: savedEl, lineEl: lineEl,
      field: field, pile: pile, flood: flood, tokensWrap: tokensWrap,
      fake: fake, hint: hint, toasts: toasts, banner: banner, chase: chase,
      chaseCanvas: null, chaseMask: null, chaseCrown: null,
      words: [], tokens: [], W: 320, H: 480, dpr: 1, rootRect: null,
      storm: [], bossRect: null, bgGrad: null
    };
  }

  function measure(c, ui) {
    var r = c.rect(ui.root);
    ui.rootRect = r;
    ui.W = Math.max(240, Math.round(r.width));
    ui.H = Math.max(300, Math.round(r.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    ui.dpr = dpr;
    ui.canvas.width = Math.round(ui.W * dpr);
    ui.canvas.height = Math.round(ui.H * dpr);
    ui.canvas.style.width = ui.W + 'px';
    ui.canvas.style.height = ui.H + 'px';
    ui.lineEl.style.top = Math.round(ui.H * 0.385) + 'px';
    var g = ui.ctx.createLinearGradient(0, 0, 0, ui.H);
    g.addColorStop(0, '#251733');
    g.addColorStop(0.45, '#15211f');
    g.addColorStop(1, '#0a1411');
    ui.bgGrad = g;
    var glyphs = 'ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՈՒՓՔՕՖ';
    ui.storm = [];
    for (var i = 0; i < 18; i++) {
      ui.storm.push({
        g: glyphs.charAt(randInt(0, glyphs.length - 1)),
        x: rand(0.04, 0.96), y: rand(-0.1, 1.1),
        amp: rand(8, 34), sp: rand(0.3, 1.1), ph: rand(0, 6.28),
        size: rand(16, 46), rot: rand(-0.5, 0.5), speed: rand(6, 22)
      });
    }
  }

  function updateHud(ui, S) {
    ui.phaseEl.textContent = S.phaseTitle || 'ФИНАЛЬНЫЙ ЭКЗАМЕН';
    ui.savedEl.textContent = 'СПАСЕНО: ' + S.saved + (S.phase ? ' · ' + (S.phaseSaved || 0) + '/' + (S.goal || 4) : '');
  }

  function setBossLine(c, S, ui, text, ms) {
    ui.lineEl.textContent = text || '';
    if (text) ui.lineEl.classList.add('show');
    if (S._lineTimer) S._lineTimer = null;
    if (ms) {
      c.wait(ms).then(function () {
        if (ui.lineEl.textContent === text) ui.lineEl.classList.remove('show');
      }, noop);
    }
  }

  function toast(c, ui, text) {
    var el = c.h.el('div', 'ep6-toast', text);
    ui.toasts.appendChild(el);
    el.addEventListener('animationend', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    while (ui.toasts.childNodes.length > 3) ui.toasts.removeChild(ui.toasts.firstChild);
  }

  function shock(c, ui, x, y, text) {
    var el = c.h.el('div', 'ep6-shock', text);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    ui.root.appendChild(el);
    el.addEventListener('animationend', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function showHint(c, ui, text, ms) {
    ui.hint.textContent = text;
    ui.hint.classList.add('show');
    var token = text;
    c.wait(ms || 4200).then(function () {
      if (ui.hint.textContent === token) ui.hint.classList.remove('show');
    }, noop);
  }

  async function showBanner(c, ui, title, sub, ms) {
    ui.banner.innerHTML = '';
    ui.banner.appendChild(c.h.el('div', 't', title));
    if (sub) ui.banner.appendChild(c.h.el('div', 's', sub));
    ui.banner.classList.add('show');
    await c.wait(ms || 1400);
    ui.banner.classList.remove('show');
    await c.wait(200);
  }

  /* ============================================================ canvas-босс */
  function drawStorm(ctx, W, H, t, ui, dim) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < ui.storm.length; i++) {
      var s = ui.storm[i];
      var y = ((s.y * H + t * s.speed) % (H + 120)) - 60;
      var x = s.x * W + Math.sin(t * s.sp + s.ph) * s.amp;
      var a = (0.08 + 0.09 * Math.abs(Math.sin(t * s.sp * 0.7 + s.ph))) * (dim ? 0.5 : 1);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.rot + Math.sin(t * s.sp + s.ph) * 0.2);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#dfe8d8';
      ctx.font = '900 ' + Math.round(s.size) + 'px "Segoe UI","Noto Sans Armenian",sans-serif';
      ctx.fillText(s.g, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBoss(ctx, ui, t, S) {
    var W = ui.W, H = ui.H;
    var bw = Math.min(W * 0.68, 440);
    var bh = Math.min(H * 0.29, 190);
    var bx = (W - bw) / 2;
    var by = H * 0.045;
    ui.bossRect = { x: bx, y: by, w: bw, h: bh };
    var hurt = Math.max(0, S.bossHurt || 0);
    var dead = !!S.bossDead;
    var jx = hurt > 0 ? Math.sin(t * 70) * 5 * hurt : 0;
    var jy = hurt > 0 ? Math.cos(t * 64) * 3 * hurt : 0;
    ctx.save();
    ctx.translate(jx, jy);
    // рама
    ctx.fillStyle = '#3a2412';
    roundRect(ctx, bx - 9, by - 9, bw + 18, bh + 18, 10);
    ctx.fill();
    ctx.fillStyle = '#6b4426';
    roundRect(ctx, bx - 5, by - 5, bw + 10, bh + 10, 7);
    ctx.fill();
    ctx.strokeStyle = '#2b1a0c';
    ctx.lineWidth = 2;
    roundRect(ctx, bx - 5, by - 5, bw + 10, bh + 10, 7);
    ctx.stroke();
    // доска
    ctx.fillStyle = dead ? '#0e1b16' : '#15302a';
    roundRect(ctx, bx, by, bw, bh, 5);
    ctx.fill();
    // мелкий текст сверху
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(242,236,217,.55)';
    ctx.font = '800 ' + Math.round(bh * 0.075) + 'px "Segoe UI","Noto Sans Armenian",sans-serif';
    ctx.fillText('ПЕДАГОГИЧЕСКИЙ ХАОС', bx + bw / 2, by + bh * 0.12);
    // глаза
    var cx = bx + bw / 2;
    var ey = by + bh * 0.46;
    var exD = bw * 0.16;
    var er = Math.max(6, bw * 0.055);
    var lx = 0, ly = 0;
    if (S.pointer) {
      lx = Math.max(-1, Math.min(1, (S.pointer.x - cx) / (bw * 0.9)));
      ly = Math.max(-1, Math.min(1, (S.pointer.y - (by + bh * 0.6)) / (bh * 1.4)));
    }
    if (dead) {
      ctx.strokeStyle = '#f2ecd9';
      ctx.lineWidth = Math.max(2.5, er * 0.28);
      [-1, 1].forEach(function (sgn) {
        var ex = cx + sgn * exD;
        ctx.beginPath();
        ctx.moveTo(ex - er * 0.75, ey - er * 0.75);
        ctx.lineTo(ex + er * 0.75, ey + er * 0.75);
        ctx.moveTo(ex + er * 0.75, ey - er * 0.75);
        ctx.lineTo(ex - er * 0.75, ey + er * 0.75);
        ctx.stroke();
      });
    } else {
      [-1, 1].forEach(function (sgn) {
        var ex = cx + sgn * exD;
        ctx.fillStyle = '#f2ecd9';
        ctx.beginPath();
        ctx.arc(ex, ey, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b1b1f';
        var pr = er * 0.42;
        ctx.beginPath();
        ctx.arc(ex + lx * er * 0.42, ey + ly * er * 0.42, pr, 0, Math.PI * 2);
        ctx.fill();
      });
      // брови
      ctx.strokeStyle = '#f2ecd9';
      ctx.lineWidth = Math.max(2, er * 0.25);
      var browLift = S.phase === 3 ? er * 0.5 : 0;
      var browAngry = S.phase === 2 || S.phase === 3 ? er * 0.35 : 0;
      [-1, 1].forEach(function (sgn) {
        var ex = cx + sgn * exD;
        ctx.beginPath();
        ctx.moveTo(ex - er * 0.9, ey - er * 1.5 - browLift + browAngry * sgn * 0.2);
        ctx.lineTo(ex + er * 0.9, ey - er * 1.5 - browLift - browAngry * sgn * 0.35);
        ctx.stroke();
      });
      // рот
      ctx.strokeStyle = '#f2ecd9';
      ctx.lineWidth = Math.max(2, er * 0.22);
      var my = by + bh * 0.74;
      if (S.phase === 3) {
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.12, my);
        ctx.lineTo(cx - bw * 0.06, my + bh * 0.05);
        ctx.lineTo(cx, my);
        ctx.lineTo(cx + bw * 0.06, my + bh * 0.05);
        ctx.lineTo(cx + bw * 0.12, my);
        ctx.stroke();
      } else if (S.phase === 2) {
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.12, my);
        ctx.quadraticCurveTo(cx + bw * 0.02, my - bh * 0.06, cx + bw * 0.13, my - bh * 0.01);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.13, my - bh * 0.015);
        ctx.quadraticCurveTo(cx, my + bh * 0.09, cx + bw * 0.13, my - bh * 0.015);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.05, my + bh * 0.028);
        ctx.lineTo(cx + bw * 0.05, my + bh * 0.028);
        ctx.stroke();
      }
    }
    // трещины по количеству спасённых артиклей
    if (!dead) {
      var cracks = Math.min(6, Math.floor((S.saved || 0) / 2));
      ctx.strokeStyle = 'rgba(242,236,217,.35)';
      ctx.lineWidth = 1.2;
      for (var ci = 0; ci < cracks; ci++) {
        var cxp = bx + bw * (0.1 + ci * 0.14);
        var cyp = by + bh * (ci % 2 === 0 ? 0.08 : 0.02);
        ctx.beginPath();
        ctx.moveTo(cxp, cyp);
        ctx.lineTo(cxp + 10, cyp + bh * 0.12);
        ctx.lineTo(cxp - 4, cyp + bh * 0.2);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(242,236,217,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + bw * 0.12, by + bh * 0.05);
      ctx.lineTo(bx + bw * 0.38, by + bh * 0.36);
      ctx.lineTo(bx + bw * 0.28, by + bh * 0.62);
      ctx.lineTo(bx + bw * 0.52, by + bh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw * 0.88, by + bh * 0.1);
      ctx.lineTo(bx + bw * 0.66, by + bh * 0.42);
      ctx.lineTo(bx + bw * 0.78, by + bh * 0.72);
      ctx.lineTo(bx + bw * 0.6, by + bh);
      ctx.stroke();
    }
    // бумажки на раме
    for (var pi = 0; pi < 3 && !dead; pi++) {
      var px = bx + bw * (0.05 + pi * 0.4);
      ctx.save();
      ctx.translate(px, by + bh + 3);
      ctx.rotate(-0.2 + pi * 0.16);
      ctx.fillStyle = '#f7efdf';
      ctx.fillRect(-14, -5, 34, 20);
      ctx.strokeStyle = '#b6a070';
      ctx.lineWidth = 1;
      ctx.strokeRect(-14, -5, 34, 20);
      ctx.strokeStyle = '#a09a86';
      ctx.beginPath();
      ctx.moveTo(-9, 3); ctx.lineTo(14, 3);
      ctx.moveTo(-9, 8); ctx.lineTo(9, 8);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawLightning(ctx, ui, t, S) {
    if (!(S.lightning > 0)) return;
    var a = Math.min(1, S.lightning * 4) * 0.85;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,240,190,' + a + ')';
    ctx.lineWidth = 2;
    for (var b = 0; b < 2; b++) {
      var x = ui.W * (b === 0 ? 0.2 : 0.78);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      var y = 0;
      while (y < ui.H * 0.55) {
        y += rand(14, 34);
        x += rand(-16, 16);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintToken(tok, t) {
    var cv = tok.canvas;
    if (!cv) return;
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 74, 74);
    var A = G.art;
    if (A && typeof A.drawArticle === 'function') {
      try {
        A.drawArticle(ctx, { x: 3, y: 3, w: 68, h: 68 }, tok.armed ? 'proud' : 'idle', t, { glyph: tok.article });
        return;
      } catch (e) {}
    }
    ctx.fillStyle = tok.article === 'ը' ? '#ffd23f' : '#8fd8ff';
    ctx.beginPath();
    ctx.arc(37, 38, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1b1f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 30px "Segoe UI","Noto Sans Armenian",sans-serif';
    ctx.fillText(tok.article === 'ը' ? 'Ը' : 'Ն', 37, 40);
  }

  function paintChase(c, S, ui, t) {
    var cv = ui.chaseCanvas;
    if (!cv) return;
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 96, 96);
    var A = G.art;
    var mood = S.chaseHits >= 5 ? 'happy' : (S.chaseHits >= 3 ? 'evil' : 'run');
    var opts = { glyph: 'Ը' };
    if (!S.crownOff && S.chaseHits < 5) opts.crown = true;
    if (A && typeof A.drawArticle === 'function') {
      try { A.drawArticle(ctx, { x: 2, y: 2, w: 92, h: 92 }, mood, t, opts); return; } catch (e) {}
    }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(48, 48, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1b1f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 40px "Segoe UI","Noto Sans Armenian",sans-serif';
    ctx.fillText('Ը', 48, 50);
  }

  /* ================================================================ tick */
  function startTick(c, S, ui) {
    var last = performance.now();
    c.raf(function (dt, now) {
      dt = Math.min(0.06, dt);
      var slow = S.slow || 1;
      var sdt = dt * slow;
      S.visT = (S.visT || 0) + sdt;
      var t = S.visT;
      updateWords(c, S, ui, sdt);
      updateChase(c, S, ui, sdt);
      // таймеры эффектов
      if (S.lightning > 0) S.lightning = Math.max(0, S.lightning - dt);
      if (S.bossHurt > 0) S.bossHurt = Math.max(0, S.bossHurt - dt);
      S.nextLightning = (S.nextLightning === undefined ? rand(2.5, 5) : S.nextLightning) - dt;
      if (S.nextLightning <= 0) { S.lightning = 0.16; S.nextLightning = rand(3.5, 7); }
      // кадр
      var ctx = ui.ctx;
      if (!ctx) return;
      ctx.setTransform(ui.dpr, 0, 0, ui.dpr, 0, 0);
      ctx.clearRect(0, 0, ui.W, ui.H);
      ctx.fillStyle = ui.bgGrad || '#0a1411';
      ctx.fillRect(0, 0, ui.W, ui.H);
      drawStorm(ctx, ui.W, ui.H, t, ui, S.slow < 1);
      drawBoss(ctx, ui, t, S);
      drawLightning(ctx, ui, t, S);
      for (var i = 0; i < ui.tokens.length; i++) paintToken(ui.tokens[i], t);
      if (S.chase && ui.chaseCanvas) paintChase(c, S, ui, t);
    });
  }

  function updateWords(c, S, ui, dt) {
    if (S.paused || !S.active || S.done) return;
    S.spawnCd = (S.spawnCd || 0) - dt;
    if (S.spawnCd <= 0 && ui.words.length < (S.maxWords || 3)) {
      spawnWord(c, S, ui);
      S.spawnCd = rand(S.spawnMin || 0.9, S.spawnMax || 1.7);
    }
    var missY = ui.H - 104;
    for (var i = ui.words.length - 1; i >= 0; i--) {
      var w = ui.words[i];
      if (w.dead) continue;
      w.y += w.vy * dt;
      if (w.y > missY) {
        wordMiss(c, S, ui, w);
        continue;
      }
      w.el.style.transform = 'translate3d(' + w.x.toFixed(1) + 'px,' + w.y.toFixed(1) + 'px,0)';
    }
  }

  function updateChase(c, S, ui, dt) {
    if (!S.chase || S.chaseDone || S.paused || S.done) return;
    var ch = S.chase;
    if (!ch.ready) return;
    ch.x += ch.vx * dt;
    ch.y += ch.vy * dt;
    var minX = 6, maxX = ui.W - ch.w - 6;
    var minY = ui.H * 0.32, maxY = ui.H - ch.h - 120;
    if (ch.x < minX) { ch.x = minX; ch.vx = Math.abs(ch.vx); }
    if (ch.x > maxX) { ch.x = maxX; ch.vx = -Math.abs(ch.vx); }
    if (ch.y < minY) { ch.y = minY; ch.vy = Math.abs(ch.vy); }
    if (ch.y > maxY) { ch.y = maxY; ch.vy = -Math.abs(ch.vy); }
    // уворот от указателя
    if (S.pointer) {
      var cx = ch.x + ch.w / 2, cy = ch.y + ch.h / 2;
      var dx = cx - S.pointer.x, dy = cy - S.pointer.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 105 && S.visT - (ch.lastDodge || -9) > 0.7) {
        ch.lastDodge = S.visT;
        var ang = Math.atan2(dy, dx) + rand(-0.6, 0.6);
        var sp = Math.sqrt(ch.vx * ch.vx + ch.vy * ch.vy);
        ch.vx = Math.cos(ang) * sp;
        ch.vy = Math.sin(ang) * sp * 0.85;
      }
    }
    ch.el.style.transform = 'translate3d(' + ch.x.toFixed(1) + 'px,' + ch.y.toFixed(1) + 'px,0)';
  }

  /* ================================================================ слова */
  function spawnWord(c, S, ui) {
    if (S.paused || !S.active || S.done) return null;
    var useV = Math.random() < 0.34;
    var base = useV ? pick(WORDS_V) : pick(WORDS_C);
    var need = needFor(base.w);
    var w = { base: base.w, ru: base.ru, need: need, dead: false };
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'ep6-word';
    var last = base.w.slice(-1);
    el.innerHTML = '<span class="w">' + esc(base.w.slice(0, -1)) + '<i>' + esc(last) + '</i></span>' +
      '<span class="r">' + esc(S.phase === 2 && Math.random() < 0.22 ? 'мы это уже проходили' : base.ru) + '</span>';
    ui.field.appendChild(el);
    w.el = el;
    w.w = el.offsetWidth || 110;
    w.h = el.offsetHeight || 56;
    w.x = rand(6, Math.max(8, ui.W - w.w - 6));
    w.y = -w.h - rand(0, 60);
    w.vy = rand(S.vyMin || 46, S.vyMax || 66);
    el.style.transform = 'translate3d(' + w.x.toFixed(1) + 'px,' + w.y.toFixed(1) + 'px,0)';
    w.off = c.tap(el, function () {
      if (S.paused || S.busy || !S.active || S.done || w.dead) return;
      onWordTap(c, S, ui, w);
    });
    ui.words.push(w);
    return w;
  }

  function removeWord(c, S, ui, w) {
    if (!w || w.dead) return;
    w.dead = true;
    var i = ui.words.indexOf(w);
    if (i >= 0) ui.words.splice(i, 1);
    try { if (w.off) w.off(); } catch (e) {}
  }

  function clearWords(c, S, ui, fade) {
    var list = ui.words.slice();
    ui.words.length = 0;
    list.forEach(function (w) {
      w.dead = true;
      try { if (w.off) w.off(); } catch (e) {}
      if (!w.el) return;
      if (fade) {
        w.el.classList.add('fade');
        w.el.style.transform = w.el.style.transform + ' translateY(14px)';
        c.wait(320).then(function () {
          if (w.el.parentNode) w.el.parentNode.removeChild(w.el);
        }, noop);
      } else if (w.el.parentNode) {
        w.el.parentNode.removeChild(w.el);
      }
    });
  }

  function pushPile(c, ui) {
    var el = c.h.el('i');
    el.style.left = rand(2, 96) + '%';
    el.style.transform = 'rotate(' + rand(-24, 24).toFixed(0) + 'deg)';
    ui.pile.appendChild(el);
    while (ui.pile.querySelectorAll('i').length > 26) ui.pile.removeChild(ui.pile.querySelector('i'));
    if (!ui.pile.querySelector('b')) {
      var b = c.h.el('b', null, '');
      ui.pile.appendChild(b);
    }
    var b2 = ui.pile.querySelector('b');
    if (b2) b2.textContent = 'ПРОТОКОЛЫ: ' + ((G.state && G.state.stats.protocols) || 0);
  }

  function wordMiss(c, S, ui, w) {
    removeWord(c, S, ui, w);
    if (w.el && w.el.parentNode) w.el.parentNode.removeChild(w.el);
    S.missed = (S.missed || 0) + 1;
    c.bump('articlesLost');
    pushPile(c, ui);
    sfx(c, 'thud');
    if (S.missed % 3 === 0) {
      c.bump('protocols');
      c.gag('boss_papers');
      toast(c, ui, 'ПРОТОКОЛ № ' + (47 + S.missed));
      setBossLine(c, S, ui, 'ЕЩЁ ОДНО СЛОВО БЕЗ АРТИКЛЯ. Я СОБИРАЮ.', 1600);
    } else if (Math.random() < 0.5) {
      setBossLine(c, S, ui, pick(['СЛОВО ПАДАЕТ. АРТИКЛЬ НЕТ.', 'ЭТО БЫЛО СЛОВО. ТЕПЕРЬ ЭТО ДЗ.', 'ЛИСТ ДЗ ПРИНЯТ.']), 1400);
    }
  }

  function onWordTap(c, S, ui, w) {
    if (S.paused || S.busy || S.done || !S.active || w.dead) return;
    var tok = S.armed;
    if (!tok) {
      sfx(c, 'beep');
      ui.tokens.forEach(function (t) { t.el.classList.add('nudge'); });
      c.wait(950).then(function () { ui.tokens.forEach(function (t) { t.el.classList.remove('nudge'); }); }, noop);
      setBossLine(c, S, ui, 'СНАЧАЛА ВОЗЬМИ АРТИКЛЬ. ОН ВНИЗУ. Я ПОДОЖДУ.', 1500);
      return;
    }
    if (tok.article === w.need) attachSuccess(c, S, ui, w);
    else attachWrong(c, S, ui, w, tok);
  }

  function unarmTokens(S, ui) {
    S.armed = null;
    ui.tokens.forEach(function (t) {
      t.armed = false;
      t.el.classList.remove('armed');
      t.el.classList.remove('dim');
    });
  }

  function armToken(c, S, ui, tok) {
    if (S.paused || S.busy || S.done) return;
    if (S.armed === tok) { unarmTokens(S, ui); return; }
    unarmTokens(S, ui);
    S.armed = tok;
    tok.armed = true;
    tok.el.classList.add('armed');
    ui.tokens.forEach(function (t) { if (t !== tok) t.el.classList.add('dim'); });
    sfx(c, 'click');
    setBossLine(c, S, ui, tok.article === 'ը' ? 'ВЗЯЛ ԱՐՏԻԿԼ Ը. ПРИКРЕПИ К СЛОВУ.' : 'ВЗЯЛ АРТИКЛЬ Ն. ПРИКРЕПИ К СЛОВУ.', 1200);
  }

  function attachSuccess(c, S, ui, w) {
    removeWord(c, S, ui, w);
    w.el.classList.add('ok');
    var full = w.base + w.need;
    w.el.innerHTML = '<span class="w">' + esc(w.base) + '<em>' + esc(w.need) + '</em></span><span class="r">OK</span>';
    try {
      var r = c.rect(w.el);
      var rr = c.rect(ui.root);
      c.fx.burst(r.left + r.width / 2, r.top + r.height / 2, {
        text: w.need === 'ը' ? 'Ը' : 'Ն', count: 12, spread: 100,
        colors: ['#ffd23f', '#8ff0b8', '#fff3b0', '#f7efdf']
      });
    } catch (e) {}
    w.el.style.transition = 'transform .5s ease, opacity .5s ease';
    w.el.style.transform = 'translate3d(' + w.x.toFixed(1) + 'px,' + (w.y - 70).toFixed(1) + 'px,0) scale(1.08)';
    w.el.style.opacity = '0';
    (function (el) {
      var done = false;
      function kill() {
        if (done) return;
        done = true;
        if (el.parentNode) el.parentNode.removeChild(el);
      }
      el.addEventListener('transitionend', kill);
      c.wait(700).then(kill, noop);
    })(w.el);
    sfx(c, 'correct');
    sfx(c, 'pop');
    c.bump('bossHits');
    c.bump('articlesSaved');
    S.saved += 1;
    S.phaseSaved = (S.phaseSaved || 0) + 1;
    S.lastProgress = performance.now();
    S.bossHurt = 0.4;
    c.gag('boss_hit_' + Math.min(9, S.saved));
    if (S.saved === 2) say(c, 'teacher', 'Уже похоже на слово.', { mood: 'suspicious', ms: 1200 });
    if (S.saved === 6) say(c, 'vika', 'Я бы сделала быстрее. Но я не делаю.', { mood: 'smug', ms: 1300 });
    setBossLine(c, S, ui, pick(['ЗАКРЕПЛЕНО. ' + full + '.', 'АРТИКЛЬ ВЕРНУЛСЯ. Я ЗАПОМНЮ.', 'ХОРОШО. СЛЕДУЮЩЕЕ.']), 1400);
    unarmTokens(S, ui);
    updateHud(ui, S);
    if (S.phase === 2 && S.phaseSaved === 1 && !S.windowDone) { S.needWindow = true; S.paused = true; }
    if (S.phaseSaved >= (S.goal || 4)) S.phaseDone = true;
  }

  function attachWrong(c, S, ui, w, tok) {
    c.bump('errors');
    S.errors = (S.errors || 0) + 1;
    var rx, ry;
    try {
      var r = c.rect(w.el);
      var rr = c.rect(ui.root);
      rx = r.left - rr.left + r.width / 2;
      ry = r.top - rr.top + r.height / 2;
    } catch (e) { rx = ui.W / 2; ry = ui.H / 2; }
    shock(c, ui, rx, ry, 'ГДЕ АРТИКЛЬ?!');
    c.fx.shake(1.1, 340);
    c.fx.flash('#ff3b4a', 120);
    sfx(c, 'wrong');
    sfx(c, 'thud');
    w.el.classList.add('bad');
    w.el.addEventListener('animationend', function () { w.el.classList.remove('bad'); });
    S.bossHurt = 0.55;
    if (S.errors % 2 === 0) {
      c.bump('protocols');
      toast(c, ui, 'ПРОТОКОЛ № ' + (47 + S.errors));
    }
    if (S.errors % 2 === 1) {
      try { c.stage.scream(pick((c.text && c.text.screams) || ['ГДЕ АРТИКЛЬ?!'])); } catch (e) {}
    }
    setBossLine(c, S, ui, pool(c, 'ep6', 'bad') || 'ПРОМАХ. МНЕ НРАВИТСЯ.', 1600);
    unarmTokens(S, ui);
  }

  /* =============================================================== токены */
  function buildTokens(c, S, ui) {
    if (ui.tokens.length) return;
    ['ը', 'ն'].forEach(function (article, idx) {
      var el = c.h.el('button', 'ep6-token');
      el.type = 'button';
      el.setAttribute('data-article', article);
      var cv = document.createElement('canvas');
      cv.width = 148;
      cv.height = 148;
      el.appendChild(cv);
      var hint = c.h.el('span', 'hint', '');
      hint.textContent = idx === 0 ? 'ХВОСТ: СОГЛАСНЫЙ' : 'ХВОСТ: ГЛАСНЫЙ';
      el.appendChild(hint);
      ui.tokensWrap.appendChild(el);
      var tok = { article: article, el: el, canvas: cv, hint: hint, armed: false };
      ui.tokens.push(tok);
      var dragStart = null;
      c.drag(el, {
        onStart: function (p, ev) {
          if (S.paused || S.busy || S.done) return;
          dragStart = { x: p.x, y: p.y };
          armToken(c, S, ui, tok);
          el.style.zIndex = '22';
        },
        onMove: function (p) {
          if (!dragStart) return;
          var dx = p.x - dragStart.x, dy = p.y - dragStart.y;
          el.style.transform = 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px)';
        },
        onEnd: function (p) {
          if (!dragStart) return;
          var dx = p.x - dragStart.x, dy = p.y - dragStart.y;
          el.style.transform = '';
          el.style.zIndex = '';
          dragStart = null;
          if (Math.sqrt(dx * dx + dy * dy) > 14) {
            tryAttachAtPoint(c, S, ui, p);
          }
        },
        onCancel: function () {
          el.style.transform = '';
          el.style.zIndex = '';
          dragStart = null;
        }
      });
    });
    placeTokens(ui, false);
  }

  function placeTokens(ui, swapped) {
    var pad = 10;
    var tw = 84;
    var leftA = pad;
    var leftB = Math.max(pad, ui.W - pad - tw);
    if (swapped) { var tmp = leftA; leftA = leftB; leftB = tmp; }
    if (ui.tokens[0]) ui.tokens[0].el.style.left = leftA + 'px';
    if (ui.tokens[1]) ui.tokens[1].el.style.left = leftB + 'px';
  }

  function tryAttachAtPoint(c, S, ui, p) {
    var point = { x: p.x, y: p.y };
    for (var i = 0; i < ui.words.length; i++) {
      var w = ui.words[i];
      if (!w.dead && u.inRect(point, c.rect(w.el))) {
        onWordTap(c, S, ui, w);
        return true;
      }
    }
    return false;
  }

  function shuffleTokens(c, S, ui) {
    if (!ui.tokens.length) return;
    S.tokenSwap = !S.tokenSwap;
    placeTokens(ui, S.tokenSwap);
    // «надписи меняются» — подсказки путаются (глиф на самом артикле не врёт)
    var hints = ['ХВОСТ: СОГЛАСНЫЙ', 'ХВОСТ: ГЛАСНЫЙ'];
    if (Math.random() < 0.5) hints.reverse();
    ui.tokens[0].hint.textContent = hints[0];
    ui.tokens[1].hint.textContent = hints[1];
    sfx(c, 'whoosh');
  }

  /* ================================================================ фазы */
  async function intro(c, S, ui) {
    S.phaseTitle = 'ФИНАЛЬНЫЙ ЭКЗАМЕН';
    updateHud(ui, S);
    c.mood('teacher', 'cosmic');
    c.mood('tolya', 'scared');
    c.mood('vika', 'smug');
    c.mood('gosha', 'hide');
    c.stage.board('ՔՆՆՈՒԹՅՈՒՆ');
    sfx(c, 'airhorn');
    c.fx.flash('#ffffff', 220);
    c.fx.shake(1.4, 500);
    setBossLine(c, S, ui, 'ПЕДАГОГИЧЕСКИЙ ХАОС. ПРЕПОДАЮ С 1974 ГОДА. УРОКОВ НЕ ТЕРЯЮ.', 3000);
    say(c, 'system', 'ПОПЫТКА 1 ИЗ 1. ОТМЕНЫ НЕТ. ДОМАШНЕЕ ЗАДАНИЕ ПРИЛАГАЕТСЯ.', { ms: 2200 });
    await c.wait(1200);
    await c.say('teacher', 'Я ничего не объявляла.', { mood: 'suspicious', ms: 1400 });
    await c.wait(300);
    // босс «выезжает»: подсказка уже видна на канвасе
    await c.wait(900);
    await c.say('teacher', 'Отлично. Продолжим.', { mood: 'cosmic', ms: 1400 });
    await c.wait(500);
  }

  async function phase1(c, S, ui) {
    S.phase = 1;
    S.phaseTitle = 'ФАЗА 1 · БУРЯ АРТИКЛЕЙ';
    S.active = false;
    S.paused = false;
    S.phaseDone = false;
    S.phaseSaved = 0;
    S.goal = 4;
    S.maxWords = 3;
    S.vyMin = 44; S.vyMax = 64;
    S.spawnMin = 1.0; S.spawnMax = 1.8;
    S.spawnCd = 0.3;
    S.saved = S.saved || 0;
    buildTokens(c, S, ui);
    ui.fake.classList.remove('show');
    updateHud(ui, S);
    await showBanner(c, ui, 'ФАЗА 1 · АРТИКЛЕВАЯ БУРЯ', 'Слова падают. Артикли ը и ն — внизу.', 1600);
    showHint(c, ui, 'ВОЗЬМИ АРТИКЛЬ ВНИЗУ → ТАПНИ СЛОВО. ХВОСТ СЛОВА ПОДСКАЖЕТ.', 5000);
    setBossLine(c, S, ui, 'АРТИКЛЕВАЯ БУРЯ. ПРИКРЕПИ 4 АРТИКЛЯ. Я ПОСМОТРЮ.', 2200);
    c.say('tolya', 'Парты уехали. Я тоже хочу.', { mood: 'scared', ms: 1300 });
    c.fx.flash('#ffffff', 120);
    S.active = true;
    S.spawnCd = 0.25;
    await c.wait(400);
    await waitPhase(c, S, ui, 1);
    S.active = false;
    clearWords(c, S, ui, true);
    ui.hint.classList.remove('show');
    setBossLine(c, S, ui, 'БУРЯ СТИХЛА. ВРЕМЕННО.', 1600);
    c.gag('boss_phase1');
    await c.wait(500);
    say(c, 'teacher', pick(TEACHER_LINES.p1), { mood: 'calm', ms: 1300 });
    c.mood('teacher', 'suspicious');
    await c.wait(900);
  }

  async function phase2(c, S, ui) {
    S.phase = 2;
    S.phaseTitle = 'ФАЗА 2 · «МЫ ЭТО ПРОХОДИЛИ»';
    S.active = false;
    S.paused = false;
    S.phaseDone = false;
    S.phaseSaved = 0;
    S.goal = 3;
    S.maxWords = 3;
    S.vyMin = 54; S.vyMax = 78;
    S.spawnMin = 0.8; S.spawnMax = 1.5;
    S.spawnCd = 0.3;
    S.rollbacks = 0;
    S.windowDone = false;
    S.needWindow = false;
    S.tokenSwap = false;
    S.fakeMoves = 0;
    S.bossHurt = 0;
    placeTokens(ui, false);
    updateHud(ui, S);
    ui.fake.classList.remove('tired');
    ui.fake.disabled = false;
    ui.fake.textContent = 'МЫ ЭТО УЖЕ ПРОХОДИЛИ!';
    ui.fake.classList.add('show');
    moveFake(c, S, ui, true);
    S.nextShuffle = performance.now() + 2600;
    S.nextFakeMove = performance.now() + 2400;
    c.gag('boss_phase2');
    await showBanner(c, ui, 'ФАЗА 2 · МЫ ЭТО УЖЕ ПРОХОДИЛИ', 'Позиции и надписи меняются. Большая кнопка — ловушка.', 1700);
    showHint(c, ui, 'НУЖНО 3 АРТИКЛЯ. НЕ НАЖИМАЙ ОГРОМНУЮ КНОПКУ. ОНА ОТКАТЫВАЕТ ФАЗУ.', 5000);
    setBossLine(c, S, ui, 'МЫ ЭТО УЖЕ ПРОХОДИЛИ. ПОЗИЦИИ ПОМЕНЯЛИСЬ. КАК ВСЕГДА.', 2200);
    c.say('vika', 'Я это уже проходила. Дважды.', { mood: 'smug', ms: 1300 });
    S.active = true;
    S.spawnCd = 0.25;
    await c.wait(400);
    await waitPhase(c, S, ui, 2);
    S.active = false;
    clearWords(c, S, ui, true);
    ui.fake.classList.remove('show');
    ui.hint.classList.remove('show');
    c.gag('boss_phase2_done');
    if (S.errors === 0) c.achievement('too_perfect');
    setBossLine(c, S, ui, 'ФАЗА ПРОЙДЕНА. «МЫ ЭТО УЖЕ ПРОХОДИЛИ» ОТКЛЮЧЕНО.', 1900);
    c.fx.confetti();
    await c.wait(600);
    say(c, 'teacher', pick(['Не нажимай кнопки. Никогда.', 'Уже лучше. Почти.', 'Дальше — он.']), { mood: 'tired', ms: 1300 });
    await c.wait(900);
  }

  function moveFake(c, S, ui, center) {
    var fake = ui.fake;
    if (!fake) return;
    if (center) {
      fake.style.left = '50%';
      fake.style.top = '62%';
      return;
    }
    var fw = fake.offsetWidth || Math.min(ui.W * 0.74, 340);
    var left = rand(fw * 0.55, Math.max(fw * 0.56, ui.W - fw * 0.55));
    var top = rand(ui.H * 0.38, Math.max(ui.H * 0.4, ui.H * 0.7));
    fake.style.left = Math.round(left) + 'px';
    fake.style.top = Math.round(top) + 'px';
    fake.style.transform = 'translate(-50%,-50%)';
    var labels = ['МЫ ЭТО УЖЕ ПРОХОДИЛИ!', 'МЫ ЭТО ТОЖЕ ПРОХОДИЛИ!', 'ПРОЙДЕНО. ПОВТОРИМ?', 'ЭТО НЕ КНОПКА. ЭТО ПРИВЫЧКА.'];
    fake.textContent = pick(labels);
  }

  async function runPassword(c, S, ui) {
    S.paused = true;
    S.busy = true;
    ui.hint.classList.remove('show');
    c.gag('boss_password_open');
    var ok = false;
    var tries = 0;
    while (tries < 2 && !ok) {
      var buttons = [
        { id: 'no1', label: 'ՏՈՒՆ' },
        { id: 'ok', label: 'ՏՈՒՆԸ', primary: true },
        { id: 'no2', label: 'ՏԱՆԸ' }
      ];
      if (tries === 1) buttons = [buttons[1], buttons[2], buttons[0]];
      var id = await c.fx.fakeWindow({
        title: 'ОБНОВЛЕНИЕ АРТИКЛЯ',
        body: 'ВВЕДИТЕ ПАРОЛЬ ДЛЯ ДОСТУПА К АРТИКЛЯМ.\n\nПОДСКАЗКА: «ДОМ» С АРТИКЛЕМ.',
        buttons: buttons,
        ms: 9000
      });
      if (id === 'ok') {
        ok = true;
        c.gag('boss_password_ok');
        c.bump('bossHits');
        sfx(c, 'correct');
        say(c, 'system', 'ДОСТУП РАЗРЕШЁН. АРТИКЛИ ВЫДАНЫ. НЕ ВСЕ.', { ms: 1800 });
      } else {
        tries += 1;
        c.bump('errors');
        c.fx.glitch(420);
        sfx(c, 'error');
        c.say('system', 'ПАРОЛЬ НЕВЕРЕН. ОКНО НЕДОВОЛЬНО.', { ms: 1500 });
        await c.wait(350);
      }
    }
    if (!ok) {
      c.gag('boss_password_fail');
      say(c, 'system', 'ОКНО УСТАЛО. ПРОДОЛЖИМ.', { ms: 1600 });
    }
    await c.wait(500);
    S.lastProgress = performance.now();
    S.paused = false;
    S.busy = false;
    S.windowDone = true;
  }

  async function waitPhase(c, S, ui, phase) {
    S.lastProgress = performance.now();
    var lastSeen = S.phaseSaved || 0;
    while (!S.phaseDone) {
      await c.wait(140);
      var nowMs = performance.now();
      if (phase === 2 && S.needWindow && !S.windowBusy) {
        S.needWindow = false;
        await runPassword(c, S, ui);
        S.lastProgress = performance.now();
        continue;
      }
      if (S.paused) continue;
      if ((S.phaseSaved || 0) !== lastSeen) {
        lastSeen = S.phaseSaved;
        S.lastProgress = performance.now();
      }
      if (phase === 2) {
        if (nowMs > S.nextShuffle) {
          shuffleTokens(c, S, ui);
          S.nextShuffle = nowMs + 3600;
        }
        if (nowMs > S.nextFakeMove && S.fakeMoves < 3 && !ui.fake.classList.contains('tired')) {
          S.fakeMoves += 1;
          moveFake(c, S, ui, false);
          S.nextFakeMove = nowMs + 3000;
        }
      }
      if (nowMs - S.lastProgress > 30000) {
        S.phaseSaved = S.goal;
        S.phaseDone = true;
        c.gag('boss_autocomplete_' + phase);
        setBossLine(c, S, ui, 'ХАОС УСТАЛ ЖДАТЬ. АРТИКЛИ ПРИКРЕПЛЕНЫ ИЗ ЖАЛОСТИ.', 2200);
        toast(c, ui, 'СИСТЕМА: ЖАЛОСТЬ');
      }
    }
  }

  async function phase3(c, S, ui) {
    S.phase = 3;
    S.phaseTitle = 'ФАЗА 3 · ПОСЛЕДНИЙ АРТИКЛЬ';
    S.active = false;
    S.paused = false;
    S.phaseDone = false;
    S.chaseDone = false;
    S.chaseHits = 0;
    S.slow = 1;
    S.crownOff = false;
    clearWords(c, S, ui, true);
    ui.fake.classList.remove('show');
    ui.tokensWrap.style.transition = 'opacity .4s';
    ui.tokensWrap.style.opacity = '0';
    ui.tokensWrap.style.pointerEvents = 'none';
    ui.tokens.forEach(function (t) { t.el.style.pointerEvents = 'none'; });
    updateHud(ui, S);
    spawnChase(c, S, ui);
    c.gag('boss_phase3');
    await showBanner(c, ui, 'ФАЗА 3 · ПОСЛЕДНИЙ АРТИКЛЬ', 'Он в короне. Конечно, в короне.', 1700);
    setBossLine(c, S, ui, 'Я НЕ ХАОС. Я АРТИКЛЬ. ВЫ ПОСТРОИЛИ ХАОС ВОКРУГ МЕНЯ.', 2800);
    say(c, 'teacher', 'Артикль в короне. Тот же, что сбежал с доски.', { mood: 'cosmic', ms: 1700 });
    c.mood('teacher', 'cosmic');
    c.say('gosha', 'Я растение. Меня не считайте.', { mood: 'hide', ms: 1200 });
    showHint(c, ui, 'ТАПНИ АРТИКЛЬ 5 РАЗ. КАЖДАЯ ПОИМКА СРЫВАЕТ МАСКИРОВКУ.', 6000);
    c.fx.flash('#ffffff', 160);
    sfx(c, 'riser');
    await c.wait(700);
    if (S.chase) S.chase.ready = true;
    var lastSeen = 0;
    var lastProgress = performance.now();
    while (!S.chaseDone) {
      await c.wait(120);
      if (S.chaseHits !== lastSeen) { lastSeen = S.chaseHits; lastProgress = performance.now(); }
      if (performance.now() - lastProgress > 26000) {
        S.chaseDone = true;
        c.gag('boss_chase_autocatch');
        setBossLine(c, S, ui, 'АРТИКЛЬ УСТАЛ УБЕГАТЬ. ОН ВАС УВАЖАЕТ.', 2000);
      }
    }
    ui.hint.classList.remove('show');
    if (S.chase) S.chase.ready = false;
    // досрочная визуальная победа (если авто-таймаут)
    if (S.chaseHits < 5) {
      S.chaseHits = 5;
      if (ui.chaseMask) ui.chaseMask.textContent = 'АРТИКЛЬ';
      S.crownOff = true;
    }
    c.gag('boss_phase3_done');
    await c.wait(500);
  }

  function spawnChase(c, S, ui) {
    ui.chase.innerHTML = '';
    ui.chase.classList.add('show');
    ui.chase.classList.remove('caught');
    var cv = document.createElement('canvas');
    cv.width = 192;
    cv.height = 192;
    cv.style.width = '96px';
    cv.style.height = '96px';
    ui.chase.appendChild(cv);
    var mask = c.h.el('span', 'mask', 'АРТИКЛЬ В КОРОНЕ');
    ui.chase.appendChild(mask);
    ui.chaseCanvas = cv;
    ui.chaseMask = mask;
    var ch = {
      el: ui.chase, x: rand(ui.W * 0.2, ui.W * 0.6), y: ui.H * 0.42,
      vx: rand(80, 110), vy: rand(50, 80), w: 96, h: 96,
      ready: false, lastDodge: -9, cool: 0
    };
    S.chase = ch;
    S.chaseHits = 0;
    ui.chase.style.transform = 'translate3d(' + ch.x + 'px,' + ch.y + 'px,0)';
    c.tap(ui.chase, function () { onChaseTap(c, S, ui); });
  }

  function onChaseTap(c, S, ui) {
    if (!S.chase || S.chaseDone || S.paused || S.done) return;
    if (!S.chase.ready) return;
    var now = performance.now();
    if (now < (S.chase.cool || 0)) return;
    S.chase.cool = now + 230;
    S.chaseHits += 1;
    S.chase.lastProgress = performance.now();
    c.bump('bossHits');
    c.gag('boss_chase_' + S.chaseHits);
    var rx, ry;
    try {
      var r = c.rect(ui.chase);
      rx = r.left + r.width / 2;
      ry = r.top + r.height / 2;
      c.fx.burst(rx, ry, { text: 'Ը', count: 14, spread: 130, colors: ['#ffd23f', '#fff3b0', '#ff8fb1'] });
    } catch (e) {}
    sfx(c, 'pop');
    sfx(c, 'correct');
    spawnHomeworkFlood(c, S, ui, 6 + S.chaseHits * 5, false);
    if (S.chaseHits >= 5) {
      chaseFinal(c, S, ui);
      return;
    }
    ui.chaseMask.textContent = 'МАСКИРОВКА: ' + MASKS[S.chaseHits - 1];
    setBossLine(c, S, ui, pool(c, 'ep6', 'esc') || 'МАСКИРОВКА СОРВАНА. ПОД НЕЙ ЕЩЁ ОДНА.', 1900);
    S.bossHurt = 0.5;
    var sp = 92 + S.chaseHits * 20;
    var ang = rand(0, 6.28);
    S.chase.vx = Math.cos(ang) * sp;
    S.chase.vy = Math.sin(ang) * sp * 0.8;
    if (S.chaseHits === 2 || S.chaseHits === 4) {
      S.chase.x = rand(12, Math.max(14, ui.W - 120));
      S.chase.y = rand(ui.H * 0.34, ui.H - 140);
    }
    say(c, 'teacher', pick(['Держи его.', 'Ещё раз.', 'Он ещё в короне.', 'Хорошо. Не отвлекайся.']), { mood: 'cosmic', ms: 1100 });
  }

  function chaseFinal(c, S, ui) {
    if (S.chaseDone) return;
    S.chaseDone = true;
    S.crownOff = true;
    c.bump('articlesSaved');
    S.saved += 1;
    updateHud(ui, S);
    c.gag('boss_crown');
    if (ui.chaseMask) ui.chaseMask.textContent = 'АРТИКЛЬ';
    if (ui.chase) ui.chase.classList.add('caught');
    setBossLine(c, S, ui, 'ЛАДНО. Я СДАЮСЬ. НО КОРОНУ ОСТАВЛЮ.', 2400);
    c.fx.flash('#ffffff', 260);
    sfx(c, 'dramatic');
    sfx(c, 'crash');
    spawnHomeworkFlood(c, S, ui, 22, true);
    S.slow = 0.22;
  }

  function spawnHomeworkFlood(c, S, ui, n, slow) {
    var hw = (c.text && c.text.homework) || ['Найти артикль.'];
    for (var i = 0; i < n; i++) {
      var text = pick(hw);
      if (text.length > 52) text = text.slice(0, 52) + '…';
      var el = c.h.el('div', 'ep6-hw' + (slow ? ' slow' : ''), text);
      el.style.left = rand(0, 88) + '%';
      el.style.top = rand(-8, 82) + '%';
      el.style.setProperty('--rot', rand(-16, 16).toFixed(1) + 'deg');
      ui.flood.appendChild(el);
      while (ui.flood.childNodes.length > 58) ui.flood.removeChild(ui.flood.firstChild);
    }
  }

  async function victory(c, S, ui) {
    S.done = true;
    S.active = false;
    S.paused = false;
    ui.hint.classList.remove('show');
    ui.fake.classList.remove('show');
    // финальный выдох: артикль улетает из кадра, доска трескается
    if (ui.chase) {
      ui.chase.style.transition = 'transform .9s ease, opacity .9s ease';
      ui.chase.style.transform = 'translate3d(' + Math.round(ui.W / 2 - 48) + 'px,' + Math.round(ui.H * 0.1) + 'px,0) scale(.6)';
      ui.chase.style.opacity = '0';
    }
    c.mood('teacher', 'calm');
    c.stage.board('');
    S.slow = 0.18;
    await c.wait(1000);
    S.bossDead = true;
    S.lightning = 0.25;
    c.fx.shake(1.5, 520);
    c.fx.flash('#ffffff', 220);
    sfx(c, 'crash');
    sfx(c, 'boom');
    await c.wait(900);
    // драматическая тишина
    await c.fx.silence(1500);
  }

  /* ================================================================ сцена */
  G.scenes.boss = async function (c) {
    if (c.auto) {
      await c.wait(1200);
      c.bump('bossHits', 8);
      c.bump('articlesSaved', 8);
      c.bump('protocols', 1);
      c.gag('boss_auto');
      return;
    }

    var S = {
      phase: 0, phaseTitle: 'ФИНАЛЬНЫЙ ЭКЗАМЕН',
      active: false, paused: false, busy: false, done: false,
      saved: 0, phaseSaved: 0, goal: 4, errors: 0, missed: 0,
      armed: null, words: [], slow: 1, visT: 0,
      bossHurt: 0, lightning: 0, pointer: null,
      tokenSwap: false, rollbacks: 0, fakeMoves: 0,
      windowDone: false, needWindow: false, lastProgress: performance.now()
    };
    var ui = buildUI(c);
    measure(c, ui);
    startTick(c, S, ui);

    // указатель (для глаз босса и уворота артикля)
    var rootRect = ui.rootRect;
    var offMove = u.on(ui.root, 'pointermove', function (ev) {
      S.pointer = { x: ev.clientX - rootRect.left, y: ev.clientY - rootRect.top };
    }, { passive: true });
    c.cleanup(offMove);

    // ловушка «МЫ ЭТО УЖЕ ПРОХОДИЛИ!»
    c.tap(ui.fake, function () {
      if (S.phase !== 2 || S.paused || S.busy || S.done) return;
      if (S.rollbacks >= 2) {
        setBossLine(c, S, ui, 'КНОПКА УСТАЛА ОТКАТЫВАТЬ. ОНА УШЛА НА СОВЕЩАНИЕ.', 2000);
        ui.fake.classList.add('tired');
        ui.fake.disabled = true;
        return;
      }
      S.rollbacks += 1;
      c.gag('boss_rollback');
      c.bump('protocols');
      S.phaseSaved = 0;
      S.lastProgress = performance.now();
      updateHud(ui, S);
      c.fx.glitch(520);
      c.fx.shake(1.2, 420);
      sfx(c, 'glitch');
      sfx(c, 'error');
      setBossLine(c, S, ui, pool(c, 'ep6', 'esc') || 'ФАЗА СБРОШЕНА. «МЫ ЭТО УЖЕ ПРОХОДИЛИ» ГРОМЧЕ.', 2300);
      c.say('teacher', 'Мы это уже проходили.', { mood: 'tired', ms: 1400 });
      toast(c, ui, 'ОТКАТ ФАЗЫ · ПРОТОКОЛ № ' + (47 + S.rollbacks));
      moveFake(c, S, ui, false);
      if (S.rollbacks >= 2) {
        ui.fake.classList.add('tired');
        ui.fake.disabled = true;
        c.say('system', 'КНОПКА «МЫ ЭТО УЖЕ ПРОХОДИЛИ» УШЛА НА СОВЕЩАНИЕ.', { ms: 1800 });
      }
    });

    /* ---- пролог ---- */
    await intro(c, S, ui);
    await phase1(c, S, ui);
    await phase2(c, S, ui);
    await phase3(c, S, ui);
    await victory(c, S, ui);
  };
})();
