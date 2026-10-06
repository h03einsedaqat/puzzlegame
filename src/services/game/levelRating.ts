import { GAME_CONFIG } from '../../constants/gameConfig';

/** بیشترین ستاره‌ای که یک مرحله می‌تواند بگیرد */
export const MAX_STARS = 3;

export interface StarInput {
  /** تعداد کلمه‌های اصلی پیدا‌شده */
  targetFound: number;
  /** تعداد کل کلمه‌های اصلی مرحله */
  targetTotal: number;
  /** تعداد کلمه‌های امتیازی پیدا‌شده */
  bonusFound: number;
  /** تعداد کل کلمه‌های امتیازی مرحله */
  bonusTotal: number;
  /** تعداد راهنماهایی که در این مرحله خریده شده است */
  hintsUsed: number;
}

/**
 * ستاره‌های یک مرحله را حساب می‌کند.
 *
 * ستاره معیار «تمیز تمام‌کردن» مرحله است، نه فقط باز‌کردن آن:
 * - ۳ ستاره: همه کلمه‌های اصلی بدون هیچ راهنما و با کشف دست‌کم نیمی از کلمه‌های امتیازی
 * - ۲ ستاره: همه کلمه‌های اصلی با حداکثر یک راهنما
 * - ۱ ستاره: مرحله تمام شده ولی با راهنمای بیشتر یا کلمه‌های امتیازی کم
 * - ۰ ستاره: مرحله هنوز کامل نشده است
 */
export function computeStars(input: StarInput): number {
  const { targetFound, targetTotal, bonusFound, bonusTotal, hintsUsed } = input;

  if (targetTotal <= 0) {
    return MAX_STARS;
  }
  if (targetFound < targetTotal) {
    return 0;
  }

  const bonusRatio = bonusTotal > 0 ? bonusFound / bonusTotal : 1;
  const cleanBonusRatio = GAME_CONFIG.rating.cleanRunBonusRatio;

  if (hintsUsed === 0 && bonusRatio >= cleanBonusRatio) {
    return 3;
  }
  if (hintsUsed <= 1) {
    return 2;
  }
  return 1;
}

/** متن کوتاه برای نمایش کنار ستاره‌ها در دستاورد و آمار */
export function starLabel(stars: number): string {
  return `${Math.max(0, Math.min(MAX_STARS, Math.round(stars)))}/${MAX_STARS}`;
}

/** میانگین ستاره‌ها برای نمایش در آمار کلی */
export function averageStars(records: readonly { stars?: number }[]): number {
  if (records.length === 0) {
    return 0;
  }
  const total = records.reduce((sum, record) => sum + (record.stars ?? 0), 0);
  return Math.round((total / records.length) * 10) / 10;
}
