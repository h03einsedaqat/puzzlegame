import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';

import { GAME_CONFIG, hintCost, isHintEnabled } from '../constants';
import {
  abandonGame,
  buildWord,
  calculateLevelRewards,
  clearSelection,
  createGame,
  getLevelProgress,
  isLevelCompleted,
  removeLastLetter,
  removeLetter,
  selectLetter,
  selectedTiles as selectSelectedTiles,
  submitWord as submitWordToEngine,
  revealWithHint,
} from '../services/game/gameEngine';
import type {
  GameRewards,
  GameSession,
  LevelProgress,
  HintType,
  Level,
  LetterTileData,
  WordKind,
  WordRejectionReason,
} from '../types';
import { useProfile } from './ProfileContext';
import { useServices } from './ServicesContext';

export interface GameFeedback {
  id: number;
  status: 'accepted' | 'rejected';
  word: string;
  kind?: WordKind;
  reason?: WordRejectionReason;
  score?: number;
  coins?: number;
  combo?: number;
}

export type SubmitOutcome =
  | { status: 'ignored' }
  | { status: 'rejected'; word: string; reason: WordRejectionReason }
  | {
      status: 'accepted';
      word: string;
      kind: WordKind;
      score: number;
      coins: number;
      combo: number;
      completed: boolean;
      rewards: GameRewards | null;
    };

export type HintRequestResult =
  | { status: 'revealed'; type: HintType; word: string; letterIndex: number | null; cost: number }
  | { status: 'blocked'; reason: 'completed' | 'nothing_to_reveal' | 'not_enough_coins' | 'disabled' };

interface GameState {
  level: Level | null;
  session: GameSession | null;
  feedback: GameFeedback | null;
}

type GameAction =
  | { type: 'start'; level: Level; session: GameSession }
  | { type: 'apply'; session: GameSession }
  | { type: 'feedback'; feedback: GameFeedback }
  | { type: 'clearFeedback' }
  | { type: 'end' };

const initialState: GameState = { level: null, session: null, feedback: null };

let feedbackCounter = 0;

function nextFeedbackId(): number {
  feedbackCounter += 1;
  return feedbackCounter;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return { level: action.level, session: action.session, feedback: null };
    case 'apply':
      return { ...state, session: action.session };
    case 'feedback':
      return { ...state, feedback: action.feedback };
    case 'clearFeedback':
      return state.feedback === null ? state : { ...state, feedback: null };
    case 'end':
      return state.session === null
        ? state
        : { ...state, session: abandonGame(state.session), feedback: null };
    default:
      return state;
  }
}

export interface RevealedWordLetters {
  word: string;
  indices: readonly number[];
  full: boolean;
}

export interface GameContextValue {
  level: Level | null;
  session: GameSession | null;
  selectedTiles: LetterTileData[];
  word: string;
  isPlaying: boolean;
  isCompleted: boolean;
  progress: LevelProgress;
  rewards: GameRewards | null;
  feedback: GameFeedback | null;
  revealedLetters: RevealedWordLetters[];
  canUseHint: boolean;
  nextHintCost: number;
  startGame: (level: Level) => void;
  abandonGame: () => void;
  leaveGame: () => void;
  selectTile: (tileId: string) => void;
  removeTile: (tileId: string) => void;
  removeLast: () => void;
  clearWord: () => void;
  submit: () => SubmitOutcome;
  requestHint: (type?: HintType) => HintRequestResult;
  dismissFeedback: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { profile, spendCoins } = useProfile();
  const coins = profile.coins;
  const { sound, vibration, analytics } = useServices();
  const { level, session, feedback } = state;

  const startGame = useCallback(
    (nextLevel: Level) => {
      dispatch({ type: 'start', level: nextLevel, session: createGame(nextLevel) });
      analytics.track('level_start', {
        levelId: nextLevel.id,
        difficulty: nextLevel.difficulty,
        targetCount: nextLevel.targetWords.length,
      });
    },
    [analytics],
  );

