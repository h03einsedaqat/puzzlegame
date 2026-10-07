import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';

import {
  adoptSelection,
  createWheelInteractionState,
  wheelGestureCancel,
  wheelGestureDown,
  wheelGestureEnd,
  wheelGestureMove,
  type WheelInteractionResult,
  type WheelInteractionState,
} from '../services/game/wheelInteraction';
import type { WheelGeometry, WheelPoint } from '../services/game/wheelGesture';
import { devLog } from '../utils/devLog';

/**
 * آستانه فعال‌شدن کشیدن (پوینت).
 * کمتر از این مقدار، لمس ساده است و کار کاشی؛ بیشتر از آن، کشیدن شروع می‌شود.
 * همین آستانه در هر دو لایه (کارخانه Gesture Handler و ماشین حالت) یکی است تا
 * هیچ‌وقت یک حرکت به‌عنوان «کشیدن» در یک لایه و «لمس ساده» در لایه دیگر دیده نشود.
 */
export const WHEEL_DRAG_ACTIVATION_DISTANCE = 8;

/** شناسه آزمون برای دسترسی آزمون‌ها به همین ژست */
export const WHEEL_PAN_TEST_ID = 'letter-wheel-pan';

/** تغییر کمتر از این مقدار (پوینت) رندر تازه تولید نمی‌کند */
const POINTER_DEAD_ZONE = 0.5;

/** انباره نقطه انگشت برای لایه گرافیکی مسیر انتخاب */
export interface WheelPointerStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => WheelPoint | null;
}

