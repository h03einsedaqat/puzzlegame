/**
 * پروب تشخیصی لمس (موقت).
 *
 * هدف: اندازه‌گیری دقیق اینکه تأخیر «حرف زیر انگشت ولی انتخاب‌نشده» از کجاست:
 *  - وقفه‌های ترد JS (با تایمری که هر ۱۰۰ms اجرا می‌شود و فاصلهٔ واقعی را می‌سنجد)،
 *  - تأخیر صف از ترد UI تا ترد JS (زمان ثبت در UI تا رسیدن به JS)،
 *  - تأخیر رندر (از رسیدن به JS تا commit شدن انتخاب در React).
 *
 * این ماژول فقط وقتی فعال است که TOUCH_PROBE_ENABLED = true باشد و قبل از
 * انتشار باید خاموش (یا حذف) شود.
 */

/** ⚠️ موقت: قبل از انتشار به false تغییر دهید (یا کل این پوشه را حذف کنید). */
export const TOUCH_PROBE_ENABLED = true;

const TICK_MS = 100;
const STALL_THRESHOLD_MS = 250;

export interface OpStat {
  name: string;
  count: number;
  maxMs: number;
  slowCount: number;
}

export interface TouchProbeSnapshot {
  ops: OpStat[];
  mountAt: number | null;
  selectionEvents: number;
  firstSelectionAtMs: number | null;
  queueDelayMs: number | null;
  maxQueueDelayMs: number;
  commitDelayMs: number | null;
  maxCommitDelayMs: number;
  stallCount: number;
  maxStallMs: number;
  firstStallAtMs: number | null;
  lastStallAtMs: number | null;
}

function initialState(mountAt: number | null): TouchProbeSnapshot {
  return {
    ops: [],
    mountAt,
    selectionEvents: 0,
    firstSelectionAtMs: null,
    queueDelayMs: null,
    maxQueueDelayMs: 0,
    commitDelayMs: null,
    maxCommitDelayMs: 0,
    stallCount: 0,
    maxStallMs: 0,
    firstStallAtMs: null,
    lastStallAtMs: null,
  };
}

let state: TouchProbeSnapshot = initialState(null);
let pendingReceiveAt: number | null = null;
let monitor: ReturnType<typeof setInterval> | null = null;
let lastTick = 0;

/** شروع یک نشست تازه؛ هنگام mount صفحهٔ بازی صدا زده می‌شود. */
export function startTouchProbe(): void {
  if (!TOUCH_PROBE_ENABLED) {
    return;
  }
  stopTouchProbe();
  const now = Date.now();
  state = initialState(now);
  pendingReceiveAt = null;
  lastTick = now;
  monitor = setInterval(() => {
    const current = Date.now();
    const gap = current - lastTick;
    lastTick = current;
    if (gap > TICK_MS + STALL_THRESHOLD_MS) {
      const stall = gap - TICK_MS;
      const atMs = current - (state.mountAt ?? current);
      state.stallCount += 1;
      state.maxStallMs = Math.max(state.maxStallMs, stall);
      state.lastStallAtMs = atMs;
      if (state.firstStallAtMs === null) {
        state.firstStallAtMs = atMs;
      }
    }
  }, TICK_MS);
}

export function stopTouchProbe(): void {
  if (monitor !== null) {
    clearInterval(monitor);
    monitor = null;
  }
}

export function getTouchProbeSnapshot(): TouchProbeSnapshot {
  return { ...state, ops: state.ops.map(op => ({ ...op })) };
}

const SLOW_OP_MS = 50;

/**
 * اجرای یک عملیات همگام و ثبت مدت آن.
 * اگر یک عملیات JS خودش وقفه بسازد، اینجا با نام آن دیده می‌شود.
 */
export function timeOp<T>(name: string, fn: () => T): T {
  if (!TOUCH_PROBE_ENABLED) {
    return fn();
  }
  const start = Date.now();
  try {
    return fn();
  } finally {
    const elapsed = Date.now() - start;
    let stat = state.ops.find(op => op.name === name);
    if (!stat) {
      stat = { name, count: 0, maxMs: 0, slowCount: 0 };
      state.ops.push(stat);
    }
    stat.count += 1;
    stat.maxMs = Math.max(stat.maxMs, elapsed);
    if (elapsed >= SLOW_OP_MS) {
      stat.slowCount += 1;
    }
  }
}

/**
 * از ترد UI صدا زده می‌شود (با runOnJS) و زمان ثبت انتخاب در UI را می‌گیرد.
 * اینجا همان لحظهٔ رسیدن به JS است.
 */
export function recordUiSelection(uiAt: number): void {
  if (!TOUCH_PROBE_ENABLED) {
    return;
  }
  const now = Date.now();
  state.selectionEvents += 1;
  if (state.firstSelectionAtMs === null && state.mountAt !== null) {
    state.firstSelectionAtMs = now - state.mountAt;
  }
  const queueDelay = Math.max(0, now - uiAt);
  state.queueDelayMs = queueDelay;
  state.maxQueueDelayMs = Math.max(state.maxQueueDelayMs, queueDelay);
  pendingReceiveAt = now;
}

/** وقتی انتخاب جدید در React رندر/commit شد صدا زده می‌شود. */
export function recordSelectionCommit(): void {
  if (!TOUCH_PROBE_ENABLED || pendingReceiveAt === null) {
    return;
  }
  const delay = Math.max(0, Date.now() - pendingReceiveAt);
  state.commitDelayMs = delay;
  state.maxCommitDelayMs = Math.max(state.maxCommitDelayMs, delay);
  pendingReceiveAt = null;
}
