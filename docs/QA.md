# QA / Integration — отчёт по игре «ГДЕ АРТИКЛЬ?!»

Итоговый полный прогон. Роль: QA/Integration. Игровые исходники не правились; отчёт и инструменты — только мои файлы (`tools/check.mjs`, `tools/playtest.mjs`, `docs/QA.md`, `screenshots/qa-*.png`).

| Параметр | Значение |
|---|---|
| Дата прогона | 2026-11-15, 23:33–23:37 (Asia/Yerevan) |
| Артефакт полного прогона | `gde-artikl.html`, 490.4 KB, sha256 `de5c5e27c06f…` (сборка не менялась во время прогона — PASS `artifact.stable`) |
| Релиз-кандидат на момент сдачи | `gde-artikl.html`, 490.6 KB (502 345 B), sha256 `be66ab3e4886…` — пересобран Lead уже после полного прогона; на нём выполнен короткий smoke (врезка ниже) |
| Сборка | `node tools/build.mjs` → 2 CSS + 15 JS, 14 сцен зарегистрированы |
| Браузер | headless Chrome (системный `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`) через playwright-core 1.65.1, Windows |
| Режим | `file://` (как у пользователя), `?seed=1` для детерминизма |
| Итог | **124 PASS / 0 FAIL / 4 WARN / 1 INFO; 0 блокирующих багов**; 92 скриншота `screenshots/qa-*.png`; 61 перехваченный запрос — все `file://`, внешних 0 |
| Длительность | 248 c (полный прогон) |

> **Важно про финальную сборку.** Пока Lead финализировал релиз, файл пересобрали ещё раз (`de5c5e27` → `be66ab3e`, 490.4 → 490.6 KB). Полный прогон 124 PASS выполнен на `de5c5e27`; на финальном `be66ab3e` по просьбе Lead (без новых длинных прогонов) выполнен короткий smoke на текущем файле: статический аудит 40 PASS / 0 FAIL, 14/14 сцен, `intro`/`i1` @1280×800, `article`/`boss` @390×844, `letters` @320×568, диплом @390×844 — **0 console/pageerror, 0 внешних запросов**, диплом: звание «Свидетель урока», 10 строк статистики, 3 кнопки, без hscroll. Для повторной полной проверки: `node tools/playtest.mjs`.

**Вердикт: игра готова к сдаче.** Блокеров нет: все 42 загрузки сцен (14 сцен × 3 размера) без единой ошибки console/pageerror, полный auto-прогон доходит до finale, офлайн-копия из пустой папки работает, диплом/копирование/реплей/mute — работают. Есть 3 минорных замечания по UI и 1 технический долг (см. §9).

## Как воспроизвести

```
node tools/build.mjs        # пересборка единого HTML
node tools/check.mjs        # статический аудит (exit 0 при 0 FAIL)
node tools/playtest.mjs     # полный прогон (~4–5 мин), печатает путь к JSON-отчёту
```
Опции harness: `--quick` (без долгого auto), `--only matrix|monkey|auto|skip|diploma|touch|audio|offline`, `--no-build`, `--report <path>`.
Перед браузерными тестами `playtest.mjs` сам собирает игру и замораживает байт-идентичный снимок сборки (sha256 в отчёте), чтобы чужая пересборка посреди прогона не смешала две версии. JSON последнего прогона: `%TEMP%\gde-artikl-qa\final-report3.json` (временный, вне репозитория).

---

## 1. Статика единого HTML — 40 PASS / 0 FAIL / 1 WARN

Проверка: `node tools/check.mjs` (полный список — в stdout и `CHECK_JSON`).

