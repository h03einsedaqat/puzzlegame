import { useEffect, useLayoutEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  runOnJS,
  runOnUI,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  adoptSelection,
  createWheelInteractionState,
  wheelGestureCancel,
  wheelGestureDown,
  wheelGestureEnd,
  wheelGestureMove,
  type WheelInteractionState,
} from '../services/game/wheelInteraction';
import { type WheelGeometry } from '../services/game/wheelGesture';
import type { WheelPoint } from '../services/game/wheelGesture';

/** Native activation distance and its pure-machine test contract. */
export const WHEEL_DRAG_ACTIVATION_DISTANCE = 8;
export const WHEEL_PAN_TEST_ID = 'letter-wheel-pan';
const PATH_FADE_MS = 155;
/**
 * کمترین جابه‌جایی انگشت (به پیکسل) که یک به‌روزرسانی مسیر را ارزش دارد.
 *
 * صفحه‌لمس‌های اندروید تا ۱۲۰–۲۴۰ نمونه در ثانیه می‌فرستند؛ نوشتن هر نمونه روی
 * مقدار اشتراکی یعنی یک به‌روزرسانی روی ترد رابط کاربری. زیر نیم پیکسل هیچ
 * تفاوت دیداری ندارد، پس نادیده گرفته می‌شود تا بار ترد UI نصف شود.
 */
const POINTER_WRITE_EPSILON_SQ = 0.25;

type SelectionCallback = (next: readonly string[]) => void;
type ReleaseCallback = (selection: readonly string[]) => void;
type DragStateCallback = (dragging: boolean) => void;

export interface UseWheelGesturesOptions {
  enabled: boolean;
  geometry: WheelGeometry;
  selection: readonly string[];
  onSelectionChange: SelectionCallback;
  onRelease: ReleaseCallback;
  onDragStateChange?: DragStateCallback;
}

export interface WheelGestures {
  gesture: PanGesture;
  /**
   * جای لحظه‌ای انگشت در دستگاه مختصات چرخ.
   *
   * لایه مسیر انتخاب، «دمِ» خط را از همین دو عدد و مرکز آخرین کاشی انتخاب‌شده
   * روی ترد رابط کاربری می‌سازد؛ پس هیچ رشته‌ای ساخته نمی‌شود و هیچ به‌روزرسانی
   * props بومی در هر فریم رخ نمی‌دهد.
   */
  pointerX: SharedValue<number>;
  pointerY: SharedValue<number>;
  pathOpacity: SharedValue<number>;
}

/**
 * UI-thread touch surface — unified Tap + Drag.
 *
 * Previously tap went through RN Pressable and drag through Pan, causing
 * Android responder conflicts and missed letters. Now a single Pan gesture
 * owns the whole interaction:
 *  - Down on a tile enters holding
 *  - Small lift = tap (add tile)
 *  - Move beyond threshold = drag (ownsSelection, swept segment)
 *  - Lift after drag = release (single submit)
 *
 * No pointer event calls React setState. Gesture state, previousPoint and the
 * swept segment hit test live in shared values/worklets. The JS bridge is
 * crossed only for a changed tile sequence, drag lifecycle and the single
 * release commit.
 *
 * هزینه هر فریم کشیدن عمداً به «دو نوشتن عدد» محدود شده است. پیش‌تر مسیر انتخاب
 * به شکل یک رشته SVG در هر فریم ساخته و با `useAnimatedProps` روی `Polyline`
 * نوشته می‌شد؛ Reanimated نمی‌تواند برای `Polyline` (که یک کامپوننت کلاسی و
 * واسطه است، نه یک نمای بومی) شناسه نمای Fabric بگیرد، پس در هر نمونه لمس یک
 * عملیات props بومی با shadow node نامعتبر صادر می‌شد و روی اندروید عملاً ترد
 * رابط کاربری را قفل می‌کرد (همان «هنگ‌کردن هنگام کشیدن حروف»).
 */
