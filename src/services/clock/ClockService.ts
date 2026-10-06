import { GAME_CONFIG, STORAGE_KEYS } from '../../constants';
import { evaluateClock, isLocked, type ClockCheck, type ClockRecord } from '../game/clockGuard';
import { loadData, saveData } from '../storage/storage';

/**
 * سرویس زمان.
 *
 * زمان آخرین مشاهده برنامه را نگه می‌دارد و اگر ساعت دستگاه عقب برود،
 * پاداش‌های زمان‌محور را موقتاً قفل می‌کند. این قفل فقط از سوءاستفاده ساده
 * (عقب‌بردن ساعت برای پر کردن سریع قلب‌ها یا دریافت دوباره جایزه روزانه)
 * جلوگیری می‌کند.
 */
export class ClockService {
  private record: ClockRecord | null = null;

  async load(): Promise<ClockRecord> {
    const result = await loadData<ClockRecord | null>(STORAGE_KEYS.clock, null, value => {
      if (typeof value !== 'object' || value === null) {
        return undefined;
      }
      return value as ClockRecord;
    });
    this.record = result.data;
    return this.record ?? { lastSeenAt: Date.now(), lockedUntil: null };
  }

  /** محاسبه وضعیت فعلی و ثبت زمان تازه */
  async check(now: number = Date.now()): Promise<ClockCheck> {
    const previous = this.record ?? { lastSeenAt: now, lockedUntil: null };
    const check = evaluateClock(previous, now);
    this.record = check.record;
    if (check.rollbackDetected || check.record.lastSeenAt !== previous.lastSeenAt) {
      await saveData(STORAGE_KEYS.clock, check.record);
    }
    return check;
  }

  isLocked(now: number = Date.now()): boolean {
    return isLocked(this.record, now);
  }

  get toleranceMs(): number {
    return GAME_CONFIG.clockGuard.rollbackToleranceMs;
  }
}
