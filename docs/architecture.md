# Архитектура

Актуально на 2026-09-15. Обновляйте этот файл вместе с кодом.

## Назначение

Одна страница. Слева колесо, справа панель: кнопка «Крутить», настройки, вкладки «Участники», «История» и «Статистика».
Каждый активный участник — сектор одинакового размера. Один прокрут — один победитель, никто не выбывает.

## Слои

```
src/
  main.tsx                 точка входа: стили, i18n, dayjs, MantineProvider, QueryClientProvider
  app/                     оболочка: App (фон темы + шапка + страница + режим «только колесо»), MantineProvider
                           (акцент и схема из активной темы), AppErrorBoundary (ошибка рендера → экран с перезагрузкой)
  pages/wheel/WheelPage    склейка: грузит участников, историю и настройки; отдаёт всё в WheelBoard
  domains/
    wheel/                 движок колеса, прокрут, настройки, музыка
    theme/                 темы: реестр, токены интерфейса, папки тем (см. docs/theme-authoring.md)
    participants/          список людей
    spin-history/          история побед и статистика
  shared/                  db (Dexie), расширения Mantine, ImageLinkInput, хуки localStorage
  utils/, constants/, models/   вспомогательное для движка колеса (наследие pointauc)
  assets/i18n/             локали ru (по умолчанию) и en
```

Правила импортов: `pages → domains/shared`, `domains → domains/shared`, `shared → domains` запрещено.

## Домен `wheel`

- `BaseWheel/` — рендер колеса. `BaseWheel.tsx` управляет layout, стрелкой, картинкой в центре и оверлеем победителя.
  Зазор между заголовком-победителем и ободом задаёт `parts/wheelSpacing.ts` (`WHEEL_TITLE_GAP`); он же учтён в
  `FlexboxAutosizer`, чтобы стрелки тем не накрывали имя.
  Вся логика прокрута снаружи, через `WheelController` (`contracts.ts`): `spin({ duration, winnerId })` возвращает
  `{ animate }`, `clearWinner()`, `getItems()`.
  - `parts/` — стили колеса (`default`, `genshinImpact`): холст, стрелка, эффекты. Реестр в `resolveWheelParts.ts`.
  - `renderers/`, `effects/`, `hooks/useWheelAnimator.ts` — canvas-рисование и GSAP-анимация.
  - `WinnerBackdrop.tsx` — оверлей с именем победителя и слотом под кнопки.
- `ui/WheelBoard.tsx` — главный компонент: форма настроек (react-hook-form), плеер музыки, поток прокрута,
  кнопки «Подтвердить» / «Крутить ещё раз». Принимает `participants`, `initialSettings`, `onSettingsChanged`,
  `onWinnerConfirmed`, `sidebarExtra`. Раскладка: `.wheelArea` (flex: 1, колесо по центру) + `.sidebar` (27rem).
  Размер колеса считает `BaseWheel/FlexboxAutosizer` как min(ширина области, высота − `titleGap` − 36 px), где
  `titleGap` — зазор над ободом из `parts` темы (по умолчанию `WHEEL_TITLE_GAP` = 72 px); родитель колеса
  обязан иметь явный `gap` (иначе `parseFloat('normal')` даёт NaN).
- `ui/WheelControls.tsx` — кнопка «Крутить», длительность, музыка, стиль, картинка в центре.
- `ui/FormWheel.tsx` — связывает `BaseWheel` с полями формы (стиль, картинка).
- `lib/spin.ts` — `getSpinDuration(settings)` и `pickWinner(items)` (равномерный индекс из `crypto.getRandomValues`).
- `lib/spinTimelineStore.ts` — когда начался прокрут, сколько он длится и идёт ли сейчас (`start`/`stop` из
  `WheelBoard.onSpin`); по нему фон темы разыгрывает сцены по секундам прокрута (см. «Тайвань» в `theme-authoring.md`).
- `lib/participantsToWheelItems.ts` — активные участники → секторы с amount = 1 и стабильным цветом по позиции.
- `lib/hooks/useWheelSettings.ts`, `lib/indexedDbSettingsStore.ts` — настройки в IndexedDB (одна запись).
- `settings/ui/` — поля формы: `SpinTime`, `RandomSpinConfig`, `RandomSpinSwitch`, `StyleSelect`, `CoreImage`.
- `soundtrack/` — музыка (см. ниже).

### Поток прокрута

1. `WheelControls` сабмитит форму (кнопка или пробел через `useHotkeys`).
2. `WheelBoard.onSpin`: `clearWinner()` → `getSpinDuration` → `pickWinner(controller.getItems())` →
   `controller.spin(...)` → запуск плеера (если включён) → `await animate()` → стоп плеера.
3. `BaseWheel` показывает `WinnerBackdrop` с `WinnerActions`.
4. «Подтвердить» → `onWinnerConfirmed(winner)` → `spinsRepository.add` → уведомление → `clearWinner()`.
   «Крутить ещё раз» → `clearWinner()` и новый сабмит, в историю ничего не пишется.

