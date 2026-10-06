import { ACHIEVEMENTS, type AchievementDefinition } from '../../data/achievements/achievements';
import type { AchievementState, GameProgress, UserProfile } from '../../types';

export interface AchievementStats {
  wordsFound: number;
  levelsCompleted: number;
  dailyStreak: number;
  bestCombo: number;
  bonusWordsFound: number;
  dailyCompleted: number;
}

export interface StreakInput {
  /** استریک مؤثر امروز؛ اگر روزی از دست رفته باشد صفر است */
  current: number;
  /** بهترین استریک ثبت‌شده */
  longest: number;
}

export function buildAchievementStats(
  profile: UserProfile,
  progress: GameProgress,
  streak: StreakInput,
  dailyCompletedCount = 0,
): AchievementStats {
  return {
    wordsFound: profile.totalWordsFound,
    levelsCompleted: progress.records.length,
    dailyStreak: Math.max(streak.current, streak.longest),
    bestCombo: profile.bestCombo,
    bonusWordsFound: profile.bonusWordsFound,
    dailyCompleted: dailyCompletedCount,
  };
}

export function achievementProgress(
  definition: AchievementDefinition,
  stats: AchievementStats,
): { current: number; target: number; ratio: number; unlocked: boolean } {
  const current = stats[definition.metric];
  const ratio = definition.target === 0 ? 1 : Math.min(1, current / definition.target);
  return {
    current,
    target: definition.target,
    ratio,
    unlocked: current >= definition.target,
  };
}

export interface AchievementEvaluation {
  state: AchievementState;
  unlocked: AchievementDefinition[];
  coinsEarned: number;
}

/** بررسی دستاوردهای تازه. فقط دستاوردهایی که تازه باز شده‌اند برگردانده می‌شوند. */
export function evaluateAchievements(
  state: AchievementState,
  stats: AchievementStats,
  now: number = Date.now(),
): AchievementEvaluation {
  const unlocked: AchievementDefinition[] = [];
  const unlockedIds = [...state.unlockedIds];
  const unlockedAt = { ...state.unlockedAt };

  for (const definition of ACHIEVEMENTS) {
    if (unlockedIds.includes(definition.id)) {
      continue;
    }
    if (achievementProgress(definition, stats).unlocked) {
      unlocked.push(definition);
      unlockedIds.push(definition.id);
      unlockedAt[definition.id] = now;
    }
  }

  if (unlocked.length === 0) {
    return { state, unlocked, coinsEarned: 0 };
  }

  return {
    state: {
      unlockedIds,
      unlockedAt,
      unseenIds: [...state.unseenIds, ...unlocked.map(definition => definition.id)],
    },
    unlocked,
    coinsEarned: unlocked.reduce((total, definition) => total + definition.coinReward, 0),
  };
}

export function markAchievementsSeen(state: AchievementState): AchievementState {
  if (state.unseenIds.length === 0) {
    return state;
  }
  return { ...state, unseenIds: [] };
}

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find(definition => definition.id === id);
}
