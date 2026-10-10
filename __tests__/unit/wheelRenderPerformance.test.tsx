import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { ServicesProvider, SettingsProvider } from '../../src/context';
import { AppText } from '../../src/components/ui/AppText';
import { HeartCounter } from '../../src/components/game/HeartCounter';
import { Icon } from '../../src/components/ui/Icon';
import { LetterWheel, WHEEL_SELECTION_TEST_IDS } from '../../src/components/game/LetterWheel';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import {
  buildSelectionSegments,
  buildTailSpec,
  computeWheelGeometry,
  positionOf,
} from '../../src/services/game/wheelGesture';
import type { LetterTileData } from '../../src/types';

/**
 * آزمون‌های نگهبانِ «هنگ‌کردن اندروید».
 *
 * ریشهٔ کندی گزارش‌شده روی گوشی دو چیز بود:
 *  ۱) مسیر انتخاب با `useAnimatedProps` روی `Polyline` نوشته می‌شد. `Polyline`
 *     در react-native-svg یک کامپوننت کلاسیِ واسطه است (خودش `Path` را رندر
 *     می‌کند) و Reanimated نمی‌تواند برای آن شناسهٔ نمای Fabric بگیرد؛ پس در
 *     **هر نمونهٔ لمس** (۶۰ تا ۲۴۰ بار در ثانیه) یک عملیات props بومی با
 *     shadow node نامعتبر صادر می‌شد و ترد رابط کاربری اندروید اشغال می‌ماند.
 *  ۲) لایه‌های تزئینی (پس‌زمینهٔ تمام‌صفحه و آیکون‌ها) در هر تغییر انتخاب
 *     دوباره ساخته می‌شدند؛ روی اندروید هر ریشهٔ SVG بوم مجزای خودش را دارد.
 *
 * این آزمون‌ها همان دو قرارداد را قفل می‌کنند تا تغییر بعدی، بی‌سروصدا به
 * وضعیت قبل برنگردد.
 */

/* -------------------------------------------------------------------------- */
/* شمارندهٔ رندرِ react-native-svg                                            */
/* -------------------------------------------------------------------------- */

type SvgStats = { renders: Record<string, number> };

declare global {
  // eslint-disable-next-line no-var
  var __svgStats: SvgStats | undefined;
}

jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const { Text, View } = require('react-native');

  const stats: { renders: Record<string, number> } = { renders: {} };
  (globalThis as { __svgStats?: unknown }).__svgStats = stats;

  const host = (name: string, base: unknown) => {
    const Component = ReactLib.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      stats.renders[name] = (stats.renders[name] ?? 0) + 1;
      return ReactLib.createElement(base as never, {
        ...props,
        ref,
        testID: props.testID ?? `svg-${name}`,
      });
    });
    Component.displayName = `Svg${name}`;
    return Component;
  };

  const module: Record<string, unknown> = { __esModule: true };
  for (const name of ['Text', 'TSpan', 'Title', 'Desc']) {
    module[name] = host(name, Text);
  }
  for (const name of [
    'Svg',
    'Circle',
    'Ellipse',
    'G',
    'Line',
    'Path',
    'Polygon',
    'Polyline',
    'Rect',
    'Defs',
    'LinearGradient',
    'RadialGradient',
    'Stop',
    'ClipPath',
    'Mask',
    'Use',
    'Symbol',
    'Pattern',
    'Image',
    'ForeignObject',
  ]) {
    module[name] = host(name, View);
  }
  module.default = module.Svg;
  return module;
});

const svgRenders = (name = 'Svg'): number => globalThis.__svgStats?.renders[name] ?? 0;

beforeEach(() => {
  if (globalThis.__svgStats) {
    globalThis.__svgStats.renders = {};
  }
});

/* -------------------------------------------------------------------------- */

const DIAMETER = 300;
const TILE_SIZE = 54;
const CHARS = 'کتابرم' as const;

const tiles: LetterTileData[] = [...CHARS].map((char, index) => ({ id: `t${index}`, char }));

const geometry = computeWheelGeometry({
  tiles,
  diameter: DIAMETER,
  preferredTileSize: TILE_SIZE,
});

const centerOf = (id: string) => {
  const position = positionOf(geometry, id);
  if (!position) {
    throw new Error(`کاشی ${id} در هندسهٔ آزمون نیست.`);
  }
  return { x: position.x, y: position.y };
};

async function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ServicesProvider>
      <SettingsProvider>{ui}</SettingsProvider>
    </ServicesProvider>,
  );
}

