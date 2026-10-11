/**
 * پروب تشخیصی موقت (زمان‌بندی اولین ثبت واژه).
 *
 * فقط زمان نشانه‌ها را ثبت می‌کند و در overlay کوچکی روی صفحه نشان می‌دهد.
 * قبل از ادغام نهایی باید PROBE_ENABLED را false کنید یا کل این پوشه و
 * نشانه‌گذاری‌های `mark`/`measure` را حذف کنید.
 */

/** ⚠️ موقت: قبل از ادغام نهایی به false تغییر دهید. */
export const PROBE_ENABLED = true;

export interface ProbeMark {
  label: string;
  /** زمان ثبت نشانه (ms، Date.now) */
  at: number;
  /** برای نشانه‌های اندازه‌گیری: مدت اجرا (ms) */
  durationMs?: number;
}

const MAX_MARKS = 60;
let marks: ProbeMark[] = [];
const listeners = new Set<() => void>();

export function mark(label: string, durationMs?: number): void {
  if (!PROBE_ENABLED) {
    return;
  }
  marks = [...marks, { label, at: Date.now(), durationMs }].slice(-MAX_MARKS);
  listeners.forEach(listener => listener());
}

/** اجرای یک تابع همگام و ثبت مدت آن */
export function measure<T>(label: string, fn: () => T): T {
  if (!PROBE_ENABLED) {
    return fn();
  }
  const started = Date.now();
  const result = fn();
  mark(label, Date.now() - started);
  return result;
}

export function getMarks(): readonly ProbeMark[] {
  return marks;
}

export function subscribeProbe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