  const abandonGameSession = useCallback(() => {
    if (session && session.status === 'playing') {
      analytics.track('level_abandon', {
        levelId: session.levelId,
        wordsFound: session.foundWords.length,
      });
    }
    dispatch({ type: 'end' });
  }, [analytics, session]);

  const leaveGame = useCallback(() => dispatch({ type: 'end' }), []);

  const selectTile = useCallback(
    (tileId: string) => {
      if (!session || !level) {
        return;
      }
      const next = selectLetter(session, tileId);
      if (next === session) {
        return;
      }
      dispatch({ type: 'apply', session: next });
      sound.play('letter_select');
      vibration.trigger('letter_select');
    },
    [level, session, sound, vibration],
  );

  const removeTile = useCallback(
    (tileId: string) => {
      if (!session) {
        return;
      }
      const next = removeLetter(session, tileId);
      if (next === session) {
        return;
      }
      dispatch({ type: 'apply', session: next });
      sound.play('letter_remove');
      vibration.trigger('letter_remove');
    },
    [session, sound, vibration],
  );

  const removeLast = useCallback(() => {
    if (!session) {
      return;
    }
    const next = removeLastLetter(session);
    if (next === session) {
      return;
    }
    dispatch({ type: 'apply', session: next });
    sound.play('letter_remove');
    vibration.trigger('letter_remove');
  }, [session, sound, vibration]);

  const clearWord = useCallback(() => {
    if (!session || session.selection.length === 0) {
      return;
    }
    dispatch({ type: 'apply', session: clearSelection(session) });
    sound.play('letter_remove');
  }, [session, sound]);

  const submit = useCallback((): SubmitOutcome => {
    if (!session || !level) {
      return { status: 'ignored' };
    }
    const result = submitWordToEngine(session, level);
    if (result.validation.status === 'rejected') {
      sound.play('wrong');
      vibration.trigger('wrong');
      const word = buildWord(session);
      dispatch({
        type: 'feedback',
        feedback: {
          id: nextFeedbackId(),
          status: 'rejected',
          word,
          reason: result.validation.reason,
        },
      });
      analytics.track('word_wrong', { levelId: level.id, reason: result.validation.reason });
      return { status: 'rejected', word, reason: result.validation.reason };
    }

    const found = result.session.foundWords[result.session.foundWords.length - 1];
    const accepted = {
      word: result.validation.word,
      kind: result.validation.kind,
      score: found?.score ?? 0,
      coins: found?.coins ?? 0,
      combo: found?.combo ?? 0,
      completed: result.completed,
      rewards: result.completed ? calculateLevelRewards(result.session, level) : null,
    };

    dispatch({
      type: 'feedback',
      feedback: {
        id: nextFeedbackId(),
        status: 'accepted',
        word: accepted.word,
        kind: accepted.kind,
        score: accepted.score,
        coins: accepted.coins,
        combo: accepted.combo,
      },
    });

    if (result.completed) {
      dispatch({ type: 'apply', session: result.session });
      sound.play('level_complete');
      vibration.trigger('level_complete');
    } else {
      dispatch({ type: 'apply', session: result.session });
      sound.play(accepted.combo >= 2 ? 'combo' : 'correct');
      vibration.trigger('correct');
    }

    if (accepted.kind === 'bonus') {
      analytics.track('word_bonus', { levelId: level.id, word: accepted.word, coins: accepted.coins });
    } else {
      analytics.track('word_correct', { levelId: level.id, word: accepted.word, score: accepted.score });
    }
    if (accepted.combo >= 2) {
      analytics.track('combo_achieved', { levelId: level.id, combo: accepted.combo });
    }

    return { status: 'accepted', ...accepted };
  }, [analytics, level, session, sound, vibration]);

