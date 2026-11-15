# Handoff: Visual/Audio

Роль: Visual/Audio (teammate). Зона: **src/js/02-art.js**, **src/js/03-audio.js**, **src/css/theme.css**, **tools/art-check.html**, **screenshots/art-check.png**, этот файл.

## 1. Что сделано

### 1.1 src/js/02-art.js — G.art (вся графика кодом, без внешних картинок)
Точные сигнатуры из TECH.md §7, без изменений контракта:

* **G.art.drawTeacher(ctx, r, mood, t)**
* **G.art.drawStudent(ctx, r, idx, mood, t)** — idx 0=Толя, 1=Вика, 2=Гоша (принимает и строки 'tolya'/'vika'/'gosha')
* **G.art.drawArticle(ctx, r, mood, t, opts)** — живой артикль ը (по умолчанию) / ն
* **G.art.drawLetter(ctx, r, glyph, mood, t)** — реальный армянский глиф + лицо
* **G.art.drawClassroom(ctx, w, h, t, opts)** — фон класса, opts={boardText, dim, desks, clock, flicker}
* **G.art.drawProp(ctx, name, r, t, opts)** — police, pigeon, homework, protocol, clock, cap, stamp, article
* **G.art.paint(canvas, kind, opts)** — article|letter|police|pigeon|teacher|student

Внутри: каждый персонаж/предмет рисуется в виртуальном боксе 100×100 (квадрат min(r.w,r.h), по центру r), всегда save()/restore(), никакого глобального состояния. При r.w<=0 или r.h<=0 либо без ctx — тихий return (stage можно звать без проверок). Всё остальное — примитивы canvas: эллипсы, пути, fillText реальных армянских глифов.

**Настроения** (списки доступны как G.art.moods):
* teacher: neutral, suspicious, scream, calm, smug, tired, cosmic, proud, happy (+ любые → neutral);
* ученики: neutral, happy, panic, smug, hide, dead, scared, bored, shock (+ алиасы: idle/calm, cry/sad, angry/scream→panic, evil/proud→smug, tired/sleep→bored, cosmic→shock, run→panic);
* article: idle, angry, run, proud, sleep, union, cry, happy, evil;
* letter: neutral, happy, angry, scared, panic, smug, cry, sleep, evil, union, run, dead, shock, bored, hide, cosmic (+ алиасы proud→smug, tired→sleep, scream→angry).

**Доп. opts (все опциональны, контракт не ломают):**
* drawArticle: {glyph:'ը'|'ն', crown:true, sign:'НЕ ПРИЛОЖЕНИЕ!'|true, flip:true, alpha:0..1, ghost:true} (ghost = полупрозрачный призрак, используется Эп5); detail вычисляется по размеру r (≥280 px — подробный плакат с текстом, меньше — значки/штрихи).
* drawProp: police — {minister:true} (финал: золотые погоны, медали, аксельбант); homework/protocol — {count:47}; clock — {speed} (бешеная стрелка), {cracked:false}; article — {mood}; все — {alpha}.
* drawClassroom: boardText (поддерживает \n), dim 0..0.85 (студийное затемнение), desks:false, clock:false, flicker (мигание света).
* paint: как в TECH; opts.size игнорируется (спрайт = размер canvas).

**Производительность.** drawClassroom вызывается каждый кадр: градиенты и «пылинки» кешируются по (canvas, w, h) в WeakMap, shadowBlur не используется, ~150–250 простых операций/кадр. Рассчитан на r.h ≈ 140–270 px (stage --stage-h) и телефоны 320–430 px.

### 1.2 src/css/theme.css — палитра/типографика/фактуры
Важно: base.css (Lead) уже задаёт каркас/скины/классы FX. Поэтому theme.css — **безопасный слой поверх base.css**, он НЕ переопределяет position/размеры/показ. Проверено на живом dev.html: позиции бабблов и размеры кнопок не сломаны.

