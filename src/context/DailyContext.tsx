import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { GAME_CONFIG } from '../constants';
import { usePersistentReducer, type HydrateAction } from '../hooks/usePersistentReducer';
import {
  canClaimDailyReward,
  canPlayDailyChallenge,
  claimDailyReward as claimDailyRewardPure,
  effectiveStreak,
  getDailyReward,
  getDailyPuzzleForDate,
  markDailyChallengeCompleted,
  type DailyReward,
} from '../services/game/dailySeed';
import { dailyRepository } from '../services/storage/repositories';
import type { DailyState, Level } from '../types';
import { dateKey } from '../utils/date';
import { useProfile } from './ProfileContext';
import { useServices } from './ServicesContext';

type DailyAction =
  | HydrateAction<DailyState>
  | { type: 'completeChallenge'; today: string }
  | { type: 'claimReward'; daily: DailyState };

function dailyReducer(state: DailyState, action: DailyAction): DailyState {
  switch (action.type) {
    case '__hydrate':
      return action.state;
    case 'completeChallenge':
      return markDailyChallengeCompleted(state, action.today);
    case 'claimReward':
      return action.daily;
    default:
      return state;
  }
}

export interface DailyContextValue {
  daily: DailyState;
  ready: boolean;
  today: string;
  puzzle: Level;
  streak: number;
  longestStreak: number;
  streakMilestones: readonly number[];
  reward: DailyReward;
  canPlay: boolean;
  canClaim: boolean;
  isCompletedToday: boolean;
  /** پاداش‌های زمان‌محور هنگام دست‌کاری ساعت دستگاه قفل می‌شوند */
  rewardsLocked: boolean;
  completeChallenge: () => void;
  claimReward: () => DailyReward | null;
}

const DailyContext = createContext<DailyContextValue | null>(null);

export function DailyProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch, ready } = usePersistentReducer(dailyRepository, dailyReducer);
  const { addCoins } = useProfile();
  const { analytics, clock } = useServices();

  const now = Date.now();
  const today = dateKey();
  const puzzle = useMemo(() => getDailyPuzzleForDate(today), [today]);
  const streak = effectiveStreak(state, today);
  const reward = getDailyReward(state, today);
  const rewardsLocked = clock.isLocked(now);
  const canClaim = canClaimDailyReward(state, today) && !rewardsLocked;

  const completeChallenge = useCallback(() => {
    if (!canPlayDailyChallenge(state, today)) {
      analytics.track('daily_locked', { date: today });
      return;
    }
    dispatch({ type: 'completeChallenge', today });
    analytics.track('daily_complete', { date: today, streak: effectiveStreak(state, today) });
  }, [analytics, dispatch, state, today]);

  const claimReward = useCallback((): DailyReward | null => {
    if (!canClaimDailyReward(state, today) || clock.isLocked()) {
      return null;
    }
    const result = claimDailyRewardPure(state, today);
    if (!result) {
      return null;
    }
    dispatch({ type: 'claimReward', daily: result.daily });
    addCoins(result.reward.coins);
    analytics.track('reward_claimed', {
      day: result.reward.day,
      coins: result.reward.coins,
      streak: result.daily.streak,
    });
    return result.reward;
  }, [addCoins, analytics, clock, dispatch, state, today]);

  const value = useMemo<DailyContextValue>(
    () => ({
      daily: state,
      ready,
      today,
      puzzle,
      streak,
      longestStreak: state.longestStreak,
      streakMilestones: GAME_CONFIG.daily.streakMilestones,
      reward,
      canPlay: canPlayDailyChallenge(state, today),
      canClaim,
      isCompletedToday: state.completedChallengeDates.includes(today),
      rewardsLocked,
      completeChallenge,
      claimReward,
    }),
    [state, ready, today, puzzle, streak, reward, canClaim, rewardsLocked, completeChallenge, claimReward],
  );

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export function useDaily(): DailyContextValue {
  const value = useContext(DailyContext);
  if (!value) {
    throw new Error('useDaily باید داخل DailyProvider استفاده شود.');
  }
  return value;
}
