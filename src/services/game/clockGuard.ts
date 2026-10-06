import { GAME_CONFIG } from '../../constants';

/**
 * محافظت ساده در برابر عقب‌بردن ساعت دستگاه.
 *
 * زمان آخرین مشاهده برنامه ذخیره می‌شود؛ اگر ساعت دستگاه پیش از آن تاریخ
 * باشد (بیش از حد تحمل)، ساعت دست‌کاری‌شده در نظر گرفته می‌شود و پاداش‌های
 * زمان‌محور (قلب و جایزه روزانه) برای مدتی محدود متوقف می‌شوند. هدف، جلوگیری
 * از تقلب ساده است، نه ساخت سیستم ضد‌تقلب پیچیده.
 */

export interface ClockRecord {
  lastSeenAt: number;
  lockedUntil: number | null;
}

export interface ClockCheck {
  record: ClockRecord;
  rollbackDetected: boolean;
  locked: boolean;
}

export function evaluateClock(
  previous: ClockRecord | null,
  now: number,
  toleranceMs: number = GAME_CONFIG.clockGuard.rollbackToleranceMs,
  lockDurationMs: number = GAME_CONFIG.clockGuard.lockDurationMs,
): ClockCheck {
  const lastSeenAt = previous?.lastSeenAt ?? now;
  const previousLock = previous?.lockedUntil ?? null;
  const rollbackDetected = now < lastSeenAt - toleranceMs;

  const lockedUntil = rollbackDetected
    ? Math.max(now + lockDurationMs, previousLock ?? 0)
    : previousLock;

  return {
    record: { lastSeenAt: Math.max(lastSeenAt, now), lockedUntil: lockedUntil ?? null },
    rollbackDetected,
    locked: lockedUntil !== null && lockedUntil > now,
  };
}

export function isLocked(record: ClockRecord | null, now: number): boolean {
  if (!record?.lockedUntil) {
    return false;
  }
  return record.lockedUntil > now;
}