| Проверка | Как | Результат | Артефакт |
|---|---|---|---|
| Валидный UTF-8, `<!doctype html>`, `lang="ru"` | чтение файла, fatal-декодер UTF-8 | PASS | — |
| `<meta charset="utf-8">` в первых 2 КБ, viewport, `<title>ГДЕ АРТИКЛЬ?!</title>` | regex-аудит | PASS | — |
| Размер < 1.5 МБ | stat файла | PASS — 490.4 KB | `gde-artikl.html` |
| Нет `http(s)://`, `@import`, `<link>`, `<script src>`, `type="module"`, import/export/import.meta | regex-аудит всего файла + src | PASS (0 совпадений) | — |
| Нет `fetch`, `XMLHttpRequest`, WebSocket/EventSource/sendBeacon/serviceWorker | regex-аудит | PASS | — |
| Нет iframe/embed/object/base, внешних `src/href/srcset/poster`, внешних `url(...)` в CSS | regex-аудит | PASS | — |
| Все src-файлы проинлайнены, ровно 1 `<style>` и 1 `<script>` | маркеры `/* ===== file ===== */` | PASS — 2 CSS + 15 JS | — |
| JS-синтаксис | `node --check` каждого `src/js/*.js` | PASS — 15/15 | — |
| Армянские глифы в контенте | подсчёт U+0530–U+058F | PASS — 934 симв., 74 уникальных; буквы Ը/ը/Ն/ն; 16/16 слов DESIGN.md §8; фраза Эп3; нет U+FFFD | — |
| Армянский font-stack | поиск семейств | PASS — Segoe UI, Noto Sans Armenian, DejaVu Sans, Arial Unicode MS | — |
| Зарегистрированы все 14 сцен; debug API (`__GAME__`: start/skipCurrent/listScenes/restart/state; `?scene&only&auto&seed&diploma&debug`) | статический поиск + рантайм (§3) | PASS | — |
| Вызываемые SFX определены | сверка `sfx('name')` с картой в 03-audio.js | PASS — 37 имён, неопределённых вызовов нет | — |
| Ключи mute в localStorage | поиск | **WARN** — два ключа: `gde-artikl-muted` (core) и `gda-muted` (audio); синхронизируются через `buildUI`/toggle, поведение проверено (§7), но это техдолг | — |

## 2. Матрица сцен: ?scene=<name>&only=1 на 1280×800, 390×844, 320×568

Все 14 сцен × 3 размера = 42 загрузки. На каждую: скриншот + сбор `console.error`/`pageerror`/`requestfailed` + проверка горизонтального скролла и кнопок вне viewport.

| Сцена | 1280×800 | 390×844 | 320×568 | console/pageerror | Артефакты |
|---|---|---|---|---|---|
| intro | PASS | PASS | PASS | 0 | `qa-scene-intro-{1280x800,390x844,320x568}.png` |
| i1 | PASS | PASS | PASS | 0 | `qa-scene-i1-*.png` |
| article (Эп1) | PASS | PASS | PASS | 0 | `qa-scene-article-*.png` |
| i2 | PASS | PASS | PASS | 0 | `qa-scene-i2-*.png` |
| memory (Эп2) | PASS | PASS | PASS | 0 | `qa-scene-memory-*.png` |
| i3 | PASS | PASS | PASS | 0 | `qa-scene-i3-*.png` |
| hear (Эп3) | PASS | PASS | PASS | 0 | `qa-scene-hear-*.png` |
| i4 | PASS | PASS | PASS | 0 | `qa-scene-i4-*.png` |
| letters (Эп4) | PASS | PASS | PASS | 0 | `qa-scene-letters-*.png` |
| i5 | PASS | PASS | PASS | 0 | `qa-scene-i5-*.png` |
| loop (Эп5) | PASS | PASS | PASS | 0 | `qa-scene-loop-*.png` |
| i6 | PASS | PASS | PASS | 0 | `qa-scene-i6-*.png` |
| boss (Эп6) | PASS | PASS | PASS | 0 | `qa-scene-boss-*.png` |
| finale | PASS | PASS | PASS | 0 | `qa-scene-finale-*.png` |

Итого: **42/42 PASS, 0 ошибок, 0 горизонтальных скроллов, 0 кнопок вне экрана** (включая 320×568). Скриншоты просмотрены глазами: интро, i1/i2/i6, Эп1–Эп6, финал — вёрстка не ломается, армянские подписи на месте.

## 3. Полный auto-прогон ?auto=1&seed=1 до финала

- Проектный файл: sequence пройдена за **39.3 c**, в логе все 14 сцен в верном порядке: `intro→i1→article→i2→memory→i3→hear→i4→letters→i5→loop→i6→boss→finale`; **0 console/pageerror**.
- Копия в пустой папке (см. §5): **39.4 c**, тот же порядок, **0 ошибок**.
- Статистика auto-прогона: `articlesSaved 15, lettersCaught 15, memoryFinds 2, bossHits 8, loops 3, repeats 2, protocols 2, screams 2, homeworkItems 47, errors 0, gagsFound 4` — сцены начисляют статистику в auto-режиме, финал не падает.
- Дополнительно: последовательный `__GAME__.start(scene)` + `skipCurrent()` по всем 14 сценам — каждая стартует и корректно прерывается, следующая начинается; **0 ошибок**.

