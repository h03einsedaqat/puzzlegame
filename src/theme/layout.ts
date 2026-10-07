import { useWindowDimensions } from 'react-native';

const REFERENCE_WIDTH = 375;

export interface LayoutMetrics {
  width: number;
  height: number;
  isSmall: boolean;
  isTablet: boolean;
  /** حداکثر عرض محتوا؛ روی تبلت جلوی کشیده‌شدن بی‌قاعده را می‌گیرد */
  contentMaxWidth: number;
  /** اندازه کاشی حروف با توجه به عرض صفحه و تعداد حروف مرحله */
  tileSize: (letterCount: number, tilesPerRow: number) => number;
}

export function getLayoutMetrics(width: number, height: number): LayoutMetrics {
  const shortest = Math.min(width, height);
  const isTablet = shortest >= 600;
  const isSmall = shortest < 360;
  const contentMaxWidth = isTablet ? 620 : width;

  const tileSize = (letterCount: number, tilesPerRow: number) => {
    const available = Math.min(width, contentMaxWidth) - 32;
    const gaps = (tilesPerRow - 1) * 10;
    const byRow = Math.floor((available - gaps) / tilesPerRow);
    const byCount = Math.floor(available / Math.max(letterCount, tilesPerRow));
    const size = Math.min(72, Math.max(48, Math.min(byRow, Math.max(byCount, 52))));
    return isSmall ? Math.max(46, size - 4) : size;
  };

  return { width, height, isSmall, isTablet, contentMaxWidth, tileSize };
}

export function useLayout(): LayoutMetrics {
  const { width, height } = useWindowDimensions();
  return getLayoutMetrics(width, height);
}

/** مقیاس‌دهی نرم بر پایه عرض مرجع؛ برای اندازه‌های ثابت و غیرمنطقی نیست. */
export function scaleSize(size: number, width: number): number {
  const ratio = Math.min(Math.max(width / REFERENCE_WIDTH, 0.9), 1.35);
  return Math.round(size * ratio);
}

/* ------------------------------------------------------------------ */
/* چیدمان صفحه بازی                                                    */
/* ------------------------------------------------------------------ */

export interface GameLayoutInput {
  width: number;
  height: number;
  /** حاشیه‌های ناحیه امن (نوار وضعیت و نوار ناوبری) */
  insets: { top: number; bottom: number };
}

export interface GameLayout {
  /** صفحه کوتاه است؛ بخش‌های ثانویه باید جمع‌وجور شوند */
  compact: boolean;
  /** ارتفاع واقعی محتوای صفحه پس از کسر ناحیه امن */
  contentHeight: number;
  /** عرض قابل استفاده برای محتوا */
  contentWidth: number;
  headerHeight: number;
  /** جایگاه ثابت نوار بازخورد/آموزش/راهنما؛ همیشه رزرو می‌شود تا چرخ نپرد */
  statusSlotHeight: number;
  /** اندازه هر جای خالی واژه */
  slotSize: number;
  controlsHeight: number;
  /** بیشترین ارتفاع فهرست واژه‌ها؛ پس از آن خودش اسکرول می‌شود */
  foundWordsMaxHeight: number;
  /** قطر چرخ؛ از فضای باقی‌مانده حساب می‌شود */
  wheelDiameter: number;
  /** فاصله عمودی بین بخش‌های صفحه */
  gap: number;
  paddingBottom: number;
  paddingHorizontal: number;
}

const MIN_WHEEL_DIAMETER = 190;
/**
 * کمترین ارتفاع جایگاه بازخورد برای نمایش دو خط متن (پیام + توضیح یا عنوان +
 * الگوی راهنما). جایگاه‌های کوتاه‌تر فقط یک خط می‌گیرند تا هیچ متنی بریده نشود.
 * این مقدار تنها مرجع این قاعده است؛ هم نوار بازخورد و هم نوار راهنما از آن
 * استفاده می‌کنند.
 */
