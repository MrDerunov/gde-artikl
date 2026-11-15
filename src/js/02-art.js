/* «ГДЕ АРТИКЛЬ?!» — 02-art.js — вся графика игры на canvas. Роль: Visual/Audio.
   Контракт (TECH.md §7):
     G.art.drawTeacher(ctx, r, mood, t)
     G.art.drawStudent(ctx, r, idx, mood, t)      // idx 0=Толя, 1=Вика, 2=Гоша
     G.art.drawArticle(ctx, r, mood, t, opts)     // живой артикль ը/ն
     G.art.drawLetter(ctx, r, glyph, mood, t)     // армянский глиф + лицо
     G.art.drawClassroom(ctx, w, h, t, opts)      // фон класса, opts={boardText}
     G.art.drawProp(ctx, name, r, t, opts)        // police, pigeon, homework, protocol, clock, cap, stamp, article
     G.art.paint(canvas, kind, opts)              // статичный спрайт
   Персонажи и предметы рисуются в виртуальном боксе 100x100, вписанном в r
   (квадрат со стороной min(r.w,r.h), по центру). Всё — кодом, без внешних ресурсов.
   Каждая публичная функция делает save()/restore() и не оставляет глобального состояния.
*/
(function () {
  'use strict';
  var G = (window.G = window.G || {});
  var A = (G.art = G.art || {});

  var TAU = Math.PI * 2;
  var FONT = "'Segoe UI','Noto Sans Armenian','DejaVu Sans','Arial Unicode MS',Arial,sans-serif";
  A.FONT = FONT;

  /* ---------------------------------------------------------------- палитра */
  var C = (A.COLORS = {
    ink: '#20242c', inkSoft: '#3c4552', inkPale: '#6d7480',
    chalk: '#f6f2df', chalkDim: '#c9cfb8', chalkDark: '#9fae94',
    board: '#1d4534', boardDark: '#153529', boardLight: '#255742',
    boardFrame: '#7c4c2b', boardFrameDark: '#55311a',
    wall: '#3a4a3e', wallDark: '#263129', wallLight: '#4d5f50',
    floor: '#5c4430', floorDark: '#43301f', floorLight: '#6f5340',
    paper: '#f8f0d9', paperShade: '#e4d6b4', paperLine: '#b6a070', paperInk: '#4a4336',
    stamp: '#bf2f22', stampDark: '#8d1d13',
    warm: '#ffd479', gold: '#f2b62e', goldDark: '#b8841a',
    skin: '#f0c49c', skinShade: '#d9a67c', skinDark: '#b9825b',
    teacherSkin: '#eec39b', teacherSkinShade: '#d5a176',
    hairDark: '#3a2a22', hairBrown: '#5a3a24', hairGrey: '#6f6a62',
    jacket: '#7d3347', jacketDark: '#5a2030', plaid: '#f0d6a8',
    blouse: '#f3efe2', pearls: '#f4e6c8',
    toliaSkin: '#f0c197', toliaHair: '#4a3221', toliaHood: '#566b45', toliaHoodDark: '#3d4f31',
    vikaSkin: '#f4cba6', vikaHair: '#a35427', vikaHairLight: '#c9773f',
    vikaTop: '#a63f6c', vikaTopDark: '#7c2a4f', vikaHeadband: '#e2597e',
    goshaSkin: '#f1c8a0', goshaHair: '#5a3f28',
    leaf: '#3f7a48', leafDark: '#2a5232', leafLight: '#5f9f5b', pot: '#b5673f', potDark: '#8a4728',
    navy: '#2f4a72', navyDark: '#1d2f4d', navyLight: '#4a6b99',
    pigeon: '#9aa4b3', pigeonDark: '#6f7a8b', pigeonLight: '#c6ceda', pigeonNeck: '#7bb39b',
    blood: '#5a2b33', tongue: '#c46a73', blush: '#e88b8b',
    sweat: '#bfe4f7', sweatDark: '#78a7c9',
    cyan: '#7fe3ff', pink: '#ff9ec4', green: '#7fd48a', violet: '#b98cff',
    skinShadow: 'rgba(90,50,30,0.13)'
  });

  /* ------------------------------------------------------- цветовые утилиты */
  function hex2rgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, k) {
    var x = hex2rgb(a), y = hex2rgb(b);
    k = k == null ? 0.5 : k;
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * k) + ',' +
      Math.round(x[1] + (y[1] - x[1]) * k) + ',' + Math.round(x[2] + (y[2] - x[2]) * k) + ')';
  }
  function shade(c, k) { return k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function rgba(c, a) { var p = hex2rgb(c); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
  A.mix = mix; A.shade = shade; A.rgba = rgba;

  /* --------------------------------------------------------- гео-утилиты */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function rnd(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  var RNG = rnd(20261115); // общий сид для «пылинок» и мела — стабильные детали

  function ellPath(ctx, cx, cy, rx, ry, rot) {
    rx = Math.max(0.01, rx); ry = Math.max(0.01, ry);
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU);
    else {
      ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot);
      ctx.scale(rx, ry); ctx.arc(0, 0, 1, 0, TAU); ctx.restore();
    }
  }
  function fillEll(ctx, cx, cy, rx, ry, fill, rot) { ellPath(ctx, cx, cy, rx, ry, rot); ctx.fillStyle = fill; ctx.fill(); }
  function strokeEll(ctx, cx, cy, rx, ry, w, col, rot) {
    ellPath(ctx, cx, cy, rx, ry, rot); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  }
  function circle(ctx, x, y, r, fill, ink, lw) {
    fillEll(ctx, x, y, r, r, fill);
    if (ink) strokeEll(ctx, x, y, r, r, lw || Math.max(1, r * 0.16), ink);
  }
  function line(ctx, x1, y1, x2, y2, w, col, cap) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = cap || 'round'; ctx.stroke();
  }
  function poly(ctx, pts, close) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close !== false) ctx.closePath();
  }
  function fillPoly(ctx, pts, fill) { poly(ctx, pts); ctx.fillStyle = fill; ctx.fill(); }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function fillRound(ctx, x, y, w, h, r, fill) { roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function strokeRound(ctx, x, y, w, h, r, w2, col) { roundRect(ctx, x, y, w, h, r); ctx.lineWidth = w2; ctx.strokeStyle = col; ctx.stroke(); }
  function starPath(ctx, cx, cy, r, points, inner, rot) {
    points = points || 5; inner = inner == null ? r * 0.45 : inner;
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var a = (rot || -Math.PI / 2) + i * Math.PI / points;
      var rr = i % 2 ? inner : r;
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function fillStar(ctx, cx, cy, r, col, rot) { starPath(ctx, cx, cy, r, 5, r * 0.45, rot); ctx.fillStyle = col; ctx.fill(); }

  // виртуальный бокс 100x100: подгоняет ctx под r, возвращает масштаб (px на единицу)
  function box(ctx, r) {
    var s = Math.min(r.w, r.h);
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(s / 100, s / 100);
    ctx.translate(-50, -50);
    return s;
  }
  // безопасный «песочный» вызов чужого рисунка
  function guard(ctx, fn) {
    ctx.save();
    try { fn(); } finally { ctx.restore(); }
  }

  /* ---------------------------------------------------- анимационные мелочи */
  function bob(t, amp, speed, phase) { return Math.sin(t * (speed || 2) + (phase || 0)) * (amp == null ? 1 : amp); }
  function blinkAmt(t, seed) {
    seed = seed || 0;
    var p = 3.1 + seed * 1.4;
    var m = (t + seed * 2.3) % p;
    var d = 0.15;
    if (m > p - d) return Math.sin(((m - (p - d)) / d) * Math.PI);
    return 0;
  }
  function jitter(t, amp, speed) { return Math.sin(t * (speed || 27)) * amp; }

  /* ------------------------------------------------------------- лицо: глаза */
  /* o = {open:0..1.3, pupilR, lookX:-1..1, lookY:-1..1, cross:bool, white, ink, lash, glint, lashCol} */
  function eye(ctx, cx, cy, rx, ry, o) {
    o = o || {};
    var ink = o.ink || C.ink;
    if (o.cross) {
      var w = Math.max(0.7, rx * 0.34);
      if (o.halo) {
        line(ctx, cx - rx * 0.9, cy - ry * 0.9, cx + rx * 0.9, cy + ry * 0.9, w * 2.1, o.halo);
        line(ctx, cx + rx * 0.9, cy - ry * 0.9, cx - rx * 0.9, cy + ry * 0.9, w * 2.1, o.halo);
      }
      line(ctx, cx - rx * 0.9, cy - ry * 0.9, cx + rx * 0.9, cy + ry * 0.9, w, ink);
      line(ctx, cx + rx * 0.9, cy - ry * 0.9, cx - rx * 0.9, cy + ry * 0.9, w, ink);
      return;
    }
    var open = o.open == null ? 1 : o.open;
    if (open < 0.09) {
      if (o.halo) line(ctx, cx - rx, cy, cx + rx, cy, Math.max(1.4, rx * 0.62), o.halo);
      line(ctx, cx - rx, cy, cx + rx, cy, Math.max(0.7, rx * 0.3), ink);
      if (o.lash) lashLine(ctx, cx, cy, rx, ry, o.lashCol || ink, o.lash);
      return;
    }
    var h = Math.max(0.05, ry * Math.min(open, 1.35));
    var cy2 = cy + (ry - h);
    if (o.halo) strokeEll(ctx, cx, cy2, rx * 1.1, h * 1.15, Math.max(1.1, rx * 0.42), o.halo);
    fillEll(ctx, cx, cy2, rx, h, o.white || '#fbf8ef');
    strokeEll(ctx, cx, cy2, rx, h, Math.max(0.7, rx * 0.17), ink);
    if (o.lash) lashLine(ctx, cx, cy2, rx, h, o.lashCol || ink, o.lash);
    var pr = o.pupilR == null ? Math.min(rx, h) * 0.54 : o.pupilR;
    var px = cx + (o.lookX || 0) * rx * 0.4;
    var py = cy2 + (o.lookY || 0) * h * 0.4;
    fillEll(ctx, px, py, pr, pr, o.pupil || C.ink);
    if (o.glint !== false) fillEll(ctx, px - pr * 0.36, py - pr * 0.4, pr * 0.36, pr * 0.36, '#ffffff');
  }
  function lashLine(ctx, cx, cy, rx, ry, col, n) {
    n = n || 2;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI * 0.78 + i * 0.42;
      var x = cx + Math.cos(a) * rx * 1.02, y = cy + Math.sin(a) * ry * 1.02;
      line(ctx, x, y, x + Math.cos(a) * rx * 0.5, y + Math.sin(a) * ry * 0.5, Math.max(0.6, rx * 0.14), col);
    }
  }

  /* -------------------------------------------------------------- брови */
  /* kind: 'level' | 'inner' | 'up' | 'high' | 'down' | 'oneUp' | 'sad' */
  function brows(ctx, cx, y, sep, len, thick, col, kind) {
    var tiltL = 0, tiltR = 0, raiseL = 0, raiseR = 0;
    switch (kind) {
      case 'inner': tiltL = 0.16; tiltR = -0.16; raiseL = raiseR = -0.1; break;
      case 'sad': tiltL = 0.26; tiltR = -0.26; raiseL = raiseR = -0.05; break;
      case 'up': tiltL = -0.2; tiltR = 0.2; raiseL = 0.35; raiseR = 0.35; break;
      case 'high': tiltL = -0.24; tiltR = 0.24; raiseL = 0.8; raiseR = 0.8; break;
      case 'down': tiltL = -0.3; tiltR = 0.3; raiseL = -0.18; raiseR = -0.18; break;
      case 'oneUp': tiltL = 0.05; tiltR = -0.24; raiseL = 0.75; raiseR = 0.05; break;
      default: break;
    }
    var yL = y + raiseL * thick * 3, yR = y + raiseR * thick * 3;
    var xl1 = cx - sep - len / 2, xl2 = cx - sep + len / 2;
    var xr1 = cx + sep - len / 2, xr2 = cx + sep + len / 2;
    line(ctx, xl1, yL + tiltL * len * 0.6, xl2, yL - tiltL * len * 0.6, thick, col);
    line(ctx, xr1, yR - tiltR * len * 0.6, xr2, yR + tiltR * len * 0.6, thick, col);
  }

  /* -------------------------------------------------------------- рот */
  /* type: smile|grin|tiny|flat|frown|smirk|wavy|open|o|scream|sad */
  function mouth(ctx, cx, cy, w, type, o) {
    o = o || {};
    var ink = o.ink || C.ink;
    var col = o.color || ink;
    var stroke = Math.max(0.7, o.stroke || w * 0.16);
    var h = Math.max(1, w * 0.55);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function curve(dy) {
      ctx.beginPath(); ctx.moveTo(cx - w / 2, cy);
      ctx.quadraticCurveTo(cx, cy + dy, cx + w / 2, cy);
      ctx.lineWidth = stroke; ctx.strokeStyle = col; ctx.stroke();
    }
    switch (type) {
      case 'smile': curve(h * 0.95); break;
      case 'tiny': curve(h * 0.5); break;
      case 'frown':
      case 'sad': curve(-h * 0.8); break;
      case 'flat': line(ctx, cx - w / 2, cy, cx + w / 2, cy, stroke, col); break;
      case 'smirk':
        ctx.beginPath(); ctx.moveTo(cx - w * 0.5, cy + h * 0.12);
        ctx.quadraticCurveTo(cx + w * 0.12, cy + h * 0.72, cx + w * 0.5, cy - h * 0.22);
        ctx.lineWidth = stroke; ctx.strokeStyle = col; ctx.stroke(); break;
      case 'wavy':
        ctx.beginPath(); ctx.moveTo(cx - w / 2, cy);
        ctx.quadraticCurveTo(cx - w * 0.25, cy + h * 0.55, cx, cy);
        ctx.quadraticCurveTo(cx + w * 0.25, cy - h * 0.55, cx + w / 2, cy);
        ctx.lineWidth = stroke; ctx.strokeStyle = col; ctx.stroke(); break;
      case 'scream':
      case 'open': {
        var big = type === 'scream';
        var rx = w * (big ? 0.52 : 0.44), ry = h * (big ? 0.95 : 0.62);
        fillEll(ctx, cx, cy + ry * 0.25, rx, ry, o.inner || C.blood);
        strokeEll(ctx, cx, cy + ry * 0.25, rx, ry, Math.max(0.6, stroke * 0.55), ink);
        fillEll(ctx, cx + rx * 0.1, cy + ry * 0.85, rx * 0.6, ry * 0.34, o.tongue || C.tongue);
        if (!o.noTeeth) fillRound(ctx, cx - rx * 0.86, cy - ry * 0.72, rx * 1.72, ry * 0.42, 1, '#fdfbf4');
        break;
      }
      case 'o': {
        var r = w * 0.3;
        fillEll(ctx, cx, cy, r, r * 1.05, o.inner || C.blood);
        strokeEll(ctx, cx, cy, r, r * 1.05, Math.max(0.6, stroke * 0.55), ink);
        break;
      }
      case 'grin': {
        ctx.beginPath(); ctx.moveTo(cx - w / 2, cy - h * 0.1);
        ctx.quadraticCurveTo(cx, cy + h * 1.25, cx + w / 2, cy - h * 0.1);
        ctx.quadraticCurveTo(cx, cy + h * 0.18, cx - w / 2, cy - h * 0.1);
        ctx.closePath();
        ctx.fillStyle = o.inner || C.blood; ctx.fill();
        ctx.lineWidth = Math.max(0.6, stroke * 0.6); ctx.strokeStyle = ink; ctx.stroke();
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#fdfbf4';
        ctx.fillRect(cx - w, cy - h, w * 2, h * 0.55);
        ctx.restore();
        break;
      }
      default: curve(h * 0.6);
    }
  }

  /* --------------------------------------------------------- эффекты лиц */
  function sweat(ctx, x, y, r, rot, a) {
    guard(ctx, function () {
      ctx.globalAlpha = a == null ? 1 : a;
      ctx.translate(x, y); ctx.rotate(rot || 0);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.9);
      ctx.bezierCurveTo(r * 0.95, -r * 0.5, r * 0.95, r * 0.9, 0, r * 0.9);
      ctx.bezierCurveTo(-r * 0.95, r * 0.9, -r * 0.95, -r * 0.5, 0, -r * 1.9);
      ctx.closePath();
      ctx.fillStyle = C.sweat; ctx.fill();
      ctx.lineWidth = Math.max(0.4, r * 0.22); ctx.strokeStyle = C.sweatDark; ctx.stroke();
      fillEll(ctx, -r * 0.28, r * 0.15, r * 0.22, r * 0.3, '#ffffff');
    });
  }
  function spark(ctx, x, y, r, col, a) {
    guard(ctx, function () {
      ctx.globalAlpha = a == null ? 1 : a;
      ctx.fillStyle = col || '#fff6cf';
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
      ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
      ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
      ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
      ctx.fill();
    });
  }
  function blush(ctx, x, y, rx, ry, a) {
    guard(ctx, function () {
      ctx.globalAlpha = a == null ? 0.4 : a;
      fillEll(ctx, x, y, rx, ry, C.blush);
    });
  }
  function shockLines(ctx, cx, cy, r1, r2, n, col, a, phase) {
    guard(ctx, function () {
      ctx.globalAlpha = a == null ? 0.9 : a;
      for (var i = 0; i < (n || 9); i++) {
        var ang = (phase || 0) + i * TAU / (n || 9);
        var x1 = cx + Math.cos(ang) * r1, y1 = cy + Math.sin(ang) * r1;
        var x2 = cx + Math.cos(ang) * r2, y2 = cy + Math.sin(ang) * r2;
        line(ctx, x1, y1, x2, y2, Math.max(0.7, (r2 - r1) * 0.28), col || C.ink);
      }
    });
  }
  function zzz(ctx, x, y, t, size, col) {
    guard(ctx, function () {
      ctx.fillStyle = col || C.inkSoft;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var i = 0; i < 3; i++) {
        var k = (t * 0.34 + i * 0.33) % 1;
        ctx.globalAlpha = (1 - k) * 0.85;
        var s = size * (0.55 + k * 0.6);
        ctx.font = '800 ' + s.toFixed(2) + 'px ' + FONT;
        ctx.fillText('Z', x + Math.sin(k * 3.4) * size * 0.5 + k * size * 0.9, y - k * size * 2.2);
      }
    });
  }
  function tear(ctx, x, y, r, a) {
    guard(ctx, function () {
      ctx.globalAlpha = a == null ? 0.9 : a;
      fillEll(ctx, x, y, r * 0.6, r * 0.85, '#9fd8f2');
      fillEll(ctx, x - r * 0.16, y - r * 0.2, r * 0.2, r * 0.3, '#ffffff');
    });
  }
  function motionLines(ctx, x, y, len, n, col, a, ang) {
    guard(ctx, function () {
      ctx.globalAlpha = a == null ? 0.55 : a;
      for (var i = 0; i < n; i++) {
        var yy = y + (i - (n - 1) / 2) * len * 0.42;
        line(ctx, x, yy, x - len, yy, Math.max(0.6, len * 0.1), col || C.inkSoft);
      }
    });
  }
  function shadowEll(ctx, cx, cy, rx, ry, a) {
    guard(ctx, function () {
      ctx.globalAlpha = a == null ? 0.22 : a;
      fillEll(ctx, cx, cy, rx, ry, '#000000');
    });
  }

  // проверка: глиф реально отрисовался шрифтом (для fallback-подписи)
  var glyphOKCache = {};
  function glyphSupported(ctx, glyph) {
    if (glyphOKCache[glyph] != null) return glyphOKCache[glyph];
    ctx.save();
    ctx.font = '40px ' + FONT;
    var w = ctx.measureText(glyph).width;
    var ok = w > 1;
    ctx.restore();
    glyphOKCache[glyph] = ok;
    return ok;
  }

  /* ================================================================ УЧИТЕЛЬ
     Ануш Валерьевна: высокая, пучок, очки на цепочке, клетчатый жакет,
     указка. moods: neutral|suspicious|scream|calm|smug|tired|cosmic|proud|happy
  ========================================================================= */
  var TEACHER_MOODS = ['neutral', 'suspicious', 'scream', 'calm', 'smug', 'tired', 'cosmic', 'proud', 'happy'];
  function teacherMood(m) { return TEACHER_MOODS.indexOf(m) >= 0 ? m : 'neutral'; }

  var T_EYES = {
    neutral: { open: 1, look: [0, 0] },
    suspicious: { open: 0.62, look: [-1, 0.15] },
    scream: { open: 1.2, look: [0, 0], pupil: 0.42 },
    calm: { open: 0.76, look: [0, 0], glint: 1 },
    smug: { open: 0.55, look: [1, 0.1], glint: 2 },
    tired: { open: 0.4, look: [0.2, 0.25] },
    cosmic: { open: 1.05, look: [0, 0], cosmic: 1 },
    proud: { happyClosed: 1 },
    happy: { open: 1.05, look: [0, 0], happy: 1 }
  };
  var T_BROWS = { neutral: 'level', suspicious: 'oneUp', scream: 'down', calm: 'level', smug: 'oneUp', tired: 'sad', cosmic: 'high', proud: 'level', happy: 'up' };
  var T_MOUTH = {
    neutral: ['tiny', 9], suspicious: ['flat', 8], scream: ['scream', 9.5], calm: ['tiny', 8],
    smug: ['smirk', 9], tired: ['flat', 7.5], cosmic: ['o', 6.5], proud: ['smile', 10], happy: ['grin', 10]
  };
  var T_TILT = { neutral: 0, suspicious: 0.02, scream: 0.035, calm: -0.012, smug: -0.05, tired: 0.035, cosmic: 0, proud: -0.04, happy: -0.02 };
  var T_POINTER = { neutral: -0.95, suspicious: -1.05, scream: -0.55, calm: -0.9, smug: -0.72, tired: 0.55, cosmic: -1.25, proud: -1.15, happy: -0.8 };

  A.drawTeacher = function (ctx, r, mood, t) {
    if (!ctx || !r || !(r.w > 0) || !(r.h > 0)) return;
    t = t || 0;
    guard(ctx, function () {
      box(ctx, r);
      teacherInner(ctx, teacherMood(mood || 'neutral'), t);
    });
  };

  function teacherInner(ctx, m, t) {
    var br = bob(t, 0.5, 1.9);
    var shake = (m === 'scream') ? jitter(t, 1.2, 41) : (m === 'cosmic' ? bob(t, 0.35, 2.6) : 0);
    var tilt = T_TILT[m] || 0;
    ctx.translate(shake, br * 0.32);

    teacherBody(ctx, m, t);

    // шея
    fillRound(ctx, 45, 36, 10, 14, 3, C.teacherSkinShade);
    fillEll(ctx, 50, 44, 5.2, 3.2, rgba(C.teacherSkinShade, 0.5));

    ctx.save();
    ctx.translate(50, 42); ctx.rotate(tilt); ctx.translate(-50, -42);
    teacherHead(ctx, m, t);
    ctx.restore();

    teacherExtras(ctx, m, t);
  }

  function teacherBody(ctx, m, t) {
    // жакет
    function jacketPath() {
      ctx.beginPath();
      ctx.moveTo(13, 100);
      ctx.bezierCurveTo(14, 77, 22, 58, 37.5, 51.5);
      ctx.quadraticCurveTo(50, 47.5, 62.5, 51.5);
      ctx.bezierCurveTo(78, 58, 86, 77, 87, 100);
      ctx.closePath();
    }
    jacketPath(); ctx.fillStyle = C.jacket; ctx.fill();

    ctx.save(); jacketPath(); ctx.clip();
    // клетка
    for (var x = 17; x < 84; x += 7.5) line(ctx, x, 40, x, 102, 0.75, rgba(C.plaid, 0.42));
    for (var y = 55; y < 102; y += 7.5) line(ctx, 10, y, 92, y, 0.75, rgba(C.plaid, 0.42));
    for (var x2 = 20.5; x2 < 84; x2 += 15) line(ctx, x2, 40, x2, 102, 1.25, rgba(C.jacketDark, 0.5));
    for (var y2 = 58.5; y2 < 102; y2 += 15) line(ctx, 10, y2, 92, y2, 1.25, rgba(C.jacketDark, 0.5));
    ctx.restore();

    // блик ткани и тень у шеи
    ctx.save(); jacketPath(); ctx.clip();
    ctx.fillStyle = rgba('#ffffff', 0.05);
    ctx.fillRect(13, 48, 74, 12);
    ctx.fillStyle = rgba('#000000', 0.1);
    ctx.fillRect(13, 93, 74, 12);
    ctx.restore();

    // блузка и лацканы
    ctx.beginPath(); ctx.moveTo(45, 50); ctx.lineTo(55, 50); ctx.lineTo(50, 79); ctx.closePath();
    ctx.fillStyle = C.blouse; ctx.fill();
    fillPoly(ctx, [[37, 51.5], [47, 49.5], [48.6, 62], [43, 72]], C.jacketDark);
    fillPoly(ctx, [[63, 51.5], [53, 49.5], [51.4, 62], [57, 72]], C.jacketDark);
    fillPoly(ctx, [[45, 50], [48.5, 49.6], [50, 55]], C.blouse);
    fillPoly(ctx, [[55, 50], [51.5, 49.6], [50, 55]], C.blouse);
    // жемчужное ожерелье
    for (var i = 0; i < 5; i++) {
      var a = Math.PI * (0.18 + i * 0.16);
      circle(ctx, 50 + Math.cos(a) * 6.6, 50 + Math.sin(a) * 3.4, 1.05, C.pearls, rgba('#7c6a4a', 0.5), 0.3);
    }

    // руки (рукав = толстая линия с обводкой)
    function sleeve(x1, y1, x2, y2, w) {
      line(ctx, x1, y1, x2, y2, w + 2, C.jacketDark);
      line(ctx, x1, y1, x2, y2, w, C.jacket);
      line(ctx, x1 - w * 0.12, y1, x2 - w * 0.12, y2, w * 0.28, rgba('#ffffff', 0.06));
    }
    var leftHand = { x: 18, y: 82.5 };
    var rightHand = { x: 82.5, y: 64 };
    sleeve(ctx, 27, 59, leftHand.x, leftHand.y, 9);
    sleeve(ctx, 73, 59, rightHand.x, rightHand.y, 9);

    // указка
    var pa = T_POINTER[m] + (m === 'smug' ? Math.sin(t * 3.4) * 0.05 : 0) + (m === 'scream' ? jitter(t, 0.06, 21) : 0);
    var len = 26;
    var tx = rightHand.x + Math.cos(pa) * len, ty = rightHand.y + Math.sin(pa) * len;
    line(ctx, rightHand.x, rightHand.y, tx, ty, 2.3, '#c9a06a');
    line(ctx, rightHand.x, rightHand.y, tx, ty, 1.2, rgba('#ffffff', 0.35));
    fillEll(ctx, tx, ty, 1.5, 1.5, '#5a3a24');

    // кисти
    fillEll(ctx, leftHand.x, leftHand.y + 1.5, 4.5, 4.2, C.teacherSkin);
    strokeEll(ctx, leftHand.x, leftHand.y + 1.5, 4.5, 4.2, 0.5, rgba(C.teacherSkinShade, 0.7));
    fillEll(ctx, rightHand.x, rightHand.y, 4.7, 4.4, C.teacherSkin);
    strokeEll(ctx, rightHand.x, rightHand.y, 4.7, 4.4, 0.5, rgba(C.teacherSkinShade, 0.7));
    line(ctx, rightHand.x - 1.6, rightHand.y - 2.2, rightHand.x - 0.4, rightHand.y + 2.2, 0.6, C.teacherSkinShade);

    if (m === 'tired') teacherCoffee(ctx, leftHand.x, leftHand.y, t);
  }

  function teacherCoffee(ctx, x, y, t) {
    var cx = x - 5, cy = y - 4;
    fillRound(ctx, cx - 6, cy - 5, 12, 11, 1.5, '#e9e0cd');
    strokeRound(ctx, cx - 6, cy - 5, 12, 11, 1.5, 0.6, '#8a8172');
    ctx.beginPath(); ctx.arc(cx + 6, cy, 3.1, -Math.PI * 0.45, Math.PI * 0.45); ctx.lineWidth = 1.6; ctx.strokeStyle = '#e9e0cd'; ctx.stroke();
    fillEll(ctx, cx, cy - 5, 5.4, 1.7, '#5a3a24');
    ctx.save(); ctx.globalAlpha = 0.6;
    for (var i = 0; i < 2; i++) {
      var ph = t * 1.4 + i * 1.7;
      ctx.beginPath();
      ctx.moveTo(cx - 2.4 + i * 4.4, cy - 7);
      ctx.bezierCurveTo(cx - 4 + i * 4.4, cy - 11 + Math.sin(ph) * 1.2, cx - 1 + i * 4.4, cy - 13 + Math.sin(ph) * 1.2, cx - 2.4 + i * 4.4, cy - 17 - Math.sin(ph) * 1.5);
      ctx.lineWidth = 1; ctx.strokeStyle = '#cfd6cc'; ctx.stroke();
    }
    ctx.restore();
  }

  function teacherHead(ctx, m, t) {
    // задние волосы
    fillEll(ctx, 50, 25.5, 17.6, 18.6, C.hairDark);
    // пучок
    fillEll(ctx, 50, 5.4, 6.4, 6.8, C.hairDark);
    strokeEll(ctx, 50, 5.4, 6.4, 6.8, 0.6, rgba('#1c130e', 0.55));
    ctx.beginPath(); ctx.arc(50, 5.4, 4.4, Math.PI * 0.75, Math.PI * 1.85);
    ctx.lineWidth = 0.8; ctx.strokeStyle = rgba('#6b4a38', 0.8); ctx.stroke();
    fillEll(ctx, 50, 11.2, 3.2, 1.4, '#a8763f');

    // лицо, уши
    fillEll(ctx, 50, 28, 14, 16, C.teacherSkin);
    fillEll(ctx, 35.4, 30, 3.3, 4.2, C.teacherSkin);
    fillEll(ctx, 64.6, 30, 3.3, 4.2, C.teacherSkin);
    strokeEll(ctx, 35.4, 30, 3.3, 4.2, 0.5, rgba(C.teacherSkinShade, 0.8));
    strokeEll(ctx, 64.6, 30, 3.3, 4.2, 0.5, rgba(C.teacherSkinShade, 0.8));

    // челка и боковые пряди
    ctx.beginPath();
    ctx.moveTo(35.6, 22.5);
    ctx.quadraticCurveTo(37.5, 11.5, 50, 9.8);
    ctx.quadraticCurveTo(62.5, 11.5, 64.4, 22.5);
    ctx.quadraticCurveTo(58, 15.5, 50, 15.8);
    ctx.quadraticCurveTo(42, 15.5, 35.6, 22.5);
    ctx.closePath(); ctx.fillStyle = C.hairDark; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(35.4, 21);
    ctx.quadraticCurveTo(32.4, 27, 33.6, 37.5);
    ctx.quadraticCurveTo(37, 30, 37.6, 23);
    ctx.closePath(); ctx.fillStyle = C.hairDark; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(64.6, 21);
    ctx.quadraticCurveTo(67.6, 27, 66.4, 37.5);
    ctx.quadraticCurveTo(63, 30, 62.4, 23);
    ctx.closePath(); ctx.fillStyle = C.hairDark; ctx.fill();
    // седая прядь — она устала
    line(ctx, 61, 13.5, 64.8, 20, 1.1, rgba('#cfc7b6', 0.9));

    var ep = T_EYES[m] || T_EYES.neutral;
    var blink = blinkAmt(t, 0.2);
    var open = ep.happyClosed ? 0 : (ep.open == null ? 1 : ep.open) * (m === 'scream' ? 1 : 1 - blink * 0.92);
    var look = ep.look || [0, 0];

    // брови
    var browCol = shade(C.hairDark, -0.1);
    brows(ctx, 50, 19.6, 7.4, 6.8, 1.5, browCol, T_BROWS[m] || 'level');

    // очки
    var gY = 28.4, gRx = 6.5, gRy = 5.3;
    var glassesShift = (m === 'scream') ? jitter(t, 0.5, 33) : 0;
    fillEll(ctx, 43.4 + glassesShift, gY, gRx, gRy, rgba('#e6f4ff', 0.1));
    fillEll(ctx, 56.6 - glassesShift, gY, gRx, gRy, rgba('#e6f4ff', 0.1));
    strokeEll(ctx, 43.4 + glassesShift, gY, gRx, gRy, 1.35, C.ink);
    strokeEll(ctx, 56.6 - glassesShift, gY, gRx, gRy, 1.35, C.ink);
    line(ctx, 49.9 - 0.2, gY - 0.3, 50.1, gY + 0.9, 1.1, C.ink);
    line(ctx, 36.9, gY - 0.6, 35.2, 28.4, 1.1, C.ink);
    line(ctx, 63.1, gY - 0.6, 64.8, 28.4, 1.1, C.ink);
    // цепочка от очков
    line(ctx, 35.2, 29, 34.5, 37, 0.45, rgba(C.gold, 0.85));
    line(ctx, 64.8, 29, 65.5, 37, 0.45, rgba(C.gold, 0.85));

    // глаза
    if (ep.cosmic) {
      var pulse = 0.65 + Math.sin(t * 3.2) * 0.2;
      fillEll(ctx, 43.4, 28.6, 2.7, 2.4, '#fbf8ef');
      fillEll(ctx, 56.6, 28.6, 2.7, 2.4, '#fbf8ef');
      guard(ctx, function () { ctx.globalAlpha = pulse; fillEll(ctx, 43.4, 28.6, 2.0, 1.9, C.cyan); fillEll(ctx, 56.6, 28.6, 2.0, 1.9, C.cyan); });
    } else if (ep.happyClosed) {
      happyEyeArc(ctx, 43.4, 29);
      happyEyeArc(ctx, 56.6, 29);
    } else {
      eye(ctx, 43.4, 28.7, 2.85, 2.45, { open: open, pupilR: (ep.pupil == null ? 1 : ep.pupil) * 1.25, lookX: look[0], lookY: look[1] });
      eye(ctx, 56.6, 28.7, 2.85, 2.45, { open: open, pupilR: (ep.pupil == null ? 1 : ep.pupil) * 1.25, lookX: look[0], lookY: look[1] });
      if (m === 'tired') {
        line(ctx, 41, 32.4, 45.7, 32.9, 0.5, rgba(C.teacherSkinShade, 0.9));
        line(ctx, 54.3, 32.9, 59, 32.4, 0.5, rgba(C.teacherSkinShade, 0.9));
      }
    }
    // блик на очках
    if (ep.glint) {
      var gl = Math.sin(t * 1.3) * 0.4;
      line(ctx, 40.6 + gl, 26.2, 45.8 + gl, 24.8, 1, rgba('#ffffff', 0.75));
      line(ctx, 54.4 + gl, 26.2, 58.8 + gl, 25.1, 1, rgba('#ffffff', 0.6));
    }

    // нос
    fillEll(ctx, 50.3, 33.4, 2.1, 1.35, C.teacherSkinShade);
    fillEll(ctx, 49.3, 34.3, 0.45, 0.35, rgba('#8a5a3a', 0.8));
    fillEll(ctx, 51.2, 34.3, 0.45, 0.35, rgba('#8a5a3a', 0.8));

    // рот
    var mo = T_MOUTH[m] || T_MOUTH.neutral;
    mouth(ctx, 50, 38.4, mo[1], mo[0], { color: '#a34b5d', stroke: 0.95 });

    if (m === 'happy' || m === 'proud') blush(ctx, 41.5, 32.8, 3.2, 2, 0.3);
    if (m === 'scream') {
      // очки съехали, капельки пота
      sweat(ctx, 30.5, 22.5, 1.6, -0.4, 0.95);
      sweat(ctx, 69.2, 23.4, 1.4, 0.4, 0.9);
    }
    // серьги
    circle(ctx, 35.4, 36.6, 1.5, C.gold, rgba(C.goldDark, 0.9), 0.4);
    circle(ctx, 64.6, 36.6, 1.5, C.gold, rgba(C.goldDark, 0.9), 0.4);
  }

  function happyEyeArc(ctx, cx, cy) {
    ctx.beginPath(); ctx.moveTo(cx - 3.1, cy + 0.4);
    ctx.quadraticCurveTo(cx, cy - 3.4, cx + 3.1, cy + 0.4);
    ctx.lineWidth = 1.35; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke();
  }

  function teacherExtras(ctx, m, t) {
    if (m === 'scream') {
      shockLines(ctx, 50, 24, 21.5, 29.5, 11, C.chalk, 0.85, t * 1.6);
      shockLines(ctx, 50, 24, 18.5, 20.5, 8, C.chalkDim, 0.5, t * 1.6 + 0.3);
    } else if (m === 'cosmic') {
      // гало и орбита звёзд
      guard(ctx, function () {
        ctx.globalAlpha = 0.16 + Math.sin(t * 2.2) * 0.05;
        strokeEll(ctx, 50, 27, 23, 24, 0.9, C.chalk);
      });
      for (var i = 0; i < 3; i++) {
        var a = t * 0.7 + i * TAU / 3;
        var sx = 50 + Math.cos(a) * 24, sy = 27 + Math.sin(a) * 25;
        spark(ctx, sx, sy, 2.6 - i * 0.3, i === 1 ? C.cyan : C.gold, 0.55 + Math.sin(t * 2 + i) * 0.35);
      }
      // волосы вверх
      for (var j = 0; j < 3; j++) {
        var xx = 42 + j * 8;
        ctx.beginPath(); ctx.moveTo(xx, 10);
        ctx.bezierCurveTo(xx - 2 + Math.sin(t * 1.6 + j) * 2, 4, xx + 2, 1, xx + Math.sin(t * 1.2 + j) * 3, -2);
        ctx.lineWidth = 0.9; ctx.strokeStyle = rgba(C.chalk, 0.55); ctx.stroke();
      }
    } else if (m === 'proud') {
      fillStar(ctx, 76, 17, 4.4, C.gold);
      spark(ctx, 80, 26, 2.2, '#fff6cf', 0.9);
      spark(ctx, 25, 20, 2.6, '#fff6cf', 0.8);
    } else if (m === 'happy') {
      spark(ctx, 29.5, 15, 2.8, '#fff6cf', 0.95);
      spark(ctx, 71.5, 20.5, 2.1, '#ffe6a3', 0.85);
      spark(ctx, 66, 10, 1.6, '#ffffff', 0.7);
    } else if (m === 'smug') {
      spark(ctx, 91, 36.5, 1.7, '#fff6cf', 0.8);
      spark(ctx, 88.5, 32, 1.1, '#ffe6a3', 0.6);
    } else if (m === 'suspicious') {
      // подозрительный прищур — лёгкий мел у стекла
      line(ctx, 38.4, 24.6, 48.4, 23.4, 0.6, rgba(C.chalk, 0.5));
    }
    // мел на жакете
    fillEll(ctx, 34, 78, 0.7, 0.45, rgba(C.chalk, 0.5));
    fillEll(ctx, 63, 89, 0.9, 0.5, rgba(C.chalk, 0.4));
    fillEll(ctx, 71, 64, 0.6, 0.4, rgba(C.chalk, 0.45));
  }

  /* ================================================================ УЧЕНИКИ
     idx 0 = Толя, 1 = Вика, 2 = Гоша.
     moods: neutral|happy|panic|smug|hide|dead|scared|bored|shock (+ синонимы)
  ========================================================================= */
  var STUDENT_MOODS = ['neutral', 'happy', 'panic', 'smug', 'hide', 'dead', 'scared', 'bored', 'shock'];
  var STU_ALIAS = {
    idle: 'neutral', calm: 'neutral', cry: 'scared', sad: 'scared', angry: 'panic', scream: 'panic',
    evil: 'smug', proud: 'smug', tired: 'bored', sleep: 'bored', cosmic: 'shock', run: 'panic',
    union: 'smug', confused: 'bored', thinking: 'bored'
  };
  function stuMood(m) {
    if (STUDENT_MOODS.indexOf(m) >= 0) return m;
    return STU_ALIAS[m] || 'neutral';
  }
  var STU_IDX = { tolya: 0, tolia: 0, vika: 1, gosha: 2, gosh: 2 };

  var S_FACE = {
    neutral: { open: 1, pupil: 1, look: [0, 0], brow: 'inner', mouth: 'tiny', mw: 0.95 },
    happy: { open: 0.94, pupil: 1, look: [0, 0], brow: 'up', mouth: 'grin', mw: 1.25, blush: 1, sparkle: 2 },
    panic: { open: 1.2, pupil: 0.48, look: [0, -1], brow: 'up', mouth: 'scream', mw: 1.35, sweat: 2, jitter: 1, lines: 1 },
    smug: { open: 0.55, pupil: 1, look: [1, 0.1], brow: 'oneUp', mouth: 'smirk', mw: 1.15, sparkle: 1 },
    hide: { open: 0.88, pupil: 0.9, look: [0, 0], brow: 'up', mouth: 'wavy', mw: 0.8 },
    dead: { cross: 1, brow: 'up', mouth: 'open', mw: 0.95, pale: 1 },
    scared: { open: 1.22, pupil: 0.42, look: [1, 0.1], brow: 'up', mouth: 'wavy', mw: 0.95, sweat: 2, pale: 0.6 },
    bored: { open: 0.3, pupil: 1, look: [1, -0.4], brow: 'level', mouth: 'flat', mw: 1.05 },
    shock: { open: 1.3, pupil: 0.34, look: [0, 0], brow: 'high', mouth: 'o', mw: 0.95, lines: 1, pale: 0.3 }
  };

  /* общее лицо ученика; cx,cy,R — центр/радиус головы */
  function studentFace(ctx, cx, cy, R, m, t, P) {
    P = P || {};
    var f = S_FACE[m] || S_FACE.neutral;
    var erx = R * (P.erx || 0.24), ery = R * (P.ery || 0.27);
    var sep = R * (P.sep || 0.36);
    var eyeY = cy + R * (P.eyeY == null ? -0.02 : P.eyeY);
    var look = f.look || [0, 0];
    var jx = f.jitter ? jitter(t, R * 0.025, 29) : 0;
    var blink = blinkAmt(t, P.seed || 0.4);
    var open = f.cross ? 0 : f.open * (1 - blink * 0.92);

    if (f.pale) guard(ctx, function () {
      ctx.globalAlpha = f.pale * 0.4;
      fillEll(ctx, cx, cy + R * 0.1, R * 1.0, R * 1.08, '#ffffff');
    });

    var pupilR = erx * (f.pupil || 1) * 0.68;
    eye(ctx, cx - sep + jx, eyeY, erx, ery, { open: open, cross: f.cross, pupilR: pupilR, lookX: look[0], lookY: look[1], pupil: P.pupilCol, white: P.white, lash: P.lash, lashCol: P.lashCol });
    eye(ctx, cx + sep + jx, eyeY, erx, ery, { open: open, cross: f.cross, pupilR: pupilR, lookX: look[0], lookY: look[1], pupil: P.pupilCol, white: P.white, lash: P.lash, lashCol: P.lashCol });

    brows(ctx, cx + jx, eyeY - ery * 1.5, sep, erx * 1.85, Math.max(0.8, R * 0.058), P.browCol || C.ink, f.brow);

    mouth(ctx, cx + jx, cy + R * (P.mouthY == null ? 0.46 : P.mouthY), erx * (f.mw || 1) * (P.mouthW || 1.7), f.mouth, {
      color: P.mouthColor || C.inkSoft,
      stroke: Math.max(0.7, R * 0.045),
      inner: P.mouthInner, tongue: P.tongue, noTeeth: P.noTeeth
    });

    if (f.blush) { blush(ctx, cx - sep * 1.3, eyeY + ery * 1.5, R * 0.2, R * 0.12, 0.32); blush(ctx, cx + sep * 1.3, eyeY + ery * 1.5, R * 0.2, R * 0.12, 0.32); }
    if (f.sweat) {
      sweat(ctx, cx - R * 1.02, cy - R * 0.25, R * 0.13, -0.5, 0.95);
      if (f.sweat > 1) sweat(ctx, cx + R * 1.05, cy + R * 0.1, R * 0.11, 0.45, 0.9);
      if (f.sweat > 2) sweat(ctx, cx + R * 0.8, cy - R * 0.55, R * 0.09, 0.2, 0.85);
    }
    if (f.lines) shockLines(ctx, cx, cy - R * 0.1, R * 1.15, R * 1.55, 9, rgba(C.ink, 0.5), 0.55, t * 0.8);
    if (f.sparkle) {
      spark(ctx, cx - R * 1.15, cy - R * 0.85, R * 0.16, '#fff6cf', 0.85);
      if (f.sparkle > 1) spark(ctx, cx + R * 1.2, cy - R * 0.5, R * 0.12, '#ffe6a3', 0.7);
    }
    return f;
  }

  /* ---- Толя: паника, худи, вечно потерянное лицо */
  function toliaInner(ctx, m, t) {
    var br = bob(t, 0.6, 2.05);
    var jx = (m === 'panic' || m === 'shock' || m === 'scared') ? jitter(t, 0.85, 28) : 0;
    var tilt = (m === 'dead') ? 0.19 : (m === 'bored' ? 0.08 : 0);
    ctx.translate(jx, br * 0.35);
    var headY = 25.5 + (m === 'hide' ? 9 : m === 'bored' ? 2 : m === 'dead' ? 2.5 : 0);
    var R = 14.2;

    // туловище
    ctx.beginPath();
    ctx.moveTo(12, 100); ctx.bezierCurveTo(13, 75, 24, 56, 38, 52.5);
    ctx.quadraticCurveTo(50, 48.6, 62, 52.5); ctx.bezierCurveTo(76, 56, 87, 75, 88, 100);
    ctx.closePath(); ctx.fillStyle = C.toliaHood; ctx.fill();
    guard(ctx, function () {
      ctx.clip();
      line(ctx, 12, 96, 88, 96, 9, rgba(C.toliaHoodDark, 0.55));
      line(ctx, 24, 63, 30, 100, 3, rgba(C.toliaHoodDark, 0.35));
      line(ctx, 76, 63, 70, 100, 3, rgba(C.toliaHoodDark, 0.35));
    });
    // капюшон сзади
    fillEll(ctx, 50, headY + 15, 19.5, 8.5, C.toliaHoodDark);

    // шея
    fillRound(ctx, 46, headY + 11.5, 8, 9, 2, C.toliaSkin);

    // руки по настроению
    function arm(fx, fy, tx, ty, r) {
      line(ctx, fx, fy, tx, ty, 9.4, '#2f3d26');
      line(ctx, fx, fy, tx, ty, 7.6, C.toliaHoodDark);
      fillEll(ctx, tx, ty, r, r * 0.96, C.toliaSkin);
      strokeEll(ctx, tx, ty, r, r * 0.96, 0.6, rgba(C.skinDark, 0.6));
      line(ctx, tx - r * 0.5, ty - r * 0.15, tx + r * 0.1, ty - r * 0.3, 0.5, rgba(C.skinDark, 0.5));
    }

    // голова
    fillEll(ctx, 50, headY, R, R * 1.05, C.toliaSkin);
    fillEll(ctx, 35.4, headY + 1.2, 2.9, 3.5, C.toliaSkin);
    fillEll(ctx, 64.6, headY + 1.2, 2.9, 3.5, C.toliaSkin);
    strokeEll(ctx, 35.4, headY + 1.2, 2.9, 3.5, 0.45, rgba(C.skinDark, 0.5));
    strokeEll(ctx, 64.6, headY + 1.2, 2.9, 3.5, 0.45, rgba(C.skinDark, 0.5));

    // волосы: шапка + вихры
    var sp = (m === 'panic' || m === 'shock') ? 4.2 : (m === 'scared' ? 2.2 : 0);
    ctx.beginPath();
    ctx.moveTo(35.6, headY - 1.5);
    ctx.quadraticCurveTo(34.2, headY - 13.5, 50, headY - 15.8);
    ctx.quadraticCurveTo(65.8, headY - 13.5, 64.4, headY - 1.5);
    ctx.quadraticCurveTo(57.6, headY - 8.8, 50, headY - 9);
    ctx.quadraticCurveTo(42.4, headY - 8.8, 35.6, headY - 1.5);
    ctx.closePath(); ctx.fillStyle = C.toliaHair; ctx.fill();
    fillPoly(ctx, [[36, headY - 11.5], [31.6, headY - 22 - sp], [43, headY - 13.5]], C.toliaHair);
    fillPoly(ctx, [[42.4, headY - 15], [45.8, headY - 27.5 - sp * 1.25], [51.4, headY - 15.2]], C.toliaHair);
    fillPoly(ctx, [[50.6, headY - 15.2], [57.6, headY - 26.5 - sp], [61, headY - 13.2]], C.toliaHair);
    fillPoly(ctx, [[58.4, headY - 13.6], [67.4, headY - 21 - sp], [64.2, headY - 7.6]], C.toliaHair);
    // лоб и брови
    studentFace(ctx, 50, headY, R, m, t, { seed: 0.3, browCol: C.toliaHair, mouthColor: '#7a4b48', pupilCol: '#2a1f18' });

    // капюшон-воротник поверх шеи
    ctx.beginPath();
    ctx.moveTo(38.5, headY + 13.5);
    ctx.quadraticCurveTo(50, headY + 21, 61.5, headY + 13.5);
    ctx.quadraticCurveTo(50, headY + 17.6, 38.5, headY + 13.5);
    ctx.closePath(); ctx.fillStyle = C.toliaHoodDark; ctx.fill();
    // шнурки
    line(ctx, 45, headY + 18.5, 42.4, headY + 30, 1.1, '#e8e2cf');
    line(ctx, 55, headY + 18.5, 57.6, headY + 30, 1.1, '#e8e2cf');
    fillRound(ctx, 41.4, headY + 29.5, 2, 3.2, 0.6, '#d8d2bf');
    fillRound(ctx, 56.6, headY + 29.5, 2, 3.2, 0.6, '#d8d2bf');

    // руки
    if (m === 'panic' || m === 'shock') { arm(25, 60, 27.5, 38, 4.5); arm(75, 60, 72.5, 38, 4.5); }
    else if (m === 'scared') { arm(25, 62, 30, 47, 4.3); arm(75, 62, 70, 47, 4.3); }
    else if (m === 'hide') { arm(28, 60, 38.5, headY - 16.5, 4.2); arm(72, 60, 61.5, headY - 16.5, 4.2); }
    else if (m === 'dead') { arm(24, 62, 17, 79, 4.2); arm(76, 62, 83, 79, 4.2); }
    else if (m === 'bored') { arm(73, 62, 63.5, headY + 5.5, 4.3); }
    else if (m === 'happy') { arm(74, 60, 79, 33, 4.4); }
    else if (m === 'smug') { arm(30, 62, 35, 82, 4.2); arm(70, 62, 65, 82, 4.2); }
    else { arm(30, 62, 37, 84, 4.2); arm(70, 62, 63, 84, 4.2); }

    // карман худи
    ctx.beginPath(); ctx.moveTo(38.5, 86);
    ctx.quadraticCurveTo(50, 92.5, 61.5, 86);
    ctx.lineWidth = 0.9; ctx.strokeStyle = rgba(C.toliaHoodDark, 0.8); ctx.stroke();

    // призрак при 'dead'
    if (m === 'dead') {
      guard(ctx, function () {
        ctx.globalAlpha = 0.55;
        fillEll(ctx, 50, 2.5, 8, 7, '#eef3ee');
        fillEll(ctx, 50, 7.5, 6.2, 5, '#eef3ee');
        fillEll(ctx, 47.4, 4.6, 1.4, 1.6, C.ink);
        fillEll(ctx, 52.6, 4.6, 1.4, 1.6, C.ink);
      });
    }
    if (m === 'hide') {
      // голова вжата в плечи, глаза над воротом
      line(ctx, 26, 52, 31, 42, 0.8, rgba(C.toliaHoodDark, 0.6));
    }
  }

  /* ---- Вика: самоуверенность, телефон, идеальное произношение */
  function vikaInner(ctx, m, t) {
    var br = bob(t, 0.5, 1.75, 1);
    var jx = (m === 'panic' || m === 'shock') ? jitter(t, 0.7, 26) : 0;
    var tilt = (m === 'smug' ? -0.06 : m === 'bored' ? 0.05 : m === 'dead' ? 0.12 : 0);
    ctx.translate(jx, br * 0.32);
    var headY = 25.8 + (m === 'bored' ? 2 : 0);
    var R = 13.4;

    // волосы сзади
    fillEll(ctx, 50, headY, 17.6, 17.8, C.vikaHair);
    ctx.beginPath();
    ctx.moveTo(32.8, headY - 4);
    ctx.bezierCurveTo(29.5, headY + 14, 30.5, headY + 27, 33.4, headY + 36);
    ctx.quadraticCurveTo(38.5, headY + 30, 39.2, headY + 14);
    ctx.closePath(); ctx.fillStyle = C.vikaHair; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(67.2, headY - 4);
    ctx.bezierCurveTo(70.5, headY + 14, 69.5, headY + 27, 66.6, headY + 36);
    ctx.quadraticCurveTo(61.5, headY + 30, 60.8, headY + 14);
    ctx.closePath(); ctx.fillStyle = C.vikaHair; ctx.fill();

    // туловище
    ctx.beginPath();
    ctx.moveTo(14, 100); ctx.bezierCurveTo(15, 76, 25, 57, 38.5, 53.5);
    ctx.quadraticCurveTo(50, 49.6, 61.5, 53.5); ctx.bezierCurveTo(75, 57, 85, 76, 86, 100);
    ctx.closePath(); ctx.fillStyle = C.vikaTop; ctx.fill();
    guard(ctx, function () {
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(14, 53, 30, 47);
      line(ctx, 60, 53, 56, 100, 2.2, rgba(C.vikaTopDark, 0.5));
      line(ctx, 40, 53, 44, 100, 2.2, rgba(C.vikaTopDark, 0.5));
    });
    // белый воротник
    fillPoly(ctx, [[42.5, 51], [50, 58.5], [57.5, 51], [61.5, 53.5], [70, 58], [62, 64], [50, 63.5], [38, 64], [30, 58], [38.5, 53.5]], C.blouse);
    fillPoly(ctx, [[43.5, 52], [50, 58], [56.5, 52], [50, 61.5]], C.vikaTopDark);
    // цепочка
    for (var i = 0; i < 4; i++) circle(ctx, 46 + i * 2.8, 66 + Math.abs(i - 1.5) * 0.6, 0.8, C.gold, rgba(C.goldDark, 0.7), 0.3);

    // шея
    fillRound(ctx, 46.4, headY + 11.5, 7.2, 9, 2, C.vikaSkin);

    // руки
    function arm(fx, fy, tx, ty, r) {
      line(ctx, fx, fy, tx, ty, 8.8, '#4f1a33');
      line(ctx, fx, fy, tx, ty, 7.1, C.vikaTopDark);
      fillEll(ctx, tx, ty, r, r * 0.96, C.vikaSkin);
      strokeEll(ctx, tx, ty, r, r * 0.96, 0.5, rgba(C.skinDark, 0.5));
      line(ctx, tx - r * 0.5, ty - r * 0.12, tx + r * 0.1, ty - r * 0.28, 0.45, rgba(C.skinDark, 0.45));
    }

    // голова
    fillEll(ctx, 50, headY, R, R * 1.06, C.vikaSkin);
    fillEll(ctx, 36.8, headY + 1.2, 2.6, 3.2, C.vikaSkin);
    fillEll(ctx, 63.2, headY + 1.2, 2.6, 3.2, C.vikaSkin);

    // волосы сверху: косой пробор
    ctx.beginPath();
    ctx.moveTo(36.8, headY - 1.2);
    ctx.quadraticCurveTo(35, headY - 14, 50, headY - 15.8);
    ctx.quadraticCurveTo(65, headY - 14, 63.2, headY - 1.2);
    ctx.quadraticCurveTo(57.5, headY - 9.2, 49, headY - 8.2);
    ctx.quadraticCurveTo(42, headY - 7, 36.8, headY - 1.2);
    ctx.closePath(); ctx.fillStyle = C.vikaHair; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(38, headY - 12.5);
    ctx.quadraticCurveTo(46, headY - 20.5, 58.5, headY - 16);
    ctx.quadraticCurveTo(50, headY - 12.4, 40.5, headY - 6.5);
    ctx.closePath(); ctx.fillStyle = C.vikaHairLight; ctx.fill();
    // ободок
    ctx.beginPath(); ctx.moveTo(36.6, headY - 9.5);
    ctx.quadraticCurveTo(50, headY - 18.8, 63.4, headY - 9.5);
    ctx.lineWidth = 2.1; ctx.strokeStyle = C.vikaHeadband; ctx.lineCap = 'round'; ctx.stroke();
    // блики волос
    guard(ctx, function () {
      ctx.globalAlpha = 0.5;
      line(ctx, 41, headY - 15, 39.4, headY - 4, 0.8, C.vikaHairLight);
      line(ctx, 59.6, headY - 13.6, 61.2, headY - 5, 0.7, C.vikaHairLight);
    });

    // лицо
    studentFace(ctx, 50, headY, R, m, t, {
      seed: 1.1, lash: 2, lashCol: '#5a2a18', mouthColor: '#c2435c', mouthW: 1.55,
      eyeY: -0.03, erx: 0.245, ery: 0.275, browCol: '#7a3d1c', pupilCol: '#2b1c12'
    });

    // серьги-кольца
    guard(ctx, function () {
      ctx.lineWidth = 0.7; ctx.strokeStyle = C.gold;
      ctx.beginPath(); ctx.arc(36.4, headY + 5.2, 1.9, -0.4, Math.PI + 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(63.6, headY + 5.2, 1.9, -0.4, Math.PI + 0.9); ctx.stroke();
    });

    // телефон
    var phoneDropped = (m === 'dead' || m === 'shock');
    if (!phoneDropped) {
      arm(75, 62, 77, 72, 4.1);
      guard(ctx, function () {
        ctx.translate(77.6, 75.6); ctx.rotate(-0.16);
        fillRound(ctx, -5, -8.6, 10, 17.2, 1.6, '#2b3442');
        fillRound(ctx, -4.2, -7.6, 8.4, 14.6, 1.2, m === 'bored' ? '#c9f7ff' : '#8fe6ff');
        fillRound(ctx, -4.2, -7.6, 8.4, 4.6, 1.2, 'rgba(255,255,255,0.5)');
        fillEll(ctx, 0, 0.4, 0.8, 0.8, '#ffffff');
      });
    } else {
      arm(75, 62, 70, 70, 4.1);
      guard(ctx, function () {
        ctx.translate(63, 92); ctx.rotate(0.42);
        fillRound(ctx, -4.4, -7.4, 8.8, 14.8, 1.4, '#2b3442');
        fillRound(ctx, -3.6, -6.6, 7.2, 12.4, 1, '#6f8a9e');
      });
    }

    if (m === 'smug') arm(27, 62, 33.5, 20, 4.2);   // поправляет волосы
    else if (m === 'panic') { arm(27, 62, 31, 40, 4.2); arm(73, 62, 69, 40, 4.2); }
    else if (m === 'scared') { arm(27, 62, 32, 47, 4.1); }
    else if (m === 'bored') arm(30, 62, 40, 44, 4.1);

    if (m === 'dead') {
      guard(ctx, function () {
        ctx.globalAlpha = 0.5;
        fillEll(ctx, 50, 3, 7.6, 6.6, '#eef3ee');
        fillEll(ctx, 50, 7.6, 5.8, 4.6, '#eef3ee');
        fillEll(ctx, 47.6, 4.2, 1.3, 1.5, C.ink);
        fillEll(ctx, 52.4, 4.2, 1.3, 1.5, C.ink);
      });
    }
    // идеальное произношение: звёздочки-нимб
    if (m === 'smug' || m === 'happy') {
      spark(ctx, 72, 12, 2.4, '#fff6cf', 0.9);
      spark(ctx, 28, 15, 1.9, '#ffe6a3', 0.8);
    }
  }

  /* ---- Гоша: прячется за растением и постепенно становится растением */
  function leafShape(ctx, x, y, len, ang, w, fill, dark) {
    guard(ctx, function () {
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(w, -len * 0.2, w * 1.02, -len * 0.74, 0, -len);
      ctx.bezierCurveTo(-w * 1.02, -len * 0.74, -w, -len * 0.2, 0, 0);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.lineWidth = 0.7; ctx.strokeStyle = dark; ctx.stroke();
      line(ctx, 0, -len * 0.06, 0, -len * 0.9, 0.85, dark);
      for (var i = 1; i <= 3; i++) {
        var yy = -len * (0.16 + i * 0.19);
        var xx = w * (1 - i * 0.2);
        line(ctx, 0, yy, xx * 0.72, yy - len * 0.1, 0.45, rgba(dark, 0.75));
        line(ctx, 0, yy, -xx * 0.72, yy - len * 0.1, 0.45, rgba(dark, 0.75));
      }
    });
  }

  function goshaInner(ctx, m, t) {
    var br = bob(t, 0.5, 1.9, 2);
    var sway = (m === 'panic' || m === 'shock') ? jitter(t, 1.2, 24) : 0;
    var headY = m === 'hide' ? 36 : m === 'dead' ? 45 : m === 'panic' || m === 'shock' ? 21 : 24;
    var R = 12.4;
    var swing = function (i) { return Math.sin(t * 1.15 + i * 1.7) * 0.035 + (m === 'panic' || m === 'shock' ? Math.sin(t * 9 + i) * 0.02 : 0); };
    ctx.translate(sway, br * 0.3);

    // горшок
    fillPoly(ctx, [[34, 77], [66, 77], [61.5, 98], [38.5, 98]], C.pot);
    fillPoly(ctx, [[34, 77], [66, 77], [64.4, 84], [35.6, 84]], C.potDark);
    fillRound(ctx, 31.6, 74.4, 36.8, 7.4, 1.6, C.pot);
    fillEll(ctx, 50, 78.6, 13.4, 2.4, '#4a3423');
    fillEll(ctx, 42, 94, 3, 1.2, rgba(C.potDark, 0.5));

    // тело (за листьями)
    ctx.beginPath();
    ctx.moveTo(30, 100); ctx.quadraticCurveTo(32, 52, 50, 48);
    ctx.quadraticCurveTo(68, 52, 70, 100); ctx.closePath();
    ctx.fillStyle = '#5e7186'; ctx.fill();

    // задние листья
    leafShape(ctx, 44, 78, 31, -0.82 + swing(0), 8.6, C.leafDark, '#20432a');
    leafShape(ctx, 47, 78, 37, -0.42 + swing(1), 9.4, C.leaf, C.leafDark);
    leafShape(ctx, 50, 78, 41, -0.02 + swing(2), 10, C.leaf, C.leafDark);
    leafShape(ctx, 53, 78, 36, 0.4 + swing(3), 9.2, C.leafLight, C.leafDark);
    leafShape(ctx, 57, 78, 30, 0.78 + swing(4), 8.2, C.leaf, C.leafDark);

    // голова (если видна)
    if (m !== 'dead') {
      fillEll(ctx, 50, headY, R, R * 1.05, C.goshaSkin);
      fillEll(ctx, 37.9, headY + 1, 2.5, 3.1, C.goshaSkin);
      fillEll(ctx, 62.1, headY + 1, 2.5, 3.1, C.goshaSkin);
      // кудри
      var curls = [[39, headY - 9], [44, headY - 13], [50, headY - 14.6], [56, headY - 13], [61, headY - 9], [36.8, headY - 3.6], [63.2, headY - 3.6]];
      for (var ci = 0; ci < curls.length; ci++) {
        fillEll(ctx, curls[ci][0], curls[ci][1], 4.3, 4.1, C.goshaHair);
      }
      ctx.beginPath();
      ctx.moveTo(38.6, headY - 8.4);
      ctx.quadraticCurveTo(44, headY - 17.6, 56, headY - 17.2);
      ctx.quadraticCurveTo(61.4, headY - 16.6, 61.4, headY - 8.4);
      ctx.quadraticCurveTo(50, headY - 13, 38.6, headY - 8.4);
      ctx.closePath(); ctx.fillStyle = C.goshaHair; ctx.fill();

      // круглые очки
      fillEll(ctx, 44.2, headY - 0.6, 4.4, 4.0, rgba('#e9f7ff', 0.16));
      fillEll(ctx, 55.8, headY - 0.6, 4.4, 4.0, rgba('#e9f7ff', 0.16));
      strokeEll(ctx, 44.2, headY - 0.6, 4.4, 4.0, 0.95, C.ink);
      strokeEll(ctx, 55.8, headY - 0.6, 4.4, 4.0, 0.95, C.ink);
      line(ctx, 48.6, headY - 1, 51.4, headY - 1, 0.8, C.ink);
      line(ctx, 39.8, headY - 1.2, 38, headY + 0.6, 0.7, C.ink);
      line(ctx, 60.2, headY - 1.2, 62, headY + 0.6, 0.7, C.ink);

      studentFace(ctx, 50, headY, R, m, t, {
        seed: 2.2, erx: 0.225, ery: 0.25, sep: 0.345, mouthY: 0.5, mouthW: 1.62,
        browCol: '#4a3320', mouthColor: '#7c4e42', pupilCol: '#241a12'
      });
      // блик на очках
      line(ctx, 42.2, headY - 2.4, 45.4, headY - 3.4, 0.7, rgba('#ffffff', 0.7));
      line(ctx, 53.8, headY - 2.4, 57, headY - 3.4, 0.7, rgba('#ffffff', 0.6));
    }

    // передние листья
    leafShape(ctx, 39, 82, 27, -0.62 + swing(5), 7.4, C.leaf, C.leafDark);
    leafShape(ctx, 47, 82, 30, -0.12 + swing(6), 8, C.leafLight, C.leafDark);
    leafShape(ctx, 58, 82, 26, 0.5 + swing(7), 7.2, C.leaf, C.leafDark);
    if (m === 'hide') leafShape(ctx, 50, headY + 2, 21, -0.06, 8.2, C.leaf, C.leafDark);

    // руки, держатся за лист
    function hand(x, y) {
      fillEll(ctx, x, y, 3.5, 3.2, C.goshaSkin);
      strokeEll(ctx, x, y, 3.5, 3.2, 0.45, rgba(C.skinDark, 0.5));
      line(ctx, x - 1.6, y - 0.6, x + 1.4, y - 0.8, 0.5, rgba(C.skinDark, 0.6));
    }
    if (m === 'hide') { hand(43, headY + 7.5); hand(57, headY + 7.5); }
    else if (m === 'scared') { hand(40.5, 62); hand(59.5, 62); }
    else if (m === 'dead') { hand(64, 76.5); }
    else { hand(40.5, 64); hand(59.5, 64); }

    // Гоша становится растением
    if (m === 'dead') {
      leafShape(ctx, 58, 70, 18, 0.5, 5.4, C.leafLight, C.leafDark);
      fillEll(ctx, 41, 74, 2.6, 1.3, '#3a2a1c'); // ботинок на горшке
    }
    if (m === 'bored') leafShape(ctx, 52, headY - 8, 14, 0.5, 5.2, C.leafLight, C.leafDark);
    if (m === 'smug') fillEll(ctx, 61, headY - 3, 0.8, 0.8, '#c9f7ff'); // капелька самоуверенности
    // шевеление листьев на панике
    if (m === 'panic') {
      motionLines(ctx, 32, 60, 6, 3, C.leafDark, 0.4, 0);
    }
  }

  A.drawStudent = function (ctx, r, idx, mood, t) {
    if (!ctx || !r || !(r.w > 0) || !(r.h > 0)) return;
    t = t || 0;
    if (typeof idx === 'string') idx = STU_IDX[idx.toLowerCase()] || 0;
    idx = idx === 1 || idx === 2 ? idx : 0;
    var m = stuMood(mood || 'neutral');
    guard(ctx, function () {
      box(ctx, r);
      if (idx === 0) toliaInner(ctx, m, t);
      else if (idx === 1) vikaInner(ctx, m, t);
      else goshaInner(ctx, m, t);
    });
  };

  /* ================================================== ЖИВЫЕ АРТИКЛИ И БУКВЫ
     Одна механика: армянский глиф = тело существа, поверх — лицо, лапки, ручки.
     Артикль — главный герой: крупные глаза, брови, кроссовки, характер.
     Буквы — то же, но проще: тонкие ручки, тёмные ботинки.
     moods article: idle|angry|run|proud|sleep|union|cry|happy|evil
     moods letter:  neutral|happy|angry|scared|panic|smug|cry|sleep|evil|union|run|dead|shock|bored|hide|cosmic
  ========================================================================= */
  var LETTER_MOODS = ['neutral', 'happy', 'angry', 'scared', 'panic', 'smug', 'cry', 'sleep', 'evil', 'union', 'run', 'dead', 'shock', 'bored', 'hide', 'cosmic'];
  var LETTER_ALIAS = {
    idle: 'neutral', proud: 'smug', scream: 'angry', tired: 'sleep', sad: 'cry',
    scream: 'angry', scared: 'scared', union: 'union', happy: 'happy', evil: 'evil'
  };
  function letterMood(m) {
    if (LETTER_MOODS.indexOf(m) >= 0) return m;
    return LETTER_ALIAS[m] || 'neutral';
  }
  var ARTICLE_TO_FACE = { idle: 'neutral', angry: 'angry', run: 'run', proud: 'smug', sleep: 'sleep', union: 'union', cry: 'cry', happy: 'happy', evil: 'evil' };

  var G_FACE = {
    neutral: { open: 1, pupil: 1, look: [0, 0], brow: 'level', mouth: 'tiny' },
    happy: { open: 0.94, pupil: 1, look: [0, 0], brow: 'up', mouth: 'grin', blush: 1, sparkle: 2 },
    angry: { open: 0.82, pupil: 0.85, brow: 'down', mouth: 'frown', steam: 1 },
    scared: { open: 1.18, pupil: 0.45, look: [0, -0.2], brow: 'up', mouth: 'wavy', sweat: 1 },
    panic: { open: 1.28, pupil: 0.34, brow: 'high', mouth: 'scream', sweat: 2, jitter: 1, lines: 1 },
    smug: { open: 0.5, pupil: 1, look: [1, 0], brow: 'oneUp', mouth: 'smirk', blush: 1 },
    cry: { open: 0.85, pupil: 0.9, look: [0, 0.3], brow: 'sad', mouth: 'frown', tears: 1 },
    sleep: { open: 0, pupil: 0, brow: 'level', mouth: 'tiny', zzz: 1 },
    evil: { open: 0.5, pupil: 0.55, brow: 'down', mouth: 'smirk', evilEyes: 1 },
    union: { open: 0.9, pupil: 1, brow: 'down', mouth: 'flat', sign: 1 },
    run: { open: 1, pupil: 1, look: [-1, 0], brow: 'up', mouth: 'scream', motion: 1 },
    dead: { cross: 1, brow: 'up', mouth: 'o', halo: 1 },
    shock: { open: 1.3, pupil: 0.3, brow: 'high', mouth: 'o', lines: 1 },
    bored: { open: 0.3, pupil: 1, look: [1, -0.3], brow: 'level', mouth: 'flat' },
    hide: { open: 0.85, pupil: 0.9, look: [0, 0], brow: 'up', mouth: 'wavy' },
    cosmic: { open: 1.05, pupil: 0.4, brow: 'high', mouth: 'o', cosmic: 1 }
  };

  function measureGlyph(ctx, glyph, size, cx, cy) {
    ctx.font = '800 ' + size.toFixed(2) + 'px ' + FONT;
    var m = ctx.measureText(glyph);
    var asc = (m.actualBoundingBoxAscent > 0) ? m.actualBoundingBoxAscent : size * 0.74;
    var desc = (m.actualBoundingBoxDescent > 0) ? m.actualBoundingBoxDescent : size * 0.2;
    var w = m.width > 0 ? m.width : size * 0.55;
    var h = asc + desc;
    return {
      w: w, h: h, asc: asc, desc: desc,
      base: cy + (asc - desc) / 2,
      top: cy - h / 2, bottom: cy + h / 2,
      cx: cx, cy: cy, size: size
    };
  }

  /* тело-глиф: жирная обводка + тёплая заливка + блик */
  function glyphSticker(ctx, b, opt) {
    opt = opt || {};
    var glyph = b.glyph, size = b.size;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    // тень-подложка
    guard(ctx, function () {
      ctx.globalAlpha = 0.22; ctx.fillStyle = C.ink;
      ctx.fillText(glyph, b.cx + size * 0.028, b.base + size * 0.065);
    });
    // обводка
    ctx.strokeStyle = opt.ink || C.ink;
    ctx.lineWidth = Math.max(1, size * (opt.outline == null ? 0.145 : opt.outline));
    ctx.strokeText(glyph, b.cx, b.base);
    // заливка
    var g = ctx.createLinearGradient(0, b.top, 0, b.bottom);
    g.addColorStop(0, opt.fillTop || '#fff8e6');
    g.addColorStop(0.55, opt.fill || '#f7e8c2');
    g.addColorStop(1, opt.fillBottom || '#e0c78d');
    ctx.fillStyle = g;
    ctx.fillText(glyph, b.cx, b.base);
    // верхний блик
    guard(ctx, function () {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.rect(b.cx - b.w, b.top - 2, b.w * 2, b.h * 0.4);
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(glyph, b.cx, b.base);
    });
    ctx.restore();
  }

  /* ручки существа. Поза зависит от настроения. */
  function glyphArms(ctx, b, mood, t, isArticle) {
    var size = b.size, cx = b.cx, cy = b.cy;
    var wdt = Math.max(0.9, size * (isArticle ? 0.052 : 0.04));
    var handR = size * (isArticle ? 0.058 : 0.042);
    var sy = b.top + b.h * 0.55;
    var sxL = cx - b.w * 0.46, sxR = cx + b.w * 0.46;
    var eyeY = b.top + b.h * 0.34;
    var L, R;
    switch (mood) {
      case 'happy': L = [cx - b.w * 0.85, cy - b.h * 0.55]; R = [cx + b.w * 0.85, cy - b.h * 0.55]; break;
      case 'angry': L = [cx - b.w * 0.72, eyeY + size * 0.04]; R = [cx + b.w * 0.72, eyeY + size * 0.04]; break;
      case 'scared': case 'panic': L = [cx - b.w * 0.62, eyeY + size * 0.06]; R = [cx + b.w * 0.62, eyeY + size * 0.06]; break;
      case 'cry': L = [cx - b.w * 0.42, eyeY + size * 0.02]; R = [cx + b.w * 0.42, eyeY + size * 0.02]; break;
      case 'smug': L = [cx - b.w * 0.62, cy + b.h * 0.42]; R = [cx + b.w * 0.66, cy + b.h * 0.1]; break;
      case 'union':
        L = [cx - b.w * 0.5, cy + b.h * 0.42];
        R = b.signGeom ? [b.signGeom.handX, b.signGeom.handY] : [cx + b.w * 0.55 + size * 0.1, b.top + size * 0.486];
        break;
      case 'run': L = [cx - b.w * 0.7, cy + b.h * 0.55]; R = [cx + b.w * 0.78, cy - b.h * 0.2]; break;
      case 'sleep': L = [cx - b.w * 0.6, cy + b.h * 0.62]; R = [cx + b.w * 0.6, cy + b.h * 0.62]; break;
      case 'evil': L = [cx - b.w * 0.7, cy + b.h * 0.1]; R = [cx + b.w * 0.7, cy + b.h * 0.1]; break;
      case 'dead': L = [cx - b.w * 0.66, cy + b.h * 0.66]; R = [cx + b.w * 0.66, cy + b.h * 0.66]; break;
      case 'cosmic': L = [cx - b.w * 0.95, cy]; R = [cx + b.w * 0.95, cy]; break;
      default: L = [cx - b.w * 0.66, cy + b.h * 0.5]; R = [cx + b.w * 0.66, cy + b.h * 0.5];
    }
    function arm(sx, sy2, hx, hy) {
      var mx = (sx + hx) / 2, my = (sy2 + hy) / 2;
      var sway = mood === 'run' ? size * 0.04 * Math.sin(t * 15) : size * 0.02 * Math.sin(t * 3 + hx);
      ctx.beginPath();
      ctx.moveTo(sx, sy2);
      ctx.quadraticCurveTo(mx + sway, my - size * 0.05, hx, hy);
      ctx.lineWidth = wdt; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke();
      if (isArticle) {
        circle(ctx, hx, hy, handR, '#f7e8c2', C.ink, Math.max(0.5, handR * 0.35));
        circle(ctx, hx, hy, handR * 0.4, rgba('#ffffff', 0.35));
      } else {
        circle(ctx, hx, hy, handR, C.ink);
      }
    }
    arm(sxL, sy, L[0], L[1]);
    arm(sxR, sy, R[0], R[1]);
  }

  function glyphLegs(ctx, b, mood, t, isArticle, opts) {
    var size = b.size, cx = b.cx;
    var hipY = b.bottom - size * 0.03;
    var spread = size * (isArticle ? 0.12 : 0.1);
    var lw = Math.max(0.9, size * 0.05);
    var sleep = mood === 'sleep';
    var run = mood === 'run';
    var walk = run ? Math.sin(t * 13) : Math.sin(t * 3.4);
    var legLen = (b.legLen || size * 0.2) * (sleep ? 0.62 : 1);
    var hipYL = hipY + (sleep ? size * 0.06 : 0);
    var hipYR = hipYL;
    var footY = hipYL + legLen;
    var fl = [cx - spread + (run ? walk * size * 0.14 : walk * size * 0.025), footY];
    var fr = [cx + spread + (run ? -walk * size * 0.14 : -walk * size * 0.025), footY + (run ? Math.max(0, walk) * size * 0.06 : 0)];
    if (sleep) { fl = [cx - spread * 0.85, footY + size * 0.02]; fr = [cx + spread * 1.05, footY + size * 0.02]; }
    // ножки
    line(ctx, cx - spread * 0.8, hipYL, fl[0], fl[1], lw, C.ink);
    line(ctx, cx + spread * 0.8, hipYR, fr[0], fr[1], lw, C.ink);
    // ступни
    var shoeW = size * (isArticle ? 0.1 : 0.085), shoeH = b.shoeH || size * (isArticle ? 0.062 : 0.05);
    function shoe(x, y, flip) {
      if (isArticle) {
        fillEll(ctx, x, y, shoeW, shoeH, '#cc3f2f');
        strokeEll(ctx, x, y, shoeW, shoeH, Math.max(0.5, size * 0.014), C.ink);
        fillEll(ctx, x - shoeW * 0.15, y + shoeH * 0.45, shoeW * 0.72, shoeH * 0.26, '#f7f1e0');
        line(ctx, x - shoeW * 0.5, y - shoeH * 0.1, x + shoeW * 0.5, y - shoeH * 0.1, Math.max(0.4, size * 0.012), rgba('#ffffff', 0.5));
      } else {
        fillEll(ctx, x, y, shoeW, shoeH * 0.9, C.ink);
      }
    }
    shoe(fl[0], fl[1] + shoeH * 0.5);
    shoe(fr[0], fr[1] + shoeH * 0.5);
  }

  /* лицо на глифе */
  function glyphFace(ctx, b, mood, t, isArticle, opt) {
    opt = opt || {};
    var m = G_FACE[mood] || G_FACE.neutral;
    var size = b.size, cx = b.cx;
    var eyeY = b.top + b.h * (isArticle ? 0.33 : 0.32);
    var sep = clamp(b.w * 0.245, size * 0.07, size * 0.175);
    var erx = clamp(b.w * 0.155, size * 0.052, size * (isArticle ? 0.09 : 0.08));
    var ery = erx * (isArticle ? 1.1 : 1.0);
    var blink = blinkAmt(t, isArticle ? 0.7 : 1.6);
    var jx = m.jitter ? jitter(t, size * 0.02, 30) : 0;
    var open = m.cross || m.open === 0 ? 0 : m.open * (1 - blink * 0.9);

    // злые/космические глаза
    var white = m.evilEyes ? '#2b2530' : '#fbf8ef';
    var pupil = m.evilEyes ? '#ff4a3a' : (m.cosmic ? C.cyan : C.ink);
    var glint = !m.evilEyes;

    var eyeOpt = { open: open, cross: m.cross, pupilR: erx * (m.pupil == null ? 1 : m.pupil) * 0.7, lookX: (m.look || [0, 0])[0], lookY: (m.look || [0, 0])[1], white: white, pupil: pupil, glint: glint, ink: m.evilEyes ? '#0e0c10' : C.ink, halo: '#f6f2df' };
    eye(ctx, cx - sep + jx, eyeY, erx, ery, eyeOpt);
    eye(ctx, cx + sep + jx, eyeY, erx, ery, eyeOpt);

    // брови — толстые, с меловым ореолом (иначе теряются на фоне)
    var browY = eyeY - ery * 1.35;
    var browT = Math.max(0.8, size * (isArticle ? 0.05 : 0.04));
    var browInk = m.evilEyes ? '#0e0c10' : C.ink;
    brows(ctx, cx + jx, browY, sep, erx * 1.9, browT * 2.2, 'rgba(246,242,223,0.92)', m.brow);
    brows(ctx, cx + jx, browY, sep, erx * 1.9, browT, browInk, m.brow);

    // рот: светлая «мордочка», чтобы читался и на просвете глифа
    var mouthY = b.top + b.h * (isArticle ? 0.72 : 0.7);
    var mw = clamp(b.w * 0.44, size * 0.12, size * (isArticle ? 0.24 : 0.2));
    guard(ctx, function () {
      ctx.globalAlpha = 0.95;
      fillEll(ctx, cx + jx, mouthY + mw * 0.04, mw * 0.82, mw * 0.5, '#f7eecf');
    });
    mouth(ctx, cx + jx, mouthY, mw, m.mouth, {
      color: C.ink, stroke: Math.max(0.7, size * 0.026), inner: C.blood, tongue: C.tongue
    });

    if (m.blush) {
      blush(ctx, cx - sep * 1.55, eyeY + ery * 1.5, erx * 0.85, ery * 0.6, 0.4);
      blush(ctx, cx + sep * 1.55, eyeY + ery * 1.5, erx * 0.85, ery * 0.6, 0.4);
    }
    if (m.sweat) {
      sweat(ctx, cx + sep + erx * 1.9, eyeY - ery * 0.6, size * 0.06, 0.4, 0.95);
      if (m.sweat > 1) sweat(ctx, cx - sep - erx * 1.9, eyeY - ery * 0.2, size * 0.05, -0.5, 0.9);
    }
    if (m.tears) {
      tear(ctx, cx - sep - erx * 1.3, eyeY + ery * 1.75, size * 0.08, 0.95);
      tear(ctx, cx + sep + erx * 1.25, eyeY + ery * 2.05, size * 0.07, 0.9);
      tear(ctx, cx - sep - erx * 1.05, eyeY + ery * 2.4, size * 0.05, 0.8);
    }
    if (m.zzz) zzz(ctx, cx + b.w * 0.62, b.top + size * 0.06, t, size * 0.19, C.inkSoft);
    if (m.steam) {
      for (var i = 0; i < 2; i++) {
        var k = (t * 0.7 + i * 0.5) % 1;
        guard(ctx, function () {
          ctx.globalAlpha = 0.7 - k * 0.6;
          fillEll(ctx, b.top > 0 ? cx + b.w * 0.5 + i * size * 0.16 : cx, b.top - k * size * 0.3 - size * 0.02, size * 0.07, size * 0.05, C.chalkDim);
        });
      }
    }
    if (m.lines) shockLines(ctx, cx, eyeY, b.w * 0.78 + erx, b.w * 0.78 + erx + size * 0.16, 8, rgba(C.ink, 0.55), 0.6, t * 0.7);
    if (m.sparkle) {
      spark(ctx, cx - b.w * 0.7 - size * 0.1, b.top - size * 0.05, size * 0.1, '#fff3c4', 0.95);
      if (m.sparkle > 1) spark(ctx, cx + b.w * 0.7 + size * 0.06, b.top + size * 0.12, size * 0.075, '#ffe6a3', 0.85);
    }
    if (m.cosmic) {
      for (var ci = 0; ci < 3; ci++) {
        var a = t * 0.9 + ci * TAU / 3;
        spark(ctx, cx + Math.cos(a) * (b.w * 0.7 + size * 0.16), eyeY + Math.sin(a) * size * 0.3, size * 0.07, ci === 1 ? C.cyan : C.gold, 0.6);
      }
    }
    if (m.halo) {
      guard(ctx, function () {
        ctx.globalAlpha = 0.6;
        strokeEll(ctx, cx, b.top - size * 0.12, size * 0.17, size * 0.05, Math.max(0.6, size * 0.028), C.gold);
      });
    }
  }

  /* корона для артикля-короля */
  function crown(ctx, cx, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, y);
    ctx.lineTo(cx - w / 2, y - h * 0.55);
    ctx.lineTo(cx - w * 0.22, y - h * 0.18);
    ctx.lineTo(cx, y - h);
    ctx.lineTo(cx + w * 0.22, y - h * 0.18);
    ctx.lineTo(cx + w / 2, y - h * 0.55);
    ctx.lineTo(cx + w / 2, y);
    ctx.closePath();
    ctx.fillStyle = C.gold; ctx.fill();
    ctx.lineWidth = Math.max(0.6, h * 0.09); ctx.strokeStyle = C.goldDark; ctx.stroke();
    circle(ctx, cx, y - h * 0.4, h * 0.14, C.stamp, C.goldDark, h * 0.05);
    circle(ctx, cx - w * 0.3, y - h * 0.3, h * 0.1, C.cyan, C.goldDark, h * 0.05);
    circle(ctx, cx + w * 0.3, y - h * 0.3, h * 0.1, C.cyan, C.goldDark, h * 0.05);
  }

  function wrapText(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* пикетный плакат: «АРТИКЛЬ — НЕ ПРИЛОЖЕНИЕ!» */
  function picketSign(ctx, g, t) {
    var sway = Math.sin(t * 2.2) * 0.04;
    var w = g.w, h = g.h;
    guard(ctx, function () {
      ctx.translate(g.x + w * 0.2, g.y + h * 0.9);
      ctx.rotate(-0.07 + sway);
      // палка
      line(ctx, 0, 0, 0, h * 0.85, Math.max(0.9, h * 0.1), '#a9773f');
      line(ctx, 0, 0, 0, h * 0.85, Math.max(0.4, h * 0.04), 'rgba(255,235,190,0.55)');
      // табличка
      ctx.translate(-w * 0.2, -h * 0.9);
      fillRound(ctx, 0, 0, w, h, h * 0.1, C.paper);
      strokeRound(ctx, 0, 0, w, h, h * 0.1, Math.max(0.6, h * 0.06), C.ink);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // глиф
      ctx.font = '800 ' + (h * 0.66).toFixed(2) + 'px ' + FONT;
      ctx.fillStyle = C.ink;
      ctx.fillText(g.glyph, w * 0.3, h * 0.5);
      // красная восклицалка
      ctx.font = '800 ' + (h * 0.6).toFixed(2) + 'px ' + FONT;
      ctx.fillStyle = C.stamp;
      ctx.fillText('!', w * 0.7, h * 0.44);
      // подпись
      if (g.detail) {
        ctx.font = '700 ' + (h * 0.13).toFixed(2) + 'px ' + FONT;
        ctx.fillStyle = C.stamp;
        var lines = wrapText(ctx, g.text, w * 0.88);
        for (var i = 0; i < Math.min(lines.length, 2); i++) ctx.fillText(lines[i], w * 0.5, h * (0.79 + i * 0.14));
      } else {
        guard(ctx, function () {
          ctx.strokeStyle = C.stamp; ctx.lineWidth = Math.max(0.6, h * 0.05);
          for (var i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.moveTo(w * 0.16, h * (0.85 + i * 0.1));
            ctx.lineTo(w * (0.84 - i * 0.1), h * (0.85 + i * 0.1));
            ctx.stroke();
          }
        });
      }
      // скотч
      guard(ctx, function () {
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#e8dfc4';
        ctx.fillRect(w * 0.3, -h * 0.05, w * 0.34, h * 0.1);
      });
    });
  }

  /* общее тело-существо: глиф + конечности + лицо */
  function glyphCreature(ctx, glyph, size, cx, cy, mood, t, isArticle, opts) {
    opts = opts || {};
    if (!glyphSupported(ctx, glyph)) glyph = isArticle ? 'Ը' : 'Ա';
    var m = G_FACE[mood] || G_FACE.neutral;
    var run = mood === 'run';
    var lean = run ? -0.1 : (mood === 'evil' ? 0.03 : 0);
    var jx = m.jitter ? jitter(t, size * 0.02, 31) : 0;
    var jy = bob(t, size * 0.012, 2.2, isArticle ? 0.4 : 1.2);

    // раскладка: подгоняем размер так, чтобы существо занимало ~94 бокса
    var legRatio = mood === 'sleep' ? 0.16 : 0.24;
    var shoeRatio = isArticle ? 0.07 : 0.06;
    var probe0 = measureGlyph(ctx, glyph, size, cx, 50);
    var totalRatio = probe0.h / size + legRatio + shoeRatio * 0.9;
    if (totalRatio > 0.94) size = size * 0.94 / totalRatio;
    var probe = measureGlyph(ctx, glyph, size, cx, 50);
    var legLen = size * legRatio;
    var shoeH = size * shoeRatio;
    var totalH = probe.h + legLen + shoeH * 0.9;
    var top = clamp((100 - totalH) / 2, 0.5, 62);
    var bodyCy = top + probe.h / 2;
    var b = measureGlyph(ctx, glyph, size, cx, bodyCy);
    b.glyph = glyph; b.legLen = legLen; b.shoeH = shoeH;
    cy = bodyCy;
    var groundY = b.bottom + legLen + shoeH;

    // плакат (забастовка): геометрия до рук, чтобы рука держала палку
    var signMode = !!(m.sign || opts.sign);
    if (signMode) {
      var sw = Math.max(22, size * 0.44), sh = Math.max(11, size * 0.24);
      var handX = cx + b.w * 0.5 + size * 0.14;
      var handY = b.top + size * 0.4;
      var sgx = clamp(handX - sw * 0.2, 2, 97 - sw);
      var sgy = clamp(handY - sh * 1.75, 2, 97 - sh);
      b.signGeom = {
        x: sgx, y: sgy, w: sw, h: sh,
        handX: sgx + sw * 0.2, handY: sgy + sh * 1.75,
        glyph: String(glyph).toUpperCase(),
        text: (typeof opts.sign === 'string') ? opts.sign : 'НЕ ПРИЛОЖЕНИЕ!',
        detail: !!opts.detail
      };
    }

    guard(ctx, function () {
      shadowEll(ctx, cx, groundY + shoeH * 0.1, size * 0.2, size * 0.04, 0.22);
      ctx.translate(jx, jy);
      glyphLegs(ctx, b, mood, t, isArticle, opts);
      glyphArms(ctx, b, mood, t, isArticle);
      ctx.save();
      if (lean) { ctx.translate(cx, groundY); ctx.rotate(lean); ctx.translate(-cx, -groundY); }
      glyphSticker(ctx, b, opts);
      ctx.restore();
      // лицо поверх (без наклона — так читается)
      ctx.save();
      if (lean) { ctx.translate(cx, groundY); ctx.rotate(lean * 0.4); ctx.translate(-cx, -groundY); }
      glyphFace(ctx, b, mood, t, isArticle, opts);
      ctx.restore();
      // награды и плакаты
      if (opts.crown) {
        crown(ctx, cx, b.top + size * 0.02, size * 0.34, size * 0.2);
      }
      if (b.signGeom) picketSign(ctx, b.signGeom, t);
      if (m.motion) motionLines(ctx, cx - b.w * 0.85, cy + size * 0.05, size * 0.22, 3, C.inkSoft, 0.5);
    });
  }

  A.drawArticle = function (ctx, r, mood, t, opts) {
    if (!ctx || !r || !(r.w > 0) || !(r.h > 0)) return;
    opts = opts || {};
    t = t || 0;
    var face = ARTICLE_TO_FACE[mood] || letterMood(mood || 'idle');
    if (mood == null) face = 'neutral';
    var g0 = opts.glyph;
    var glyph = (g0 === 'ն' || g0 === 'n' || g0 === 'N') ? 'ն' : (g0 || 'ը');
    var oo = {};
    for (var kk in opts) if (Object.prototype.hasOwnProperty.call(opts, kk)) oo[kk] = opts[kk];
    oo.detail = Math.min(r.w, r.h) >= 280;
    if (mood === 'proud' && opts.crown !== false) oo.crown = true;
    guard(ctx, function () {
      box(ctx, r);
      if (opts.flip) { ctx.translate(100, 0); ctx.scale(-1, 1); }
      if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
      else if (opts.ghost) ctx.globalAlpha = 0.42;
      glyphCreature(ctx, glyph, 84, 50, 41, face, t, true, oo);
    });
  };

  A.drawLetter = function (ctx, r, glyph, mood, t) {
    if (!ctx || !r || !(r.w > 0) || !(r.h > 0)) return;
    t = t || 0;
    var g = glyph || 'Ա';
    var m = letterMood(mood || 'neutral');
    guard(ctx, function () {
      box(ctx, r);
      glyphCreature(ctx, g, 82, 50, 40, m, t, false, { detail: Math.min(r.w, r.h) >= 280 });
    });
  };

  /* ================================================================ КЛАСС
     drawClassroom(ctx, w, h, t, opts)   opts = {boardText, dim, desks, clock, flicker}
     Доска с мелом, окно с тёплым светом, часы, парты, пылинки мела.
  ========================================================================= */
  var gradCache = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

  A.drawClassroom = function (ctx, w, h, t, opts) {
    if (!ctx || !(w > 0) || !(h > 0)) return;
    opts = opts || {};
    t = t || 0;
    ctx.save();
    try { classroomInner(ctx, w, h, t, opts); } finally { ctx.restore(); }
  };

  function classroomGrads(ctx, w, h) {
    var c = gradCache ? gradCache.get(ctx) : null;
    if (c && c.w === w && c.h === h) return c;
    var floorY = h * 0.78;
    c = { w: w, h: h, floorY: floorY };
    c.wall = ctx.createLinearGradient(0, 0, 0, floorY);
    c.wall.addColorStop(0, '#425544');
    c.wall.addColorStop(0.5, '#38493c');
    c.wall.addColorStop(1, '#293528');
    c.floor = ctx.createLinearGradient(0, floorY, 0, h);
    c.floor.addColorStop(0, '#6a4e36');
    c.floor.addColorStop(1, '#43301f');
    c.board = ctx.createRadialGradient(w * 0.5, h * 0.28, h * 0.05, w * 0.5, h * 0.3, Math.max(w, h) * 0.7);
    c.board.addColorStop(0, '#265440');
    c.board.addColorStop(0.55, '#1d4534');
    c.board.addColorStop(1, '#143127');
    c.vign = ctx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.18, w * 0.5, h * 0.5, Math.max(w, h) * 0.82);
    c.vign.addColorStop(0, 'rgba(0,0,0,0)');
    c.vign.addColorStop(0.7, 'rgba(0,0,0,0.16)');
    c.vign.addColorStop(1, 'rgba(0,0,0,0.5)');
    c.light = ctx.createRadialGradient(w * 0.9, h * 0.22, 0, w * 0.9, h * 0.22, Math.max(w, h) * 0.75);
    c.light.addColorStop(0, 'rgba(255,214,140,0.24)');
    c.light.addColorStop(0.5, 'rgba(255,200,120,0.08)');
    c.light.addColorStop(1, 'rgba(255,190,110,0)');
    if (gradCache) gradCache.set(ctx, c);
    return c;
  }

  var dustCache = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  function classroomDust(ctx, w, h) {
    var arr = dustCache ? dustCache.get(ctx) : null;
    if (arr && arr.w === w && arr.h === h) return arr.list;
    var r = rnd(7717);
    arr = { w: w, h: h, list: [] };
    for (var i = 0; i < 26; i++) {
      arr.list.push({
        x: r() * w, y: r() * h * 0.8,
        sp: 3 + r() * 7, ph: r() * TAU, sz: 0.6 + r() * 1.7, a: 0.1 + r() * 0.28
      });
    }
    if (dustCache) dustCache.set(ctx, arr);
    return arr.list;
  }

  /* перенос меловой строки по словам под ширину доски */
  function wrapBoardLines(ctx, rawLines, maxW) {
    var out = [];
    for (var i = 0; i < rawLines.length; i++) {
      var words = String(rawLines[i]).replace(/\s+/g, ' ').trim().split(' ');
      var cur = '';
      for (var j = 0; j < words.length; j++) {
        if (!words[j]) continue;
        var test = cur ? cur + ' ' + words[j] : words[j];
        if (ctx.measureText(test).width > maxW && cur) { out.push(cur); cur = words[j]; }
        else cur = test;
      }
      out.push(cur);
    }
    return out;
  }

  /* авто-подбор размера мелового текста: ширина <= maxW, высота блока <= maxH.
     Старт — bh*0.34, минимум по ТЗ — ~55% от старта; если совсем не влезает
     (одно длинное слово на узком экране) — страховочно ужимаем до ~34%. */
  function fitBoardText(ctx, rawLines, maxW, maxH, baseSize) {
    var size = baseSize;
    var lineH = 1.2;
    var softMin = Math.max(7, baseSize * 0.55);
    var hardMin = Math.max(5.5, baseSize * 0.34);
    var lines = rawLines, widest = 0, blockH = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + size.toFixed(2) + 'px ' + FONT;
    for (var n = 0; n < 120; n++) {
      lines = wrapBoardLines(ctx, rawLines, maxW);
      widest = 0;
      for (var i = 0; i < lines.length; i++) widest = Math.max(widest, ctx.measureText(lines[i]).width);
      blockH = lines.length * size * lineH;
      if (widest <= maxW && blockH <= maxH) break;
      if (size <= hardMin + 0.01) break;
      var next = size * (widest > maxW ? 0.97 : 0.94);
      if (next < softMin && size > softMin) next = softMin;   // перешагиваем порог 55% плавно
      size = Math.max(hardMin, next);
      ctx.font = '700 ' + size.toFixed(2) + 'px ' + FONT;
    }
    // неразрывное слово шире доски — дожимаем пропорционально
    if (widest > maxW && widest > 0) {
      size = Math.max(4, size * (maxW / widest));
      ctx.font = '700 ' + size.toFixed(2) + 'px ' + FONT;
      lines = wrapBoardLines(ctx, rawLines, maxW);
      widest = 0;
      for (var k = 0; k < lines.length; k++) widest = Math.max(widest, ctx.measureText(lines[k]).width);
      blockH = lines.length * size * lineH;
    }
    return { size: size, lines: lines, lineH: lineH, blockH: blockH, widest: widest };
  }

  function classroomInner(ctx, w, h, t, opts) {
    var G2 = classroomGrads(ctx, w, h);
    var floorY = G2.floorY;
    var u = Math.min(w, h) / 100;
    var narrow = w < 560;

    // стены
    ctx.fillStyle = G2.wall; ctx.fillRect(0, 0, w, floorY);
    // панель под доской и полосы обоев
    guard(ctx, function () {
      ctx.globalAlpha = 0.06; ctx.fillStyle = '#ffffff';
      for (var x = 0; x < w; x += Math.max(26, w * 0.035)) ctx.fillRect(x, 0, Math.max(1, w * 0.006), floorY);
    });
    // плинтус
    ctx.fillStyle = '#5b3f2a'; ctx.fillRect(0, floorY - Math.max(4, h * 0.012), w, Math.max(4, h * 0.012));
    guard(ctx, function () {
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#e8d6b0';
      ctx.fillRect(0, floorY - Math.max(4, h * 0.012), w, 1.5);
    });

    // пол
    ctx.fillStyle = G2.floor; ctx.fillRect(0, floorY, w, h - floorY);
    guard(ctx, function () {
      ctx.globalAlpha = 0.18; ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = 1;
      for (var py = floorY + h * 0.03; py < h; py += h * 0.045) {
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
      }
      for (var px = 0; px < w; px += w * 0.09) {
        ctx.beginPath(); ctx.moveTo(px, floorY); ctx.lineTo(px - w * 0.02, h); ctx.stroke();
      }
    });

    // доска
    var clockR = clamp(Math.min(w, h) * 0.072, 12, 38);
    var bx1 = Math.max(w * 0.05, clockR * 2.5 + w * 0.035);
    var by1 = h * 0.075;
    var bx2 = w - (narrow ? w * 0.035 : w * 0.175);
    var by2 = h * 0.60;
    var bw = bx2 - bx1, bh = by2 - by1;
    var frame = clamp(Math.min(bw, bh) * 0.045, 3, 12);
    // тень доски
    guard(ctx, function () {
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#000000';
      fillRound(ctx, bx1 - frame + 2, by1 - frame + 4, bw + frame * 2, bh + frame * 2, frame, '#000000');
    });
    // рама
    fillRound(ctx, bx1 - frame, by1 - frame, bw + frame * 2, bh + frame * 2, frame * 0.8, C.boardFrame);
    guard(ctx, function () {
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#000000';
      ctx.fillRect(bx1 - frame, by2 + frame * 0.1, bw + frame * 2, frame * 0.8);
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffd9a0';
      ctx.fillRect(bx1 - frame, by1 - frame, bw + frame * 2, Math.max(1, frame * 0.35));
    });
    // полотно доски
    roundRect(ctx, bx1, by1, bw, bh, frame * 0.4);
    ctx.fillStyle = G2.board; ctx.fill();
    // мел и разводы
    guard(ctx, function () {
      ctx.globalAlpha = 0.05; ctx.strokeStyle = C.chalk;
      var r = rnd(4242);
      for (var i = 0; i < 7; i++) {
        var sx = bx1 + r() * bw, sy = by1 + r() * bh;
        ellPath(ctx, sx, sy, bw * (0.05 + r() * 0.1), bh * (0.04 + r() * 0.08), r() * TAU);
        ctx.lineWidth = 1; ctx.stroke();
      }
    });
    // лоток
    var trayY = by2 + frame * 0.7;
    fillRound(ctx, bx1 - frame, trayY, bw + frame * 2, Math.max(3, bh * 0.055), 2, C.boardFrameDark);
    fillRound(ctx, bx1 - frame, trayY, bw + frame * 2, Math.max(2, bh * 0.02), 2, shade(C.boardFrame, 0.15));
    // мелки
    var chalkY = trayY + Math.max(1.5, bh * 0.015);
    var chalkC = [C.chalk, '#ffe08a', '#f6b8c4'];
    for (var ci = 0; ci < 3; ci++) {
      guard(ctx, function () {
        ctx.translate(bx1 + bw * (0.16 + ci * 0.13), chalkY + 2);
        ctx.rotate(-0.12 + ci * 0.1);
        fillRound(ctx, -bw * 0.022, -Math.max(1.4, bh * 0.016), bw * 0.044, Math.max(2.8, bh * 0.032), 1.5, chalkC[ci]);
      });
    }
    // тряпка
    guard(ctx, function () {
      ctx.translate(bx1 + bw * 0.78, chalkY + 1.5); ctx.rotate(-0.06);
      fillRound(ctx, -bw * 0.05, -Math.max(2, bh * 0.03), bw * 0.1, Math.max(4, bh * 0.06), 2, '#6f5a44');
      ctx.globalAlpha = 0.4; fillRound(ctx, -bw * 0.05, -Math.max(2, bh * 0.03), bw * 0.1, Math.max(1.5, bh * 0.02), 1, '#c9b07e');
    });

    // текст на доске: авто-подбор размера, перенос по словам, без вылезания за доску
    if (opts.boardText) {
      var btx = bx1 + bw * 0.5, bty = by1 + bh * 0.5;
      var baseSize = clamp(bh * 0.34, 13, 86);
      var fit = null;
      guard(ctx, function () {
        fit = fitBoardText(ctx, String(opts.boardText).split('\n'), bw * 0.86, bh * 0.8, baseSize);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var lh = fit.size * fit.lineH;
        var top = bty - ((fit.lines.length - 1) * lh) / 2;
        for (var li = 0; li < fit.lines.length; li++) {
          var ly = top + li * lh;
          ctx.fillStyle = rgba(C.chalk, 0.92);
          ctx.fillText(fit.lines[li], btx, ly);
          ctx.save();
          ctx.globalAlpha = 0.2; ctx.fillStyle = '#ffffff';
          ctx.fillText(fit.lines[li], btx + 1.2, ly + 1.1);
          ctx.restore();
        }
      });
      // меловая пыль под текстом
      guard(ctx, function () {
        ctx.globalAlpha = 0.1;
        fillEll(ctx, btx, bty + fit.blockH * 0.5 + fit.size * 0.2, bw * 0.22, fit.size * 0.32, C.chalk);
      });
    }

    // окно (не на узком экране)
    if (!narrow) {
      var wx1 = w - w * 0.155, wx2 = w - w * 0.02;
      var wy1 = h * 0.11, wy2 = h * 0.46;
      // рама
      fillRound(ctx, wx1 - Math.max(3, frame * 0.6), wy1 - Math.max(3, frame * 0.6), (wx2 - wx1) + Math.max(6, frame * 1.2), (wy2 - wy1) + Math.max(6, frame * 1.2), 3, '#cbb894');
      var sky = ctx.createLinearGradient(0, wy1, 0, wy2);
      sky.addColorStop(0, '#bfe8ff'); sky.addColorStop(0.55, '#e8f4fb'); sky.addColorStop(1, '#f8ecd0');
      ctx.fillStyle = sky; ctx.fillRect(wx1, wy1, wx2 - wx1, wy2 - wy1);
      // облака
      guard(ctx, function () {
        ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffffff';
        fillEll(ctx, wx1 + (wx2 - wx1) * 0.32, wy1 + (wy2 - wy1) * 0.3, (wx2 - wx1) * 0.2, (wy2 - wy1) * 0.09);
        fillEll(ctx, wx1 + (wx2 - wx1) * 0.55, wy1 + (wy2 - wy1) * 0.22, (wx2 - wx1) * 0.14, (wy2 - wy1) * 0.07);
        fillEll(ctx, wx1 + (wx2 - wx1) * 0.7, wy1 + (wy2 - wy1) * 0.55, (wx2 - wx1) * 0.22, (wy2 - wy1) * 0.08);
      });
      // переплёт
      var wcw = (wx2 - wx1), wch = (wy2 - wy1);
      ctx.fillStyle = '#cbb894';
      ctx.fillRect(wx1 + wcw * 0.5 - 2, wy1, 4, wch);
      ctx.fillRect(wx1, wy1 + wch * 0.55 - 2, wcw, 4);
      // блик на стекле
      guard(ctx, function () {
        ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffffff';
        poly(ctx, [[wx1 + wcw * 0.08, wy2], [wx1 + wcw * 0.42, wy1], [wx1 + wcw * 0.55, wy1], [wx1 + wcw * 0.2, wy2]]);
        ctx.fill();
      });
      // лучи света из окна
      var fk = 0.85 + Math.sin(t * 1.7) * 0.1 + (opts.flicker ? Math.sin(t * 13) * 0.12 : 0);
      guard(ctx, function () {
        ctx.globalAlpha = 0.13 * fk;
        ctx.fillStyle = '#ffe6ae';
        poly(ctx, [[wx1, wy2], [wx2, wy1 + wch * 0.1], [wx2 - w * 0.02, wy2 + h * 0.16], [bx1 + bw * 0.3, h * 0.66]]);
        ctx.fill();
        ctx.globalAlpha = 0.08 * fk;
        poly(ctx, [[w * 0.55, h * 0.06], [w, h * 0.02], [w, h * 0.34], [w * 0.42, h * 0.5]]);
        ctx.fill();
      });
    }

    // часы
    if (opts.clock !== false) {
      var ccx = narrow ? w * 0.075 : bx1 - clockR * 1.55;
      var ccy = narrow ? h * 0.17 : h * 0.19;
      drawWallClock(ctx, ccx, ccy, clockR, t, opts.clockSpeed);
    }

    // постеры и портрет (широкий экран)
    if (!narrow) {
      var pX = Math.max(4, bx1 - clockR * 2.9), pY = h * 0.34, pW = clockR * 1.5, pH = clockR * 2.1;
      if (pX > 6) {
        // плакат с алфавитом
        fillRound(ctx, pX, pY, pW, pH, 1.5, '#efe3c6');
        strokeRound(ctx, pX, pY, pW, pH, 1.5, 1.2, '#8a6a45');
        guard(ctx, function () {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '700 ' + (pH * 0.2).toFixed(1) + 'px ' + FONT;
          ctx.fillStyle = '#6b4a2c';
          ctx.fillText('Ա Բ Գ', pX + pW * 0.5, pY + pH * 0.28);
          ctx.fillText('Դ Ե Զ', pX + pW * 0.5, pY + pH * 0.58);
          ctx.globalAlpha = 0.5;
          ctx.fillText('Է Ը Թ', pX + pW * 0.5, pY + pH * 0.86);
        });
      }
      // портрет строгого дяди в раме (справа под окном)
      if (w > 700) {
        var qX = w - w * 0.155, qY = h * 0.55, qW = w * 0.125, qH = qW * 0.82;
        fillRound(ctx, qX, qY, qW, qH, 2, '#8a5a2f');
        fillRound(ctx, qX + 2, qY + 2, qW - 4, qH - 4, 1.5, '#d8c9a6');
        guard(ctx, function () {
          ctx.save();
          roundRect(ctx, qX + 3, qY + 3, qW - 6, qH - 6, 1.5); ctx.clip();
          ctx.fillStyle = '#4a4436'; ctx.fillRect(qX, qY, qW, qH);
          ctx.fillStyle = '#e6c9a4';
          fillEll(ctx, qX + qW * 0.5, qY + qH * 0.46, qW * 0.2, qH * 0.24);
          ctx.fillStyle = '#2f2a22';
          fillEll(ctx, qX + qW * 0.5, qY + qH * 0.3, qW * 0.24, qH * 0.14);
          fillEll(ctx, qX + qW * 0.42, qY + qH * 0.44, 2, 2.4, '#2f2a22');
          fillEll(ctx, qX + qW * 0.58, qY + qH * 0.44, 2, 2.4, '#2f2a22');
          ctx.beginPath(); ctx.moveTo(qX + qW * 0.4, qY + qH * 0.56);
          ctx.quadraticCurveTo(qX + qW * 0.5, qY + qH * 0.62, qX + qW * 0.6, qY + qH * 0.56);
          ctx.lineWidth = 2; ctx.strokeStyle = '#2f2a22'; ctx.stroke();
          ctx.restore();
        });
      }
    }

    // парты
    if (opts.desks !== false) classroomDesks(ctx, w, h, t, u);

    // пылинки мела
    guard(ctx, function () {
      var dust = classroomDust(ctx, w, h);
      for (var i = 0; i < dust.length; i++) {
        var p = dust[i];
        var dy = (p.y + t * p.sp) % (h * 0.86);
        var dx = p.x + Math.sin(t * 0.5 + p.ph) * (w * 0.012);
        ctx.globalAlpha = p.a * (0.65 + 0.35 * Math.sin(t * 1.4 + p.ph));
        ctx.fillStyle = i % 4 ? C.chalk : C.warm;
        fillEll(ctx, dx, dy, p.sz, p.sz, ctx.fillStyle);
      }
    });

    // тёплый свет и виньетка
    ctx.fillStyle = G2.light; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = G2.vign; ctx.fillRect(0, 0, w, h);

    // затемнение (студийный режим)
    if (opts.dim) {
      ctx.fillStyle = 'rgba(8,10,9,' + clamp(opts.dim, 0, 0.85) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawWallClock(ctx, cx, cy, r, t, speed) {
    var sp = speed == null ? 0.12 : speed;
    // тень
    shadowEll(ctx, cx + r * 0.1, cy + r * 1.12, r * 0.95, r * 0.2, 0.22);
    // корпус
    fillEll(ctx, cx, cy, r, r, '#c9a05a');
    fillEll(ctx, cx, cy, r * 0.9, r * 0.9, '#f8f2e0');
    strokeEll(ctx, cx, cy, r * 0.9, r * 0.9, Math.max(1, r * 0.06), '#6d5336');
    // деления
    guard(ctx, function () {
      ctx.strokeStyle = '#3a3128';
      for (var i = 0; i < 12; i++) {
        var a = i * TAU / 12, r1 = r * (i % 3 === 0 ? 0.6 : 0.72), r2 = r * 0.82;
        ctx.lineWidth = i % 3 === 0 ? Math.max(1, r * 0.075) : Math.max(0.6, r * 0.035);
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1);
        ctx.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2);
        ctx.stroke();
      }
    });
    // стрелки: часовые тикают вечно
    var hA = -0.6 + t * 0.001, mA = 1.4 + t * 0.004;
    var sA = t * 0.4 * Math.PI; // секундная носится
    line(ctx, cx, cy, cx + Math.sin(hA) * r * 0.42, cy - Math.cos(hA) * r * 0.42, Math.max(1, r * 0.09), '#2b241d');
    line(ctx, cx, cy, cx + Math.sin(mA) * r * 0.6, cy - Math.cos(mA) * r * 0.6, Math.max(0.8, r * 0.065), '#2b241d');
    line(ctx, cx, cy, cx + Math.sin(sA) * r * 0.68, cy - Math.cos(sA) * r * 0.68, Math.max(0.5, r * 0.03), '#b8342a');
    // трещина на стекле — время треснуло
    guard(ctx, function () {
      ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(0.5, r * 0.03); ctx.strokeStyle = '#8a7d66';
      ctx.beginPath(); ctx.moveTo(cx + r * 0.1, cy - r * 0.55);
      ctx.lineTo(cx - r * 0.18, cy + r * 0.02); ctx.lineTo(cx + r * 0.06, cy + r * 0.2); ctx.stroke();
    });
    circle(ctx, cx, cy, Math.max(1.2, r * 0.09), '#4a3a28');
    // блик стекла
    guard(ctx, function () {
      ctx.globalAlpha = 0.18; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, -2.3, -1.3); ctx.stroke();
    });
  }

  function classroomDesks(ctx, w, h, t, u) {
    var baseY = h * 0.95;
    var n = w > 760 ? 3 : 2;
    var deskW = w / (n + 0.65);
    for (var i = 0; i < n; i++) {
      var cx = w * (0.5 + (i - (n - 1) / 2) * (deskW / w) * 0.98);
      var dw = deskW * 0.92;
      var dh = h * 0.12;
      var topH = dh * 0.22;
      var legH = dh * 0.82;
      var x = cx - dw / 2;
      // тень на полу
      guard(ctx, function () {
        ctx.globalAlpha = 0.25; fillEll(ctx, cx, baseY + dh * 0.08, dw * 0.52, dh * 0.16, '#000000');
      });
      // ножки
      ctx.fillStyle = '#2c3138';
      ctx.fillRect(x + dw * 0.08, baseY - legH, Math.max(2, dw * 0.035), legH);
      ctx.fillRect(x + dw * 0.86, baseY - legH, Math.max(2, dw * 0.035), legH);
      // столешница
      fillRound(ctx, x, baseY - legH - topH * 0.4, dw, topH, topH * 0.3, '#8a5f3b');
      fillRound(ctx, x, baseY - legH - topH * 0.4, dw, topH * 0.5, topH * 0.25, '#a3764d');
      guard(ctx, function () {
        ctx.globalAlpha = 0.4; ctx.strokeStyle = '#5d3d24'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + dw * 0.06, baseY - legH - topH * 0.15);
        ctx.lineTo(x + dw * 0.94, baseY - legH - topH * 0.15); ctx.stroke();
      });
      // ящик/фартук
      fillRound(ctx, x + dw * 0.06, baseY - legH + dh * 0.04, dw * 0.88, dh * 0.18, 2, '#6f4a2d');
      // пара мелочей на парте: тетрадь
      guard(ctx, function () {
        ctx.translate(x + dw * (0.3 + (i % 2) * 0.25), baseY - legH - topH * 0.18);
        ctx.rotate(-0.08 + i * 0.03);
        fillRound(ctx, -dw * 0.11, -topH * 0.55, dw * 0.22, topH * 0.7, 1, '#e9dcc0');
        line(ctx, -dw * 0.08, -topH * 0.2, dw * 0.07, -topH * 0.2, 0.5, '#b8a888');
      });
    }
  }

  /* ================================================================= РЕКВИЗИТ
     police, pigeon, homework, protocol, clock, cap, stamp (+ article)
  ========================================================================= */
  var PROP_NAMES = ['police', 'article', 'pigeon', 'homework', 'protocol', 'clock', 'cap', 'stamp'];

  A.drawProp = function (ctx, name, r, t, opts) {
    if (!ctx || !r || !(r.w > 0) || !(r.h > 0)) return;
    t = t || 0;
    opts = opts || {};
    var n = String(name || '').toLowerCase();
    if (n === 'article') { A.drawArticle(ctx, r, opts.mood || 'idle', t, opts); return; }
    guard(ctx, function () {
      box(ctx, r);
      if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
      switch (n) {
        case 'police': policeProp(ctx, t, opts); break;
        case 'pigeon': pigeonProp(ctx, t, opts); break;
        case 'homework': homeworkProp(ctx, t, opts); break;
        case 'protocol': protocolProp(ctx, t, opts); break;
        case 'clock': clockProp(ctx, t, opts); break;
        case 'cap': capProp(ctx, t, opts); break;
        case 'stamp': stampProp(ctx, t, opts); break;
        default: unknownProp(ctx, n);
      }
    });
  };

  /* ---- полицейский: усы, фуражка, протокол. opts.minister — уже министр ---- */
  function policeProp(ctx, t, opts) {
    var br = bob(t, 0.35, 1.8);
    var minister = !!opts.minister;
    ctx.translate(0, br * 0.25);
    shadowEll(ctx, 50, 96, 24, 3.6, 0.18);
    // туловище
    ctx.beginPath();
    ctx.moveTo(16, 100); ctx.bezierCurveTo(17, 76, 27, 58, 39, 53);
    ctx.quadraticCurveTo(50, 49, 61, 53); ctx.bezierCurveTo(73, 58, 83, 76, 84, 100);
    ctx.closePath(); ctx.fillStyle = C.navy; ctx.fill();
    guard(ctx, function () {
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(16, 53, 22, 47);
      line(ctx, 50, 56, 50, 100, 1.1, rgba(C.navyDark, 0.8));
      // пуговицы
      for (var i = 0; i < 3; i++) circle(ctx, 50, 66 + i * 9, 1.5, C.gold, rgba(C.goldDark, 0.8), 0.35);
    });
    // воротник и галстук
    fillPoly(ctx, [[41, 52], [50, 64], [59, 52], [64, 55], [57, 63], [50, 66], [43, 63], [36, 55]], '#2a3f61');
    fillPoly(ctx, [[47, 57], [53, 57], [55, 78], [50, 81], [45, 78]], '#7c2f35');
    // погоны
    fillRound(ctx, 18, 59, 14, 5, 2.5, '#26385a');
    fillRound(ctx, 68, 59, 14, 5, 2.5, '#26385a');
    if (minister) {
      fillRound(ctx, 18, 59, 14, 5, 2.5, C.gold);
      fillRound(ctx, 68, 59, 14, 5, 2.5, C.gold);
      // аксельбант
      ctx.beginPath(); ctx.moveTo(26, 60); ctx.quadraticCurveTo(40, 72, 36, 88);
      ctx.lineWidth = 1.1; ctx.strokeStyle = C.gold; ctx.stroke();
      for (var m = 0; m < 3; m++) {
        fillStar(ctx, 33 + m * 7, 86 + (m % 2) * 2, 2.6, C.gold);
        circle(ctx, 33 + m * 7, 86 + (m % 2) * 2, 0.7, C.stamp);
      }
    }
    // медаль
    fillStar(ctx, 32, 72, 3.6, C.gold);
    circle(ctx, 32, 72, 1.2, C.stamp);

    // шея
    fillRound(ctx, 45.5, 42, 9, 9, 2.5, '#d9a87e');
    // голова
    fillEll(ctx, 50, 33, 12.4, 13, '#e3b489');
    fillEll(ctx, 37.8, 34, 2.6, 3.3, '#e3b489');
    fillEll(ctx, 62.2, 34, 2.6, 3.3, '#e3b489');
    // виски/волосы под фуражкой
    fillEll(ctx, 38.6, 26.5, 3.4, 3, '#4a342a');
    fillEll(ctx, 61.4, 26.5, 3.4, 3, '#4a342a');
    // фуражка
    fillEll(ctx, 50, 20.6, 17.4, 8.4, C.navy);
    fillRound(ctx, 33.2, 19.2, 33.6, 5.6, 1.6, C.navyDark);
    fillEll(ctx, 50, 26.4, 15.4, 4.7, '#16223a');
    guard(ctx, function () {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
      fillEll(ctx, 42, 16.6, 6.6, 2.1, '#ffffff');
    });
    fillStar(ctx, 50, 18.6, 3.8, C.gold);
    if (minister) {
      fillStar(ctx, 38, 16.4, 1.9, C.gold); fillStar(ctx, 62, 16.4, 1.9, C.gold);
      fillRound(ctx, 33.2, 19.2, 33.6, 5.6, 1.6, rgba(C.gold, 0.55));
    }
    // глаза (строгие), брови
    eye(ctx, 44.4, 33, 2.7, 2, { open: 0.62, pupilR: 1.35, lookX: 0, lookY: 0 });
    eye(ctx, 55.6, 33, 2.7, 2, { open: 0.62, pupilR: 1.35, lookX: 0, lookY: 0 });
    brows(ctx, 50, 28.4, 6.6, 6.4, 1.8, '#3a2a1c', 'down');
    // нос
    fillEll(ctx, 50, 36.4, 3.3, 2.5, '#d9a87e');
    fillEll(ctx, 48.8, 37.6, 0.55, 0.45, rgba('#8a5a3a', 0.7));
    fillEll(ctx, 51.2, 37.6, 0.55, 0.45, rgba('#8a5a3a', 0.7));
    // усы
    ctx.beginPath();
    ctx.moveTo(50, 38.6);
    ctx.bezierCurveTo(43, 37.2, 38.4, 39.6, 37.6, 43.4);
    ctx.bezierCurveTo(41.4, 45.4, 46.8, 43.4, 50, 41);
    ctx.bezierCurveTo(53.2, 43.4, 58.6, 45.4, 62.4, 43.4);
    ctx.bezierCurveTo(61.6, 39.6, 57, 37.2, 50, 38.6);
    ctx.fillStyle = '#4a342a'; ctx.fill();
    line(ctx, 50, 44.4, 50, 46.4, 1.1, '#7c4a3a');
    // свисток
    guard(ctx, function () {
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(50, 52, 8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 0.9; ctx.strokeStyle = '#cfc8b8'; ctx.stroke();
    });
    fillRound(ctx, 47.4, 55.4, 5.2, 3, 1.3, '#cfd4dd');
    strokeRound(ctx, 47.4, 55.4, 5.2, 3, 1.3, 0.35, '#6f7780');

    // руки: левая с протоколом, правая с ручкой
    line(ctx, 25, 61, 21, 80, 8.6, C.navyDark);
    line(ctx, 25, 61, 21, 80, 7, C.navy);
    fillEll(ctx, 21, 82, 4.2, 4, '#e3b489');
    line(ctx, 75, 61, 73, 67, 8.6, C.navyDark);
    line(ctx, 75, 61, 73, 67, 7, C.navy);
    fillEll(ctx, 73.5, 69, 4.2, 4, '#e3b489');

    // протокол в руке
    guard(ctx, function () {
      ctx.translate(72.5, 74); ctx.rotate(-0.13);
      fillRound(ctx, -15, -10, 30, 21, 1.2, C.paper);
      strokeRound(ctx, -15, -10, 30, 21, 1.2, 0.5, rgba(C.ink, 0.55));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.inkSoft; ctx.font = '700 3.4px ' + FONT;
      ctx.fillText('ПРОТОКОЛ', 0, -7);
      for (var i = 0; i < 4; i++) line(ctx, -12, -3 + i * 3, 12, -3 + i * 3, 0.4, '#b9ab8d');
      guard(ctx, function () {
        ctx.translate(8, 5.4); ctx.rotate(-0.3);
        strokeEll(ctx, 0, 0, 4, 4, 0.5, rgba(C.stamp, 0.85));
        ctx.fillStyle = rgba(C.stamp, 0.85); ctx.font = '700 4px ' + FONT;
        ctx.fillText('Ը', 0, 0.3);
      });
    });
    // ручка
    guard(ctx, function () {
      ctx.translate(68, 62); ctx.rotate(0.5);
      fillRound(ctx, -0.8, -6, 1.6, 12, 0.8, '#2b3442');
      fillPoly(ctx, [[-0.8, -6], [0.8, -6], [0, -9]], C.gold);
    });
  }

  /* ---- голубь: информатор в фуражке ---- */
  function pigeonProp(ctx, t, opts) {
    var br = bob(t, 1.1, 1.6);
    var walk = Math.sin(t * 7);
    ctx.translate(0, br * 0.3);
    shadowEll(ctx, 50, 92, 18, 3.2, 0.2);
    // хвост
    fillPoly(ctx, [[36, 62], [20, 54], [22, 62], [18, 68], [34, 70]], C.pigeonDark);
    guard(ctx, function () {
      ctx.globalAlpha = 0.45;
      line(ctx, 35, 64, 22, 59, 0.6, '#4e5766');
      line(ctx, 35, 66, 21, 63, 0.6, '#4e5766');
      line(ctx, 35, 68, 23, 66, 0.6, '#4e5766');
    });
    // лапы
    var lp = walk * 1.4;
    line(ctx, 46, 76, 44 + lp, 86, 1.2, '#d98a3a');
    line(ctx, 55, 76, 57 - lp, 86, 1.2, '#d98a3a');
    guard(ctx, function () {
      ctx.lineWidth = 0.8; ctx.strokeStyle = '#d98a3a';
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(44 + lp, 86); ctx.lineTo(44 + lp + i * 2.2, 88.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(57 - lp, 86); ctx.lineTo(57 - lp + i * 2.2, 88.4); ctx.stroke();
      }
    });
    // тело
    fillEll(ctx, 51, 58, 15.4, 18.4, C.pigeon);
    fillEll(ctx, 57, 60, 9.6, 12.4, C.pigeonLight);
    // крыло
    guard(ctx, function () {
      ctx.save();
      ctx.translate(43, 58); ctx.rotate(0.2);
      fillEll(ctx, 0, 0, 8.4, 13.4, C.pigeonDark);
      ctx.globalAlpha = 0.5;
      for (var i = 0; i < 3; i++) line(ctx, -5, -6 + i * 6, 5, -3 + i * 6, 0.55, '#4e5766');
      ctx.restore();
    });
    // шея с переливом
    fillEll(ctx, 57, 44, 7.4, 7.2, C.pigeonNeck);
    guard(ctx, function () {
      ctx.globalAlpha = 0.45;
      fillEll(ctx, 56, 42, 5.4, 4.4, '#b98cff');
    });
    // голова
    fillEll(ctx, 58, 33.4, 8.4, 8, C.pigeon);
    // фуражка
    fillEll(ctx, 58, 26.6, 9.4, 4.6, C.navy);
    fillRound(ctx, 49.2, 25.8, 17.6, 3, 1, C.navyDark);
    fillEll(ctx, 58, 29.6, 8.2, 2.4, '#16223a');
    fillStar(ctx, 58, 25.4, 2, C.gold);
    // глаз и клюв
    fillEll(ctx, 62.2, 33, 2.6, 2.6, '#e8a33d');
    fillEll(ctx, 62.6, 33, 1.5, 1.5, '#20242c');
    fillEll(ctx, 62.2, 32.4, 0.6, 0.6, '#ffffff');
    fillPoly(ctx, [[65.4, 33.6], [75.4, 35.4], [65.6, 37.6]], '#e8942f');
    line(ctx, 65.6, 35.4, 74.6, 35.4, 0.4, '#b96a1c');
    // блокнот информатора под крылом? мини-портфель
    fillRound(ctx, 33, 74, 9, 7, 1.2, '#6b4a2d');
    fillRound(ctx, 34.2, 72.8, 6.6, 2, 0.8, '#8a6238');
    // важно кивает
    ctx.translate(0, Math.abs(Math.sin(t * 1.9)) * 0.6);
  }

  /* ---- домашнее задание: стопка листов с «47» ---- */
  function homeworkProp(ctx, t, opts) {
    var count = opts.count || 47;
    var wob = Math.sin(t * 1.6) * 0.015;
    shadowEll(ctx, 50, 93, 26, 3.4, 0.18);
    // нижние листы
    guard(ctx, function () {
      ctx.translate(50, 51); ctx.rotate(0.09);
      fillRound(ctx, -29, -37, 58, 74, 1.5, C.paperShade);
      strokeRound(ctx, -29, -37, 58, 74, 1.5, 0.6, rgba(C.ink, 0.35));
    });
    guard(ctx, function () {
      ctx.translate(50, 50); ctx.rotate(-0.07 + wob);
      fillRound(ctx, -29, -37, 58, 74, 1.5, C.paper);
      strokeRound(ctx, -29, -37, 58, 74, 1.5, 0.7, rgba(C.ink, 0.55));
      // заголовок
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3f6a3f';
      ctx.font = '800 6.2px ' + FONT;
      ctx.fillText('ДОМАШНЕЕ', 0, -26);
      ctx.fillText('ЗАДАНИЕ', 0, -18);
      line(ctx, -22, -12.6, 22, -12.6, 0.8, '#3f6a3f');
      // пункты
      ctx.textAlign = 'left';
      ctx.font = '600 3.4px ' + FONT;
      for (var i = 0; i < 7; i++) {
        var yy = -7 + i * 6.2;
        ctx.fillStyle = C.paperInk;
        ctx.fillText((i + 1) + '.', -24, yy);
        line(ctx, -19, yy + 0.6, 14 + (i % 3) * 2.4, yy + 0.6, 0.5, '#a89a7a');
      }
      ctx.fillStyle = C.stamp; ctx.font = '800 5px ' + FONT;
      ctx.fillText('...47.', -22, 44);
      // печать
      guard(ctx, function () {
        ctx.translate(14, 28); ctx.rotate(-0.24);
        strokeEll(ctx, 0, 0, 10.6, 6.8, 1.1, rgba(C.stamp, 0.9));
        strokeEll(ctx, 0, 0, 8.8, 5.2, 0.5, rgba(C.stamp, 0.7));
        ctx.fillStyle = rgba(C.stamp, 0.9);
        ctx.textAlign = 'center'; ctx.font = '800 7px ' + FONT;
        ctx.fillText(String(count), 0, 0.6);
      });
      // скрепка
      guard(ctx, function () {
        ctx.translate(-22, -26); ctx.rotate(-0.4);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(0, 9); ctx.quadraticCurveTo(0, 12, 3, 12); ctx.quadraticCurveTo(6, 12, 6, 9);
        ctx.lineTo(6, -1); ctx.quadraticCurveTo(6, -4, 3, -4); ctx.quadraticCurveTo(0, -4, 0, -1);
        ctx.lineTo(0, 7);
        ctx.lineWidth = 0.9; ctx.strokeStyle = '#8a8172'; ctx.stroke();
      });
      // загнутый уголок
      fillPoly(ctx, [[29, 37], [29, 28], [20, 37]], '#fff8e8');
      line(ctx, 20, 37, 29, 37, 0.5, '#b9a67d');
    });
    // лист, выпадающий из стопки
    guard(ctx, function () {
      ctx.translate(24, 84); ctx.rotate(0.3 + Math.sin(t * 1.1) * 0.03);
      fillRound(ctx, -11, -4, 22, 12, 1, '#f2e8cd');
      strokeRound(ctx, -11, -4, 22, 12, 1, 0.4, rgba(C.ink, 0.4));
      line(ctx, -8, -0.4, 8, -0.4, 0.4, '#a89a7a');
      line(ctx, -8, 2.4, 5, 2.4, 0.4, '#a89a7a');
    });
  }

  /* ---- протокол №47 ---- */
  function protocolProp(ctx, t, opts) {
    var count = opts.count || 47;
    var wob = Math.sin(t * 1.4) * 0.012;
    shadowEll(ctx, 50, 94, 27, 3, 0.18);
    ctx.save();
    ctx.translate(50, 49); ctx.rotate(-0.035 + wob);
    fillRound(ctx, -31, -41, 62, 82, 1.5, C.paper);
    strokeRound(ctx, -31, -41, 62, 82, 1.5, 0.8, rgba(C.ink, 0.6));
    // загнутый угол
    fillPoly(ctx, [[31, -41], [31, -30], [20, -41]], '#efe2c2');
    line(ctx, 20, -41, 31, -30, 0.4, '#b9a67d');
    // заголовок
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.ink;
    ctx.font = '800 6.6px ' + FONT;
    ctx.fillText('ПРОТОКОЛ', 0, -33);
    ctx.fillStyle = C.stamp;
    ctx.font = '800 5.4px ' + FONT;
    ctx.fillText('№ ' + count, 0, -25.5);
    line(ctx, -24, -21.5, 24, -21.5, 0.8, C.inkSoft);
    // строки
    ctx.fillStyle = C.paperInk;
    ctx.font = '600 3.1px ' + FONT;
    var labels = ['Составлен:', 'Место:', 'Обвиняемый:', 'Улики:', 'Решение:'];
    for (var i = 0; i < labels.length; i++) {
      var yy = -16 + i * 7.4;
      ctx.textAlign = 'left';
      ctx.fillText(labels[i], -25, yy);
      line(ctx, -4, yy + 1.2, 24, yy + 1.2, 0.45, '#b9ab8d');
    }
    // галочки
    for (var c = 0; c < 3; c++) {
      roundRect(ctx, -25, 20 + c * 4.6, 3, 3, 0.4);
      ctx.lineWidth = 0.4; ctx.strokeStyle = C.inkSoft; ctx.stroke();
    }
    ctx.fillStyle = C.paperInk; ctx.font = '600 2.9px ' + FONT;
    ctx.fillText('артикль отсутствует', -20, 21.8);
    ctx.fillText('слово цело', -20, 26.4);
    ctx.fillText('виноват игрок', -20, 31);
    // подпись
    guard(ctx, function () {
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(-24, 37);
      ctx.bezierCurveTo(-18, 33, -14, 40, -8, 36);
      ctx.bezierCurveTo(-2, 32, 2, 40, 8, 36);
      ctx.lineWidth = 0.8; ctx.strokeStyle = C.inkSoft; ctx.stroke();
    });
    ctx.textAlign = 'left'; ctx.fillStyle = C.inkSoft; ctx.font = '600 2.6px ' + FONT;
    ctx.fillText('полицейский (уволен)', 12, 37.6);
    // печать
    guard(ctx, function () {
      ctx.translate(17, 10); ctx.rotate(-0.28);
      strokeEll(ctx, 0, 0, 11, 7.6, 1.2, rgba(C.stamp, 0.9));
      strokeEll(ctx, 0, 0, 9.2, 6, 0.55, rgba(C.stamp, 0.75));
      ctx.fillStyle = rgba(C.stamp, 0.9);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 6.4px ' + FONT;
      ctx.fillText('Ը', 0, 0.4);
      ctx.font = '700 1.9px ' + FONT;
      ctx.fillText('НЕ НАЙДЕН', 0, 4.4);
    });
    // чернильные брызги
    fillEll(ctx, 23, -22, 0.9, 0.7, rgba(C.stamp, 0.5));
    fillEll(ctx, 26, -18, 0.6, 0.5, rgba(C.stamp, 0.4));
    ctx.restore();
  }

  /* ---- настенные часы (реквизит) ---- */
  function clockProp(ctx, t, opts) {
    var speed = opts.speed;
    // подвес
    line(ctx, 50, 2, 50, 12, 0.8, '#6f5a44');
    circle(ctx, 50, 5, 1.6, '#6f5a44');
    drawWallClock(ctx, 50, 49, 36, t, speed == null ? 0.55 : speed);
    if (opts.cracked !== false) {
      guard(ctx, function () {
        ctx.globalAlpha = 0.65; ctx.lineWidth = 0.7; ctx.strokeStyle = '#5a4a36';
        ctx.beginPath(); ctx.moveTo(64, 24); ctx.lineTo(52, 48); ctx.lineTo(60, 60); ctx.stroke();
      });
    }
  }

  /* ---- фуражка ---- */
  function capProp(ctx, t, opts) {
    var br = bob(t, 1.2, 1.5);
    ctx.translate(0, br * 0.4);
    shadowEll(ctx, 50, 80, 26, 3.6, 0.18);
    // тулья
    fillEll(ctx, 50, 52, 33, 16.5, C.navy);
    guard(ctx, function () {
      ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffffff';
      fillEll(ctx, 38, 44, 14, 5.4, '#ffffff');
    });
    // околыш
    fillRound(ctx, 18, 52, 64, 10, 2.4, C.navyDark);
    // козырёк
    fillEll(ctx, 50, 64, 30, 9.6, '#16223a');
    fillEll(ctx, 50, 61.6, 30, 7.6, C.navyDark);
    line(ctx, 22, 62, 78, 62, 1, rgba('#ffffff', 0.18));
    // кокарда
    guard(ctx, function () {
      ctx.translate(50, 47); ctx.rotate(0);
      fillStar(ctx, 0, 0, 9.4, C.gold);
      fillStar(ctx, 0, 0, 6.4, shade(C.gold, 0.2));
      circle(ctx, 0, 0, 2.6, C.stamp, C.goldDark, 0.6);
    });
    // золотой кант
    line(ctx, 18, 52.4, 82, 52.4, 0.8, rgba(C.gold, 0.85));
    // пуговки по бокам
    circle(ctx, 22, 57, 1.4, C.gold, C.goldDark, 0.3);
    circle(ctx, 78, 57, 1.4, C.gold, C.goldDark, 0.3);
    if (opts.minister) {
      fillStar(ctx, 30, 46, 3.4, C.gold);
      fillStar(ctx, 70, 46, 3.4, C.gold);
    }
  }

  /* ---- резиновый штамп ---- */
  function stampProp(ctx, t, opts) {
    var press = (opts.hit != null) ? opts.hit : (Math.sin(t * 2.4) * 0.5 + 0.5);
    ctx.translate(0, press * 2.5);
    shadowEll(ctx, 50, 96, 24, 3.2, 0.16);
    // ручка
    fillRound(ctx, 41, 12, 18, 25, 6, '#9a6234');
    fillRound(ctx, 43, 14, 14, 21, 5, '#b57a44');
    guard(ctx, function () {
      ctx.globalAlpha = 0.4; ctx.fillStyle = '#e0b07c';
      fillRound(ctx, 44.5, 15, 5, 19, 3, '#e0b07c');
    });
    // шейка
    fillRound(ctx, 45.6, 35, 8.8, 9, 1.6, '#7c4a2c');
    // колодка
    fillRound(ctx, 30, 42, 40, 18, 3.4, '#8a1f16');
    fillRound(ctx, 30, 42, 40, 6.4, 3, '#a92b1e');
    guard(ctx, function () {
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#5e120c'; ctx.lineWidth = 0.8;
      roundRect(ctx, 34, 47, 32, 9, 2); ctx.stroke();
    });
    // резиновая подошва
    fillRound(ctx, 28, 60, 44, 7, 2.6, '#3a2a2a');
    // оттиск
    guard(ctx, function () {
      ctx.translate(50, 86); ctx.rotate(-0.06);
      ctx.globalAlpha = 0.9;
      strokeEll(ctx, 0, 0, 13.4, 8.4, 1.6, C.stamp);
      strokeEll(ctx, 0, 0, 11.2, 6.6, 0.7, rgba(C.stamp, 0.8));
      ctx.fillStyle = C.stamp; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 8.4px ' + FONT;
      ctx.fillText('Ը', 0, 0.4);
      // брызги
      fillEll(ctx, 14, 3, 1, 0.7, rgba(C.stamp, 0.65));
      fillEll(ctx, -13, 5, 0.7, 0.5, rgba(C.stamp, 0.5));
      fillEll(ctx, 16, -2, 0.5, 0.4, rgba(C.stamp, 0.45));
      ctx.font = '700 2.2px ' + FONT;
      ctx.fillText('УТВЕРЖДЕНО', 0, 5.4);
    });
  }

  function unknownProp(ctx, name) {
    ctx.save();
    ctx.setLineDash([3, 2.4]);
    roundRect(ctx, 12, 12, 76, 76, 6);
    ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(C.ink, 0.4); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = rgba(C.ink, 0.5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 22px ' + FONT;
    ctx.fillText('?', 50, 48);
    ctx.font = '600 7px ' + FONT;
    ctx.fillText(name || '', 50, 66);
  }

  /* ============================================================ ПУБЛИКАЦИЯ */
  A.drawPropNames = PROP_NAMES.slice();
  A.moods = {
    teacher: TEACHER_MOODS.slice(),
    student: STUDENT_MOODS.slice(),
    article: ['idle', 'angry', 'run', 'proud', 'sleep', 'union', 'cry', 'happy', 'evil'],
    letter: LETTER_MOODS.slice()
  };

  A.paint = function (canvas, kind, opts) {
    if (!canvas || !canvas.getContext) return canvas;
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.save();
    try {
      ctx.clearRect(0, 0, W, H);
      var r = { x: 0, y: 0, w: W, h: H };
      var t = opts.t || 0;
      var k = String(kind || 'article').toLowerCase();
      if (k === 'article') A.drawArticle(ctx, r, opts.mood || 'idle', t, opts);
      else if (k === 'letter') A.drawLetter(ctx, r, opts.glyph || 'Ա', opts.mood || 'neutral', t);
      else if (k === 'teacher') A.drawTeacher(ctx, r, opts.mood || 'neutral', t);
      else if (k === 'student') A.drawStudent(ctx, r, opts.idx || 0, opts.mood || 'neutral', t);
      else A.drawProp(ctx, k === 'policeman' ? 'police' : k, r, t, opts);
    } finally { ctx.restore(); }
    return canvas;
  };





})();