  const requestHint = useCallback(
    (type: HintType = 'reveal_letter'): HintRequestResult => {
      if (!session || !level) {
        return { status: 'blocked', reason: 'completed' };
      }
      if (!isHintEnabled(type)) {
        return { status: 'blocked', reason: 'disabled' };
      }
      const cost = hintCost(type);
      if (coins < cost) {
        return { status: 'blocked', reason: 'not_enough_coins' };
      }

      const outcome = revealWithHint(session, level, type);
      if (outcome.status === 'blocked') {
        return { status: 'blocked', reason: outcome.reason };
      }
      if (!spendCoins(cost)) {
        return { status: 'blocked', reason: 'not_enough_coins' };
      }

      dispatch({ type: 'apply', session: outcome.session });
      sound.play('reward');
      vibration.trigger('reward');
      analytics.track('hint_used', { levelId: level.id, type, word: outcome.word, cost });

      return {
        status: 'revealed',
        type,
        word: outcome.word,
        letterIndex: outcome.letterIndex,
        cost,
      };
    },
    [analytics, coins, level, session, sound, spendCoins, vibration],
  );

  const dismissFeedback = useCallback(() => dispatch({ type: 'clearFeedback' }), []);

  const selectedTiles = useMemo(() => (session ? selectSelectedTiles(session) : []), [session]);

  const word = useMemo(() => (session ? buildWord(session) : ''), [session]);

  const progress = useMemo<LevelProgress>(
    () =>
      session && level
        ? getLevelProgress(session, level)
        : { foundTargets: 0, totalTargets: 0, foundBonus: 0, totalBonus: 0, isCompleted: false },
    [level, session],
  );

  const rewards = useMemo(
    () => (session && level && isLevelCompleted(session, level) ? calculateLevelRewards(session, level) : null),
    [level, session],
  );

  const revealedLetters = useMemo<RevealedWordLetters[]>(() => {
    if (!session || !level) {
      return [];
    }
    const levelWords = new Set([...level.targetWords, ...level.bonusWords]);
    const entries = new Map<string, { indices: Set<number>; full: boolean }>();

    for (const hint of session.hints) {
      if (!levelWords.has(hint.word)) {
        continue;
      }
      const entry = entries.get(hint.word) ?? { indices: new Set<number>(), full: false };
      if (hint.letterIndex === null) {
        entry.full = true;
      } else {
        entry.indices.add(hint.letterIndex);
      }
      entries.set(hint.word, entry);
    }

    return [...entries.entries()].map(([entryWord, entry]) => ({
      word: entryWord,
      indices: [...entry.indices].sort((a, b) => a - b),
      full: entry.full || entry.indices.size >= entryWord.length,
    }));
  }, [level, session]);

  const nextHintCost = hintCost('reveal_letter');
  const canUseHint = coins >= nextHintCost && session?.status === 'playing';

  const value = useMemo<GameContextValue>(
    () => ({
      level,
      session,
      selectedTiles,
      word,
      isPlaying: session?.status === 'playing',
      isCompleted: session?.status === 'completed',
      progress,
      rewards,
      feedback,
      revealedLetters,
      canUseHint,
      nextHintCost,
      startGame,
      abandonGame: abandonGameSession,
      leaveGame,
      selectTile,
      removeTile,
      removeLast,
      clearWord,
      submit,
      requestHint,
      dismissFeedback,
    }),
    [
      level,
      session,
      selectedTiles,
      word,
      progress,
      rewards,
      feedback,
      revealedLetters,
      canUseHint,
      nextHintCost,
      startGame,
      abandonGameSession,
      leaveGame,
      selectTile,
      removeTile,
      removeLast,
      clearWord,
      submit,
      requestHint,
      dismissFeedback,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) {
    throw new Error('useGame باید داخل GameProvider استفاده شود.');
  }
  return value;
}

export const GAME_LIMITS = {
  minWordLength: GAME_CONFIG.gameplay.minWordLength,
  maxSelectionLength: GAME_CONFIG.gameplay.maxSelectionLength,
} as const;