export interface UseWheelGesturesOptions {
  enabled: boolean;
  geometry: WheelGeometry;
  /** انتخاب فعلی بازی؛ مبنای «عکس لحظه‌ای» پیش از حرکت و بازگشت پس از لغو */
  selection: readonly string[];
  /** دنباله انتخاب لایه لمس؛ تنها زمانی صدا زده می‌شود که واقعاً چیزی عوض شود */
  onSelectionChange: (next: readonly string[]) => void;
  /** پس از یک کشیدن واقعی: واژه باید ثبت شود */
  onRelease: (selection: readonly string[]) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export interface WheelGestures {
  /** ژست کشیدن؛ به یک `GestureDetector` پایدار داده می‌شود */
  gesture: PanGesture;
  /** نقطه انگشت برای کشیدن مسیر انتخاب (بدون رندر دوباره لایه کاشی‌ها) */
  pointer: WheelPointerStore;
}

/**
 * لایه انگشت چرخ حروف.
 *
 * مسئولیت‌ها فقط سه چیز است: دریافت لمس از Gesture Handler، عبور دادنش از
 * ماشین حالت خالص و رساندن «دنباله انتخاب» به وضعیت بازی. هیچ قاعده بازی
 * اینجا نیست و هیچ‌جای دیگری هم لمس هندل نمی‌شود؛ بنابراین رقابت responder بین
 * PanResponder و Pressable کاشی‌ها از بین می‌رود.
 *
 * دو نکته معماری که اینجا رعایت می‌شود:
 *   ۱) ژست فقط یک‌بار ساخته می‌شود و همه داده‌های متغیر از `ref` خوانده می‌شوند؛
 *      پس رندرهای پیاپی صفحه، ژست را دوباره نصب نمی‌کند.
 *   ۲) نقطه انگشت در یک انباره بیرونی نگه داشته می‌شود و با حداکثر یک بار در هر
 *      فریم منتشر می‌شود؛ بنابراین حرکت انگشت، کاشی‌ها را دوباره رندر نمی‌کند.
 */
export function useWheelGestures(options: UseWheelGesturesOptions): WheelGestures {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stateRef = useRef<WheelInteractionState>(createWheelInteractionState());
  // اگر انتخاب از بیرون عوض شود (مثلاً برداشتن حرف از جای خالی واژه)، لایه همان
  // را می‌پذیرد؛ ولی در میانه کشیدن هرگز، تا رندر دیررس حرفی را پاک نکند.
  stateRef.current = adoptSelection(stateRef.current, options.selection);

  const pointerRef = useRef<WheelPoint | null>(null);
  const pendingPointerRef = useRef<WheelPoint | null>(null);
  const frameRef = useRef<number | null>(null);
  const listenersRef = useRef(new Set<() => void>());

  const pointer = useMemo<WheelPointerStore>(
    () => ({
      subscribe: listener => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
      getSnapshot: () => pointerRef.current,
    }),
    [],
  );

  const publishPointer = useCallback(() => {
    const next = pendingPointerRef.current;
    const current = pointerRef.current;
    if (next === current) {
      return;
    }
    if (
      next !== null &&
      current !== null &&
      Math.abs(next.x - current.x) < POINTER_DEAD_ZONE &&
      Math.abs(next.y - current.y) < POINTER_DEAD_ZONE
    ) {
      return;
    }
    pointerRef.current = next;
    for (const listener of listenersRef.current) {
      listener();
    }
  }, []);

  const setPointer = useCallback(
    (point: WheelPoint | null, immediate = false) => {
      pendingPointerRef.current = point;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (immediate) {
        publishPointer();
        return;
      }
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        publishPointer();
      });
    },
    [publishPointer],
  );

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    },
    [],
  );

  /** رساندن نتیجه ماشین حالت به بیرون (وضعیت بازی + سیگنال‌ها) */
  const apply = useCallback(
    (result: WheelInteractionResult, wasOwning: boolean) => {
      stateRef.current = result.state;
      const current = optionsRef.current;
      if (result.selection) {
        current.onSelectionChange(result.selection);
      }
      if (result.dragStarted) {
        current.onDragStateChange?.(true);
      }
      if ((result.dragEnded || result.aborted) && wasOwning) {
        current.onDragStateChange?.(false);
      }
      if (result.released) {
        devLog('wheel:release', {
          tiles: result.released.length,
          word: result.released.join(','),
        });
        current.onRelease(result.released);
      }
    },
    [],
  );

  /** رساندن یک نقطه انگشت به ماشین حالت (رویداد شروع و حرکت هر دو از همین راه) */
  const feed = useCallback(
    (point: WheelPoint) => {
      const wasOwning = stateRef.current.ownsSelection;
      apply(wheelGestureMove(stateRef.current, optionsRef.current.geometry, point), wasOwning);
      setPointer(point);
    },
    [apply, setPointer],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(WHEEL_DRAG_ACTIVATION_DISTANCE)
        // فقط یک انگشت: ورود انگشت دوم ژست را قطعی شکست می‌دهد و انتخاب لغو
        // می‌شود؛ پس هیچ‌وقت دو انتخاب هم‌زمان شکل نمی‌گیرد.
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .withTestId(WHEEL_PAN_TEST_ID)
        .onBegin(event => {
          if (!optionsRef.current.enabled) {
            return;
          }
          const point = { x: event.x, y: event.y };
          // «عکس لحظه‌ای» از خود ماشین حالت گرفته می‌شود، نه از prop؛ اگر رندر
          // تازه هنوز نرسیده باشد، prop می‌تواند یک قدم عقب‌تر از حقیقت باشد و
          // بازگشت پس از لغو، انتخاب قدیمی را برمی‌گرداند.
          apply(
            wheelGestureDown(optionsRef.current.geometry, stateRef.current.selection, point),
            false,
          );
          setPointer(point, true);
          devLog('wheel:down', { x: Math.round(point.x), y: Math.round(point.y) });
        })
        // نقطه‌ای که ژست در آن فعال شد هم پردازش می‌شود؛ وگرنه اگر انگشت در
        // همان لحظه روی حرف بعدی باشد، آن حرف تا حرکت بعدی جا می‌ماند.
        .onStart(event => {
          if (!optionsRef.current.enabled) {
            return;
          }
          feed({ x: event.x, y: event.y });
        })
        .onUpdate(event => {
          if (!optionsRef.current.enabled) {
            return;
          }
          feed({ x: event.x, y: event.y });
        })
        .onFinalize((event, success) => {
          if (!optionsRef.current.enabled) {
            return;
          }
          const wasOwning = stateRef.current.ownsSelection;
          const point = { x: event.x, y: event.y };
          if (success) {
            apply(wheelGestureEnd(stateRef.current, optionsRef.current.geometry, point), wasOwning);
          } else {
            apply(wheelGestureCancel(stateRef.current), wasOwning);
          }
          setPointer(null, true);
          devLog('wheel:finalize', { success, dragging: wasOwning });
        }),
    [apply, feed, setPointer],
  );

  /**
   * اگر چرخ وسط کار غیرفعال شود (تمام‌شدن مرحله، بسته‌شدن نشست)، کشیدن نیمه‌کاره
   * بسته می‌شود تا انتخاب معلق نماند.
   */
  useEffect(() => {
    if (options.enabled) {
      return;
    }
    const state = stateRef.current;
    if (state.phase === 'idle') {
      return;
    }
    apply(wheelGestureCancel(state), state.ownsSelection);
    setPointer(null, true);
  }, [apply, options.enabled, setPointer]);

  /**
   * رفتن برنامه به پس‌زمینه: انگشت دیگر وجود ندارد، پس هر کشیدن نیمه‌کاره پاک
   * می‌شود و انتخاب به حالت پیش از حرکت برمی‌گردد.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        return;
      }
      const state = stateRef.current;
      if (state.phase === 'idle') {
        return;
      }
      apply(wheelGestureCancel(state), state.ownsSelection);
      setPointer(null, true);
    });
    return () => subscription.remove();
  }, [apply, setPointer]);

  return { gesture, pointer };
}