async function renderWheel(selectedIds: readonly string[]) {
  return renderWithProviders(
    <LetterWheel
      tiles={tiles}
      selectedIds={selectedIds}
      onTilePress={jest.fn()}
      onSelectionChange={jest.fn()}
      onRelease={jest.fn()}
      diameter={DIAMETER}
      preferredTileSize={TILE_SIZE}
    />,
  );
}

describe('هندسهٔ خالص مسیر انتخاب', () => {
  it('پاره‌خط‌ها را به ترتیب انتخاب و بین مراکز واقعی کاشی‌ها می‌سازد', () => {
    const segments = buildSelectionSegments(geometry, ['t0', 't1', 't3']);

    expect(segments).toHaveLength(2);

    const first = segments[0]!;
    const a = centerOf('t0');
    const b = centerOf('t1');
    expect(first.from).toBe('t0');
    expect(first.to).toBe('t1');
    expect(first.length).toBeCloseTo(Math.hypot(b.x - a.x, b.y - a.y), 6);
    expect(first.midX).toBeCloseTo((a.x + b.x) / 2, 6);
    expect(first.midY).toBeCloseTo((a.y + b.y) / 2, 6);
    expect(first.angle).toBeCloseTo(Math.atan2(b.y - a.y, b.x - a.x), 6);

    // ترتیب انتخاب حفظ می‌شود، نه ترتیب چیدمان کاشی‌ها روی چرخ.
    expect(segments[1]!.from).toBe('t1');
    expect(segments[1]!.to).toBe('t3');
  });

  it('شناسهٔ ناشناس زنجیرهٔ خط‌ها را نمی‌شکند و پاره‌خط صفر نمی‌سازد', () => {
    expect(buildSelectionSegments(geometry, ['t0'])).toHaveLength(0);
    expect(buildSelectionSegments(geometry, [])).toHaveLength(0);

    const withUnknown = buildSelectionSegments(geometry, ['t0', 'missing', 't1']);
    expect(withUnknown).toHaveLength(1);
    expect(withUnknown[0]!.from).toBe('t0');
    expect(withUnknown[0]!.to).toBe('t1');

    const repeated = buildSelectionSegments(geometry, ['t2', 't2']);
    expect(repeated).toHaveLength(0);
  });

  it('دمِ زنده تا وقتی انگشت داخل کاشی است کشیده نمی‌شود', () => {
    const anchor = centerOf('t0');
    const visualRadius = geometry.visualRadius;
    const inside = buildTailSpec(visualRadius, DIAMETER, anchor, {
      x: anchor.x + visualRadius * 0.5,
      y: anchor.y,
    });

    expect(inside.visible).toBe(false);
    expect(inside.scaleX).toBe(0);
    expect(inside.length).toBe(0);
  });

  it('دمِ زنده دقیقاً از مرکز آخرین کاشی تا نوک انگشت می‌رسد', () => {
    const anchor = centerOf('t0');
    const pointer = { x: anchor.x + 40, y: anchor.y - 30 };
    const barSpan = DIAMETER;
    const spec = buildTailSpec(geometry.visualRadius, barSpan, anchor, pointer);

    expect(spec.visible).toBe(true);
    expect(spec.length).toBeCloseTo(50, 6);
    expect(spec.scaleX).toBeCloseTo(50 / barSpan, 6);

    /**
     * بازسازی ریاضیِ transform: نوار با `left: 0` و `top: -thickness/2` ساخته
     * می‌شود، پس مرکزِ بی‌ترنسفورمش `(barSpan/2, 0)` است. مبدأ چرخش پیش‌فرض
     * مرکز نماست؛ بنابراین دو سر نوار باید دقیقاً روی لنگر و انگشت بنشینند.
     */
    const centerX = barSpan / 2 + spec.translateX;
    const centerY = spec.translateY;
    const half = (barSpan * spec.scaleX) / 2;
    const cos = Math.cos(spec.angle);
    const sin = Math.sin(spec.angle);

    expect(centerX - half * cos).toBeCloseTo(anchor.x, 6);
    expect(centerY - half * sin).toBeCloseTo(anchor.y, 6);
    expect(centerX + half * cos).toBeCloseTo(pointer.x, 6);
    expect(centerY + half * sin).toBeCloseTo(pointer.y, 6);
  });
});

