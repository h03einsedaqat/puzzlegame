import React, { useState } from 'react';
import { AppState, DeviceEventEmitter, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { State, type PanGesture } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { render, waitFor } from '@testing-library/react-native';

import { ServicesProvider } from '../../src/context/ServicesContext';
import { SettingsProvider } from '../../src/context/SettingsContext';
import { LetterWheel } from '../../src/components/game/LetterWheel';
import { computeWheelGeometry } from '../../src/services/game/wheelGesture';
import { WHEEL_PAN_TEST_ID } from '../../src/hooks/useWheelGestures';
import { colors } from '../../src/theme';
import type { LetterTileData } from '../../src/types';

/**
 * آزمون یکپارچه لایه لمس چرخ.
 *
 * اینجا لایه واقعی (Gesture Handler + هوک + ماشین حالت) با ژست‌های شبیه‌سازی‌شده
 * آزموده می‌شود؛ پس همان چیزی سنجیده می‌شود که روی گوشی اتفاق می‌افتد: دنباله
 * حروف، برگشت به حرف قبلی، ثبت پس از برداشتن انگشت و لغو حرکت.
 */

const DIAMETER = 300;
const TILE_SIZE = 54;
const CHARS = 'کتا برم' as const;

const tiles: LetterTileData[] = [...CHARS].map((char, index) => ({ id: `t${index}`, char }));

const geometry = computeWheelGeometry({
  tiles,
  diameter: DIAMETER,
  preferredTileSize: TILE_SIZE,
});

const centerOf = (id: string) => {
  const position = geometry.positions.find(candidate => candidate.id === id);
  if (!position) {
    throw new Error(`کاشی ${id} در هندسه آزمون نیست.`);
  }
  return { x: Math.round(position.x), y: Math.round(position.y) };
};

interface Harness {
  onTilePress: jest.Mock;
  onSelectionChange: jest.Mock;
  onRelease: jest.Mock;
}

/**
 * میزبان آزمون.
 *
 * مثل صفحه واقعی بازی، انتخاب را در وضعیت نگه می‌دارد و همان چیزی را که چرخ
 * گزارش می‌کند برمی‌گرداند؛ پس رفتار «والدِ زنده» شبیه‌سازی می‌شود، نه یک
 * prop ثابت.
 */
function WheelHost({
  harness,
  disabled = false,
  initialSelection = [],
}: {
  harness: Harness;
  disabled?: boolean;
  initialSelection?: string[];
}) {
  const [selection, setSelection] = useState<readonly string[]>(initialSelection);

  return (
    <LetterWheel
      tiles={tiles}
      selectedIds={selection}
      onTilePress={harness.onTilePress}
      onSelectionChange={next => {
        setSelection([...next]);
        harness.onSelectionChange(next);
      }}
      onRelease={harness.onRelease}
      disabled={disabled}
      diameter={DIAMETER}
      preferredTileSize={TILE_SIZE}
    />
  );
}

async function renderWheel(overrides: { disabled?: boolean; selection?: string[] } = {}): Promise<Harness> {
  const harness: Harness = {
    onTilePress: jest.fn(),
    onSelectionChange: jest.fn(),
    onRelease: jest.fn(),
  };

  render(
    <ServicesProvider>
      <SettingsProvider>
        <WheelHost
          harness={harness}
          disabled={overrides.disabled}
          initialSelection={overrides.selection ?? []}
        />
      </SettingsProvider>
    </ServicesProvider>,
  );

  // ژست باید پیش از شبیه‌سازی در رجیستری ثبت شده باشد
  await waitFor(() => expect(getByGestureTestId(WHEEL_PAN_TEST_ID)).toBeTruthy());
  return harness;
}

const pan = () => getByGestureTestId(WHEEL_PAN_TEST_ID) as unknown as PanGesture;

/**
 * فرستادن دستی رویداد ژست.
 *
 * ابزار `fireGestureHandler` همیشه یک رویداد پایان به دنباله اضافه می‌کند، پس
 * برای آزمودن «کشیدنِ در جریان» (مثلاً وقتی برنامه به پس‌زمینه می‌رود) رویدادها
 * را مستقیم روی همان کانالی می‌فرستیم که خود Gesture Handler استفاده می‌کند.
 */
function emitState(
  gesture: PanGesture,
  state: State,
  oldState: State,
  point: { x: number; y: number },
) {
  DeviceEventEmitter.emit('onGestureHandlerStateChange', {
    handlerTag: gesture.handlerTag,
    state,
    oldState,
    numberOfPointers: 1,
    x: point.x,
    y: point.y,
    absoluteX: point.x,
    absoluteY: point.y,
    translationX: 0,
    translationY: 0,
    velocityX: 0,
    velocityY: 0,
  });
}

const lastSelection = (harness: Harness) => {
  const calls = harness.onSelectionChange.mock.calls;
  return calls.length === 0 ? null : (calls[calls.length - 1]![0] as readonly string[]);
};

describe('لمس چرخ با Gesture Handler واقعی', () => {
  it('حلقهٔ پیشرفت پس از پیدا شدن واژه دقیقاً حول مرکز چرخ قرار می‌گیرد', async () => {
    const rendered = await render(
      <ServicesProvider>
        <SettingsProvider>
          <LetterWheel
            tiles={tiles}
            selectedIds={[]}
            onTilePress={jest.fn()}
            onSelectionChange={jest.fn()}
            onRelease={jest.fn()}
            diameter={DIAMETER}
            preferredTileSize={TILE_SIZE}
            foundCount={1}
            totalCount={4}
          />
        </SettingsProvider>
      </ServicesProvider>,
    );

    const rings = rendered.container.queryAll(
      instance => instance.props.stroke === colors.brandTeal && instance.props.strokeDasharray !== undefined,
    );
    expect(rings).toHaveLength(1);
    const ring = rings[0]!;
    expect(ring.props.cx).toBe(geometry.center.x);
    expect(ring.props.cy).toBe(geometry.center.y);
    expect(ring.props.transform).toBe(`rotate(-90 ${geometry.center.x} ${geometry.center.y})`);
    expect(Number(ring.props.strokeDashoffset)).toBeCloseTo(2 * Math.PI * Number(ring.props.r) * 0.75);
  });

  it('دنباله [A,B,C,D] را دقیق و بدون افت حرف می‌سازد و پس از برداشتن انگشت ثبت می‌کند', async () => {
    const harness = await renderWheel();

    fireGestureHandler<PanGesture>(pan(), [
      { ...centerOf('t0') },
      { ...centerOf('t1'), state: State.ACTIVE },
      { ...centerOf('t2') },
      { ...centerOf('t3'), state: State.END },
    ]);

    expect(lastSelection(harness)).toEqual(['t0', 't1', 't2', 't3']);
    expect(harness.onRelease).toHaveBeenCalledTimes(1);
    expect(harness.onRelease).toHaveBeenCalledWith(['t0', 't1', 't2', 't3']);
    expect(harness.onTilePress).not.toHaveBeenCalled();
  });

  it('دنباله [A,B,C,B] همان [A,B] می‌شود (برگشت به حرف یکی‌مانده‌قبل)', async () => {
    const harness = await renderWheel();

    fireGestureHandler<PanGesture>(pan(), [
      { ...centerOf('t0') },
      { ...centerOf('t1'), state: State.ACTIVE },
      { ...centerOf('t2') },
      { ...centerOf('t1') },
      { ...centerOf('t1'), state: State.END },
    ]);

    expect(lastSelection(harness)).toEqual(['t0', 't1']);
    expect(harness.onRelease).toHaveBeenCalledWith(['t0', 't1']);
  });

  it('کشیدن سریع روی همه حروف، هیچ حرفی را جا نمی‌گذارد', async () => {
    const harness = await renderWheel();

    fireGestureHandler<PanGesture>(pan(), [
      { ...centerOf('t0') },
      { ...centerOf('t1'), state: State.ACTIVE },
      { ...centerOf('t2') },
      { ...centerOf('t3') },
      { ...centerOf('t4') },
      { ...centerOf('t5') },
      { ...centerOf('t5'), state: State.END },
    ]);

    expect(lastSelection(harness)).toEqual(['t0', 't1', 't2', 't3', 't4', 't5']);
  });

  it('روی مرز بین دو حرف، انتخاب دست نمی‌خورد', async () => {
    const harness = await renderWheel();
    const middle = {
      x: Math.round((centerOf('t1').x + centerOf('t2').x) / 2),
      y: Math.round((centerOf('t1').y + centerOf('t2').y) / 2),
    };

    fireGestureHandler<PanGesture>(pan(), [
      { ...centerOf('t0') },
      { ...centerOf('t1'), state: State.ACTIVE },
      { ...middle },
      { ...middle },
      { ...centerOf('t1'), state: State.END },
    ]);

    // t2 هرگز اضافه نمی‌شود؛ نتیجه همان [t0, t1] است
    expect(lastSelection(harness)).toEqual(['t0', 't1']);
    expect(
      harness.onSelectionChange.mock.calls.every(
        ([selection]) => (selection as readonly string[]).every(id => id === 't0' || id === 't1'),
      ),
    ).toBe(true);
  });

  it('لغو حرکت (انگشت دوم یا قطع سیستم) انتخاب را به حالت قبل برمی‌گرداند و چیزی ثبت نمی‌شود', async () => {
    const harness = await renderWheel({ selection: ['t5'] });

    fireGestureHandler<PanGesture>(pan(), [
      { ...centerOf('t0') },
      { ...centerOf('t1'), state: State.ACTIVE },
      { ...centerOf('t2') },
      { ...centerOf('t2'), state: State.CANCELLED },
    ]);

    expect(harness.onRelease).not.toHaveBeenCalled();
    expect(lastSelection(harness)).toEqual(['t5']);
  });

  it('چرخ غیرفعال هیچ لمسی را نمی‌پذیرد', async () => {
    const harness = await renderWheel({ disabled: true, selection: ['t0'] });

    fireGestureHandler<PanGesture>(pan(), [
      { ...centerOf('t0') },
      { ...centerOf('t1'), state: State.ACTIVE },
      { ...centerOf('t1'), state: State.END },
    ]);

    expect(harness.onSelectionChange).not.toHaveBeenCalled();
    expect(harness.onRelease).not.toHaveBeenCalled();
  });

  it('رفتن برنامه به پس‌زمینه، کشیدن نیمه‌کاره را لغو می‌کند', async () => {
    const listeners: ((status: AppStateStatus) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (status: AppStateStatus) => void);
      return { remove: jest.fn() } as unknown as NativeEventSubscription;
    });

    try {
      const harness = await renderWheel({ selection: ['t5'] });
      const gesture = pan();

      fireGestureHandler<PanGesture>(gesture, [
        { ...centerOf('t0') },
        { ...centerOf('t1'), state: State.ACTIVE },
        { ...centerOf('t2') },
        { ...centerOf('t2'), state: State.END },
      ]);
      expect(lastSelection(harness)).toEqual(['t0', 't1', 't2']);

      // اکنون یک کشیدن نیمه‌کاره شروع می‌شود (بدون رویداد پایان) و برنامه به
      // پس‌زمینه می‌رود.
      emitState(gesture, State.BEGAN, State.UNDETERMINED, centerOf('t3'));
      emitState(gesture, State.ACTIVE, State.BEGAN, centerOf('t4'));
      expect(lastSelection(harness)).toEqual(['t3', 't4']);
      expect(listeners.length).toBeGreaterThan(0);

      for (const listener of listeners) {
        listener('background');
      }

      // انتخاب دقیقاً به وضعیت پیش از حرکت نیمه‌کاره برمی‌گردد و چیزی ثبت نمی‌شود
      expect(lastSelection(harness)).toEqual(['t0', 't1', 't2']);
      expect(harness.onRelease).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
