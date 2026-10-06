import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { GAME_CONFIG } from '../constants';
import { usePersistentReducer, type HydrateAction } from '../hooks/usePersistentReducer';
import {
  applyHeartState,
  computeHeartState,
  grantHearts,
  refillHearts as refillHeartsPure,
  refundHeart,
  spendHeart,
  type HeartState,
} from '../services/game/heartService';
import { profileRepository } from '../services/storage/repositories';
import type { UserProfile } from '../types';
import { useServices } from './ServicesContext';

export interface WordResultSummary {
  wordsFound: number;
  bonusWords: number;
  maxCombo: number;
  hintsUsed: number;
}

export interface LevelCompletionSummary extends WordResultSummary {
  score: number;
  coins: number;
}

type ProfileAction =
  | HydrateAction<UserProfile>
  | { type: 'addCoins'; amount: number }
  | { type: 'spendCoins'; amount: number }
  | { type: 'addScore'; amount: number }
  | { type: 'setHeartState'; state: HeartState }
  | { type: 'grantHearts'; amount: number }
  | { type: 'refillHearts' }
  | { type: 'recordGameStart' }
  | { type: 'recordWordResults'; summary: WordResultSummary }
  | { type: 'recordLevelCompletion'; summary: LevelCompletionSummary }
  | { type: 'setMembership'; adsRemoved: boolean; membership: UserProfile['membership'] }
  | { type: 'replace'; profile: UserProfile };

function profileReducer(state: UserProfile, action: ProfileAction): UserProfile {
  switch (action.type) {
    case '__hydrate':
      return action.state;
    case 'addCoins':
      return { ...state, coins: Math.max(0, state.coins + action.amount) };
    case 'spendCoins':
      return state.coins < action.amount ? state : { ...state, coins: state.coins - action.amount };
    case 'addScore':
      return { ...state, score: Math.max(0, state.score + action.amount) };
    case 'setHeartState':
      return applyHeartState(state, action.state);
    case 'grantHearts':
      return grantHearts(state, action.amount, Date.now());
    case 'refillHearts':
      return refillHeartsPure(state);
    case 'recordGameStart':
      return { ...state, totalGamesPlayed: state.totalGamesPlayed + 1 };
    case 'recordWordResults':
      return {
        ...state,
        totalWordsFound: state.totalWordsFound + action.summary.wordsFound,
        bonusWordsFound: state.bonusWordsFound + action.summary.bonusWords,
        totalHintsUsed: state.totalHintsUsed + action.summary.hintsUsed,
        bestCombo: Math.max(state.bestCombo, action.summary.maxCombo),
      };
    case 'recordLevelCompletion':
      return {
        ...state,
        totalGamesCompleted: state.totalGamesCompleted + 1,
        totalWordsFound: state.totalWordsFound + action.summary.wordsFound,
        bonusWordsFound: state.bonusWordsFound + action.summary.bonusWords,
        totalHintsUsed: state.totalHintsUsed + action.summary.hintsUsed,
        bestCombo: Math.max(state.bestCombo, action.summary.maxCombo),
        score: state.score + action.summary.score,
        coins: state.coins + action.summary.coins,
      };
    case 'setMembership':
      return { ...state, adsRemoved: action.adsRemoved, membership: action.membership };
    case 'replace':
      return action.profile;
    default:
      return state;
  }
}