Что даёт theme.css:
* **Палитра**: уточняет переменные base (--board/--chalk/--paper/--ink/--stamp/--accent/--font-ui и т.д.) и добавляет токены --bg/--panel/--line, --gold/--gold-dark/--warm, --cyan/--violet/--blush, --teacher/--tolya/--vika/--gosha/--article/--police/--system, --radius/-sm/-pill, --shadow-2/--shadow-paper, --ease-pop.
* **Шрифты**: --font-ui с армянскими fallback'ами (Noto Sans Armenian, DejaVu Sans, Arial Unicode MS), утилиты .arm/.arm-big/.chalk-text. Армянский всегда через --font-arm.
* **Кнопки**: базовую геометрию (3px ink, 5px shadow, 12px радиус) оставляем base; theme добавляет объёмный блик-градиент, focus-visible, disabled-фильтр и алиасы .btn--primary/--danger/--ghost/--huge/--small/--block/--squeak.
* **Бабблы по персонажам**: .bubble.teacher/.tolya/.vika/.gosha/.article/.police/.system — тёплые градиенты бумаги + цвет канта; .bubble.article получает армянский стек; .bubble.urgent — лёгкий комичный wiggle. Позиции/показ остаются в base.css.
* **Бумага/карточки/печати**: .paper (клетка + кант через ::before), .card, .seal (ярко-красная на тёмном, multiply на бумаге), .stamp-inline, .diploma, .chalk-board, .hud-chip, .badge.
* **Анимации**: канонические @keyframes fx-shake / fx-flash / fx-glitch (плюс fx-bubble-in/wiggle, fx-bob, fx-float, fx-pulse, fx-wobble, fx-pop-in, fx-stamp-hit, fx-flicker, fx-marquee); утилиты .fx-bob/.fx-float/.fx-pulse/.fx-wobble/.fx-pop-in/.fx-flicker/.fx-marquee/.fx-dim. Конфликтующие классы base (.fx-shake/.fx-glitch/.fx-stamp) НЕ переопределены — core работает как раньше.
* Виньетка в режиме #app.presenting, лёгкая «пыль мела» на .stage-wrap::before, prefers-reduced-motion.

### 1.3 src/js/03-audio.js — G.audio (WebAudio, синтез)
API по TECH §6: unlock(), muted (get/set), setMuted(bool), toggle(), sfx(name, opts?), tone(freq, dur, type, vol), babble(on). Дополнительно: G.audio.SFX_NAMES.

37 звуков: click, tap, pop, correct, wrong, scream, whoosh, swoosh, thud, sparkle, chalk, police, panic, letter, stamp, paper, glitch, explosion, boom, win, lose, dramatic, heartbeat, typing, airhorn, sadtrombone, bell, static, riser, babble, beep, error, ding, crash, applause, **squeak**, **silence** (squeak/silence добавлены по фактическим вызовам intro/finale/30-cutscene-scenes).

Особенности: master gain 0.42 + компрессор; только осцилляторы/шум/фильтры и огибающие, без семплов и музыки; unlock() создаёт/резюмирует AudioContext и проигрывает тихий буфер (iOS); до жеста sfx молчит и не падает; muted глушит master; при отсутствии AudioContext всё no-op. Наружу ничего не бросает — звук не может сломать игру.

### 1.4 tools/art-check.html + screenshots/art-check.png
Витрина: все персонажи во всех настроениях, артикли ը/ն, буквы (բ/պ/փ, ռ/ր, ձ/ծ/ց и др.), реквизит, класс в 3 размерах, реальные скины theme.css (кнопки/бабблы/бумага/печать), кнопка на каждый SFX + MUTE + «проиграть подряд», спрайты paint(), zoom-секции для приёмки глазами.

Запуск: node tools/shot.mjs tools/art-check.html screenshots/art-check.png 1280 1900 1600
(высота 1900, а не 900: при 900 витрина обрезается на 6-й секции и не попадают тема/звук).
Фильтр секций: ?only=teacher,students,articles,letters,props,classroom,theme,audio,paints,zteacher,zstudents,zarticles,zletters,zprops,zclass

