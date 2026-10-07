import {
  applyWheelTouch,
  getTileAtPoint,
  resolveWheelTouch,
  type WheelGeometry,
  type WheelPoint,
} from './wheelGesture';

/**
 * ماشین حالت کشیدن حروف.
 *
 * تمام مسئولیت این لایه «لمس، کشیدن، ضربه‌سنجی و ترتیب انتخاب» است؛ هیچ قاعده
 * بازی (اعتبار واژه، امتیاز، تکمیل مرحله) اینجا نیست. خالص و بدون React است تا
 * بتوان رفتار لمس را با آزمون‌های قطعی سنجید — همان چیزی که در نسخه قبلی (که
 * منطق لمس بین PanResponder و Pressable و state پخش شده بود) ممکن نبود.
 *
 * تصمیم‌های رفتاری که همین‌جا و یک‌جا قطعی شده‌اند:
 *   ۱) `down` هیچ‌وقت انتخاب را عوض نمی‌کند. فقط کاشی زیر انگشت و «عکس لحظه‌ای
 *      انتخاب» ثبت می‌شود؛ بنابراین لمس کوتاه (Tap) هیچ‌وقت با کشیدن قاطی نمی‌شود.
 *   ۲) با نخستین حرکت، لایه مالکیت انتخاب را می‌گیرد:
 *        • انگشت روی کاشی‌ای که از قبل در انتخاب است → همان زنجیره ادامه می‌یابد.
 *        • انگشت روی کاشی تازه → انتخاب قبلی کنار می‌رود و واژه از همان حرف
 *          شروع می‌شود (استاندارد چرخ کلمه: کشیدن روی حرف تازه = واژه تازه).
 *   ۳) هر تغییر فقط زمانی رخ می‌دهد که کاشی «فعال» عوض شود؛ پس کشیدن داخل یک
 *      کاشی هیچ به‌روزرسانی تکراری تولید نمی‌کند.
 *   ۴) برداشتن انگشت پس از کشیدن → `released` (صفحه بازی واژه را ثبت می‌کند).
 *      لغو/شکست (انگشت دوم، رفتن برنامه به پس‌زمینه، دیالوگ) → `aborted` و
 *      بازگشت انتخاب به «عکس لحظه‌ای» پیش از حرکت.
 */

export type WheelInteractionPhase = 'idle' | 'holding' | 'dragging';

export interface WheelInteractionState {
  phase: WheelInteractionPhase;
  /** کاشی‌ای که انگشت رویش گذاشته شده (اگر انگشت روی حاشیه باشد `null`) */
  downTileId: string | null;
  /** انتخاب پیش از حرکت؛ اگر حرکت لغو شود همین برمی‌گردد */
  snapshot: readonly string[];
  /** دنباله انتخاب؛ در طول کشیدن تنها منبع حقیقت است */
  selection: readonly string[];
  /** کاشی زیر انگشت؛ تا وقتی انگشت وارد حرف دیگری نشود همان می‌ماند */
  activeTileId: string | null;
  /** آیا لایه انتخاب را در اختیار گرفته؟ (حرکت از آستانه گذشته است) */
  ownsSelection: boolean;
}

export interface WheelInteractionResult {
  state: WheelInteractionState;
  /**
   * انتخاب تازه‌ای که باید در وضعیت بازی نوشته شود؛ `null` یعنی «تغییری لازم نیست».
   */
  selection: readonly string[] | null;
  /** کشیدن واقعی شروع شد (صفحه بازی ثبت خودکار را معلق می‌کند) */
  dragStarted: boolean;
  /** کشیدن تمام شد (انگشت برداشته شد یا حرکت لغو شد) */
  dragEnded: boolean;
  /** انگشت پس از یک کشیدن واقعی برداشته شد؛ این دنباله باید ثبت شود */
  released: readonly string[] | null;
  /** حرکت لغو شد و انتخاب به عکس لحظه‌ای برگشت */
  aborted: boolean;
}

export function createWheelInteractionState(): WheelInteractionState {
  return {
    phase: 'idle',
    downTileId: null,
    snapshot: [],
    selection: [],
    activeTileId: null,
    ownsSelection: false,
  };
}

const noChange: Omit<WheelInteractionResult, 'state'> = {
  selection: null,
  dragStarted: false,
  dragEnded: false,
  released: null,
  aborted: false,
};

/**
 * انگشت روی چرخ نشسته. انتخاب عوض نمی‌شود؛ فقط مبدأ حرکت ثبت می‌شود.
 */
export function wheelGestureDown(
  geometry: WheelGeometry,
  selection: readonly string[],
  point: WheelPoint,
): WheelInteractionResult {
  const tileId = getTileAtPoint(geometry, point);
  return {
    state: {
      phase: 'holding',
      downTileId: tileId,
      snapshot: selection,
      selection,
      activeTileId: tileId,
      ownsSelection: false,
    },
    ...noChange,
  };
}

/**
 * حرکت انگشت. نخستین حرکتِ پس از فعال‌شدن کشیدن، مالکیت انتخاب را می‌گیرد و بعد
 * کاشی زیر انگشت را (با قاعده بازگشت به حرف قبلی) اعمال می‌کند.
 */
