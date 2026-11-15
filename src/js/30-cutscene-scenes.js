/* 30-cutscene-scenes.js — движок катсцен + регистрация i1..i6. Lead. */
(function(){
'use strict';
var G = window.G = window.G || {};
var u = G.u;

G.u.css([
'.cut-layer{position:absolute;inset:0;z-index:5;pointer-events:none;display:flex;align-items:center;justify-content:center}',
'.cut-card{max-width:min(86vw,720px);background:#f7efdf;color:#1b1b1f;border:4px solid #1b1b1f;border-radius:8px;padding:clamp(16px,4vw,32px) clamp(18px,5vw,44px);box-shadow:0 16px 0 rgba(0,0,0,.35);transform:rotate(-1.2deg);text-align:center;animation:cutCardIn .22s cubic-bezier(.2,1.4,.4,1)}',
'.cut-card h2{margin:0;font:900 clamp(22px,6vw,52px)/1.02 var(--font-ui);letter-spacing:.02em}',
'.cut-card .sub{margin:10px 0 0;font:600 clamp(13px,3.2vw,18px)/1.35 var(--font-ui);opacity:.78}',
'.cut-text{max-width:min(88vw,780px);text-align:center;color:#f2ecd9;text-shadow:0 3px 0 rgba(0,0,0,.55);padding:0 12px;animation:cutCardIn .22s ease-out}',
'.cut-text h2{margin:0;font:900 clamp(22px,6.4vw,54px)/1.05 var(--font-ui);letter-spacing:.02em}',
'.cut-text .sub{margin:12px 0 0;font:600 clamp(13px,3.2vw,19px)/1.35 var(--font-ui);opacity:.8;font-style:italic}',
'@keyframes cutCardIn{from{opacity:0;transform:rotate(-1.2deg) scale(.94) translateY(10px)}to{opacity:1;transform:rotate(-1.2deg) scale(1) translateY(0)}}',
'.cut-dark{position:absolute;inset:0;background:#000;animation:cutDarkIn .3s ease-out}',
'@keyframes cutDarkIn{from{opacity:0}to{opacity:1}}',
'.cut-dialog{position:absolute;left:10px;right:10px;top:calc(42vh + 12px);bottom:auto;min-height:24vh;max-height:50vh;display:flex;flex-direction:column;justify-content:center;background:#f7efdf;color:#1b1b1f;border:3px solid #1b1b1f;border-radius:12px;padding:16px 18px 22px;box-shadow:0 10px 0 rgba(0,0,0,.35);animation:cutCardIn .18s ease-out;overflow:auto}',
'.cut-dialog::after{content:"ТАП — ДАЛЬШЕ";position:absolute;right:14px;bottom:8px;font:800 9px/1 var(--font-ui);letter-spacing:.14em;color:#8c2418;opacity:.5}',
'.cut-dialog .who{display:block;font:800 10px/1.1 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;color:#8c2418;margin-bottom:6px}',
'.cut-dialog .line{font:800 clamp(19px,5.4vw,30px)/1.16 var(--font-ui);color:#1b1b1f}',
'.cut-dialog.urgent{background:#3a0f0f;border-color:#ff8a8a;color:#ffdada}',
'.cut-dialog.urgent .who{color:#ffb4b4}',
'.cut-dialog.urgent .line{color:#ffe9e9;font-size:clamp(22px,6.4vw,36px)}',
'.cut-dialog.system{background:#06110d;border-color:#2c6c4a;font-family:var(--font-mono)}',
'.cut-dialog.system .who{color:#8ff0b8}',
'.cut-dialog.system .line{color:#a9ffd0;font-family:var(--font-mono);font-weight:600;font-size:clamp(14px,4vw,20px)}',
'.cut-homework{position:absolute;inset:6% 6% 6%;overflow:auto;background:#f7efdf;color:#1b1b1f;border:4px solid #1b1b1f;border-radius:6px;padding:14px 18px;pointer-events:auto}',
'.cut-homework h3{margin:0 0 8px;font:900 clamp(15px,3.6vw,22px)/1.1 var(--font-ui)}',
'.cut-homework ol{margin:0;padding-left:22px;font:600 clamp(11px,2.7vw,14px)/1.4 var(--font-ui)}'
].join('\n'));

function defaultMs(step){
  if (step.ms !== undefined) return step.ms;
  if (step.say) return Math.max(900, Math.min(2400, 620 + String(step.text || '').length * 42));
  if (step.card || step.text) return 1700;
  if (step.board) return 1200;
  if (step.scream) return 1400;
  if (step.prop) return step.action === 'exit' ? 700 : 800;
  if (step.silence) return step.silence;
  if (step.fx) return 500;
  if (step.audio) return 160;
  if (step.wait) return step.wait;
  return 700;
}

function waitOrTap(c, ms){
  if (c.auto) ms = Math.min(ms, 130);
  var offTap = null, offKey = null;
  var tapPromise = new Promise(function(resolve){
    offTap = u.on(document, 'pointerdown', function(){ resolve(true); }, true);
    offKey = u.on(document, 'keydown', function(e){
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') resolve(true);
    }, true);
  });
  function cleanup(){
    if (offTap) offTap();
    if (offKey) offKey();
  }
  var timed = c.wait(Math.max(0, ms));
  return Promise.race([timed, tapPromise]).then(function(){ cleanup(); }, function(err){ cleanup(); throw err; });
}

function whoLabel(who){
  if (who === 'teacher') return (G.text && G.text.teacherName) || 'Учительница';
  if (who === 'article') return (G.text && G.text.article && G.text.article.name) || 'Артикль';
  if (who === 'police') return 'Полицейский';
  if (who === 'system') return 'СИСТЕМА';
  var st = G.text && G.text.studentById && G.text.studentById[who];
  return (st && st.name) || { tolya: 'Толя', vika: 'Вика', gosha: 'Гоша' }[who] || who;
}

function showDialog(c, cut, who, text, urgent){
  var cls = 'cut-dialog' + (urgent ? ' urgent' : '') + (who === 'system' ? ' system' : '');
  var dlg = c.h.el('div', cls);
  dlg.appendChild(c.h.el('span', 'who', whoLabel(who)));
  dlg.appendChild(c.h.el('div', 'line', String(text || '')));
  cut.appendChild(dlg);
  return dlg;
}

async function runStep(c, cut, step){
  var h = c.h;
  cut.innerHTML = '';
  var ms = defaultMs(step);
  var mobileDialog = c._mobileDialog || false;

  if (step.silence !== undefined && step.say === undefined && step.card === undefined && step.text === undefined){
    var dark = h.el('div', 'cut-dark');
    cut.appendChild(dark);
    if (G.audio && G.audio.sfx){ try { G.audio.sfx('silence'); } catch(e) {} }
    await waitOrTap(c, step.silence || 500);
    return;
  }
  if (step.sfx && c.fx && typeof c.fx[step.sfx] === 'function'){ try { c.fx[step.sfx](); } catch(e){} }
  if (step.fx){
    try {
      if (step.fx === 'flash') c.fx.flash('#ffffff', step.ms || 260);
      else if (step.fx === 'glitch') c.fx.glitch(step.ms || 450);
      else if (step.fx === 'shake') c.fx.shake(1.3, step.ms || 420);
      else if (step.fx === 'confetti') c.fx.confetti();
      else if (step.fx === 'spotlight') c.fx.spotlight(step.ms || 700);
    } catch(e){ console.error(e); }
  }
  if (step.audio && G.audio && G.audio.sfx){ try { G.audio.sfx(step.audio); } catch(e){} }
  if (step.board !== undefined){ try { c.stage.board(step.board); } catch(e){} }
  if (step.prop){ try { c.stage.prop(step.prop, step.action || 'enter', { mood: step.mood }); } catch(e){} }

  if (step.stamp){
    try { c.fx.stamp(step.stamp); } catch(e) {}
    try { if (G.audio && G.audio.sfx) G.audio.sfx('stamp'); } catch(e) {}
    await waitOrTap(c, step.ms || 1600);
    return;
  }
  if (step.confetti){ try { c.fx.confetti(); } catch(e) {} }

  if (step.homework){
    var hw = h.el('div', 'cut-homework');
    var list = (G.text && G.text.homework) || [];
    var h3 = h.el('h3', null, 'ДОМАШНЕЕ ЗАДАНИЕ (фрагмент)');
    var ol = document.createElement('ol');
    for (var i = 0; i < list.length; i++){ var li = document.createElement('li'); li.textContent = list[i]; ol.appendChild(li); }
    hw.appendChild(h3); hw.appendChild(ol);
    cut.appendChild(hw);
    await waitOrTap(c, ms);
    return;
  }

  if (step.card || (step.text !== undefined && step.say === undefined)){
    var isCard = !!step.card;
    var box = h.el('div', isCard ? 'cut-card' : 'cut-text');
    var h2 = h.el('h2', null, step.card || step.text);
    box.appendChild(h2);
    if (step.sub){ box.appendChild(h.el('div', 'sub', step.sub)); }
    cut.appendChild(box);
    await waitOrTap(c, ms);
    return;
  }

  if (step.scream){
    var screamText = step.scream || (G.text && G.text.catchphrase) || 'ГДЕ АРТИКЛЬ?!';
    try { c.stage.scream(screamText, { bubble: !mobileDialog }); } catch(e) {}
    if (mobileDialog) showDialog(c, cut, 'teacher', screamText, true);
    await waitOrTap(c, step.ms || 1400);
    return;
  }

  if (step.say){
    var who = step.say;
    var text = step.text || '';
    if (mobileDialog){
      showDialog(c, cut, who, text, !!step.urgent);
      if (step.mood && (who === 'teacher' || who === 'tolya' || who === 'vika' || who === 'gosha')){ try { c.stage.mood(who, step.mood); } catch(e){} }
    } else {
      try { c.say(who, text, { mood: step.mood, urgent: !!step.urgent, ms: Math.max(900, ms + 250) }); } catch(e){}
      if (step.mood && (who === 'teacher' || who === 'tolya' || who === 'vika' || who === 'gosha')){ try { c.stage.mood(who, step.mood); } catch(e){} }
    }
    await waitOrTap(c, ms);
    return;
  }

  if (step.wait !== undefined){ await waitOrTap(c, step.wait); return; }
  await waitOrTap(c, ms);
}

G.playCutscene = async function(c, steps){
  steps = steps || [];
  if (!steps.length) return;
  c.fullscreen(true);
  var cut = c.h.el('div', 'cut-layer');
  c.layer.appendChild(cut);
  c._mobileDialog = u.isPortraitMobile();
  try { c.stage.show(); } catch(e) {}
  try { c.stage.presenting(true); } catch(e) {}
  try {
    for (var i = 0; i < steps.length; i++){
      if (c.done) return;
      try {
        await runStep(c, cut, steps[i] || {});
      } catch(err){
        if (err && err.__skip) throw err;
        console.error('[cutscene ' + c.name + ' step ' + i + ']', err);
      }
    }
  } finally {
    try { c.stage.presenting(false); } catch(e) {}
  }
  c.layer.style.display = 'none';
};

function register(name){
  G.scenes[name] = async function(c){
    await G.playCutscene(c, (G.cutscenes && G.cutscenes[name]) || []);
  };
}
['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].forEach(register);
})();