| Сцена | Длительность в auto, c | | Сцена | c |
|---|---|---|---|---|
| intro | 0.8 | | letters | 1.3 |
| i1 | 4.8 | | i5 | 3.6 |
| article | 1.1 | | loop | 1.1 |
| i2 | 3.0 | | i6 | 3.6 |
| memory | 1.3 | | boss | 1.3 |
| i3 | 3.5 | | finale | 9.3 |
| hear | 1.3 | | | |
| i4 | 3.2 | | | |

Скриншоты перехода по сценам: `qa-auto-auto-<scene>.png`, финальный кадр `qa-auto-auto-end.png`, офлайн `qa-auto-offline-auto-*.png`.
Замечание: катсцены i1–i6 в auto-режиме идут 3–4.8 c каждая, finale ~9.3 c — это дольше требования TECH.md §3 «сцена обязана быстро (1–2 сек) завершиться в auto»; на игрока не влияет, но удлиняет QA-прогон (в список замечаний §9).

## 4. Диплом: ?scene=finale&only=1&diploma=1

| Проверка | Как | Результат | Артефакт |
|---|---|---|---|
| Министерство, титул, номер | DOM-текст | PASS — «Министерство потерянных артиклей», «СВИДЕТЕЛЬСТВО О ПЕРЕЖИТОМ УРОКЕ», документ № Ը-47-47 | `qa-diploma-1280x800.png` |
| Звание от статистики | `rankFor` на пустых/богатых/null | PASS — `{}`→«Свидетель урока», богатый набор→«Друг артикля», `null` не падает | — |
| Статистика | строки диплома | PASS — 10 строк с реальными счётчиками («Артиклей возвращено: 0. Они справились сами.» и т.п.) | `qa-diploma-1280x800.png` |
| Печать / подпись | DOM | PASS — «Ը», «ՀՈԴԸ ՏԵՂՈՒՄ Է», «Полицейский (ныне министр)» | `qa-diploma-390x844.png` |
| shareText | API | PASS — 203 симв., многострочный | — |
| «Скопировать результат» (clipboard) | клик, `file://` — secure context, `navigator.clipboard` есть | PASS — «СКОПИРОВАНО. АРТИКЛЬ ПРИЛОЖЕН.» | — |
| Fallback при недоступном clipboard | принудительно `navigator.clipboard=undefined`, `execCommand=()=>false` | PASS — открывается `.fin-manual` с textarea (203 симв.), заголовок «РЕЗУЛЬТАТ · СКОПИРУЙТЕ ВРУЧНУЮ» | `qa-diploma-copyfallback-1280x800.png` |
| «показать текст вручную» | клик | PASS — textarea readOnly 203 симв. | `qa-diploma-manual.png` |
| «Сыграть ещё раз» (G.restart) | клик, замер состояния | PASS — диплом закрыт, **все 12 счётчиков = 0**, `running=true`, пошла сцена `intro` (log: `intro`) | `qa-diploma-restart-1280x800.png` |
| Мобильный лейаут 390×844 | скриншот + геометрия | PASS — без горизонтального скролла, карточка 372 px в 390; копирование тапом работает | `qa-diploma-390x844.png` |
| Мобильный лейаут 320×568 | — | PASS — без горизонтального скролла, карточка 303 px в 320 | `qa-diploma-320x568.png` |
| Кнопки диплома на мобильном | размеры | **WARN** — второстепенная ссылка «показать текст вручную» высотой 26 px < 44 px (кнопки 52+ px — ок) | `qa-diploma-390x844.png` |

Замечание по вёрстке: на 1280×800 нижняя часть диплома (печать, подпись, сноска) частично перекрыта sticky-панелью кнопок до прокрутки — см. §9, B-1.

## 5. Офлайн и сетевые запросы — 0 внешних

- За весь прогон (61 запрос: матрица, auto, тач, диплом) — **все запросы `file://`**, ни одного http(s)/ws/data-внешнего. Схема-фильтр: разрешены только `file:`, `data:`, `blob:`.
- `gde-artikl.html` (байт-в-байт, 490.4 KB) скопирован в **пустую временную папку вне проекта** и открыт по `file://`: auto-прогон дошёл до finale за 39.4 c, 0 ошибок, 0 внешних запросов. Скриншот `qa-offline-scene.png`.
- Статически: в едином HTML нет http(s)-URL, fetch/XHR/@import/import/внешних `<link>/<script src>` (§1).

## 6. Тач (390×844, isMobile+hasTouch, тап через touchscreen)

