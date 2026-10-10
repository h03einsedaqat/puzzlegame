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
  const activationRequested = useSharedValue(false);
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

    const pan = Gesture.Pan()
      .enabled(enabled)
      .manualActivation(true)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .withTestId(WHEEL_PAN_TEST_ID)
      .onTouchesDown((event, manager) => {
        'worklet';
        if (!enabled) {
          manager.fail();
          return;
        }
        if (event.numberOfTouches > 1) {
          cancelledByMultiTouch.value = true;
          cancelInteraction();
          return;
        }

        const touch = event.changedTouches[0] ?? event.allTouches[0];
        if (!touch) {
          manager.fail();
          return;
        }
        const point = { x: touch.x, y: touch.y };
        const down = wheelGestureDown(geometry, interaction.value.selection, point);
        interaction.value = down.state;
        cancelledByMultiTouch.value = false;
        activationRequested.value = false;
        hidePath();
        // مسیر از همان نقطه نخست شروع می‌شود تا «دمِ» خط از گوشه صفحه نپرد.
        pointerX.value = point.x;
        pointerY.value = point.y;

        // A drag can begin only on a real tile. A blank part of the orbital
        // surface is left to the parent scroll system instead of capturing it.
        if (down.state.downTileId === null) {
          manager.fail();
        }
      })
      .onTouchesMove((event, manager) => {
        'worklet';
        if (event.numberOfTouches > 1) {
          cancelledByMultiTouch.value = true;
          cancelInteraction();
          // maxPointers(1) also rejects the recognizer; fail handles a second
          // finger that arrives before manual activation.
          if (interaction.value.phase !== 'dragging') {
            manager.fail();
          }
          return;
        }
        if (cancelledByMultiTouch.value || activationRequested.value) {
          return;
        }
        const current = interaction.value;
        if (current.phase !== 'holding' || !current.downPoint) {
          return;
        }
        const touch = event.allTouches[0];
        if (!touch) {
          return;
        }
        const dx = touch.x - current.downPoint.x;
        const dy = touch.y - current.downPoint.y;
        if (dx * dx + dy * dy >= WHEEL_DRAG_ACTIVATION_DISTANCE * WHEEL_DRAG_ACTIVATION_DISTANCE) {
          // یک‌بار درخواست فعال‌سازی کافی است؛ تکرار آن در هر نمونه لمس، یک
          // فراخوانی بومی بی‌اثر روی ترد رابط کاربری می‌گذارد.
          activationRequested.value = true;
          manager.activate();
        }
      })
      .onTouchesUp((event, manager) => {
        'worklet';
        if (event.numberOfTouches > 0 || cancelledByMultiTouch.value) {
          return;
        }
        const current = interaction.value;
        if (current.phase === 'holding' && !current.ownsSelection) {
          // Unified tap handling: previously this was delegated to RN Pressable,
          // which conflicted with RNGH on Android. Now tap is handled here.
          if (current.downTileId !== null) {
            const alreadySelected = current.selection.includes(current.downTileId);
            let nextSelection: readonly string[] = current.selection;
            if (!alreadySelected) {
              nextSelection = [...current.selection, current.downTileId];
            }
            // Only emit if actually changed — avoids unnecessary JS work.
            const changed = nextSelection !== current.selection;
            interaction.value = {
              ...createWheelInteractionState(),
              snapshot: nextSelection,
              selection: nextSelection,
            };
            if (changed) {
              runOnJS(onSelectionChange)(nextSelection);
            }
          } else {
            interaction.value = {
              ...createWheelInteractionState(),
              snapshot: current.selection,
              selection: current.selection,
            };
          }
          manager.fail();
        }
      })
      .onTouchesCancelled(() => {
        'worklet';
        if (interaction.value.phase !== 'idle') {
          cancelledByMultiTouch.value = true;
          cancelInteraction();
        }
      })
      .onBegin(event => {
        'worklet';
        // Some platforms/tests surface BEGAN before touch callbacks; seed the
        // same holding state without replacing a down point already captured.
        if (enabled && interaction.value.phase === 'idle') {
          interaction.value = wheelGestureDown(geometry, interaction.value.selection, { x: event.x, y: event.y }).state;
          pointerX.value = event.x;
          pointerY.value = event.y;
        }
      })
      .onStart(event => {
        'worklet';
        activationRequested.value = true;
        feedPointer({ x: event.x, y: event.y });
      })
      .onUpdate(event => {
        'worklet';
        feedPointer({ x: event.x, y: event.y });
      })
      .onEnd((event, success) => {
        'worklet';
        activationRequested.value = false;
        if (!success || cancelledByMultiTouch.value || !enabled) {
          return;
        }
        const previous = interaction.value;
        const ended = wheelGestureEnd(previous, geometry, { x: event.x, y: event.y });
        interaction.value = ended.state;
        // Publish the final unsampled tile before release; the explicit release
        // snapshot is still authoritative if a React render is one frame behind.
        if (ended.selection !== null) {
          runOnJS(onSelectionChange)(ended.selection);
        }
        if (ended.dragEnded && previous.ownsSelection && onDragStateChange) {
          runOnJS(onDragStateChange)(false);
        }
        // onEnd is the only submission edge. onFinalize never submits.
        if (ended.released !== null) {
          runOnJS(onRelease)(ended.released);
        }
        if (previous.ownsSelection) {
          fadePath();
        }
      })
      .onFinalize((_event, success) => {
        'worklet';
        activationRequested.value = false;
        if (!success && interaction.value.phase !== 'idle') {
          cancelInteraction();
        }
        cancelledByMultiTouch.value = false;
      });

    return pan;
  }, [
    activationRequested,
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
      activationRequested.value = false;
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
    activationRequested,
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
