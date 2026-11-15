/* 10-intro.js — титульный экран, первый гэг. Lead. */
(function(){
'use strict';
var G = window.G = window.G || {};
var u = G.u;

G.u.css([
'.intro-layer{position:absolute;inset:0;z-index:95;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:max(16px,3.5vh) 14px max(16px,3.5vh);background:radial-gradient(120% 95% at 50% 38%, rgba(7,18,14,.30) 0%, rgba(5,13,10,.76) 62%, rgba(3,8,6,.94) 100%);overflow:hidden}',
'.intro-logo{text-align:center;color:#f6f2df;transform:rotate(-1.2deg);margin-top:2vh;animation:introLogoIn .7s cubic-bezier(.2,1.3,.4,1) both}',
'@keyframes introLogoIn{from{opacity:0;transform:rotate(-1.2deg) translateY(-26px) scale(.92)}to{opacity:1;transform:rotate(-1.2deg) translateY(0) scale(1)}}',
'.intro-logo .l1{display:block;font:900 clamp(46px,13.5vw,140px)/.86 var(--font-ui);letter-spacing:.01em;text-shadow:0 6px 0 rgba(0,0,0,.42), 0 0 34px rgba(246,242,223,.14)}',
'.intro-logo .l2{display:block;font:900 clamp(38px,10.6vw,118px)/1.02 var(--font-ui);letter-spacing:.005em;color:#ffd23f;text-shadow:0 5px 0 rgba(0,0,0,.45), 0 0 28px rgba(255,210,63,.2)}',
'.intro-logo .q{display:inline-block;color:#ff6b6b;animation:introQ 2.2s ease-in-out infinite;transform-origin:60% 80%}',
'@keyframes introQ{0%,72%,100%{transform:rotate(0) scale(1)}78%{transform:rotate(-9deg) scale(1.12)}84%{transform:rotate(7deg) scale(1.05)}90%{transform:rotate(-4deg)}}',
'.intro-sub{margin-top:12px;font:700 clamp(10px,2.6vw,14px)/1.4 var(--font-ui);letter-spacing:.22em;text-transform:uppercase;color:rgba(242,236,217,.68);text-align:center}',
'.intro-mid{position:relative;flex:1 1 auto;width:100%;min-height:60px}',
'.intro-article{position:absolute;width:clamp(86px,15vw,150px);height:clamp(86px,15vw,150px);transform:translate(-50%,-50%);transition:left .32s cubic-bezier(.2,1.2,.4,1), top .32s cubic-bezier(.2,1.2,.4,1), transform .18s;filter:drop-shadow(0 10px 6px rgba(0,0,0,.4));cursor:pointer;touch-action:manipulation}',
'.intro-article-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
'.intro-article-label{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:2px;font:800 10px/1.1 var(--font-ui);letter-spacing:.14em;color:rgba(242,236,217,.55);white-space:nowrap;pointer-events:none;z-index:2}',
'.intro-article.hop{transform:translate(-50%,-50%) scale(1.12) rotate(-6deg)}',
'.intro-bottom{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;padding-bottom:1vh}',
'.intro-start{min-width:min(78vw,360px);min-height:62px;font-size:clamp(17px,4.4vw,24px);letter-spacing:.06em;animation:introBtn 2.6s ease-in-out infinite}',
'@keyframes introBtn{0%,100%{transform:translateY(0) rotate(-.6deg)}50%{transform:translateY(-4px) rotate(.6deg)}}',
'.intro-start:active{animation:none}',
'.intro-hint{font:600 clamp(11px,2.9vw,14px)/1.35 var(--font-ui);color:rgba(242,236,217,.6);text-align:center;max-width:min(86vw,520px)}',
'.intro-fine{font:600 clamp(9px,2.3vw,11px)/1.4 var(--font-ui);letter-spacing:.06em;color:rgba(242,236,217,.34);text-align:center}',
'.intro-chalkline{width:min(70vw,520px);height:3px;margin:10px auto 0;background:linear-gradient(90deg,transparent,rgba(246,242,223,.5),transparent);border-radius:2px}',
'.intro-bubble{position:absolute;left:50%;top:-16px;transform:translate(-50%,-100%) rotate(-2deg);background:#f7efdf;color:#1b1b1f;border:3px solid #1b1b1f;border-radius:10px;padding:6px 10px;font:800 12px/1.2 var(--font-ui);white-space:nowrap;box-shadow:3px 4px 0 rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .15s}',
'.intro-bubble.show{opacity:1}',
].join('\n'));

var DEFAULT_TEXT = {
  catchphrase: 'ГДЕ АРТИКЛЬ?!',
  screams: ['ГДЕ АРТИКЛЬ?!']
};

G.scenes.intro = async function(c){
  var h = c.h;
  c.stage.presenting(true);
  c.stage.mood('teacher', 'neutral');
  c.stage.mood('tolya', 'neutral');
  c.stage.mood('vika', 'smug');
  c.stage.mood('gosha', 'hide');
  c.layer.style.display = 'block';

  var layer = h.el('div', 'intro-layer');
  c.layer.appendChild(layer);

  var logo = h.el('div', 'intro-logo');
  var l1 = h.el('span', 'l1', 'ГДЕ');
  var l2 = h.el('span', 'l2');
  l2.appendChild(document.createTextNode('АРТИКЛЬ'));
  var q = h.el('span', 'q', '?!');
  l2.appendChild(q);
  logo.appendChild(l1); logo.appendChild(l2);
  layer.appendChild(logo);
  layer.appendChild(h.el('div', 'intro-sub', 'Урок 47 · взрослые люди · հայերեն'));

  var mid = h.el('div', 'intro-mid');
  layer.appendChild(mid);

  var spr = h.el('div', 'intro-article');
  var sprCanvas = document.createElement('canvas');
  sprCanvas.width = 300; sprCanvas.height = 300;
  sprCanvas.className = 'intro-article-canvas';
  spr.appendChild(sprCanvas);
  if (G.art && G.art.paint){ try { G.art.paint(sprCanvas, 'article', { mood: 'idle' }); } catch(e) { console.error(e); } }
  else {
    var g2 = sprCanvas.getContext('2d'); g2.font = '900 160px sans-serif'; g2.textAlign = 'center'; g2.fillStyle = '#ffd23f'; g2.fillText('Ը', 150, 200);
  }
  var pos = { x: 63, y: 55 };
  function place(){ spr.style.left = pos.x + '%'; spr.style.top = pos.y + '%'; }
  spr.style.left = pos.x + '%'; spr.style.top = pos.y + '%';
  mid.appendChild(spr);
  spr.appendChild(h.el('span', 'intro-article-label', 'живой артикль · не трогать'));
  var bubble = h.el('div', 'intro-bubble', 'НЕ ТРОГАЙ!');
  spr.appendChild(bubble);

  var dodgeCount = 0, squeakAt = 0, clicks = 0, finished = false;
  function squeak(){
    var now = Date.now();
    if (now - squeakAt < 260) return;
    squeakAt = now;
    if (G.audio && G.audio.sfx){ try { G.audio.sfx('squeak'); } catch(e) {} }
  }
  function fleeFrom(x, y){
    var r = spr.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    if (dist > Math.max(130, r.width * 1.15)) return false;
    var ang = Math.atan2(cy - y, cx - x) || 0;
    var nx = pos.x + Math.cos(ang) * h.rand(20, 34) + h.rand(-10, 10);
    var ny = pos.y + Math.sin(ang) * h.rand(18, 32) + h.rand(-8, 8);
    pos.x = h.clamp(nx, 12, 88);
    pos.y = h.clamp(ny, 12, 86);
    place();
    spr.classList.add('hop');
    setTimeout(function(){ spr.classList.remove('hop'); }, 180);
    bubble.classList.add('show');
    setTimeout(function(){ bubble.classList.remove('show'); }, 700);
    squeak();
    if (dodgeCount === 0){ G.gag('title_escape'); }
    dodgeCount++;
    return true;
  }
  c.cleanup(u.on(document, 'pointermove', function(ev){ fleeFrom(ev.clientX, ev.clientY); }, { passive: true }));

  c.tap(spr, function(ev){
    ev.stopPropagation();
    clicks++;
    squeak();
    if (clicks < 5){
      bubble.textContent = clicks === 1 ? 'НЕ ТРОГАЙ!' : (clicks < 4 ? 'ПРЕКРАТИ.' : 'ЛАДНО. ЛАДНО!');
      bubble.classList.add('show');
      setTimeout(function(){ bubble.classList.remove('show'); }, 700);
      var r = spr.getBoundingClientRect();
      if (G.fx) G.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { text: 'ը', count: 5, colors: ['#ffd23f', '#f6f2df'], spread: 90 });
    } else {
      bubble.classList.remove('show');
      G.achievement('title_easter');
      spr.style.opacity = '0.55';
    }
  });

  var bottom = h.el('div', 'intro-bottom');
  var startBtn = h.el('button', 'btn primary intro-start', 'НАЧАТЬ УРОК');
  startBtn.type = 'button';
  bottom.appendChild(startBtn);
  bottom.appendChild(h.el('div', 'intro-hint', 'Управление: палец или мышь. Артикль сам не придёт.'));
  bottom.appendChild(h.el('div', 'intro-chalkline'));
  bottom.appendChild(h.el('div', 'intro-fine', 'Министерство потерянных артиклей · урок 47 · ошибки не наказываются, они коллекционируются'));
  layer.appendChild(bottom);

  if (c.auto){ await c.wait(700); return; }

  await new Promise(function(resolve){
    var started = false;
    function finish(){
      if (started) return;
      started = true;
      layer.style.transition = 'opacity .3s ease';
      layer.style.opacity = '0';
      setTimeout(function(){ if (layer.parentNode) layer.parentNode.removeChild(layer); resolve(); }, 320);
    }
    c.tap(startBtn, async function(){
      if (started) return;
      startBtn.disabled = true;
      if (G.audio && G.audio.sfx){ try { G.audio.sfx('chalk'); } catch(e) {} }
      var choice = await c.fx.fakeWindow({
        title: 'МИНИСТЕРСТВО ОБРАЗОВАНИЯ · ПРОВЕРКА',
        body: 'Перед началом урока необходимо сдать домашнее задание образца 2019 года.',
        buttons: [
          { id: 'give', label: 'СДАТЬ ДОМАШНЕЕ' },
          { id: 'skip', label: 'Я ЗАБЫЛ', primary: true, runaway: true }
        ]
      });
      if (choice === 'give'){
        await c.fx.fakeWindow({
          title: 'ПРОВЕРКА ДОМАШНЕГО ЗАДАНИЯ',
          body: 'ДОМАШНЕЕ ЗАДАНИЕ ОБРАЗЦА 2019 ГОДА НЕ НАЙДЕНО.\nЗАЧТЕНО. УРОК НАЧИНАЕТСЯ.',
          buttons: [{ id: 'ok', label: 'НАЧАТЬ', primary: true }]
        });
      }
      startBtn.disabled = false;
      finish();
    });
  });
  c.stage.presenting(false);
  c.layer.style.display = 'none';
  G.bump('errors', 0);
};
})();