| Проверка | Результат | Артефакт |
|---|---|---|
| Интро: кнопка «НАЧАТЬ УРОК» 305×65 px, в viewport | PASS | `qa-touch-intro-390x844.png` |
| Старт через **фейковое окно** (2 окна: «СДАТЬ ДОМАШНЕЕ» → «НАЧАТЬ») | PASS — оба окна пройдены тапом | `qa-touch-fakewin-390x844.png` |
| Переход intro→i1 (катсцена) | PASS | `qa-touch-i1-390x844.png` |
| Переход i1→Эп1 тап-ускорением катсцены | PASS — за 5 c | — |
| Мини-игра Эп1 на тач: тап артикля ը/ն, затем тап слова | PASS — `articlesSaved=1`, `errors=0` | `qa-touch-article-390x844.png`, `qa-touch-article-attach-390x844.png` |
| Эп1 на 390 px: горизонтальный скролл / кнопки вне экрана / тач-цели <44 px | PASS — 0/0/0 | — |
| HUD SKIP тапом (?debug=1): intro→i1, повторно i1→article | PASS | `qa-touch-skip-390x844.png` |
| Monkey-стресс тачем: 6 мини-игр × 16 тапов | PASS — 0 ошибок; в Эп1 `articlesSaved 0→1`, в Эп2 `memoryFinds 0→1`, в Эп4 `errors 0→2` (забастовка букв) — интерактив живой и не падает | `qa-monkey-<scene>-390x844.png` |
| Hover-зависимости | Не обнаружено: все проверенные действия выполнены тачем (pointerdown); мини-игра Эп1 пройдена без мыши | — |

## 7. Звук / mute

| Проверка | Результат |
|---|---|
| AudioContext в headless при жесте | PASS — создаётся, state `running`, ни одной ошибки страницы/консоли; 37 SFX-имён |
| Вызовы `G.audio.sfx(...)`/`tone` на боевых звуках | PASS — 0 ошибок (несуществующее имя молча игнорируется) |
| Mute-кнопка тапом на 390 px | PASS — `G.state.muted=true`, `G.audio.muted=true`, иконка 🔇, `localStorage.gde-artikl-muted='1'`, `gda-muted='1'` |
| Персистентность после reload | PASS — остаётся muted=true, иконка 🔇, звук muted |
| Повторный тап (включение) | PASS — muted=false, 🔇→🔊, `gde-artikl-muted='0'` |
| Техдолг | 2 ключа localStorage (core + audio), синхронизируются через `buildUI`/toggle — поведение корректное (см. §9, B-4) |

## 8. Армянские глифы (canvas fillText + DOM)

- Статически: 934 символа, 74 уникальных; ключевые Ը/ը/Ն/ն; 16/16 слов DESIGN.md §8; фраза Эп3 «Ես այսօր տանը հաց եմ ուտում».
- Canvas-замер в браузере: `measureText('ԸըՆն')` = 108.6 px vs tofu-заглушки 51.6 px — реальные глифы, не «квадратики» (ширина отличается, шрифтовой fallback работает).
- DOM на сценах: memory — 36 арм. символов, hear — 22, letters — 13, loop — 11, article — 4, intro — 7.
- Визуально проверены скриншоты: доска i1/i5/i6/boss (ԳԻՐՔ, ԴԱՍ № 47, ՊԵԴԱԳՈԳԻԱԿԱՆ ԽԱՈՍ), карточки памяти (հաց, տուն, սար…), буквы Эп4 (պ/փ/ր/ռ/ց/ձ…), печать диплома Ը и «ՀՈԴԸ ՏԵՂՈՒՄ Է». Искажений/тофу нет.

## 9. Баги и замечания

Блокирующих багов (FAIL) — **нет**. Ниже — все 4 WARN прогона, оформленные как замечания.

### B-1 (minor, UX/вёрстка). Sticky-панель кнопок перекрывает низ диплома на 1280×800
- **Шаги:** открыть `gde-artikl.html?scene=finale&only=1&diploma=1` в окне 1280×800.
- **Ожидалось:** печать, подпись и сноска диплома видны (или панель кнопок не накрывает документ).
- **Фактически:** панель «СКОПИРОВАТЬ РЕЗУЛЬТАТ / СЫГРАТЬ ЕЩЁ РАЗ» (`.fin-actions`, `position:sticky; bottom:0`) накрывает нижние ~150 px карточки; печать/подпись видны только после прокрутки. Кнопки доступны, данные не теряются — косметика.
- **Скриншот:** `screenshots/qa-diploma-1280x800.png`.

