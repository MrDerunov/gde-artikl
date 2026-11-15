# «ГДЕ АРТИКЛЬ?!» — технический контракт (v1, Lead)

> Источник истины по API и интеграции. Читать целиком перед кодом. Если нужна правка контракта — сначала send_message Lead.

## 1. Итог и сборка
- Конечный продукт: один файл **gde-artikl.html** в корне репозитория, без единого внешнего запроса.
- Исходники: `src/shell.html`, `src/css/base.css`, `src/css/theme.css`, `src/js/*.js` (порядок по имени), каждый JS-файл — самостоятельная IIFE, пишущая в `window.G`.
- Сборка: `node tools/build.mjs` → инлайнит CSS и JS в `gde-artikl.html` и генерирует `dev.html` (внешние скрипты для отладки).
- Запрещено: ES-модули (file:// их блокирует), фреймворки, внешние URL/шрифты/картинки/аудио, fetch/XHR, TTS, localStorage без try/catch.
- Всё UI по-русски; армянский — внутри игровых ситуаций. Шрифтовой стек для армянского: 'Segoe UI', 'Noto Sans Armenian', 'DejaVu Sans', 'Arial Unicode MS', sans-serif.
- Мобильный портрет 320–430px по ширине, тач-цели ≥ 44px, hover не обязателен, клавиатура не обязательна. `touch-action: manipulation`, без выделения текста в игровых зонах.

## 2. Файлы и зоны ответственности
~~~
src/shell.html            Lead
src/css/base.css          Lead  (лейаут, HUD, контейнеры, базовые кнопки)
src/css/theme.css         Visual (палитра, шрифты, скины, анимации, бабблы)
src/js/00-core.js         Lead  (утилиты, состояние, менеджер сцен, fx, debug)
src/js/01-stage.js        Lead  (классная сцена, бабблы, катсцен-движок)
src/js/02-art.js          Visual (все рисунки на canvas)
src/js/03-audio.js        Visual (WebAudio SFX)
src/js/05-content.js      Comedy (G.text, G.cutscenes)
src/js/10-intro.js        Lead  (титул/старт)
src/js/11-ep-article.js   dev-arcade (Эп1)
src/js/12-ep-memory.js    dev-chase (Эп2)
src/js/13-ep-hear.js      dev-chase (Эп3)
src/js/14-ep-letters.js   dev-arcade (Эп4)
src/js/15-ep-loop.js      dev-boss (Эп5)
src/js/16-ep-boss.js      dev-boss (Эп6)
src/js/20-finale.js       Lead  (диплом, шаринг, реплей)
src/js/30-cutscene-scenes.js Lead (регистрирует i1..i6 из G.cutscenes)
src/js/90-main.js         Lead  (boot, последовательность сцен)
~~~
Не редактируй чужие файлы. Свои CSS-классы называй с префиксом сцены (`.ep1-`, `.ep2-`...). Свои стили добавляй через `G.u.css('...')` в своём файле.

## 3. Сцена: контракт (самое важное)
Каждая сцена — `async`-функция, зарегистрированная в `G.scenes`,принимает объект `c` и резолвится, когда эпизод закончен.

~~~js
(function(){ 'use strict';
var G = window.G = window.G || {};

G.scenes.article = async function(c){
  var h = c.h;
  var wrap = c.add(h.el('div','ep1-wrap'));
  var bar = h.el('div','ep1-top', 'ГДЕ АРТИКЛЬ?! · 1/6');
  wrap.appendChild(bar);

  if (c.auto) { await c.wait(1200); c.bump('articlesSaved', 4); return; }

  await c.say('teacher', 'ГДЕ АРТИКЛЬ?!', { mood: 'scream', urgent: true });
  // ... игровой цикл ...
  // тапы:
  var off = c.tap(node, function(ev){ /* ... */ });
  // drag:
  c.drag(node, { onStart:function(p){}, onMove:function(p){}, onEnd:function(p){} });
  // покадровая анимация (dt — секунды):
  var stop = c.raf(function(dt, t){ /* ... */ });
  await c.wait(2000);
  return;
};
})();
~~~

Поля контекста `c`:
- `c.root` — div, заполняющий игровую зону (под классной сценой).
- `c.layer` — div на весь экран поверх всего (для полноэкранных сцен; создать и скрывать сам).
- `c.h` (= `G.u`), `c.fx`, `c.audio`, `c.stage`, `c.text` (данные Comedy).
- `c.el(tag, className?, text?)` — создать элемент; `c.add(el)` — добавить в root; `c.rect(el)` — getBoundingClientRect; `c.hit(p, el)` — попал ли указатель.
- `c.wait(ms)` — управляемый таймер; резолвится раньше при завершении сцены, никогда не reject.
- `c.raf(fn)` — покадровый цикл `fn(dt, t)`; автоматически останавливается при завершении; вернуть stop().
- `c.tap(el, fn, opts?)` — унифицированный tap/press (pointer events, аудио-разблокировка); auto-cleanup; вернуть off().
- `c.drag(el, {onStart, onMove, onEnd, onCancel, threshold?})` — pointer drag с авто-capture; auto-cleanup.
- `c.say(who, text, opts?)` → Promise; `who`: `'teacher'|'tolya'|'vika'|'gosha'|'article'|'police'|'system'`; opts: `{mood, urgent, ms}`.
- `c.mood(who, mood)` — сменить настроение персонажа: teacher: `neutral|suspicious|scream|calm|smug|tired|cosmic|proud|happy`; ученики: `neutral|panic|smug|hide|dead|scared|bored|shock`; article: `idle|angry|run|proud|sleep|union|cry|happy|evil`.
- `c.bump(key, n?)` — статистика; `c.gag(key)`; `c.achievement(id)` — штамп-достижение (см. G.text.achievements).
- `c.auto` — debug-автопрохождение: сцена обязана быстро (1–2 сек) завершиться, начислив минимальную статистику. Это требование для QA.
- `c.done` — true после завершения; проверяй в длинных циклах.
- `c.cleanup(fn)` — дополнительная уборка.

Правила: любая анимация — через c.raf; таймеры — c.wait; любые входные обработчики — c.tap/c.drag. При завершении сцены core сам удаляет root/layer, снимает обработчики, останавливает rAF. Никаких «вечных» setInterval.

## 4. Stage API (классная сцена сверху)
- `c.stage.visible(bool)`, `c.stage.show()`, `c.stage.hide()`
- `c.stage.say(who, text, opts)` → Promise (баббл). `opts.urgent=true` — крик с тряской. Возвращаемый промис резолвится по истечении времени/тапу.
- `c.stage.mood(who, mood)`
- `c.stage.scream(text?)` → Promise — крупный крик учительницы + shake + звук.
- `c.stage.board(text, opts?)` — текст на доске; `opts.slot=true` — показать пустой слот артикля.
- `c.stage.prop(name, action, opts?)` — `action`: `'enter'|'exit'|'set'`; имена: `police, article, pigeon, homework, protocol, clock, cap, stamp`.
- `c.stage.presenting(bool)` — студийный режим катсцен (затемнение игровой зоны).

## 5. FX API
- `c.fx.shake(power=1, ms=350)`; `c.fx.flash(color='#fff', ms=180)`; `c.fx.glitch(ms=400)`
- `c.fx.burst(x, y, {text, color, count=12, spread=180})` — взрыв букв/частиц.
- `c.fx.stamp(text)` — резиновый штамп с ударом (достижения, оценки).
- `c.fx.fakeWindow({title, body, buttons:[{id,label}], ms?})` → Promise<id> — псевдосистемное окно; кнопки можно заставить убегать (`runaway:true`).
- `c.fx.card(text, sub?, ms?)` → Promise — полноэкранная карточка; `c.fx.silence(ms)` — чёрная тишина.
- `c.fx.confetti()`, `c.fx.spotlight(el)`.

## 6. Audio API (Visual)
`G.audio`: `unlock()` (зовётся core по первому жесту), `muted`, `setMuted(bool)`, `toggle()`, `sfx(name, opts?)`, `tone(freq, dur, type, vol)`, `babble(on)` (необязательно).
Имена SFX (заглушка = тишина, если не реализовано): click, pop, correct, wrong, scream, whoosh, thud, sparkle, chalk, police, panic, letter, stamp, paper, glitch, explosion, boom, win, lose, dramatic, heartbeat, typing, airhorn, sadtrombone, bell, static, riser, babble, beep, error, swoosh, ding, crash, applause.

## 7. Art API (Visual) — точные сигнатуры
Все функции рисуют в `ctx` внутри прямоугольника `r = {x, y, w, h}`, аспект ~1:1, с `save()/restore()`, без глобального состояния. `t` — секунды для idle-анимации.
~~~js
G.art.drawTeacher(ctx, r, mood, t)
G.art.drawStudent(ctx, r, idx, mood, t)      // idx 0=Толя, 1=Вика, 2=Гоша
G.art.drawArticle(ctx, r, mood, t, opts)     // живой артикль
G.art.drawLetter(ctx, r, glyph, mood, t)     // реальный армянский глиф + лицо
G.art.drawClassroom(ctx, w, h, t, opts)      // фон класса, opts={boardText}
G.art.drawProp(ctx, name, r, t, opts)        // police, pigeon, homework, protocol, clock, cap, stamp
G.art.paint(canvas, kind, opts)              // статичный спрайт: kind='article'|'letter'|'police'|'pigeon'; opts={mood,glyph,size}
~~~

## 8. State (ключи статистики — общие!)
`G.state.stats`: `errors, articlesSaved, articlesLost, screams, repeats, lettersCaught, memoryFinds, loops, bossHits, protocols, homeworkItems` + произвольные `gag:<id>` при `c.gag(id)`.
Сцены обязаны: правильное действие — `c.bump('ключ')`, ошибка — `c.bump('errors')` и комедийный эффект. Никаких game over.

## 9. Контент Comedy: G.text и G.cutscenes
`G.text` (данные и функции): `teacherName`, `students`, `catchphrase`, `screams[]`, `achievements{id:label}`, `diploma{ministry,title,rankFor(stats),statsLines(stats),shareText(stats),footnote}`.
`G.cutscenes.i1..i6` — массивы шагов (только данные, без функций):
- `{say: who, text, mood?, ms?, urgent?}` — реплика на классной сцене; `who` = teacher|tolya|vika|gosha|article|police|system.
- `{card: '...', sub?: '...', ms?}` — полноэкранная карточка.
- `{text: '...', sub?: '...', ms?}` — полноэкранная нарративная строка.
- `{scream: '...', ms?}` — крик учительницы.
- `{board: '...', ms?}` — текст на доске.
- `{prop: 'police', action: 'enter'|'exit', ms?}`.
- `{fx: 'shake'|'flash'|'glitch'|'confetti'|'spotlight', ms?}`, `{audio:'имя'}`, `{wait: ms}`, `{silence: ms}`, `{homework: true, ms?}`.
Автопродвижение по `ms` (по умолчанию 700–2400 мс в зависимости от длины) + тап/пробел ускоряет. Длинные паузы — только `silence`.

## 10. Debug/QA
`window.__GAME__` (Lead реализует): `start(sceneName?)`, `skipCurrent()`, `listScenes()`, `state`, `stats`, `setAuto(true)`, `seed(n)`. URL: `?scene=article`, `?debug=1` (кнопка SKIP), `?auto=1`, `?seed=1`.
QA прогоняет все сцены через `__GAME__.start(name)` и `skipCurrent()`.

## 11. Требования к сдачам dev-агентов
1. Файлы только из твоей зоны. 2. `node --check` для своего JS. 3. Сцена запускается через `dev.html?scene=<name>` (после появления сборки) или `gde-artikl.html?scene=<name>`; проверь в headless Chrome (`node tools/shot.mjs ...`) и посмотри скриншот глазами через read_image. 4. Напиши `docs/handoff-<role>.md`: что реализовано, какие API использованы, известные ограничения, что проверить Lead'у. 5. Отправь send_message lead: статус + путь к handoff. 6. Если API не хватает — сообщи Lead, не меняй чужие файлы.