## 2. Как проверено
* node --check src/js/02-art.js и node --check src/js/03-audio.js — OK.
* headless Chrome: art-check без pageerror/console errors; отдельный edge-case прогон (null/undefined/нулевые/отрицательные rect, неизвестные mood/глифы/имена пропов, paint(null), все опции) — без исключений, блок ошибок пуст.
* живой dev.html (1280×800 и 390×844 при DPR 2): classroom/персонажи рисуются, pageerror нет; через G.stage.say() проверены позиции бабблов — position:absolute, left/top из base.css не сломаны; кнопка .btn.primary сохранила 3px ink-бордер + 5px тень и получила блик темы.
* Армянские глифы проверены в реальном рендере браузера (доска ԳԻՐՔ, слова в буквах/артиклях).

## 3. Известные ограничения / что проверить Lead
1. **Шрифты.** Армянский — из системных шрифтов. На Windows/Chromium есть (Segoe UI), на Android чаще Noto Sans Armenian. Если глиф не найдётся, drawLetter/drawArticle подменяют символ на Ա/Ը (не «квадратики»). Стоит проверить на Android-телефоне и iOS Safari.
2. **Эп1 рисует артикль сам** (11-ep-article.js), не через G.art — это не баг, но визуально артикль Эп1 отличается (жёлтые кружки). Если нужен мой живой ը/ն в Эп1 — сцена может звать G.art.drawArticle/paint.
3. drawProp рисует квадратную композицию по центру r; stage-пропорции PROP_DEFS подобраны так, что это ок. Для «стоящего» реквизита при сильно вытянутом по высоте r возможен вертикальный зазор — если понадобится, добавлю opts.anchor:'bottom'.
4. police.minister (финал) пока недоступен через stage.prop (stage передаёт только {mood}). Если нужен министр на сцене — расширить stage (зона Lead) либо звать G.art.drawProp(ctx,'police',r,t,{minister:true}) из сцены.
5. theme.css сознательно не переопределяет layout/скины base.css. Если захочешь, чтобы тема полностью владела скинами (кнопки/бабблы/окна) — это отдельное согласование; сейчас сделано безопасно для текущей сборки.
6. Mute: источник истины — 00-core.js (localStorage['gde-artikl-muted'] + G.audio.setMuted). Мой модуль дополнительно пишет gda-muted как fallback, если его позовут без core.
7. После последних правок (theme.css, audio squeak/silence, ghost-артикль) **нужен пересбор**: node tools/build.mjs — gde-artikl.html собран из предыдущей версии. Чужие файлы я не трогал.

## 4. Файлы
* src/js/02-art.js — графика
* src/css/theme.css — тема
* src/js/03-audio.js — звук
* tools/art-check.html — витрина (фильтр ?only=)
* screenshots/art-check.png — скриншот витрины 1280×1900
## 5. Правки по ревью Lead
**Авто-масштабирование текста на доске (drawClassroom).** Раньше размер шрифта был фиксирован (bh*0.34) и длинные армянские фразы вылезали за доску на узких экранах. Добавлены:
* `wrapBoardLines()` — перенос строк по словам под ширину доски (явные \n сохраняются как жёсткие переносы);
* `fitBoardText()` — подбор размера: измерение самой длинной строки через ctx.measureText, ширина <= bw*0.86, высота блока <= bh*0.8; уменьшение шагом 0.94 до ~55% от стартового (страховочно до ~34% для неразрывных слов), затем пропорциональный дожим по ширине.
Проверено через dev.html (без пересборки) на 320×568 и 390×844 для `?scene=i6&only=1` («ՔՆՆՈՒԹՅՈՒՆ»), `?scene=i3` («Ես այսօր տանը հաց եմ ուտում»), `?scene=i1` («ԳԻՐՔ»), а также на десктопе 1280×800 — текст центрирован, переносится, за края доски не выходит; console/pageerror пустые. Скриншоты-доказательства: `screenshots/board-fix-320-i1.png`, `board-fix-320-i3.png`, `board-fix-320-i6.png`, `board-fix-390-i1.png`, `board-fix-390-i3.png`, `board-fix-390-i6.png`.
