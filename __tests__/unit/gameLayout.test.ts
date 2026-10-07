import { computeGameLayout } from '../../src/theme/layout';

/**
 * چیدمان صفحه بازی روی اندازه‌های واقعی گوشی.
 *
 * این آزمون همان تضمینی را می‌سنجد که کاربر روی دستگاه می‌بیند: هیچ بخشی بیرون
 * صفحه نمی‌ماند، چرخ از حد لمس‌پذیر (۱۹۰ پوینت) کوچک‌تر نمی‌شود و در صفحه‌های
 * کوتاه، بخش‌های ثانویه جمع‌وجور می‌شوند.
 */

interface Screen {
  name: string;
  width: number;
  height: number;
  insets: { top: number; bottom: number };
}

const INSETS_PHONE = { top: 24, bottom: 48 };
const INSETS_BARE = { top: 0, bottom: 0 };

const SCREENS: Screen[] = [
  { name: '320×568 (کوچک‌ترین گوشی)', width: 320, height: 568, insets: INSETS_PHONE },
  { name: '320×568 بدون ناحیه امن', width: 320, height: 568, insets: INSETS_BARE },
  { name: '360×640', width: 360, height: 640, insets: INSETS_PHONE },
  { name: '375×667', width: 375, height: 667, insets: INSETS_PHONE },
  { name: '390×844', width: 390, height: 844, insets: INSETS_PHONE },
  { name: '412×915', width: 412, height: 915, insets: INSETS_PHONE },
  { name: '600×960 (تبلت کوچک)', width: 600, height: 960, insets: { top: 32, bottom: 32 } },
];

const MIN_WHEEL = 190;
const MAX_WHEEL = 340;

/** مجموع ارتفاع همه بخش‌ها، دقیقاً همان‌طور که صفحه می‌چیند */
function totalHeight(layout: ReturnType<typeof computeGameLayout>): number {
  return (
    layout.headerHeight +
    layout.statusSlotHeight +
    layout.slotSize +
    layout.controlsHeight +
    layout.wheelDiameter +
    layout.foundWordsMaxHeight +
    layout.gap * 4 +
    layout.paddingBottom
  );
}

describe('computeGameLayout', () => {
  for (const screen of SCREENS) {
    describe(screen.name, () => {
      const layout = computeGameLayout({
        width: screen.width,
        height: screen.height,
        insets: screen.insets,
      });

      it('مجموع بخش‌ها از ارتفاع صفحه بیشتر نمی‌شود (هیچ‌چیز بیرون نمی‌زند)', () => {
        expect(totalHeight(layout)).toBeLessThanOrEqual(layout.contentHeight);
        expect(layout.contentHeight).toBe(
          screen.height - screen.insets.top - screen.insets.bottom,
        );
      });

      it('چرخ از حد لمس‌پذیر کوچک‌تر و از سقف بزرگ‌تر نمی‌شود', () => {
        expect(layout.wheelDiameter).toBeGreaterThanOrEqual(MIN_WHEEL);
        expect(layout.wheelDiameter).toBeLessThanOrEqual(MAX_WHEEL);
      });

      it('چرخ در عرض محتوا جا می‌شود', () => {
        expect(layout.wheelDiameter).toBeLessThanOrEqual(layout.contentWidth);
        expect(layout.contentWidth).toBe(screen.width - layout.paddingHorizontal * 2);
      });

      it('جایگاه بازخورد همیشه رزرو است (بازخورد چرخ را جابه‌جا نمی‌کند)', () => {
        expect(layout.statusSlotHeight).toBeGreaterThan(0);
      });

      it('همه بخش‌ها اندازه مثبت دارند', () => {
        for (const value of [
          layout.headerHeight,
          layout.slotSize,
          layout.controlsHeight,
          layout.foundWordsMaxHeight,
          layout.gap,
          layout.paddingBottom,
        ]) {
          expect(value).toBeGreaterThan(0);
        }
      });
    });
  }

  it('صفحه کوتاه جمع‌وجور می‌شود و صفحه بلند نه', () => {
    const short = computeGameLayout({ width: 360, height: 568, insets: INSETS_PHONE });
    const tall = computeGameLayout({ width: 390, height: 844, insets: INSETS_PHONE });
    expect(short.compact).toBe(true);
    expect(tall.compact).toBe(false);
    expect(short.slotSize).toBeLessThan(tall.slotSize);
    expect(short.controlsHeight).toBeLessThan(tall.controlsHeight);
  });

  it('در صفحه باریک، حاشیه افقی کمتر می‌شود تا چرخ جا شود', () => {
    const narrow = computeGameLayout({ width: 320, height: 568, insets: INSETS_PHONE });
    const wide = computeGameLayout({ width: 412, height: 915, insets: INSETS_PHONE });
    expect(narrow.paddingHorizontal).toBeLessThan(wide.paddingHorizontal);
  });

  it('فهرست واژه‌ها فقط از مازاد سهم می‌برد؛ چرخ اولویت دارد', () => {
    const layout = computeGameLayout({ width: 412, height: 915, insets: INSETS_PHONE });
    expect(layout.foundWordsMaxHeight).toBeGreaterThanOrEqual(48);
    expect(layout.wheelDiameter).toBeGreaterThanOrEqual(layout.foundWordsMaxHeight);
  });

  it('در صفحه بسیار کوتاه (پنجره تقسیم‌شده) اول فهرست واژه‌ها کنار می‌رود، نه چرخ', () => {
    const tiny = computeGameLayout({ width: 320, height: 430, insets: INSETS_PHONE });
    // هیچ‌چیز بیرون نمی‌زند و چرخ بزرگ‌ترین بخش باقی‌مانده است
    expect(totalHeight(tiny)).toBeLessThanOrEqual(tiny.contentHeight);
    expect(tiny.foundWordsMaxHeight).toBe(0);
    expect(tiny.wheelDiameter).toBeGreaterThan(tiny.controlsHeight);
  });

  it('ناحیه امن بزرگ‌تر از صفحه، ارتفاع منفی نمی‌سازد', () => {
    const layout = computeGameLayout({ width: 360, height: 200, insets: { top: 400, bottom: 400 } });
    expect(layout.contentHeight).toBe(0);
    expect(layout.wheelDiameter).toBeGreaterThanOrEqual(0);
    expect(layout.foundWordsMaxHeight).toBeGreaterThanOrEqual(0);
  });
});
