import { GAME_CONFIG } from '../../constants';
import type { UserProfile } from '../../types';

/**
 * قلب‌ها بر پایه زمان پر می‌شوند و وضعیت آن‌ها از روی timestamp ذخیره‌شده
 * محاسبه می‌شود؛ بنابراین نیازی به تایمر پس‌زمینه نیست و نتیجه پس از بستن و
 * باز کردن برنامه هم درست می‌ماند.
 */

export interface HeartState {
  hearts: number;
  maxHearts: number;
  /** زمان شروع تایمر قلب بعدی؛ اگر قلب‌ها پر باشند null است */
  lastRefillAt: number | null;
  nextRefillAt: number | null;
  msUntilNextHeart: number;
  isFull: boolean;
  /** چند قلب در این محاسبه اضافه شد */
  gained: number;
}

export interface HeartComputationInput {
  hearts: number;
  maxHearts: number;
  lastRefillAt: number | null;
  now: number;
  refillMinutes?: number;
}

export function computeHeartState({
  hearts,
  maxHearts,
  lastRefillAt,
  now,
  refillMinutes = GAME_CONFIG.economy.heartRefillMinutes,
}: HeartComputationInput): HeartState {
  const safeMax = Math.max(1, maxHearts);
  const safeHearts = Math.max(0, Math.min(hearts, safeMax));

  if (safeHearts >= safeMax) {
    return {
      hearts: safeMax,
      maxHearts: safeMax,
      lastRefillAt: null,
      nextRefillAt: null,
      msUntilNextHeart: 0,
      isFull: true,
      gained: 0,
    };
  }

  const refillMs = refillMinutes * 60 * 1000;
  // اگر ساعت دستگاه عقب رفته باشد، تایمر از «اکنون» شروع می‌شود تا پاداش اضافه
  // به بازیکن داده نشود.
  const base = lastRefillAt === null || lastRefillAt > now ? now : lastRefillAt;
  const elapsed = Math.max(0, now - base);
  const gained = Math.floor(elapsed / refillMs);
  const heartsAfter = Math.min(safeMax, safeHearts + gained);

  if (heartsAfter >= safeMax) {
    return {
      hearts: safeMax,
      maxHearts: safeMax,
      lastRefillAt: null,
      nextRefillAt: null,
      msUntilNextHeart: 0,
      isFull: true,
      gained,
    };
  }

  const nextRefillAt = base + (gained + 1) * refillMs;
  return {
    hearts: heartsAfter,
    maxHearts: safeMax,
    lastRefillAt: base + gained * refillMs,
    nextRefillAt,
    msUntilNextHeart: Math.max(0, nextRefillAt - now),
    isFull: false,
    gained,
  };
}

/** اعمال نتیجه محاسبه روی پروفایل */
export function applyHeartState(profile: UserProfile, state: HeartState): UserProfile {
  if (
    profile.hearts === state.hearts &&
    profile.lastHeartRefillAt === state.lastRefillAt &&
    profile.maxHearts === state.maxHearts
  ) {
    return profile;
  }
  return {
    ...profile,
    hearts: state.hearts,
    maxHearts: state.maxHearts,
    lastHeartRefillAt: state.lastRefillAt,
  };
}

export function isFreeAttemptLevel(levelId: number): boolean {
  return GAME_CONFIG.economy.freeAttemptLevelIds.includes(levelId);
}

export interface HeartSpendResult {
  ok: boolean;
  profile: UserProfile;
}

/** خرج‌کردن یک قلب برای شروع تلاش تازه. اگر قلب کافی نباشد تغییری نمی‌دهد. */
export function spendHeart(profile: UserProfile, levelId: number, now: number): HeartSpendResult {
  if (isFreeAttemptLevel(levelId)) {
    return { ok: true, profile };
  }

  const state = computeHeartState({
    hearts: profile.hearts,
    maxHearts: profile.maxHearts,
    lastRefillAt: profile.lastHeartRefillAt,
    now,
  });
  const current = applyHeartState(profile, state);
  const cost = GAME_CONFIG.economy.heartCostPerAttempt;

  if (current.hearts < cost) {
    return { ok: false, profile: current };
  }

  return {
    ok: true,
    profile: {
      ...current,
      hearts: current.hearts - cost,
      // با خرج‌شدن قلب، تایمر از همین لحظه شروع می‌شود
      lastHeartRefillAt: current.lastHeartRefillAt ?? now,
    },
  };
}

/** بازگرداندن قلب پس از تکمیل مرحله (سیاست دوستانه‌ی بازی) */
export function refundHeart(profile: UserProfile, levelId: number, now: number): UserProfile {
  if (!GAME_CONFIG.economy.refundHeartOnComplete || isFreeAttemptLevel(levelId)) {
    return profile;
  }
  return grantHearts(profile, GAME_CONFIG.economy.heartCostPerAttempt, now);
}

export function grantHearts(profile: UserProfile, amount: number, now: number): UserProfile {
  const state = computeHeartState({
    hearts: profile.hearts,
    maxHearts: profile.maxHearts,
    lastRefillAt: profile.lastHeartRefillAt,
    now,
  });
  const current = applyHeartState(profile, state);
  const hearts = Math.min(current.maxHearts, current.hearts + Math.max(0, amount));
  return {
    ...current,
    hearts,
    lastHeartRefillAt: hearts >= current.maxHearts ? null : current.lastHeartRefillAt,
  };
}

export function refillHearts(profile: UserProfile): UserProfile {
  return { ...profile, hearts: profile.maxHearts, lastHeartRefillAt: null };
}
