import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { getNextLevelId } from '../data/levels/levels';
import { usePersistentReducer, type HydrateAction } from '../hooks/usePersistentReducer';
import { progressRepository } from '../services/storage/repositories';
import type { GameProgress, LevelRecord, LevelSummary } from '../types';
import { useServices } from './ServicesContext';

export interface LevelCompletionInput {
  levelId: number;
  score: number;
  completedAt?: number;
}

type ProgressAction =
  | HydrateAction<GameProgress>
  | { type: 'enterLevel'; levelId: number }
  | { type: 'completeLevel'; input: Required<LevelCompletionInput> }
  | { type: 'attempt'; levelId: number };

function progressReducer(state: GameProgress, action: ProgressAction): GameProgress {
  switch (action.type) {
    case '__hydrate':
      return action.state;
    case 'enterLevel':
      return state.lastPlayedLevelId === action.levelId
        ? state
        : { ...state, lastPlayedLevelId: action.levelId };
    case 'attempt':
      return {
        ...state,
        records: state.records.map(record =>
          record.levelId === action.levelId
            ? { ...record, attempts: record.attempts + 1 }
            : record,
        ),
      };
    case 'completeLevel': {
      const { levelId, score, completedAt } = action.input;
      const existing = state.records.find(record => record.levelId === levelId);
      const record: LevelRecord = {
        levelId,
        bestScore: Math.max(existing?.bestScore ?? 0, score),
        completedAt: existing?.completedAt ?? completedAt,
        attempts: (existing?.attempts ?? 0) + 1,
      };
      const records = existing
        ? state.records.map(entry => (entry.levelId === levelId ? record : entry))
        : [...state.records, record];

      const nextLevelId = getNextLevelId(levelId);
      const unlockedLevel =
        nextLevelId === null ? state.unlockedLevel : Math.max(state.unlockedLevel, nextLevelId);

      return {
        ...state,
        records: records.sort((a, b) => a.levelId - b.levelId),
        unlockedLevel,
        currentLevel: nextLevelId ?? levelId,
        lastPlayedLevelId: levelId,
      };
    }
    default:
      return state;
  }
}

export interface ProgressContextValue {
  progress: GameProgress;
  ready: boolean;
  /** مرحله‌ای که «ادامه بازی» باز می‌کند */
  continueLevelId: number;
  completedCount: number;
  isLevelUnlocked: (levelId: number) => boolean;
  isLevelCompleted: (levelId: number) => boolean;
  getRecord: (levelId: number) => LevelRecord | undefined;
  enterLevel: (levelId: number) => void;
  recordAttempt: (levelId: number) => void;
  completeLevel: (input: LevelCompletionInput) => void;
  buildSummaries: (levels: readonly { id: number; title: string; difficulty: LevelSummary['difficulty']; targetWords: string[] }[]) => LevelSummary[];
  reset: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch, ready, reset } = usePersistentReducer(progressRepository, progressReducer);
  const { analytics } = useServices();

  const isLevelUnlocked = useCallback(
    (levelId: number) => levelId <= state.unlockedLevel,
    [state.unlockedLevel],
  );

  const isLevelCompleted = useCallback(
    (levelId: number) => state.records.some(record => record.levelId === levelId),
    [state.records],
  );

  const getRecord = useCallback(
    (levelId: number) => state.records.find(record => record.levelId === levelId),
    [state.records],
  );

  const enterLevel = useCallback(
    (levelId: number) => dispatch({ type: 'enterLevel', levelId }),
    [dispatch],
  );

  const recordAttempt = useCallback(
    (levelId: number) => dispatch({ type: 'attempt', levelId }),
    [dispatch],
  );

  const completeLevel = useCallback(
    (input: LevelCompletionInput) => {
      const completedAt = input.completedAt ?? Date.now();
      const firstCompletion = !state.records.some(record => record.levelId === input.levelId);
      dispatch({ type: 'completeLevel', input: { ...input, completedAt } });
      analytics.track('level_complete', {
        levelId: input.levelId,
        score: input.score,
        firstCompletion,
      });
    },
    [analytics, dispatch, state.records],
  );

  const buildSummaries = useCallback<ProgressContextValue['buildSummaries']>(
    levels =>
      levels.map(level => ({
        id: level.id,
        title: level.title,
        difficulty: level.difficulty,
        targetCount: level.targetWords.length,
        isCompleted: state.records.some(record => record.levelId === level.id),
      })),
    [state.records],
  );

  /**
   * مرحله‌ای که «ادامه بازی» باز می‌کند.
   *
   * اگر آخرین مرحله‌ای که بازیکن وارد آن شده هنوز تکمیل نشده باشد، همان ادامه
   * داده می‌شود؛ ولی بعد از تکمیل یک مرحله، دکمه به مرحله بعد می‌رود نه مرحله‌ای
   * که تازه تمام شده است.
   */
  const continueLevelId = useMemo(() => {
    const lastPlayed = state.lastPlayedLevelId;
    const lastCompleted = lastPlayed !== null && state.records.some(record => record.levelId === lastPlayed);
    return lastPlayed === null || lastCompleted ? state.currentLevel : lastPlayed;
  }, [state.currentLevel, state.lastPlayedLevelId, state.records]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress: state,
      ready,
      continueLevelId,
      completedCount: state.records.length,
      isLevelUnlocked,
      isLevelCompleted,
      getRecord,
      enterLevel,
      recordAttempt,
      completeLevel,
      buildSummaries,
      reset,
    }),
    [
      state,
      ready,
      continueLevelId,
      isLevelUnlocked,
      isLevelCompleted,
      getRecord,
      enterLevel,
      recordAttempt,
      completeLevel,
      buildSummaries,
      reset,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) {
    throw new Error('useProgress باید داخل ProgressProvider استفاده شود.');
  }
  return value;
}