`CanvasSpinningWheel` рисует секторы один раз в закадровый canvas (`CanvasCache`) и каждый кадр переносит его на
видимый canvas с поворотом. GSAP-твин запоминает колбэк отрисовки на момент старта прокрута и зовёт его до конца
анимации, поэтому размеры в этом колбэке берутся из самих canvas'ов (`ctx.canvas.width`), а не из пропа `layout`:
иначе ресайз во время прокрута (схлопывание панели, режим «только колесо») крутил бы уже перерисованный кэш вокруг
прежнего центра, и колесо уезжало бы с оси, а неочищенная часть холста оставляла бы призраки прошлых кадров.

### Настройки (`Wheel.Settings`, глобальный тип в `src/models/wheel.d.ts`)

`spinTime`, `randomSpinEnabled`, `randomSpinConfig {min,max}`, `coreImage`, `wheelStyles`, `soundtrack`.
Сохраняются с дебаунсом 1 с из `WheelPage`. Картинка центра дублируется в `localStorage['wheelCoreImage']`,
чтобы первый рендер не ждал IndexedDB.

## Музыка (`domains/wheel/soundtrack`)

- Источники: файл (base64 data URL, хранится в настройках) и YouTube (videoId).
- `ui/index.tsx` — кнопка с индикатором, открывает `SoundtrackModal`.
- `ui/AudioSourceSelector` — выбор файла (`FileUpload`) или вставка ссылки YouTube. `FileUpload` — это `<label>` для
  визуально скрытого `<input type=file>` (класс `sr-only`, не `display: none`): диалог выбора файла открывает сам
  браузер по клику, без программного `input.click()`, который часть браузеров и режимов блокирует. Drag-and-drop
  на том же элементе. Метаданные ролика берутся как
  в pointauc: `api/youtubeApi.ts` (YouTube Data API, ключи унаследованы, ротация при ошибке). Если API недоступен,
  запасной путь — публичный oEmbed без ключей; тогда длительность неизвестна (0) и дописывается в источник из плеера
  через `onDurationChange` в `SoundtrackSourceConfig`. `LoopMarkers` при нулевой длительности ничего не рисует.
- `ui/SoundtrackSourceConfig` — таймлайн (`AudioTimeline`), отступ, громкость, тест-проигрывание, включение.
- `ui/PlayerFactory` — `FilePlayer` (HTMLAudio) и `YoutubePlayer` (react-player, скрытый). Ref `PlayerRef`:
  `play(offset, volume)`, `stop()`, `setVolume()`.
- `lib/useAudioPlayback.ts` + `lib/adapters/*` — только для извлечения волны (waveform) в модалке.

## Домен `participants`

- `model/types.ts` — `Participant { id, name, isActive, createdAt }`.
- `api/participantsRepository.ts` — CRUD над `db.participants`; `addMany` принимает список имён, дубли
  (без учёта регистра) пропускает. При первом запуске (`getAll`, таблица пуста, флага
  `localStorage['participants.seeded.v1']` нет) заполняет список из `config/defaultParticipants.ts` и ставит флаг,
  чтобы намеренно очищенный список не заполнялся заново.
- `config/defaultParticipants.ts` — стартовый состав команды (19 имён: autosave pointauc без Semen Nazarov).
- `model/useParticipants.ts` — query `['participants']` и мутации с инвалидацией.
- `ui/ParticipantsPanel.tsx` — форма добавления (Enter добавляет, Shift+Enter перенос), счётчик, «Включить/выключить
  всех», список `ParticipantRow` (чекбокс, цвет сектора, переименование по двойному клику, удаление с подтверждением).

## Домен `spin-history`

- `model/types.ts` — `SpinResult { id, participantId, participantName, spunAt }` (имя — снимок на момент победы),
  `ParticipantStats`, `SpinStatsSummary`.
- `api/spinsRepository.ts` — `getAll`, `add`, `remove`, `clear`.
- `lib/computeStats.ts` — чистая функция: победы, доля, последняя победа, текущая и максимальная серия,
  ожидаемое число побед на активного (`totalSpins / activeCount`). Строки есть для всех текущих участников
  (даже с нулём) и для удалённых, если они есть в истории. Фильтр `since`. Тест рядом.
- `ui/HistoryPanel.tsx` + `ui/HistoryFeed.tsx` — вкладка «История»: лента всех подтверждённых прокрутов, новые
  сверху, сгруппированы по дням («Сегодня», «Вчера», дата), время и имя, удаление записи, «Очистить историю».
- `ui/StatsPanel.tsx` — вкладка «Статистика»: период (всё время / 30 дней / 7 дней) и таблица `StatsTable`.

## Хранение

Dexie, база `koleso` (`src/shared/lib/database/db.ts`), версия 1:

| таблица         | ключ | индексы                       |
| --------------- | ---- | ----------------------------- |
| `participants`  | id   | name, isActive, createdAt     |
| `spins`         | id   | participantId, spunAt         |
| `wheelSettings` | id   | (одна запись, data = JSON)    |

При изменении схемы поднимайте `version` и добавляйте миграцию в конструкторе.