export function wheelGestureMove(
  state: WheelInteractionState,
  geometry: WheelGeometry,
  point: WheelPoint,
): WheelInteractionResult {
  // اگر به هر دلیلی رویداد `down` نرسیده باشد، همان‌جا ساخته می‌شود تا حرفی جا نیفتد.
  const base = state.phase === 'idle' ? wheelGestureDown(geometry, state.snapshot, point).state : state;

  let selection = base.selection;
  let ownsSelection = base.ownsSelection;
  let changed = false;

  if (!ownsSelection) {
    ownsSelection = true;
    const downTileId = base.downTileId;
    if (downTileId !== null && !selection.includes(downTileId)) {
      // واژه تازه از همان حرفی که انگشت رویش بوده شروع می‌شود.
      selection = [downTileId];
      changed = true;
    }
  }

  const tileId = getTileAtPoint(geometry, point);
  let activeTileId = base.activeTileId;

  if (tileId !== base.activeTileId) {
    activeTileId = tileId;
    const action = resolveWheelTouch(selection, tileId);
    const next = applyWheelTouch(selection, action);
    if (next !== selection) {
      selection = next;
      changed = true;
    }
  }

  const dragStarted = !base.ownsSelection && ownsSelection;
  return {
    state: { ...base, phase: 'dragging', selection, activeTileId, ownsSelection },
    selection: changed ? selection : null,
    dragStarted,
    dragEnded: false,
    released: null,
    aborted: false,
  };
}

/**
 * برداشتن انگشت.
 *
 * اگر حرکت به آستانه نرسیده باشد (لمس ساده) هیچ‌چیز ثبت نمی‌شود: افزودن حرف در
 * لمس ساده کار دکمه کاشی است و ثبت واژه هم به عهده ثبت خودکار/دکمه ثبت می‌ماند.
 * اگر کشیدن واقعی بوده، انتخاب فعلی برای ثبت برگردانده می‌شود.
 */
export function wheelGestureEnd(
  state: WheelInteractionState,
  geometry: WheelGeometry,
  point: WheelPoint,
): WheelInteractionResult {
  if (state.phase === 'idle') {
    return { state, ...noChange };
  }

  // آخرین نمونه انگشت هم پردازش می‌شود تا انتهای مسیر جا نیفتد.
  const moved = state.ownsSelection ? wheelGestureMove(state, geometry, point) : null;
  const current = moved ? moved.state : state;
  const selection = moved?.selection ?? null;
  const dragging = current.ownsSelection;

  return {
    // پس از پایان کشیدن، «انتخاب جاری» همان دنباله نهایی است؛ ماشین حالت باید
    // همین را نگه دارد تا کشیدن بعدی (و بازگشت پس از لغو) از حقیقت شروع شود.
    state: {
      ...createWheelInteractionState(),
      snapshot: current.selection,
      selection: current.selection,
    },
    selection,
    dragStarted: moved?.dragStarted ?? false,
    dragEnded: dragging,
    released: dragging ? current.selection : null,
    aborted: false,
  };
}

/**
 * لغو یا شکست حرکت (انگشت دوم، پس‌زمینه‌شدن برنامه، بسته‌شدن صفحه).
 * اگر لایه انتخاب را در اختیار گرفته بود، دقیقاً به حالت پیش از حرکت برمی‌گردد
 * تا هیچ «نیمه‌انتخاب»ی روی صفحه نماند.
 */
export function wheelGestureCancel(state: WheelInteractionState): WheelInteractionResult {
  if (state.phase === 'idle') {
    return { state, ...noChange };
  }
  const restore = state.ownsSelection ? state.snapshot : null;
  const settled = restore ?? state.selection;
  return {
    state: {
      ...createWheelInteractionState(),
      snapshot: state.ownsSelection ? state.snapshot : settled,
      selection: settled,
    },
    selection: restore,
    dragStarted: false,
    dragEnded: state.ownsSelection,
    released: null,
    aborted: true,
  };
}

/**
 * همگام‌سازی انتخاب لایه با وضعیت بازی.
 *
 * وقتی کشیدن در جریان نیست (مثلاً بازیکن حرفی را از جای خالی واژه برداشته)،
 * لایه باید همان انتخاب را بپذیرد. در میانه کشیدن این کار انجام نمی‌شود تا یک
 * رندر دیررس، حرف‌های تازه انتخاب‌شده را پاک نکند.
 */
export function adoptSelection(
  state: WheelInteractionState,
  selection: readonly string[],
): WheelInteractionState {
  if (state.phase !== 'idle') {
    return state;
  }
  if (sameSelection(state.selection, selection) && sameSelection(state.snapshot, selection)) {
    return state;
  }
  return { ...state, snapshot: selection, selection };
}

/** مقایسه محتوایی دو انتخاب (نه مقایسه ارجاعی؛ رندرهای تازه آرایه نو می‌سازند) */
function sameSelection(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((tileId, index) => tileId === b[index]);
}


