/* 20-finale.js — домашнее задание, возвращение артикля, диплом, шаринг. Lead. */
(function(){
'use strict';
var G = window.G = window.G || {};
var u = G.u;

G.u.css([
/* ---------- домашка ---------- */
'.fin-hw-wrap{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(4,10,8,.72);padding:16px;opacity:1;transition:opacity .4s ease}',
'.fin-hw-wrap.fading{opacity:0}',
'.fin-hw-paper{position:relative;width:min(720px,100%);max-height:82vh;overflow:hidden;background:#f7efdf;color:#1b1b1f;border:4px solid #1b1b1f;border-radius:6px;box-shadow:0 14px 0 rgba(0,0,0,.4);padding:clamp(14px,3vw,26px) clamp(16px,3.4vw,30px);transform:rotate(-.7deg);display:flex;flex-direction:column}',
'.fin-hw-head{font:900 clamp(15px,3.8vw,24px)/1.1 var(--font-ui);letter-spacing:.04em;border-bottom:3px solid #1b1b1f;padding-bottom:8px;margin-bottom:8px;flex:0 0 auto}',
'.fin-hw-list{margin:0;padding-left:24px;overflow:hidden;font:600 clamp(11px,2.6vw,14px)/1.32 var(--font-ui);flex:1 1 auto}',
'.fin-hw-list li{margin:0 0 2px;opacity:0;animation:finLi .16s ease-out forwards}',
'.fin-hw-list li.last{background:#ffe9a8;box-shadow:0 0 0 3px #ffd23f;font-weight:900;border-radius:3px}',
'@keyframes finLi{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}',
'.fin-hw-count{font:800 clamp(10px,2.4vw,12px)/1.2 var(--font-ui);letter-spacing:.16em;color:#8c2418;text-transform:uppercase;flex:0 0 auto;padding-top:6px}',
'.fin-hw-article{position:absolute;right:-6%;bottom:-4%;width:clamp(90px,16vw,150px);height:clamp(90px,16vw,150px);animation:finArticleIn .8s cubic-bezier(.2,1.2,.4,1) both;filter:drop-shadow(0 8px 6px rgba(0,0,0,.35));pointer-events:none}',
'@keyframes finArticleIn{from{transform:translateX(120%) rotate(10deg)}to{transform:translateX(0) rotate(0)}}',
'.fin-hw-say{position:absolute;right:9%;bottom:calc(clamp(90px,16vw,150px) - 6px);background:#f7efdf;color:#1b1b1f;border:3px solid #1b1b1f;border-radius:10px;padding:5px 10px;font:800 clamp(11px,2.6vw,14px)/1.2 var(--font-ui);box-shadow:3px 4px 0 rgba(0,0,0,.35);transform:rotate(-2deg);animation:finArticleIn .8s cubic-bezier(.2,1.2,.4,1) both}',
/* ---------- диплом ---------- */
'.fin-diploma-wrap{position:absolute;inset:0;z-index:70;display:flex;flex-direction:column;overflow:hidden;background:radial-gradient(120% 90% at 50% 0%, #1b3c33 0%, #0b1c17 60%, #050d0a 100%)}',
'.fin-scroll{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:max(12px,2.4vh) 12px 14px}',
'.fin-diploma{position:relative;width:min(780px,100%);margin:0 auto;background:#f7efdf;color:#1b1b1f;border:4px solid #1b1b1f;border-radius:4px;box-shadow:0 16px 0 rgba(0,0,0,.4), inset 0 0 60px rgba(140,110,60,.12);padding:clamp(16px,3.4vw,34px) clamp(16px,4vw,42px);transform:rotate(-.5deg);animation:finDipIn .5s cubic-bezier(.2,1.2,.4,1) both}',
'@keyframes finDipIn{from{opacity:0;transform:rotate(-.5deg) translateY(28px) scale(.97)}to{opacity:1;transform:rotate(-.5deg) translateY(0) scale(1)}}',
'.fin-dip-strip{position:absolute;left:0;right:0;top:0;height:10px;background:repeating-linear-gradient(90deg,#bf2f22 0 18px,#f7efdf 18px 30px,#1b1b1f 30px 38px)}',
'.fin-min{font:800 clamp(9px,2.2vw,12px)/1.3 var(--font-ui);letter-spacing:.26em;text-transform:uppercase;text-align:center;color:#8c2418;margin:6px 0 2px}',
'.fin-title{font:900 clamp(20px,5.2vw,40px)/1.02 var(--font-ui);letter-spacing:.02em;text-align:center;margin:4px 0 2px;text-transform:uppercase}',
'.fin-sub{font:600 clamp(11px,2.6vw,13px)/1.35 var(--font-ui);text-align:center;opacity:.72;margin:2px 0 12px}',
'.fin-rule{height:3px;background:repeating-linear-gradient(90deg,#1b1b1f 0 10px,transparent 10px 16px);opacity:.45;margin:10px 0}',
'.fin-intro{font:600 clamp(12px,2.8vw,15px)/1.4 var(--font-ui);text-align:center;margin:0 0 12px}',
'.fin-rankbox{border:3px dashed #1b1b1f;border-radius:6px;padding:10px 14px;text-align:center;margin:4px 0 14px;background:rgba(255,210,63,.16);transform:rotate(.4deg)}',
'.fin-rank-label{font:800 clamp(9px,2.1vw,11px)/1.2 var(--font-ui);letter-spacing:.22em;text-transform:uppercase;opacity:.65}',
'.fin-rank{font:900 clamp(18px,4.6vw,30px)/1.08 var(--font-ui);margin-top:4px}',
'.fin-stats{list-style:none;margin:0 0 12px;padding:0;font:600 clamp(11px,2.6vw,14px)/1.45 var(--font-ui)}',
'.fin-stats li{padding:3px 0 3px 16px;position:relative}',
'.fin-stats li::before{content:"◆";position:absolute;left:0;top:3px;font-size:9px;color:#8c2418}',
'.fin-ach{margin:0 0 12px}',
'.fin-ach-title{font:800 clamp(9px,2.1vw,11px)/1.2 var(--font-ui);letter-spacing:.18em;text-transform:uppercase;opacity:.6;margin-bottom:4px}',
'.fin-chip{display:inline-block;border:2px solid #8c2418;color:#8c2418;border-radius:20px;padding:2px 9px;margin:0 4px 5px 0;font:800 clamp(10px,2.2vw,12px)/1.3 var(--font-ui);transform:rotate(-1deg)}',
'.fin-signrow{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:4px;flex-wrap:wrap}',
'.fin-sign{font:600 clamp(10px,2.3vw,12px)/1.5 var(--font-ui);flex:1 1 220px}',
'.fin-sign .line{display:block;border-bottom:2px solid #1b1b1f;height:18px;margin-bottom:3px}',
'.fin-seal{width:clamp(84px,20vw,116px);height:clamp(84px,20vw,116px);border-radius:50%;border:4px solid #bf2f22;color:#bf2f22;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transform:rotate(-11deg);margin:0 auto;cursor:pointer;user-select:none;flex:0 0 auto}',
'.fin-seal .big{font:900 clamp(28px,7vw,44px)/1 "Segoe UI","Noto Sans Armenian","DejaVu Sans",sans-serif}',
'.fin-seal .small{font:800 clamp(5px,1.3vw,7px)/1.15 var(--font-ui);letter-spacing:.12em;text-transform:uppercase;max-width:86%;margin-top:2px}',
'.fin-seal:active{transform:rotate(-11deg) scale(.96)}',
'.fin-foot{font:600 clamp(9px,2.1vw,11px)/1.4 var(--font-ui);opacity:.62;margin-top:14px;text-align:center}',
'.fin-bonus{font:800 clamp(11px,2.5vw,13px)/1.35 var(--font-ui);text-align:center;color:#8c2418;margin-top:12px}',
'.fin-actions{flex:0 0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:10px 8px max(10px,2vh);background:#081410;box-shadow:0 -8px 20px rgba(0,0,0,.45);z-index:5}',
'.fin-btn{min-height:50px;font-size:clamp(11.5px,2.9vw,16px);letter-spacing:.02em;padding:9px 12px;flex:1 1 44%}',
'@media (max-width:400px){.fin-btn{flex:1 1 100%}}',
'.fin-manual{position:absolute;inset:0;z-index:150;background:rgba(3,8,6,.88);display:flex;align-items:center;justify-content:center;padding:16px}',
'.fin-manual-box{width:min(620px,100%);background:#dcd7c8;color:#161616;border:3px solid #161616;border-radius:4px;padding:14px;box-shadow:0 12px 0 rgba(0,0,0,.4)}',
'.fin-manual-title{font:900 clamp(12px,2.8vw,15px)/1.3 var(--font-ui);letter-spacing:.02em;margin-bottom:8px}',
'.fin-manual-ta{width:100%;min-height:32vh;resize:vertical;font:600 13px/1.45 var(--font-mono);padding:8px;border:2px solid #161616;background:#f3efe4;color:#161616;box-sizing:border-box}',
'.fin-manual-hint{font:600 11px/1.4 var(--font-ui);opacity:.7;margin:8px 0 10px}',
'.fin-copynote{text-align:center;font:800 clamp(10px,2.4vw,12px)/1.4 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:#2f7a4a;min-height:16px;margin-top:6px}',
].join('\n'));

function el(tag, cls, text){
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}
function btn(label, cls){
  var b = el('button', 'btn ' + (cls || ''), label);
  b.type = 'button';
  return b;
}

function getDiploma(){
  var stats = G.state.stats || {};
  var data = (G.text && G.text.diploma) || {};
  var rank = 'Свидетель урока';
  var lines = [];
  var share = '«ГДЕ АРТИКЛЬ?!» — урок пережит.';
  try { if (typeof data.rankFor === 'function') rank = data.rankFor(stats); } catch(e){ console.error(e); }
  try { if (typeof data.statsLines === 'function') lines = data.statsLines(stats) || []; } catch(e){ console.error(e); }
  try { if (typeof data.shareText === 'function') share = data.shareText(stats) || share; } catch(e){ console.error(e); }
  return {
    ministry: data.ministry || 'МИНИСТЕРСТВО ПОТЕРЯННЫХ АРТИКЛЕЙ',
    title: data.title || 'СВИДЕТЕЛЬСТВО О ПЕРЕЖИТОМ УРОКЕ',
    signedBy: data.signedBy || 'Полицейский (ныне министр)',
    stamp: data.stamp || 'ՀՈԴԸ ՏԵՂՈՒՄ Է',
    footnote: data.footnote || 'Документ действительный только при предъявлении артикля.',
    rank: rank, lines: lines, share: share
  };
}

function achievementLabels(){
  var out = [];
  var ach = G.state.achievements || {};
  var meta = (G.text && G.text.achievements) || {};
  for (var id in ach){
    if (!Object.prototype.hasOwnProperty.call(ach, id)) continue;
    out.push(meta[id] || id);
  }
  return out;
}

/* ---------------- домашка заливает экран ---------------- */
async function homeworkSequence(c){
  c.layer.style.display = 'block';
  var wrap = el('div', 'fin-hw-wrap');
  var paper = el('div', 'fin-hw-paper');
  var head = el('div', 'fin-hw-head', 'ДОМАШНЕЕ ЗАДАНИЕ · 47 ПУНКТОВ');
  var list = el('ol', 'fin-hw-list');
  var counter = el('div', 'fin-hw-count', 'сдача: 47 сентября');
  paper.appendChild(head);
  paper.appendChild(list);
  paper.appendChild(counter);
  wrap.appendChild(paper);
  c.layer.appendChild(wrap);

  var items = (G.text && G.text.homework) || ['Найти артикль.'];
  if (c.audio && c.audio.sfx){ try { c.audio.sfx('paper'); } catch(e) {} }
  for (var i = 0; i < items.length; i++){
    var li = el('li', i === items.length - 1 ? 'last' : '', items[i]);
    list.appendChild(li);
    paper.scrollTop = paper.scrollHeight;
    if (c.audio && i === 12 && c.audio.sfx){ try { c.audio.sfx('chalk'); } catch(e) {} }
    await c.wait(i < 10 ? 95 : (i < 30 ? 52 : 32));
  }
  G.bump('homeworkItems', items.length);
  paper.scrollTop = paper.scrollHeight;
  await c.wait(220);
  c.stage.mood('article', 'proud');

  var canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 320;
  canvas.className = 'fin-hw-article';
  if (G.art && G.art.paint){ try { G.art.paint(canvas, 'article', { mood: 'proud', size: 320 }); } catch(e) {} }
  paper.appendChild(canvas);
  paper.appendChild(el('div', 'fin-hw-say', 'Я здесь.'));
  if (G.audio && G.audio.sfx){ try { G.audio.sfx('squeak'); } catch(e) {} }
  await c.wait(1500);
  wrap.classList.add('fading');
  await c.wait(460);
  if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  c.layer.style.display = 'none';
}

/* ---------------- копирование ---------------- */
async function copyResult(c, noteEl, text){
  var ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch(e){ ok = false; }
  if (!ok){ ok = legacyCopy(text); }
  if (ok){
    if (noteEl){ noteEl.textContent = 'СКОПИРОВАНО. АРТИКЛЬ ПРИЛОЖЕН.'; }
    if (G.audio && G.audio.sfx){ try { G.audio.sfx('correct'); } catch(e) {} }
  } else {
    openManualCopy(c, text);
  }
  return ok;
}
function legacyCopy(text){
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch(e){ return false; }
}
function openManualCopy(c, text){
  if (document.getElementById('fin-manual')) return;
  var wrap = el('div', 'fin-manual');
  wrap.id = 'fin-manual';
  var box = el('div', 'fin-manual-box');
  box.appendChild(el('div', 'fin-manual-title', 'РЕЗУЛЬТАТ · СКОПИРУЙТЕ ВРУЧНУЮ'));
  var ta = document.createElement('textarea');
  ta.className = 'fin-manual-ta';
  ta.value = text;
  ta.readOnly = true;
  box.appendChild(ta);
  box.appendChild(el('div', 'fin-manual-hint', 'Текст уже выделен. Нажмите Ctrl+C (⌘+C). Если не получилось — выделите вручную и скопируйте.'));
  var close = btn('ЗАКРЫТЬ', 'small primary');
  box.appendChild(close);
  wrap.appendChild(box);
  c.layer.appendChild(wrap);
  setTimeout(function(){
    try { ta.focus(); ta.select(); } catch(e) {}
    try { document.execCommand('copy'); } catch(e) {}
  }, 60);
  c.tap(close, function(){ if (wrap.parentNode) wrap.parentNode.removeChild(wrap); });
  c.tap(wrap, function(ev){ if (ev.target === wrap) wrap.parentNode && wrap.parentNode.removeChild(wrap); });
}

/* ---------------- диплом ---------------- */
async function showDiploma(c){
  var d = getDiploma();
  var stats = G.state.stats || {};
  c.layer.style.display = 'block';
  var wrap = el('div', 'fin-diploma-wrap');
  var card = el('div', 'fin-diploma');
  card.appendChild(el('div', 'fin-dip-strip'));

  card.appendChild(el('div', 'fin-min', d.ministry));
  card.appendChild(el('div', 'fin-title', d.title));
  card.appendChild(el('div', 'fin-sub', 'отдел пережитых уроков · печать Ը · документ № Ը-47-' + (47 + (stats.protocols || 0))));
  card.appendChild(el('div', 'fin-rule'));

  var intro = el('p', 'fin-intro');
  var lostN = stats.articlesLost || 0;
  var lostWord = (lostN % 10 === 1 && lostN % 100 !== 11) ? 'артикль' : ((lostN % 10 >= 2 && lostN % 10 <= 4 && (lostN % 100 < 10 || lostN % 100 >= 20)) ? 'артикля' : 'артиклей');
  intro.appendChild(document.createTextNode('Настоящим подтверждается, что предъявитель пережил урок № 47, потерял ' + lostN + ' ' + lostWord + ' и не был признан виновным.'));
  card.appendChild(intro);

  var rankBox = el('div', 'fin-rankbox');
  rankBox.appendChild(el('div', 'fin-rank-label', 'присвоено звание'));
  rankBox.appendChild(el('div', 'fin-rank', '«' + d.rank + '»'));
  card.appendChild(rankBox);

  var ul = el('ul', 'fin-stats');
  for (var i = 0; i < d.lines.length; i++){ ul.appendChild(el('li', null, d.lines[i])); }
  card.appendChild(ul);

  var labels = achievementLabels();
  if (labels.length){
    var ach = el('div', 'fin-ach');
    ach.appendChild(el('div', 'fin-ach-title', 'особые отметки'));
    for (var a = 0; a < labels.length; a++){ ach.appendChild(el('span', 'fin-chip', labels[a])); }
    card.appendChild(ach);
  }

  var signrow = el('div', 'fin-signrow');
  var sign = el('div', 'fin-sign');
  sign.appendChild(el('span', 'line'));
  sign.appendChild(document.createTextNode('Подпись: ' + d.signedBy));
  var seal = el('div', 'fin-seal');
  seal.appendChild(el('div', 'big', 'Ը'));
  seal.appendChild(el('div', 'small', d.stamp));
  signrow.appendChild(sign);
  signrow.appendChild(seal);
  card.appendChild(signrow);

  var foot = el('div', 'fin-foot', d.footnote);
  card.appendChild(foot);
  card.appendChild(el('div', 'fin-bonus', 'Артикль вернулся. Домашнее задание — нет.'));

  var scroll = el('div', 'fin-scroll');
  scroll.appendChild(card);
  wrap.appendChild(scroll);

  var actions = el('div', 'fin-actions');
  var copyBtn = btn('СКОПИРОВАТЬ РЕЗУЛЬТАТ', 'primary fin-btn');
  var againBtn = btn('СЫГРАТЬ ЕЩЁ РАЗ', 'ghost fin-btn');
  var manualBtn = el('button', 'fin-link', 'показать текст вручную');
  manualBtn.type = 'button';
  manualBtn.style.cssText = 'background:none;border:none;color:#cfd8c8;font:700 12px/1.2 var(--font-ui);text-decoration:underline;cursor:pointer;opacity:.8;width:100%;min-height:44px;padding:10px 6px;';
  var note = el('div', 'fin-copynote', '');
  actions.appendChild(copyBtn);
  actions.appendChild(againBtn);
  actions.appendChild(manualBtn);
  actions.appendChild(note);
  wrap.appendChild(actions);
  c.layer.appendChild(wrap);

  if (c.audio && c.audio.sfx){ try { c.audio.sfx('win'); setTimeout(function(){ if (G.audio) G.audio.sfx('bell'); }, 500); } catch(e) {} }
  if (G.fx) G.fx.confetti();

  var sealClicks = 0;
  c.tap(seal, function(){
    sealClicks++;
    if (G.audio && G.audio.sfx){ try { G.audio.sfx('stamp'); } catch(e) {} }
    if (sealClicks === 3){
      note.textContent = 'ПЕЧАТЬ ПОДЛИННАЯ. МИНИСТЕРСТВО ПРОВЕРИЛО.';
      if (G.fx) G.fx.burst(window.innerWidth / 2, window.innerHeight / 2, { text: 'Ը', count: 10, spread: 140 });
    }
  });
  c.tap(copyBtn, function(){ copyResult(c, note, d.share); });
  c.tap(manualBtn, function(){ openManualCopy(c, d.share); });
  c.tap(againBtn, function(){
    if (G.audio && G.audio.sfx){ try { G.audio.sfx('click'); } catch(e) {} }
    G.restart();
  });

  if (c.auto){ await c.wait(900); return; }
  await new Promise(function(){});
}

/* ---------------- сцена ---------------- */
G.scenes.finale = async function(c){
  var stats = G.state.stats;
  c.stage.show();
  c.stage.mood('teacher', 'calm');
  c.stage.mood('tolya', 'dead');
  c.stage.mood('vika', 'scared');
  c.stage.mood('gosha', 'hide');

  if (G.params.diploma === '1'){
    c.bump('homeworkItems', 47);
    await showDiploma(c);
    return;
  }

  var steps1 = [
    { silence: 1700 },
    { say: 'teacher', text: 'Отлично.', mood: 'calm', ms: 1900 },
    { silence: 650 },
    { say: 'teacher', text: 'А теперь домашнее задание.', mood: 'calm', ms: 2100 },
    { audio: 'paper' },
    { say: 'system', text: 'ПУНКТОВ: 47. СДАЧА: 47 СЕНТЯБРЯ.', ms: 1800 },
    { say: 'tolya', text: 'Мы сдавали это в 2019-м.', mood: 'panic', ms: 1500 },
    { say: 'teacher', text: 'И пересдадите.', mood: 'tired', ms: 1300 }
  ];
  await G.playCutscene(c, steps1);
  await homeworkSequence(c);

  var steps2 = [
    { prop: 'article', action: 'enter', mood: 'proud' },
    { say: 'article', text: 'Я здесь.', mood: 'proud', ms: 1400 },
    { say: 'teacher', text: 'Где ты был?', mood: 'calm', ms: 1400 },
    { say: 'article', text: 'Я не был один.', mood: 'calm', ms: 1500 },
    { silence: 800 },
    { say: 'article', text: 'Мой брат Ն никогда не уходил. Он после гласных.', mood: 'calm', ms: 2600 },
    { board: 'կատուն · տղան', ms: 1800 },
    { say: 'system', text: 'НАЙДЕНО 2 АРТИКЛЯ. ВТОРОЙ ВСЁ ВРЕМЯ БЫЛ НА МЕСТЕ.', ms: 2000 },
    { say: 'teacher', text: '...Значит, урок сорок восьмой не нужен.', mood: 'tired', ms: 2300 },
    { say: 'article', text: 'Можно я поставлю печать?', mood: 'proud', ms: 1500 },
    { audio: 'stamp' }, { fx: 'flash' },
    { stamp: 'ՀՈԴԸ ՏԵՂՈՒՄ Է', ms: 1700 },
    { confetti: true },
    { say: 'system', text: 'УРОК 47 ЗАКРЫТ. СЛЕДУЮЩИЙ УРОК: СЕЙЧАС.', ms: 1900 },
    { say: 'teacher', text: 'Продолжение следует?', mood: 'smug', ms: 2000 },
    { card: 'УРОК 47: АРТИКЛЬ НА МЕСТЕ. МЕСТ — ДВА.', sub: 'Документ будет выдан. Не сопротивляйтесь.', ms: 2200 }
  ];
  await G.playCutscene(c, steps2);
  await showDiploma(c);
};
})();