describe('چرخ حروف بدون SVG در مسیر انتخاب', () => {
  it('مسیر انتخاب هیچ Polyline و هیچ ریشهٔ SVG اضافی نمی‌سازد', async () => {
    await renderWheel(['t0', 't1', 't3', 't4']);

    // پیش‌تر دو Polyline انیمیشنی در هر فریم به‌روز می‌شدند؛ حالا صفر است.
    expect(screen.queryAllByTestId('svg-Polyline')).toHaveLength(0);
    // تنها ریشهٔ SVG چرخ، پوستهٔ ثابت (صفحهٔ چرخ و حلقهٔ پیشرفت) است.
    expect(screen.queryAllByTestId('svg-Svg')).toHaveLength(1);
  });

  it('به ازای هر انتخاب، یک دانه و (n-1) پاره‌خط و دو نوار دم می‌سازد', async () => {
    await renderWheel(['t0', 't1', 't3', 't4']);

    expect(screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.bead)).toHaveLength(4);
    expect(screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.segmentLine)).toHaveLength(3);
    expect(screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.segmentGlow)).toHaveLength(3);
    expect(screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.tailLine)).toHaveLength(1);
    expect(screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.tailGlow)).toHaveLength(1);
  });

  it('با انتخاب خالی هیچ لایهٔ مسیری ساخته نمی‌شود', async () => {
    await renderWheel([]);

    expect(screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.bead)).toHaveLength(0);
    expect(screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.segmentLine)).toHaveLength(0);
    expect(screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.tailLine)).toHaveLength(0);
  });

  it('پاره‌خط‌ها به‌جای رشتهٔ SVG، transform عددی می‌گیرند', async () => {
    await renderWheel(['t0', 't1']);
    const [line] = screen.queryAllByTestId(WHEEL_SELECTION_TEST_IDS.segmentLine);
    const style = StyleSheet.flatten(line?.props.style);
    const expected = buildSelectionSegments(geometry, ['t0', 't1'])[0]!;

    expect(style?.width).toBeCloseTo(expected.length, 6);
    expect(style?.transform).toEqual([
      { translateX: expected.midX - expected.length / 2 },
      { translateY: expected.midY - 5 / 2 },
      { rotate: `${expected.angle}rad` },
    ]);
  });
});

describe('لایه‌های تزئینی دوباره ساخته نمی‌شوند', () => {
  it('پس‌زمینهٔ پوستهٔ صفحه با رندر مجدد صفحه بازسازی نمی‌شود', async () => {
    const view = await renderWithProviders(
      <ScreenContainer testID="shell">
        <AppText>نخست</AppText>
      </ScreenContainer>,
    );
    const svgBefore = svgRenders('Svg');
    const gradientBefore = svgRenders('RadialGradient');
    expect(svgBefore).toBeGreaterThan(0);

    await view.rerender(
      <ServicesProvider>
        <SettingsProvider>
          <ScreenContainer testID="shell">
            <AppText>دوم</AppText>
          </ScreenContainer>
        </SettingsProvider>
      </ServicesProvider>,
    );

    // پس‌زمینهٔ تمام‌صفحه با دو گرادیان شعاعی باید دست‌نخورده بماند.
    expect(svgRenders('Svg')).toBe(svgBefore);
    expect(svgRenders('RadialGradient')).toBe(gradientBefore);
  });

  it('آیکون با رندر مجدد والد دوباره ساخته نمی‌شود', async () => {
    function Host({ label }: { label: string }) {
      return (
        <>
          <Icon name="heart" size={16} color="#ffffff" />
          <AppText>{label}</AppText>
        </>
      );
    }

    const view = await render(<Host label="یک" />);
    const before = svgRenders('Path');
    await view.rerender(<Host label="دو" />);

    expect(screen.queryAllByTestId('svg-Svg')).toHaveLength(1);
    expect(svgRenders('Path')).toBe(before);
  });

  it('قلب‌ها یک ریشهٔ SVG دارند و با رندر مجدد بازسازی نمی‌شوند', async () => {
    const view = await render(<HeartCounter hearts={3} maxHearts={5} nextRefillAt={Date.now() + 65_000} />);

    // پنج قلب باید در یک ریشهٔ SVG باشند، نه پنج ریشهٔ جدا.
    expect(screen.queryAllByTestId('svg-Svg')).toHaveLength(1);
    expect(screen.queryAllByTestId('svg-Path')).toHaveLength(5);

    const before = svgRenders('Svg');
    await view.rerender(<HeartCounter hearts={3} maxHearts={5} nextRefillAt={Date.now() + 64_000} />);

    expect(svgRenders('Svg')).toBe(before);
  });
});