export function useWheelGestures(options: UseWheelGesturesOptions): WheelGestures {
  const interaction = useSharedValue<WheelInteractionState>(createWheelInteractionState());
  const pointerX = useSharedValue(0);
  const pointerY = useSharedValue(0);
  const pathOpacity = useSharedValue(0);
  const cancelledByMultiTouch = useSharedValue(false);
  const {
    enabled,
    geometry,
    selection,
    onSelectionChange,
    onRelease,
    onDragStateChange,
  } = options;

  // Tap/clear/slot removal are game state: reconcile them into the UI-thread
  // machine after commit, but never overwrite a live drag with a stale render.
  useLayoutEffect(() => {
    runOnUI((nextSelection: readonly string[]) => {
      'worklet';
      interaction.value = adoptSelection(interaction.value, nextSelection);
    })(selection);
  }, [interaction, selection]);

  const gesture = useMemo(() => {
    const fadePath = () => {
      'worklet';
      cancelAnimation(pathOpacity);
      pathOpacity.value = withTiming(0, { duration: PATH_FADE_MS });
    };

    /** روشن‌کردن مسیر بدون کار اضافی در حلقه داغ هر فریم. */
    const showPath = () => {
      'worklet';
      // خواندن مقدار در جریان انیمیشن، عدد میانی را برمی‌گرداند؛ پس این شرط
      // هم انیمیشن محوشدن را قطع می‌کند و هم در بقیه فریم‌ها هیچ نوشتنی ندارد.
      if (pathOpacity.value !== 1) {
        cancelAnimation(pathOpacity);
        pathOpacity.value = 1;
      }
    };

    const hidePath = () => {
      'worklet';
      cancelAnimation(pathOpacity);
      pathOpacity.value = 0;
    };

    /** نوشتن جای انگشت فقط وقتی که واقعاً جابه‌جا شده باشد. */
    const publishPointer = (point: WheelPoint) => {
      'worklet';
      const dx = point.x - pointerX.value;
      const dy = point.y - pointerY.value;
      if (dx * dx + dy * dy >= POINTER_WRITE_EPSILON_SQ) {
        pointerX.value = point.x;
        pointerY.value = point.y;
      }
    };

    const cancelInteraction = () => {
      'worklet';
      const previous = interaction.value;
      if (previous.phase === 'idle') {
        return;
      }
      const cancelled = wheelGestureCancel(previous);
      interaction.value = cancelled.state;
      if (cancelled.selection !== null) {
        runOnJS(onSelectionChange)(cancelled.selection);
      }
      if (previous.ownsSelection) {
        if (onDragStateChange) {
          runOnJS(onDragStateChange)(false);
        }
        fadePath();
      }
    };

    const feedPointer = (point: WheelPoint) => {
      'worklet';
      if (!enabled || cancelledByMultiTouch.value) {
        return;
      }
      const previous = interaction.value;
      const result = wheelGestureMove(previous, geometry, point);
      interaction.value = result.state;

      if (result.selection !== null) {
        runOnJS(onSelectionChange)(result.selection);
      }
      if (result.dragStarted && onDragStateChange) {
        runOnJS(onDragStateChange)(true);
      }

      if (result.state.ownsSelection) {
        showPath();
        publishPointer(point);
      }
    };

    /**
     * Manual activation makes both tap and drag depend on raw touch
     * callbacks and manager.activate. A failed/intercepted activation can
     * leave the selection in BEGAN without a release callback on Android.
     * Use the Pan's normal native lifecycle for *both* paths instead.
     * minDistance(0) acquires the wheel at touch-down; our own 8dp threshold
     * distinguishes tap from drag. The wheel is not inside a scroll view.
     */
    const start = (point: WheelPoint) => {
      'worklet';
      const down = wheelGestureDown(geometry, interaction.value.selection, point);
      interaction.value = down.state;
      hidePath();
      pointerX.value = point.x;
      pointerY.value = point.y;
    };

    const move = (point: WheelPoint) => {
      'worklet';
      if (!enabled || cancelledByMultiTouch.value) {
        return;
      }
      const current = interaction.value;
      if (current.phase === 'idle') {
        // Defensive fallback if a platform emits ACTIVE before BEGAN.
        start(point);
        return;
      }
      if (current.downTileId === null || !current.downPoint) {
        return;
      }
      if (!current.ownsSelection) {
        const dx = point.x - current.downPoint.x;
        const dy = point.y - current.downPoint.y;
        if (dx * dx + dy * dy < WHEEL_DRAG_ACTIVATION_DISTANCE ** 2) {
          return;
        }
      }
      feedPointer(point);
    };

    const pan = Gesture.Pan()
      .enabled(enabled)
      .minDistance(0)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .withTestId(WHEEL_PAN_TEST_ID)
      .onTouchesDown(event => {
        'worklet';
        if (event.numberOfTouches > 1) {
          cancelledByMultiTouch.value = true;
          cancelInteraction();
        }
      })
      .onBegin(event => {
        'worklet';
        cancelledByMultiTouch.value = false;
        start({ x: event.x, y: event.y });
      })
      .onStart(event => {
        'worklet';
        if (interaction.value.phase === 'idle') {
          start({ x: event.x, y: event.y });
        }
      })
      .onUpdate(event => {
        'worklet';
        move({ x: event.x, y: event.y });
      })
      .onEnd((event, success) => {
        'worklet';
        if (!success || cancelledByMultiTouch.value || !enabled) {
          return;
        }
        const point = { x: event.x, y: event.y };
        // A short fast swipe can end before an update sample is delivered.
        move(point);
        const previous = interaction.value;
        if (previous.phase === 'holding') {
          const tileId = previous.downTileId;
          if (tileId !== null && !previous.selection.includes(tileId)) {
            const nextSelection = [...previous.selection, tileId];
            interaction.value = {
              ...createWheelInteractionState(),
              snapshot: nextSelection,
              selection: nextSelection,
            };
            runOnJS(onSelectionChange)(nextSelection);
          } else {
            interaction.value = {
              ...createWheelInteractionState(),
              snapshot: previous.selection,
              selection: previous.selection,
            };
          }
          return;
        }
        const ended = wheelGestureEnd(previous, geometry, point);
        interaction.value = ended.state;
        if (ended.selection !== null) {
          runOnJS(onSelectionChange)(ended.selection);
        }
        if (ended.dragEnded && onDragStateChange) {
          runOnJS(onDragStateChange)(false);
        }
        if (ended.released !== null) {
          runOnJS(onRelease)(ended.released);
          fadePath();
        }
      })
      .onFinalize((_event, success) => {
        'worklet';
        if (!success && interaction.value.phase !== 'idle') {
          cancelInteraction();
        }
        cancelledByMultiTouch.value = false;
      });

    return pan;
  }, [
    cancelledByMultiTouch,
    enabled,
    geometry,
    interaction,
    onDragStateChange,
    onRelease,
    onSelectionChange,
    pathOpacity,
    pointerX,
    pointerY,
  ]);

  const cancelOnUI = useMemo(() => {
    const cancel = () => {
      'worklet';
      const previous = interaction.value;
      if (previous.phase === 'idle') {
        return;
      }
      const cancelled = wheelGestureCancel(previous);
      interaction.value = cancelled.state;
      if (cancelled.selection !== null) {
        runOnJS(onSelectionChange)(cancelled.selection);
      }
      if (previous.ownsSelection) {
        if (onDragStateChange) {
          runOnJS(onDragStateChange)(false);
        }
        cancelAnimation(pathOpacity);
        pathOpacity.value = withTiming(0, { duration: PATH_FADE_MS });
      }
      cancelledByMultiTouch.value = false;
    };
    return cancel;
  }, [
    cancelledByMultiTouch,
    interaction,
    onDragStateChange,
    onSelectionChange,
    pathOpacity,
  ]);

  useEffect(() => {
    if (!enabled) {
      runOnUI(cancelOnUI)();
    }
  }, [cancelOnUI, enabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        runOnUI(cancelOnUI)();
      }
    });
    return () => {
      subscription?.remove?.();
      // Route unmount is a terminal gesture boundary too; restore any draft.
      runOnUI(cancelOnUI)();
    };
  }, [cancelOnUI]);

  return { gesture, pointerX, pointerY, pathOpacity };
}
