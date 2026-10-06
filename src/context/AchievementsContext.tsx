import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { ACHIEVEMENTS, type AchievementDefinition } from '../data/achievements/achievements';
import { usePersistentReducer, type HydrateAction } from '../hooks/usePersistentReducer';
import {
  achievementProgress,
  buildAchievementStats,
  evaluateAchievements,
  markAchievementsSeen,
  type AchievementStats,
} from '../services/game/achievementService';
import { achievementsRepository } from '../services/storage/repositories';
import type { AchievementState } from '../types';
import { useDaily } from './DailyContext';
import { useProfile } from './ProfileContext';
import { useProgress } from './ProgressContext';
import { useServices } from './ServicesContext';

export interface AchievementView {
  definition: AchievementDefinition;
  current: number;
  target: number;
  ratio: number;
  unlocked: boolean;
  isNew: boolean;
  unlockedAt: number | null;
}

type AchievementsAction =
  | HydrateAction<AchievementState>
  | { type: 'unlock'; state: AchievementState }
  | { type: 'markSeen' };

function achievementsReducer(state: AchievementState, action: AchievementsAction): AchievementState {
  switch (action.type) {
    case '__hydrate':
      return action.state;
    case 'unlock':
      return action.state;
    case 'markSeen':
      return markAchievementsSeen(state);
    default:
      return state;
  }
}

export interface AchievementsContextValue {
  achievements: AchievementView[];
  stats: AchievementStats;
  unlockedCount: number;
  totalCount: number;
  newCount: number;
  /** بررسی دستاوردها و بازگرداندن دستاوردهای تازه‌باز‌شده */
  sync: () => AchievementDefinition[];
  markSeen: () => void;
  reset: () => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

function AchievementsStateProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch, reset } = usePersistentReducer(achievementsRepository, achievementsReducer);
  const { profile, addCoins } = useProfile();
  const { progress: gameProgress } = useProgress();
  const daily = useDaily();
  const { analytics } = useServices();

  const stats = useMemo<AchievementStats>(
    () =>
      buildAchievementStats(
        profile,
        gameProgress,
        { current: daily.streak, longest: daily.longestStreak },
        daily.daily.completedChallengeDates.length,
      ),
    [profile, gameProgress, daily.streak, daily.longestStreak, daily.daily.completedChallengeDates.length],
  );

  const sync = useCallback((): AchievementDefinition[] => {
    const evaluation = evaluateAchievements(state, stats);
    if (evaluation.unlocked.length === 0) {
      return [];
    }
    dispatch({ type: 'unlock', state: evaluation.state });
    if (evaluation.coinsEarned > 0) {
      addCoins(evaluation.coinsEarned);
    }
    for (const definition of evaluation.unlocked) {
      analytics.track('achievement_unlocked', {
        id: definition.id,
        coins: definition.coinReward,
      });
    }
    return evaluation.unlocked;
  }, [addCoins, analytics, dispatch, state, stats]);

  const markSeen = useCallback(() => dispatch({ type: 'markSeen' }), [dispatch]);

  const achievements = useMemo<AchievementView[]>(
    () =>
      ACHIEVEMENTS.map(definition => {
        const progress = achievementProgress(definition, stats);
        return {
          definition,
          current: progress.current,
          target: progress.target,
          ratio: progress.ratio,
          unlocked: state.unlockedIds.includes(definition.id),
          isNew: state.unseenIds.includes(definition.id),
          unlockedAt: state.unlockedAt[definition.id] ?? null,
        };
      }),
    [stats, state.unlockedAt, state.unlockedIds, state.unseenIds],
  );

  const value = useMemo<AchievementsContextValue>(
    () => ({
      achievements,
      stats,
      unlockedCount: state.unlockedIds.length,
      totalCount: ACHIEVEMENTS.length,
      newCount: state.unseenIds.length,
      sync,
      markSeen,
      reset,
    }),
    [achievements, stats, state.unlockedIds.length, state.unseenIds.length, sync, markSeen, reset],
  );

  return <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>;
}

/**
 * دستاوردها به استریک روزانه وابسته‌اند و باید پایین‌تر از تأمین‌کننده چالش
 * روزانه در درخت برنامه قرار بگیرند.
 */
export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  return <AchievementsStateProvider>{children}</AchievementsStateProvider>;
}

export function useAchievements(): AchievementsContextValue {
  const value = useContext(AchievementsContext);
  if (!value) {
    throw new Error('useAchievements باید داخل AchievementsProvider استفاده شود.');
  }
  return value;
}
