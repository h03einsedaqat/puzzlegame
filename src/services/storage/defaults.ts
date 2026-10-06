import { GAME_CONFIG } from '../../constants';
import type { AchievementState, AppSettings, DailyState, GameProgress, UserProfile } from '../../types';
import { dateKey } from '../../utils/date';
import { createLocalId } from '../../utils/id';

/** کارخانه‌های مقدار پیش‌فرض؛ همیشه شیء تازه می‌سازند تا وضعیت مشترک ایجاد نشود. */

export function createDefaultProfile(now: number = Date.now()): UserProfile {
  return {
    id: createLocalId(`${now}`),
    createdAt: now,
    score: 0,
    coins: GAME_CONFIG.economy.initialCoins,
    hearts: GAME_CONFIG.economy.initialHearts,
    maxHearts: GAME_CONFIG.economy.maxHearts,
    lastHeartRefillAt: null,
    totalWordsFound: 0,
    bonusWordsFound: 0,
    totalGamesPlayed: 0,
    totalGamesCompleted: 0,
    totalHintsUsed: 0,
    bestCombo: 0,
    membership: 'free',
    adsRemoved: false,
  };
}

export function createDefaultProgress(): GameProgress {
  return {
    currentLevel: 1,
    unlockedLevel: 1,
    records: [],
    lastPlayedLevelId: null,
  };
}

export function createDefaultSettings(): AppSettings {
  return {
    soundEnabled: true,
    vibrationEnabled: true,
    reducedMotion: false,
    notificationsEnabled: false,
    onboardingCompleted: false,
  };
}

export function createDefaultDaily(): DailyState {
  return {
    lastChallengeDate: null,
    completedChallengeDates: [],
    lastRewardClaimDate: null,
    rewardCycleDay: 1,
    streak: 0,
    longestStreak: 0,
    lastPlayedDate: dateKey(new Date()),
    totalRewardsClaimed: 0,
  };
}

export function createDefaultAchievements(): AchievementState {
  return {
    unlockedIds: [],
    unlockedAt: {},
    unseenIds: [],
  };
}
