import type { Difficulty, HintType } from '../types';

const MINUTE = 60 * 1000;

/**
 * تمام اعداد اقتصاد و تعادل بازی در همین فایل متمرکز است تا تنظیم بازی
 * نیازی به تغییر منطق نداشته باشد.
 */
export const GAME_CONFIG = {
  gameplay: {
    minWordLength: 3,
    maxSelectionLength: 9,
    /** کلمه‌ای که با راهنما آشکار شود، درصدی از امتیاز و هیچ سکه‌ای نمی‌دهد */
    revealedWordScoreRatio: 0.25,
  },

  economy: {
    initialCoins: 30,
    initialHearts: 5,
    maxHearts: 5,
    heartRefillMinutes: 30,
    /** هزینه شروع هر تلاش؛ مرحله‌های آموزشی رایگان‌اند */
    heartCostPerAttempt: 1,
    /** با تکمیل مرحله، قلب خرج‌شده برمی‌گردد تا تکرار دوباره تنبیه نشود */
    refundHeartOnComplete: true,
    freeAttemptLevelIds: [1],
    maxHeartsWithBonus: 5,
  },

  /** سکه هر کلمه بر پایه طول آن */
  wordCoinsByLength: {
    3: 2,
    4: 3,
    5: 5,
    6: 8,
    7: 12,
    8: 15,
    9: 20,
  } as Record<number, number>,

  /** امتیاز پایه هر کلمه بر پایه طول آن */
  wordScoreByLength: {
    3: 30,
    4: 45,
    5: 70,
    6: 100,
    7: 140,
    8: 190,
    9: 240,
  } as Record<number, number>,

  bonusWordScoreMultiplier: 1.35,
  combo: {
    /** از دو کلمه پشت‌سرهم، هر پله کمبو این مقدار امتیاز اضافه می‌کند */
    scoreBonusPerStep: 6,
    maxBonusSteps: 4,
  },

  difficultyMultiplier: {
    easy: 1,
    medium: 1.15,
    hard: 1.3,
    expert: 1.5,
  } as Record<Difficulty, number>,

  levelRewardByDifficulty: {
    easy: { score: 60, coins: 8 },
    medium: { score: 100, coins: 12 },
    hard: { score: 150, coins: 18 },
    expert: { score: 220, coins: 25 },
  } as Record<Difficulty, { score: number; coins: number }>,

  hints: {
    costs: {
      reveal_letter: 15,
      reveal_word: 35,
      smart_help: 25,
    } as Record<HintType, number>,
    /** در MVP فقط آشکارکردن حرف در دسترس کاربر است */
    enabledTypes: ['reveal_letter'] as HintType[],
  },

  daily: {
    /** چرخه جایزه روزانه؛ طول آرایه پاداش‌ها تعیین‌کننده تعداد روزهاست */
    rewards: [10, 15, 20, 30, 40, 50, 100],
    challengeScoreReward: 150,
    challengeCoinReward: 25,
    /** طول چرخه پازل‌های روزانه؛ پس از این تعداد، پازل‌ها دوره می‌شوند */
    puzzleCount: 60,
    /** اگر بازیکن یک روز را از دست بدهد، استریک به این مقدار برمی‌گردد */
    streakResetValue: 0,
    streakMilestones: [1, 3, 7, 14, 30],
  },

  progression: {
    /** تعداد مرحله‌های هر جهان در نقشه؛ فقط برای گروه‌بندی نمایشی است */
    levelsPerWorld: 10,
    /** پیش از باز شدن مرحله بعد، این نسبت از کلمات اصلی باید پیدا شود */
    requiredTargetRatio: 1,
  },

  ads: {
    /** در MVP تبلیغی نمایش داده نمی‌شود؛ فقط زیرساخت آماده است */
    enabled: false,
    rewardedHeartEnabled: false,
    interstitialEnabled: false,
    interstitialEveryNLevels: 4,
    doubleRewardEnabled: false,
  },

  purchase: {
    enabled: false,
    /** شناسه محصول‌ها در پیشخان بازار ساخته و اینجا نگه داشته می‌شوند */
    productIds: {
      coinsSmall: 'kalamesaz_coins_100',
      coinsMedium: 'kalamesaz_coins_500',
      coinsLarge: 'kalamesaz_coins_1500',
      removeAds: 'kalamesaz_remove_ads',
      premium: 'kalamesaz_premium',
    },
  },

  sound: {
    /** 'auto' در صورت وجود کتابخانه صدا فعال می‌شود، در غیر این صورت بی‌صدا */
    backend: 'auto' as 'auto' | 'none',
    defaultVolume: 0.6,
  },

  clockGuard: {
    /** اختلاف مجاز ساعت دستگاه نسبت به آخرین زمان ثبت‌شده */
    rollbackToleranceMs: 5 * MINUTE,
    /** مدت زمانی که پس از تشخیص دست‌کاری ساعت، پاداش‌ها متوقف می‌مانند */
    lockDurationMs: 6 * 60 * MINUTE,
  },

  analytics: {
    enabled: false,
    /** در حالت توسعه رویدادها در کنسول چاپ می‌شوند */
    logInDev: true,
  },

  storage: {
    /** نسخه طرح‌واره داده‌های ذخیره‌شده؛ با هر تغییر ناسازگار افزایش می‌یابد */
    schemaVersion: 1,
  },

  session: {
    /** پس از این مدت بی‌فعالیتی، نشست بازی به‌عنوان رهاشده ثبت می‌شود */
    idleAbandonMs: 30 * MINUTE,
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;

export const MAX_COMBO_BONUS =
  GAME_CONFIG.combo.scoreBonusPerStep * GAME_CONFIG.combo.maxBonusSteps;

/** سکه یک کلمه بر پایه طول آن؛ برای طول‌های خارج از جدول از آخرین مقدار استفاده می‌شود. */
export function coinsForWordLength(length: number): number {
  const table = GAME_CONFIG.wordCoinsByLength;
  if (table[length] !== undefined) {
    return table[length];
  }
  const lengths = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const maxLength = lengths[lengths.length - 1] ?? 3;
  return table[maxLength] ?? 2;
}

export function scoreForWordLength(length: number): number {
  const table = GAME_CONFIG.wordScoreByLength;
  if (table[length] !== undefined) {
    return table[length];
  }
  const lengths = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const maxLength = lengths[lengths.length - 1] ?? 3;
  return table[maxLength] ?? 30;
}

export function comboBonus(combo: number): number {
  const steps = Math.min(Math.max(combo - 1, 0), GAME_CONFIG.combo.maxBonusSteps);
  return steps * GAME_CONFIG.combo.scoreBonusPerStep;
}

export function hintCost(type: HintType): number {
  return GAME_CONFIG.hints.costs[type];
}

export function isHintEnabled(type: HintType): boolean {
  return GAME_CONFIG.hints.enabledTypes.includes(type);
}