База живёт в браузере и привязана к origin **вместе с портом**: `localhost:3000` и `localhost:3001` — две разные
базы. Если порт 3000 занят (например, забытым dev-сервером), Vite молча уходит на 3001, и там открывается пустая
база с участниками по умолчанию; данные никуда не пропали, они на прежнем порту.

## Фон

`src/app/GeometryBackground.tsx` — «созвездия» на tsparticles (`@tsparticles/slim`) поверх тёмного градиента,
взято из фона «geometry» pointauc. Рендерится один раз в `App` под шапкой и страницей (`z-index: 0`).
Стиль колеса по умолчанию — `genshinImpact` («Далёкий космос»), он визуально сочетается с этим фоном.

## Темы и кастомизация

Тема = стиль колеса + фон + токены интерфейса + вид в селекте. Всё это одна запись `ThemeDefinition`
(`src/domains/theme/model/types.ts`) в папке `src/domains/theme/themes/<id>/theme.ts`. Реестр —
`src/domains/theme/config/themes.ts` (`THEMES`, `THEME_IDS`, `resolveTheme`); порядок в реестре = порядок в
селекте. Идентификаторы перечислены в `WheelStyle` (`src/models/wheel.model.ts`), TypeScript не даст забыть
запись в реестре. Подробная инструкция по написанию темы: `docs/theme-authoring.md`.

- **Части колеса** (`parts`): `spinningWheel` — рендерер для `CanvasSpinningWheel` (`drawSlice`, `drawText`,
  `afterDraw`, всё через `scale()`; подписи размещает общий `parts/sectorText.ts`: прижимает имя к внешней границе
  с отступом от обода и уменьшает шрифт, если имя не помещается), `pointer`, `effects` (анимация на отдельном
  canvas), `coreImage` (картинка в центре по умолчанию, `public/themes/<id>/`), `titleGap` (зазор между именем
  победителя и ободом, если стрелка темы ниже обычной). `resolveWheelParts` в
  `domains/wheel` просто читает реестр.
- **Фон** (`background`): полноэкранный компонент, рендерит `ui/ThemeRoot.tsx` в `App`.
- **Токены интерфейса** (`ui`): `ThemeRoot` пишет их в CSS-переменные `--theme-*` на `<html>` и ставит
  `data-wheel-style`; `ui/theme.css` применяет их к заголовкам (`.base-wheel-wrapper h2`, `.wheel-winner-name`),
  панелям (`.theme-panel`), кнопке «Крутить» (`.theme-spin-button`) и шрифту панели (`.theme-ui`).
  `MantineProvider` берёт из токенов акцент (палитра `primary`) и цветовую схему (`light`/`dark`).
- **Селект** (`select`): фон, цвет, шрифт и значок; `StyleSelect` красит ими и закрытое поле, и пункты списка.
- **Активный стиль** живёт в `model/activeWheelStyleStore.ts` (useSyncExternalStore): `WheelBoard` пишет туда
  значение поля формы, `ThemeRoot` и `MantineProvider` читают.

Стили: `default`, `genshinImpact` («Далёкий космос», основной), `matrix`, `casino`, `synthwave`, `arcade`,
`horror`, `newYear`, `terminal`, `steampunk`, `nautical`, `stadium`, `minimalLight`, `highSociety`, `beerParty`,
`solarSystem`, `taiwan`.
Части «Обычного» и «Далёкого космоса» исторически лежат в `domains/wheel/BaseWheel/parts/`, остальные — в своих
папках тем. У каждой темы, кроме двух первых, есть эмблема в центре по умолчанию (`public/themes/<id>/core.png`,
сгенерирована в Higgsfield), у `highSociety` и `beerParty` ещё и фоновая сцена `background.jpg` оттуда же, у
`taiwan` — три фото в ротации и персонажи поверх (см. `docs/theme-authoring.md`). Собственные подписи темы (не
название в селекте) лежат в локалях под `themes.<id>.*`.

## Режим «только колесо»

Кнопка в шапке (или `Esc` для выхода) прячет шапку и панель: остаются фон темы и колесо на всю ширину.
Состояние в `localStorage['ui.presentationMode']`, пробел по-прежнему крутит. Переключателя языка нет:
язык берётся из `localStorage['i18nextLng']`, по умолчанию русский.

## Локализация

`src/assets/i18n/index.ts`: языки `ru` (fallback) и `en`, язык берётся только из localStorage (переключателя в UI нет).
Пространства ключей: `app`, `common`, `wheel`, `participants`, `history`, `stats`. Оба файла должны содержать одинаковый
набор ключей.

## Сборка и инструменты

Vite 7, React 19 с React Compiler (babel-plugin-react-compiler), Tailwind 4 через `@tailwindcss/vite`, Mantine 9
(тёмная тема принудительно), SCSS для `styles/index.scss` и миксинов `_mantine.scss`, CSS Modules.
`pnpm dev` (порт 3000), `pnpm build`, `pnpm test` (vitest + jsdom), `pnpm lint`. CI в `.github/workflows/ci.yml`
делает lint, test, build и выкладывает `dist` артефактом. `Dockerfile` собирает статику под nginx.
