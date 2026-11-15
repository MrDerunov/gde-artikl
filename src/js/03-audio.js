/* «ГДЕ АРТИКЛЬ?!» — 03-audio.js — синтезированные звуки на WebAudio. Роль: Visual.
   API (TECH.md §6): G.audio.unlock(), muted, setMuted(bool), toggle(),
   sfx(name, opts?), tone(freq, dur, type, vol), babble(on) — необязательно.
   Никаких семплов и внешних файлов: только осцилляторы, шум и фильтры.
   Все вызовы безопасны: без AudioContext / до жеста / при mute — тишина, без ошибок.
*/
(function () {
  'use strict';
  var G = (window.G = window.G || {});
  var A = (G.audio = G.audio || {});

  var VOLUME = 0.42;         // общая громкость (умеренно)
  var ctx = null;
  var master = null;
  var comp = null;
  var noiseBuf = null;
  var muted = false;
  var unlocked = false;
  var babbleTimer = null;
  var babbleUntil = 0;
  try { muted = localStorage.getItem('gda-muted') === '1'; } catch (e) { muted = false; }

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; return null; }
    try {
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOLUME;
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 18;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      master.connect(comp);
      comp.connect(ctx.destination);
    } catch (e) { master = null; }
    return ctx;
  }

  function getNoise() {
    if (noiseBuf || !ctx) return noiseBuf;
    try {
      var len = Math.floor(ctx.sampleRate * 2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        last = last * 0.72 + w * 0.28;   // чуть «теплее» белого
        d[i] = last;
      }
    } catch (e) { noiseBuf = null; }
    return noiseBuf;
  }

  function canPlay() {
    if (muted) return null;
    var c = ensure();
    if (!c || !master) return null;
    if (c.state === 'suspended') {
      try { c.resume(); } catch (e) {}
      return null;                        // не планируем раньше разблокировки
    }
    return c;
  }

  /* ---------------------------------------------------------- примитивы */
  function toneAt(t0, f0, f1, dur, type, vol, dest, opt) {
    opt = opt || {};
    var c = ctx; if (!c) return;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    var f = Math.max(20, f0);
    o.frequency.setValueAtTime(f, t0);
    if (f1 && Math.abs(f1 - f0) > 1) {
      try { o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); } catch (e) {}
    }
    var peak = Math.max(0.0002, vol);
    var a = opt.attack == null ? 0.006 : opt.attack;
    var rel = opt.release == null ? Math.min(0.25, dur * 0.75) : opt.release;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.max(0.002, a));
    g.gain.setValueAtTime(peak, t0 + Math.max(0.004, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + rel);
    if (opt.vibrato) {
      var lfo = c.createOscillator();
      var lg = c.createGain();
      lfo.frequency.value = opt.vibrato.rate || 6;
      lg.gain.value = opt.vibrato.depth || 12;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + rel + 0.05);
    }
    o.connect(g);
    g.connect(dest || master);
    o.start(t0);
    o.stop(t0 + dur + rel + 0.05);
  }

  function noiseAt(t0, dur, vol, filterType, freq, q, dest) {
    var c = ctx; if (!c || !getNoise()) return;
    var src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = c.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.setValueAtTime(Math.max(40, freq || 1200), t0);
    if (q != null) f.Q.value = q;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || master);
    src.start(t0); src.stop(t0 + dur + 0.03);
    return f;
  }

  function noiseSweep(t0, dur, vol, type, f1, f2, q) {
    var c = ctx; if (!c || !getNoise()) return;
    var src = c.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    var f = c.createBiquadFilter();
    f.type = type || 'bandpass'; f.Q.value = q == null ? 1.2 : q;
    f.frequency.setValueAtTime(Math.max(40, f1), t0);
    try { f.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t0 + dur); } catch (e) {}
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.03);
  }

  function chord(t0, freqs, dur, type, vol, stagger, dest) {
    for (var i = 0; i < freqs.length; i++) {
      toneAt(t0 + (stagger || 0) * i, freqs[i], freqs[i], dur, type, vol, dest);
    }
  }

  /* ------------------------------------------------------------ SFX-карта */
  var SFX = {
    click: function (t) { toneAt(t, 880, 760, 0.045, 'square', 0.16, null, { release: 0.03 }); },
    tap: function (t) { SFX.click(t); },
    pop: function (t) {
      toneAt(t, 320, 980, 0.075, 'sine', 0.3, null, { attack: 0.003, release: 0.05 });
      noiseAt(t, 0.045, 0.1, 'highpass', 2400, 0.7);
    },
    correct: function (t) {
      toneAt(t, 659.25, 659.25, 0.11, 'triangle', 0.2);
      toneAt(t + 0.1, 987.77, 987.77, 0.16, 'triangle', 0.22);
      noiseAt(t + 0.1, 0.12, 0.06, 'highpass', 3200, 0.8);
      toneAt(t + 0.22, 1318.5, 1318.5, 0.14, 'sine', 0.1);
    },
    wrong: function (t) {
      toneAt(t, 196, 130, 0.28, 'sawtooth', 0.18, null, { release: 0.12 });
      toneAt(t + 0.02, 98, 72, 0.3, 'square', 0.1, null, { release: 0.14 });
      noiseAt(t, 0.12, 0.08, 'lowpass', 700, 0.6);
    },
    scream: function (t) {
      var c = ctx;
      // полоса «крика»: пилообразная с вибрато + шум
      toneAt(t, 620, 1180, 0.16, 'sawtooth', 0.14, null, { attack: 0.01, vibrato: { rate: 11, depth: 46 } });
      toneAt(t + 0.15, 1180, 520, 0.34, 'sawtooth', 0.16, null, { release: 0.16, vibrato: { rate: 8, depth: 34 } });
      toneAt(t, 620, 620, 0.5, 'square', 0.05, null, { release: 0.2 });
      noiseAt(t + 0.03, 0.4, 0.06, 'bandpass', 1900, 1.4);
    },
    whoosh: function (t) { noiseSweep(t, 0.28, 0.16, 'bandpass', 420, 3200, 1.6); },
    swoosh: function (t) { noiseSweep(t, 0.2, 0.12, 'bandpass', 2600, 500, 1.8); },
    thud: function (t) {
      toneAt(t, 150, 55, 0.22, 'sine', 0.34, null, { attack: 0.004, release: 0.16 });
      noiseAt(t, 0.1, 0.1, 'lowpass', 380, 0.8);
    },
    sparkle: function (t) {
      var notes = [1174.7, 1568, 2093, 2637];
      for (var i = 0; i < notes.length; i++) toneAt(t + i * 0.045, notes[i], notes[i], 0.1, 'sine', 0.09, null, { release: 0.12 });
    },
    chalk: function (t) {
      for (var i = 0; i < 3; i++) {
        noiseAt(t + i * 0.055, 0.045, 0.07, 'bandpass', 2600 + i * 500, 2.2);
      }
      toneAt(t, 1400, 1200, 0.02, 'square', 0.025);
    },
    police: function (t) {
      toneAt(t, 740, 740, 0.16, 'square', 0.12);
      toneAt(t + 0.17, 620, 620, 0.17, 'square', 0.12);
      toneAt(t + 0.35, 740, 740, 0.16, 'square', 0.1);
      noiseAt(t, 0.52, 0.03, 'bandpass', 1800, 2);
    },
    panic: function (t) {
      var f = [392, 523, 659, 784, 1046];
      for (var i = 0; i < f.length; i++) toneAt(t + i * 0.055, f[i], f[i] * 1.01, 0.07, 'square', 0.075);
      noiseAt(t, 0.3, 0.05, 'highpass', 2400, 0.7);
    },
    letter: function (t) {
      noiseAt(t, 0.03, 0.09, 'bandpass', 3400, 2.4);
      toneAt(t, 620, 480, 0.05, 'square', 0.08);
    },
    stamp: function (t) {
      toneAt(t, 120, 46, 0.2, 'sine', 0.38, null, { attack: 0.003, release: 0.2 });
      noiseAt(t, 0.08, 0.12, 'lowpass', 900, 0.8);
      noiseAt(t + 0.01, 0.05, 0.05, 'highpass', 2600, 1.2);
    },
    paper: function (t) { noiseSweep(t, 0.16, 0.1, 'highpass', 1800, 4200, 0.8); },
    glitch: function (t) {
      for (var i = 0; i < 6; i++) {
        var f = 180 + Math.random() * 1600;
        toneAt(t + i * 0.035, f, f * (0.5 + Math.random()), 0.03, i % 2 ? 'square' : 'sawtooth', 0.07);
      }
      noiseAt(t, 0.2, 0.1, 'bandpass', 1200, 3);
    },
    explosion: function (t) {
      noiseSweep(t, 0.65, 0.34, 'lowpass', 1800, 90, 0.9);
      toneAt(t, 96, 30, 0.55, 'sine', 0.3, null, { release: 0.3 });
    },
    boom: function (t) {
      toneAt(t, 70, 34, 0.7, 'sine', 0.42, null, { attack: 0.008, release: 0.5 });
      noiseAt(t, 0.3, 0.12, 'lowpass', 260, 0.7);
    },
    win: function (t) {
      var f = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < f.length; i++) toneAt(t + i * 0.11, f[i], f[i], 0.2, 'triangle', 0.18);
      noiseAt(t + 0.44, 0.3, 0.05, 'highpass', 3400, 0.8);
    },
    lose: function (t) {
      var f = [392, 349.2, 311.1, 233.1];
      for (var i = 0; i < f.length; i++) toneAt(t + i * 0.16, f[i], f[i] * 0.98, 0.22, 'triangle', 0.14);
    },
    dramatic: function (t) {
      toneAt(t, 55, 55, 1.0, 'sine', 0.24, null, { attack: 0.3, release: 0.5 });
      chord(t + 0.02, [110, 164.8, 220], 0.9, 'triangle', 0.05, 0.02);
      noiseAt(t, 0.8, 0.03, 'lowpass', 300, 0.6);
    },
    heartbeat: function (t) {
      toneAt(t, 62, 46, 0.14, 'sine', 0.32, null, { release: 0.1 });
      toneAt(t + 0.22, 56, 42, 0.16, 'sine', 0.26, null, { release: 0.12 });
    },
    typing: function (t) {
      for (var i = 0; i < 4; i++) {
        noiseAt(t + i * 0.075, 0.022, 0.07, 'bandpass', 3000 + Math.random() * 900, 2.6);
        toneAt(t + i * 0.075, 380 + Math.random() * 120, 300, 0.03, 'square', 0.03);
      }
    },
    airhorn: function (t) {
      var fs = [440, 554.4, 659.3];
      for (var i = 0; i < fs.length; i++) toneAt(t, fs[i], fs[i] * 1.005, 0.42, 'sawtooth', 0.09, null, { attack: 0.01, release: 0.18, vibrato: { rate: 5.5, depth: 4 } });
      toneAt(t, 220, 220, 0.42, 'square', 0.05);
    },
    sadtrombone: function (t) {
      var seq = [[311.1, 0.26], [293.7, 0.26], [277.2, 0.26], [261.6, 0.5]];
      var at = t;
      for (var i = 0; i < seq.length; i++) {
        toneAt(at, seq[i][0], seq[i][0] * (i === 3 ? 0.86 : 1), seq[i][1], 'sawtooth', 0.13, null, { attack: 0.03, release: 0.12, vibrato: { rate: 5, depth: 7 } });
        at += seq[i][1] * 0.92;
      }
    },
    bell: function (t) {
      toneAt(t, 1568, 1568, 0.7, 'sine', 0.14, null, { attack: 0.004, release: 0.6 });
      toneAt(t, 2093, 2093, 0.5, 'sine', 0.06, null, { release: 0.45 });
      toneAt(t, 1046.5, 1046.5, 0.9, 'sine', 0.05, null, { release: 0.7 });
    },
    static: function (t) { noiseAt(t, 0.22, 0.09, 'bandpass', 2200, 0.5); },
    squeak: function (t) {
      // писклявая кнопка «Я ПОНЯЛ»
      toneAt(t, 1400, 2450, 0.07, 'triangle', 0.1, null, { attack: 0.004, release: 0.05 });
      toneAt(t + 0.09, 1750, 2950, 0.06, 'triangle', 0.08, null, { release: 0.04 });
      noiseAt(t, 0.04, 0.03, 'highpass', 4200, 0.8);
    },
    silence: function (t) {
      // драматическая тишина: обратный вдох, гаснущий в ноль
      noiseSweep(t, 0.55, 0.04, 'bandpass', 2800, 380, 1.5);
      toneAt(t, 120, 58, 0.55, 'sine', 0.03, null, { attack: 0.25, release: 0.3 });
    },
    riser: function (t) {
      var c = ctx; if (!c) return;
      toneAt(t, 180, 1500, 0.55, 'sawtooth', 0.06, null, { attack: 0.05, release: 0.1 });
      noiseSweep(t, 0.6, 0.12, 'bandpass', 500, 4200, 1.1);
    },
    beep: function (t) { toneAt(t, 1000, 1000, 0.055, 'square', 0.12); },
    error: function (t) {
      toneAt(t, 300, 300, 0.12, 'square', 0.12);
      toneAt(t + 0.16, 220, 220, 0.16, 'square', 0.12);
    },
    ding: function (t) {
      toneAt(t, 1318.5, 1318.5, 0.35, 'sine', 0.16, null, { attack: 0.003, release: 0.3 });
      toneAt(t, 2637, 2637, 0.18, 'sine', 0.05, null, { release: 0.15 });
    },
    crash: function (t) {
      noiseSweep(t, 0.5, 0.22, 'highpass', 3600, 900, 0.7);
      toneAt(t, 140, 60, 0.2, 'sine', 0.14, null, { release: 0.15 });
    },
    applause: function (t) {
      var c = ctx; if (!c) return;
      for (var i = 0; i < 46; i++) {
        var tt = t + Math.pow(Math.random(), 0.6) * 1.3;
        noiseAt(tt, 0.035 + Math.random() * 0.03, 0.015 + Math.random() * 0.05, 'bandpass', 1400 + Math.random() * 2600, 1.6);
      }
      noiseAt(t, 1.3, 0.02, 'bandpass', 2400, 0.9);
    },
    babble: function (t) {
      var vowels = [220, 262, 330, 392, 440];
      var f = vowels[Math.floor(Math.random() * vowels.length)];
      toneAt(t, f, f * (1 + Math.random() * 0.3), 0.08, Math.random() > 0.5 ? 'square' : 'triangle', 0.045);
      noiseAt(t, 0.03, 0.02, 'bandpass', 1600, 2);
    }
  };

  var NAMES = Object.keys(SFX);

  /* ---------------------------------------------------------- публичный API */
  A.SFX_NAMES = NAMES.slice();

  A.unlock = function () {
    if (muted) return;
    var c = ensure();
    if (!c) return;
    try { if (c.state === 'suspended') c.resume(); } catch (e) {}
    if (!unlocked) {
      unlocked = true;
      // тихий буфер: разблокировка iOS/Chrome
      try {
        var b = c.createBuffer(1, 1, 22050);
        var s = c.createBufferSource();
        s.buffer = b;
        s.connect(master || c.destination);
        s.start(0);
      } catch (e) {}
    }
  };

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem('gda-muted', muted ? '1' : '0'); } catch (e) {}
    if (muted && babbleTimer) A.babble(false);
    if (master && ctx) {
      try { master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.02); } catch (e) {}
    }
    if (!muted) A.unlock();
  }
  A.setMuted = setMuted;
  A.toggle = function () { setMuted(!muted); return muted; };
  Object.defineProperty(A, 'muted', {
    get: function () { return muted; },
    set: function (v) { setMuted(v); },
    configurable: true
  });

  A.sfx = function (name, opts) {
    opts = opts || {};
    if (muted) return;
    var c = canPlay();
    if (!c) return;
    var fn = SFX[name];
    if (!fn) return;
    var t0 = c.currentTime + 0.005 + (opts.delay || 0);
    try {
      if (opts.vol != null && opts.vol !== 1) {
        // временно понижаем мастер для этого звука
        var g = c.createGain();
        g.gain.value = Math.max(0, Math.min(2, opts.vol));
        g.connect(master);
        var prev = master;
        master = g;
        fn(t0);
        master = prev;
        setTimeout(function () { try { g.disconnect(); } catch (e) {} }, 2500);
      } else fn(t0);
    } catch (e) { /* звук не должен ломать игру */ }
  };

  A.tone = function (freq, dur, type, vol) {
    if (muted) return;
    var c = canPlay();
    if (!c) return;
    try { toneAt(c.currentTime + 0.005, freq, freq, Math.max(0.02, dur || 0.12), type || 'sine', vol == null ? 0.15 : vol); } catch (e) {}
  };

  A.babble = function (on) {
    if (babbleTimer) { clearInterval(babbleTimer); babbleTimer = null; }
    if (!on || muted) return;
    babbleUntil = Date.now() + 30000;
    babbleTimer = setInterval(function () {
      if (Date.now() > babbleUntil) { A.babble(false); return; }
      A.sfx('babble');
    }, 190 + Math.random() * 120);
  };

  if (muted) { /* старт в mute — просто тишина */ }
})();