### B-2 (minor, доступность). Ссылка «показать текст вручную» — тач-цель 26 px
- **Шаги:** диплом на 390×844 или 320×568.
- **Ожидалось:** тач-цель ≥ 44 px (TECH.md §1).
- **Фактически:** высота ссылки 26 px при ширине 350/280 px. Это вторичный fallback (основные кнопки 52+ px), поэтому не блокер.
- **Скриншот:** `screenshots/qa-diploma-390x844.png`, `qa-diploma-320x568.png`.

### B-3 (minor, QA-режим). Катсцены и finale в `?auto=1` длиннее требования TECH §3
- **Шаги:** `gde-artikl.html?auto=1&seed=1`, замер длительности сцен.
- **Ожидалось:** в auto-режиме сцена завершается за 1–2 c (TECH.md §3).
- **Фактически:** i1 4.8 c, i2 3.0, i3 3.5, i4 3.2, i5 3.6, i6 3.6, finale 9.3 c (итого прогон 39 c). Эпизоды с `c.auto` укладываются (artist 1.1, memory 1.3, hear 1.3, letters 1.3, loop 1.1, boss 1.3 c). На игрока не влияет — только на длительность автоматического QA. Не блокер.
- **Скриншот:** `screenshots/qa-auto-auto-finale.png`.

### B-4 (info, техдолг). Два ключа muted в localStorage
- В `00-core.js` — `gde-artikl-muted`, в `03-audio.js` — `gda-muted`; оба пишутся при toggle и синхронизируются через `buildUI`, поэтому поведение корректное (проверено: §7). Риск: прямой вызов `G.audio.setMuted()` до `buildUI` разойдётся с HUD. Оставить как есть или унифицировать ключ — на усмотрение Lead.

## 10. Непроверенное / известные ограничения (честно)

1. **Реальные мобильные устройства не тестировались.** Только эмуляция Chromium: 390×844 и 320×568, DPR 2, synthetic touch. iOS Safari, Android Chrome и реальные тач-события могут отличаться.
2. **Звук не слышали.** Headless: проверены только создание AudioContext (state running), отсутствие ошибок и mute-логика; громкость/тембр/баланс не оценивались.
3. **Только Chromium.** Firefox/Safari/Edge не проверялись; поведение `file://` + localStorage + clipboard в них не гарантировано.
4. **Не пройден глубокий ручной сценарий всех 6 эпизодов.** Покрыто: auto-прохождение до финала (все сцены), skip-переходы всех сцен, тач-прохождение интро→Эп1 + monkey-тапы 6 мини-игр. Все гэги/фазы босса/достижения вручную не перебирались — это зона человеческого плейтеста.
5. **Копирование не прочитано обратно из буфера.** Проверены подтверждение в UI и fallback textarea; содержимое буфера обмена программно не сверялось.
6. **Не проверялись:** клавиатурный проход, screen-reader/a11y, ландшафтная ориентация, масштаб Windows 125/150%, приватный режим/инкогнито, производительность на слабых устройствах, длительные сессии (утечки), поведение `file://` в мобильных браузерах.
7. **human-фактор:** «смешно/не смешно», баланс сложности и читаемость на реальном телефоне — не измеряются автотестами.

## 11. Артефакты

- Инструменты: `tools/check.mjs` (статический аудит, `node --check` всех src/js, армянские глифы, SFX-имена, сцены), `tools/playtest.mjs` (playwright-core + системный Chrome: матрица сцен, auto/skip-прогоны, диплом, тач, звук, офлайн-копия, monkey).
- Скриншоты: 92 файла `screenshots/qa-*.png`:
  - матрица: `qa-scene-<scene>-<1280x800|390x844|320x568>.png`;
  - auto: `qa-auto-auto-<scene>.png`, `qa-auto-auto-end.png`, `qa-auto-offline-auto-<scene>.png`, `qa-auto-offline-auto-end.png`;
  - диплом: `qa-diploma-1280x800.png`, `qa-diploma-390x844.png`, `qa-diploma-320x568.png`, `qa-diploma-manual.png`, `qa-diploma-manual-390x844.png`, `qa-diploma-copyfallback-1280x800.png`, `qa-diploma-restart-1280x800.png`;
  - тач: `qa-touch-intro/fakewin/i1/article/article-attach/skip-390x844.png`;
  - monkey: `qa-monkey-<scene>-390x844.png` (article, memory, hear, letters, loop, boss);
  - офлайн: `qa-offline-scene.png`; skip: `qa-skip-end-1280x800.png`.
- JSON последнего прогона (временный, не в git): `%TEMP%\gde-artikl-qa\final-report3.json`.