export interface ProfileContextValue {
  profile: UserProfile;
  coins: number;
  ready: boolean;
  hearts: HeartState;
  /** محاسبه تازه قلب‌ها؛ در بازگشت به برنامه و شروع صفحه صدا زده می‌شود */
  refreshHearts: () => HeartState;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addScore: (amount: number) => void;
  startAttempt: (levelId: number) => boolean;
  refundAttempt: (levelId: number) => void;
  addHearts: (amount: number) => void;
  fillHearts: () => void;
  recordGameStart: () => void;
  recordLevelCompletion: (summary: LevelCompletionSummary) => void;
  reset: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch, ready, reset } = usePersistentReducer(profileRepository, profileReducer);
  const { analytics } = useServices();

  const hearts = useMemo(
    () =>
      computeHeartState({
        hearts: state.hearts,
        maxHearts: state.maxHearts,
        lastRefillAt: state.lastHeartRefillAt,
        now: Date.now(),
      }),
    [state.hearts, state.maxHearts, state.lastHeartRefillAt],
  );

  const refreshHearts = useCallback((): HeartState => {
    const next = computeHeartState({
      hearts: state.hearts,
      maxHearts: state.maxHearts,
      lastRefillAt: state.lastHeartRefillAt,
      now: Date.now(),
    });
    if (next.gained > 0) {
      dispatch({ type: 'setHeartState', state: next });
      analytics.track('hearts_refilled', { gained: next.gained, hearts: next.hearts });
    }
    return next;
  }, [analytics, dispatch, state.hearts, state.lastHeartRefillAt, state.maxHearts]);

  // در نخستین بارگذاری، قلب‌های پر‌شده در فاصله بسته‌بودن برنامه اعمال می‌شوند
  useEffect(() => {
    if (ready) {
      refreshHearts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const addCoins = useCallback((amount: number) => dispatch({ type: 'addCoins', amount }), [dispatch]);

  const spendCoins = useCallback(
    (amount: number): boolean => {
      if (state.coins < amount) {
        return false;
      }
      dispatch({ type: 'spendCoins', amount });
      return true;
    },
    [dispatch, state.coins],
  );

  const addScore = useCallback((amount: number) => dispatch({ type: 'addScore', amount }), [dispatch]);

  const startAttempt = useCallback(
    (levelId: number): boolean => {
      const result = spendHeart(state, levelId, Date.now());
      if (!result.ok) {
        analytics.track('heart_empty', { levelId, hearts: result.profile.hearts });
        return false;
      }
      if (result.profile !== state) {
        dispatch({ type: 'replace', profile: result.profile });
      }
      dispatch({ type: 'recordGameStart' });
      analytics.track('heart_spent', { levelId, hearts: result.profile.hearts });
      return true;
    },
    [analytics, dispatch, state],
  );

  const refundAttempt = useCallback(
    (levelId: number) => {
      const next = refundHeart(state, levelId, Date.now());
      if (next !== state) {
        dispatch({ type: 'replace', profile: next });
      }
    },
    [dispatch, state],
  );

  const addHearts = useCallback((amount: number) => dispatch({ type: 'grantHearts', amount }), [dispatch]);
  const fillHearts = useCallback(() => dispatch({ type: 'refillHearts' }), [dispatch]);
  const recordGameStart = useCallback(() => dispatch({ type: 'recordGameStart' }), [dispatch]);

  const recordLevelCompletion = useCallback(
    (summary: LevelCompletionSummary) => dispatch({ type: 'recordLevelCompletion', summary }),
    [dispatch],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile: state,
      coins: state.coins,
      ready,
      hearts,
      refreshHearts,
      addCoins,
      spendCoins,
      addScore,
      startAttempt,
      refundAttempt,
      addHearts,
      fillHearts,
      recordGameStart,
      recordLevelCompletion,
      reset,
    }),
    [
      state,
      ready,
      hearts,
      refreshHearts,
      addCoins,
      spendCoins,
      addScore,
      startAttempt,
      refundAttempt,
      addHearts,
      fillHearts,
      recordGameStart,
      recordLevelCompletion,
      reset,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) {
    throw new Error('useProfile باید داخل ProfileProvider استفاده شود.');
  }
  return value;
}

export const PROFILE_DEFAULTS = {
  maxHearts: GAME_CONFIG.economy.maxHearts,
  initialCoins: GAME_CONFIG.economy.initialCoins,
} as const;
