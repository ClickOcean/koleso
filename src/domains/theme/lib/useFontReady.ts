import { useEffect, useState } from 'react';

/** Спецификации (`'20px "Matrix Title"'`), которые в этой вкладке уже успешно загрузились. */
const loadedFonts = new Set<string>();

const hasFontFaceSet = (): boolean => typeof document !== 'undefined' && Boolean(document.fonts);

/** Синхронная проверка: шрифт уже готов или ждать нечего (нет FontFaceSet, битая спецификация). */
const isFontReadyNow = (fontSpec: string): boolean => {
  if (!hasFontFaceSet() || loadedFonts.has(fontSpec)) {
    return true;
  }

  try {
    return document.fonts.check(fontSpec);
  } catch {
    // Некорректная спецификация: браузер сам подставит запасной шрифт, ждать нечего.
    return true;
  }
};

/**
 * Сообщает, загружен ли веб-шрифт, и перерендеривает компонент, когда он приедет.
 *
 * Зачем: холст колеса кешируется и рисуется один раз, только при смене участников или
 * подсветки, а `ctx.font` с ещё не загруженным `@font-face` молча берёт запасной шрифт.
 * Без повторного рендера подписи секторов так и остались бы в запасном шрифте. Компонент
 * темы вызывает хук и использует результат внутри `renderer`; смена значения пересобирает
 * кеш холста в `CanvasSpinningWheel`.
 *
 * Поведение:
 * - без `document.fonts` (SSR, старые браузеры) сразу `true`;
 * - начальное значение — `document.fonts.check(fontSpec)` или попадание в кеш модуля, поэтому
 *   повторное монтирование с уже загруженным шрифтом возвращает `true` синхронно и не мигает;
 * - ошибка загрузки тоже даёт `true`: колесо не должно застрять в ожидании шрифта;
 * - после размонтирования состояние не трогается.
 *
 * @param fontSpec шрифт в синтаксисе CSS `font`, например `'20px "Matrix Title"'`.
 */
export function useFontReady(fontSpec: string): boolean {
  // Ключ — сама спецификация, чтобы смена шрифта не унаследовала готовность предыдущего.
  const [readySpec, setReadySpec] = useState<string | null>(() => (isFontReadyNow(fontSpec) ? fontSpec : null));

  useEffect(() => {
    if (!hasFontFaceSet() || loadedFonts.has(fontSpec)) {
      return;
    }

    let cancelled = false;
    const markReady = (loaded: boolean): void => {
      if (loaded) {
        loadedFonts.add(fontSpec);
      }
      if (!cancelled) {
        setReadySpec(fontSpec);
      }
    };

    // Пустой список означает, что семейство ещё не объявлено (@font-face подключится позже):

    // такой ответ в кеш не пишем, иначе шрифт, зарегистрированный потом, никогда не перерисует холст.

    document.fonts.load(fontSpec).then(

      (faces) => markReady(faces.length > 0),

      () => markReady(false),

    );

    return () => {
      cancelled = true;
    };
  }, [fontSpec]);

  return readySpec === fontSpec || isFontReadyNow(fontSpec);
}