export const STATUS_SLOT_TWO_LINE_MIN = 52;
const MAX_WHEEL_DIAMETER = 340;
/** حداقل فضای لازم برای فهرست واژه‌ها تا حتی در صفحه کوچک هم یک ردیف بماند */
const MIN_FOUND_WORDS_HEIGHT = 48;

/**
 * چیدمان تطبیقی صفحه بازی.
 *
 * قاعده کار: ارتفاع واقعی صفحه پس از کسر ناحیه امن حساب می‌شود، سپس بخش‌های
 * ثابت (سرصفحه، جایگاه بازخورد، جای خالی واژه، دکمه‌ها) از آن کم می‌شود و
 * باقی‌مانده بین چرخ و فهرست واژه‌ها تقسیم می‌شود. اولویت با چرخ است؛ فهرست
 * واژه‌ها فقط از «مازاد» سهم می‌برد.
 *
 * نتیجه‌اش این تضمین است: مجموع ارتفاع همه بخش‌ها هرگز از صفحه بیشتر نمی‌شود،
 * پس نه دکمه‌ای بیرون صفحه می‌ماند، نه چیزی روی چیز دیگری می‌افتد و نه چرخ آن‌قدر
 * کوچک می‌شود که لمس‌کردن حروف سخت شود. این محاسبه خالص است و در آزمون برای
 * اندازه‌های واقعی گوشی بررسی می‌شود.
 */
export function computeGameLayout({ width, height, insets }: GameLayoutInput): GameLayout {
  const contentHeight = Math.max(0, Math.round(height - Math.max(0, insets.top) - Math.max(0, insets.bottom)));
  const paddingHorizontal = width < 360 ? 12 : 16;
  const contentWidth = Math.max(0, width - paddingHorizontal * 2);

  const compact = contentHeight < 640;
  const headerHeight = compact ? 64 : 78;
  const statusSlotHeight = compact ? 46 : 58;
  const slotSize = compact ? 38 : 46;
  const controlsHeight = compact ? 48 : 56;
  const gap = compact ? 6 : 8;
  const paddingBottom = compact ? 4 : 8;

  const fixed =
    headerHeight + statusSlotHeight + slotSize + controlsHeight + gap * 4 + paddingBottom;
  const slack = Math.max(0, contentHeight - fixed);

  // فهرست واژه‌ها فقط از مازادِ بالای حداقلِ چرخ سهم می‌برد (حدود یک‌سوم).
  // اگر فضا حتی به حداقل چرخ هم نرسد (پنجره تقسیم‌شده یا صفحه بسیار کوتاه)،
  // فهرست واژه‌ها به‌کل کنار می‌رود تا چرخ — که بخش اصلی بازی است — بزرگ‌تر بماند.
  const foundWordsMaxHeight =
    slack <= MIN_WHEEL_DIAMETER
      ? 0
      : Math.round(
          Math.min(
            Math.max((slack - MIN_WHEEL_DIAMETER) * 0.35, MIN_FOUND_WORDS_HEIGHT),
            compact ? 84 : 124,
          ),
        );
  const wheelAreaHeight = Math.max(0, slack - foundWordsMaxHeight);

  // قطر چرخ هرگز از فضای واقعی بیشتر نمی‌شود؛ پس هیچ‌وقت بیرون نمی‌زند.
  const wheelDiameter = Math.round(
    Math.min(
      Math.max(Math.min(contentWidth, wheelAreaHeight, MAX_WHEEL_DIAMETER), Math.min(MIN_WHEEL_DIAMETER, wheelAreaHeight)),
      Math.max(wheelAreaHeight, 0),
    ),
  );

  return {
    compact,
    contentHeight,
    contentWidth,
    headerHeight,
    statusSlotHeight,
    slotSize,
    controlsHeight,
    foundWordsMaxHeight,
    wheelDiameter,
    gap,
    paddingBottom,
    paddingHorizontal,
  };
}
