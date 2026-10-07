import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { GAME_CONFIG, enabledHintTypes, hintCost, isHintEnabled } from '../constants';
import {
  buildWord,
  calculateLevelRewards,
  clearSelection,
  createGame,
  getLevelProgress,
  isLevelCompleted,
  removeLastLetter,
  removeLetter,
  hintWordPattern,

  selectLetter,
  selectedTiles as selectSelectedTiles,
  submitWord as submitWordToEngine,
  revealWithHint,
} from '../services/game/gameEngine';
import { validateWord } from '../services/game/wordValidator';
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

export type HintBlockedReason = 'completed' | 'nothing_to_reveal' | 'not_enough_coins' | 'disabled';

export type HintRequestResult =
  | {
      status: 'revealed';
      type: HintType;
      word: string;
      letterIndex: number | null;
      cost: number;
      /** الگوی واژه با حروف آشکارشده؛ مثل «ب•ا••» */
      pattern: string;
      /** ترتیب کاشی‌هایی که بازیکن باید بزند تا این واژه ساخته شود */
      tileIds: string[];
    }
  | { status: 'blocked'; reason: HintBlockedReason };

/**
 * راهنمای فعال: تا وقتی بازیکن واژه راهنمایی‌شده را پیدا نکرده، روی صفحه می‌ماند
 * و روی چرخ حروف، کاشی بعدی را روشن می‌کند.
 */
export interface ActiveHint {
  id: number;
  type: HintType;
  word: string;
  pattern: string;
  tileIds: string[];
  cost: number;
  at: number;
}

export interface HintOption {
  type: HintType;
  cost: number;
  affordable: boolean;
  /** توضیح یک‌خطی برای برگه راهنما */
  available: boolean;
}

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
      // نشست کامل پاک می‌شود تا ورود بعدی به همان مرحله، همیشه بازی تازه بگیرد.
      // (اگر نشست تمام‌شده یا رهاشده در حافظه بماند، همه دکمه‌های صفحه بازی
      // غیرفعال می‌مانند و بازیکن فکر می‌کند بازی هنگ کرده است.)
      return initialState;
    default:
      return state;
  }
}

export interface RevealedWordLetters {
  word: string;
  indices: readonly number[];
  full: boolean;
}

export interface SubmitOptions {
  /**
   * ثبت از مسیر «برداشتن انگشت پس از کشیدن».
   * در این مسیر واژه کوتاه‌تر از حد مرحله بی‌سروصدا رها می‌شود: نه پیام خطا، نه
   * بازنشانی کمبو و نه پاک‌شدن حروف — چون بازیکن فقط انگشتش را برداشته است.
   */
  fromRelease?: boolean;
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
  /** راهنمای فعال (برای روشن‌کردن کاشی‌ها روی چرخ) */
  activeHint: ActiveHint | null;
  /** همه راهنماهای قابل خرید با قیمت و وضعیت affordability */
  hintOptions: HintOption[];
  dismissHint: () => void;
  /** واژه کنونی خودش یک واژه پذیرفتنی است؛ صفحه بازی می‌تواند خودکار ثبتش کند */
  autoSubmitReady: boolean;
  startGame: (level: Level) => void;
  abandonGame: () => void;
  leaveGame: () => void;
  selectTile: (tileId: string) => void;
  removeTile: (tileId: string) => void;
  removeLast: () => void;
  clearWord: () => void;
  /**
   * نوشتن «دنباله انتخاب» به‌صورت یک‌جا و قطعی.
   *
   * لایه لمس چرخ حروف دنباله انتخاب را در دست دارد؛ با این تابع همان دنباله
   * یک‌جا نوشته می‌شود تا انتخاب بین چند state (ref لمس، state ری‌اکت، closure
   * قدیمی) پخش نشود و در کشیدن سریع حرفی جا نیفتد. شناسه‌های ناشناس و تکراری
   * حذف می‌شوند و سقف طول انتخاب رعایت می‌شود.
   */
  replaceSelection: (tileIds: readonly string[]) => void;
  submit: (options?: SubmitOptions) => SubmitOutcome;
  requestHint: (type?: HintType) => HintRequestResult;
  dismissFeedback: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  /**
   * آینه‌ی همگام وضعیت بازی.
   *
   * دلیل وجودش یک اشکال واقعی است: پیش‌تر هر تغییر از closure روی `session`
   * حساب می‌شد. اگر دو لمس در یک چرخه (کشیدن سریع) رخ می‌داد، هر دو از همان
   * نشست قدیمی حساب می‌شدند و لمس دوم، نتیجه لمس اول را پاک می‌کرد — همان
   * «بعضی حروف جا می‌افتند». حالا هر تغییر ابتدا روی همین مرجع (که در همان
   * لحظه به‌روز می‌شود) حساب می‌شود و بعد به reducer می‌رود؛ پس هیچ تغییری روی
   * وضعیت قدیمی محاسبه نمی‌شود.
   */
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const [activeHint, setActiveHint] = useState<ActiveHint | null>(null);
  const { profile, spendCoins } = useProfile();
  const coins = profile.coins;
  const { sound, vibration, analytics } = useServices();

  /**
   * اجرای یک کنش روی «آخرین» وضعیت.
   *
   * reducer خالص است، پس نتیجه‌اش روی مرجع، همان چیزی است که React بعد از همین
   * کنش رندر می‌کند. با این کار مرجع همیشه با وضعیت رندرشده یکی می‌ماند و هیچ
   * کنشی روی وضعیت قدیمی حساب نمی‌شود.
   */
  const applyAction = useCallback(
    (action: GameAction): GameState => {
      const next = gameReducer(stateRef.current, action);
      stateRef.current = next;
      dispatch(action);
      return next;
    },
    [],
  );

  /** بازخورد لمسی/شنیداری بر پایه تفاوت واقعی انتخاب (نه بر پایه حدس) */
  const playSelectionFeedback = useCallback(
    (before: readonly string[], after: readonly string[]) => {
      if (after === before) {
        return;
      }
      if (after.some(id => !before.includes(id))) {
        sound.play('letter_select');
        vibration.trigger('letter_select');
        return;
      }
      if (before.some(id => !after.includes(id))) {
        sound.play('letter_remove');
        vibration.trigger('letter_remove');
      }
    },
    [sound, vibration],
  );

  /**
   * تغییر نشست بر پایه «آخرین» وضعیت. اگر تابع تغییر، همان نشست را برگرداند
   * (یعنی تغییری لازم نبود) هیچ dispatch و هیچ صدایی تولید نمی‌شود.
   */
  const updateSession = useCallback(
    (
      produce: (session: GameSession) => GameSession | null,
      options?: { feedback?: boolean },
    ): GameSession | null => {
      const current = stateRef.current;
      const session = current.session;
      if (!session) {
        return null;
      }
      const next = produce(session);
      if (!next || next === session) {
        return null;
      }
      applyAction({ type: 'apply', session: next });
      if (options?.feedback) {
        playSelectionFeedback(session.selection, next.selection);
      }
      return next;
    },
    [applyAction, playSelectionFeedback],
  );

  const startGame = useCallback(
    (nextLevel: Level) => {
      const current = stateRef.current;
      const existing = current.session;
      // اگر همین مرحله در حال بازی است، دوباره ساخته نمی‌شود؛ این محافظ جلوی
      // «شروع دوباره»ی ناخواسته (مثلاً اجرای دوباره اثر در حالت توسعه) و
      // پاک‌شدن پیشرفت بازیکن را می‌گیرد.
      if (existing && existing.levelId === nextLevel.id && existing.status === 'playing') {
        return;
      }
      const session = createGame(nextLevel);
      applyAction({ type: 'start', level: nextLevel, session });
      setActiveHint(null);
      analytics.track('level_start', {
        levelId: nextLevel.id,
        difficulty: nextLevel.difficulty,
        targetCount: nextLevel.targetWords.length,
      });
    },
    [analytics, applyAction],
  );

  const abandonGameSession = useCallback(() => {
    const session = stateRef.current.session;
    if (session && session.status === 'playing') {
      analytics.track('level_abandon', {
        levelId: session.levelId,
        wordsFound: session.foundWords.length,
      });
    }
    applyAction({ type: 'end' });
  }, [analytics, applyAction]);

  const leaveGame = useCallback(() => {
    applyAction({ type: 'end' });
  }, [applyAction]);

  const selectTile = useCallback(
    (tileId: string) => {
      updateSession(session => selectLetter(session, tileId), { feedback: true });
    },
    [updateSession],
  );

  const removeTile = useCallback(
    (tileId: string) => {
      updateSession(session => removeLetter(session, tileId), { feedback: true });
    },
    [updateSession],
  );

  const removeLast = useCallback(() => {
    updateSession(session => removeLastLetter(session), { feedback: true });
  }, [updateSession]);

  const clearWord = useCallback(() => {
    updateSession(session => clearSelection(session), { feedback: true });
  }, [updateSession]);

  const replaceSelection = useCallback(
    (tileIds: readonly string[]) => {
      updateSession(
        session => {
          if (session.status !== 'playing') {
            return null;
          }
          const known = new Set(session.tiles.map(tile => tile.id));
          const next: string[] = [];
          for (const tileId of tileIds) {
            if (!known.has(tileId) || next.includes(tileId)) {
              continue;
            }
            next.push(tileId);
            if (next.length >= GAME_CONFIG.gameplay.maxSelectionLength) {
              break;
            }
          }
          const unchanged =
            next.length === session.selection.length &&
            next.every((tileId, index) => tileId === session.selection[index]);
          return unchanged ? null : { ...session, selection: next };
        },
        { feedback: true },
      );
    },
    [updateSession],
  );

  const submit = useCallback(
    (options?: SubmitOptions): SubmitOutcome => {
      const current = stateRef.current;
      const session = current.session;
      const level = current.level;
      if (!session || !level || session.status !== 'playing') {
        return { status: 'ignored' };
      }
      // انتخاب خالی هرگز «کلمه اشتباه» حساب نمی‌شود؛ فقط نادیده گرفته می‌شود.
      if (session.selection.length === 0) {
        return { status: 'ignored' };
      }
      const pendingWord = buildWord(session);
      // برداشتن انگشت روی یک واژه کوتاه، خطا نیست؛ فقط رها می‌شود.
      if (
        options?.fromRelease &&
        pendingWord.length < Math.max(level.minWordLength, GAME_CONFIG.gameplay.minWordLength)
      ) {
        return { status: 'ignored' };
      }

      const result = submitWordToEngine(session, level);
      if (result.validation.status === 'rejected') {
        sound.play('wrong');
        vibration.trigger('wrong');
        // نشست رد‌شده هم نوشته می‌شود: انتخاب پاک و کمبو صفر می‌شود؛ همان
        // قراردادی که موتور بازی مستند کرده است. اگر نوشته نشود، حروف رد‌شده
        // روی صفحه می‌مانند و بازیکن گیر می‌کند.
        applyAction({ type: 'apply', session: result.session });
        applyAction({
          type: 'feedback',
          feedback: {
            id: nextFeedbackId(),
            status: 'rejected',
            word: pendingWord,
            reason: result.validation.reason,
          },
        });
        analytics.track('word_wrong', { levelId: level.id, reason: result.validation.reason });
        return { status: 'rejected', word: pendingWord, reason: result.validation.reason };
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

      applyAction({ type: 'apply', session: result.session });
      applyAction({
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
        sound.play('level_complete');
        vibration.trigger('level_complete');
      } else {
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
    },
    [analytics, applyAction, sound, vibration],
  );

  const requestHint = useCallback(
    (type: HintType = 'reveal_letter'): HintRequestResult => {
      const current = stateRef.current;
      const session = current.session;
      const level = current.level;
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
      // هزینه راهنما همان لحظه از سکه‌ها کم می‌شود؛ اگر کسر نشد، راهنما هم داده نمی‌شود.
      if (!spendCoins(cost)) {
        return { status: 'blocked', reason: 'not_enough_coins' };
      }

      const pattern = hintWordPattern(outcome.session, outcome.word);
      applyAction({ type: 'apply', session: outcome.session });
      setActiveHint({
        id: nextFeedbackId(),
        type,
        word: outcome.word,
        pattern,
        tileIds: outcome.tileIds,
        cost,
        at: Date.now(),
      });
      sound.play('reward');
      vibration.trigger('reward');
      analytics.track('hint_used', { levelId: level.id, type, word: outcome.word, cost });

      return {
        status: 'revealed',
        type,
        word: outcome.word,
        letterIndex: outcome.letterIndex,
        cost,
        pattern,
        tileIds: outcome.tileIds,
      };
    },
    [analytics, applyAction, coins, sound, spendCoins, vibration],
  );

  const dismissHint = useCallback(() => setActiveHint(null), []);

  // راهنما تا وقتی معتبر است که واژه‌اش پیدا نشده باشد؛ با پیداشدن یا شروع مرحله
  // تازه، راهنمای فعال خودش پاک می‌شود تا کاشی‌های قدیمی روشن نمانند.
  useEffect(() => {
    if (!activeHint) {
      return;
    }
    const found = state.session?.foundWords.some(entry => entry.word === activeHint.word) ?? false;
    if (found || !state.session || state.session.levelId !== state.level?.id) {
      setActiveHint(null);
    }
  }, [activeHint, state]);

  const dismissFeedback = useCallback(() => {
    applyAction({ type: 'clearFeedback' });
  }, [applyAction]);

  const session = state.session;
  const level = state.level;

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

  const autoSubmitReady = useMemo(() => {
    if (!session || !level || session.status !== 'playing' || session.selection.length < 2) {
      return false;
    }
    const candidate = buildWord(session);
    if (candidate.length < Math.max(level.minWordLength, GAME_CONFIG.gameplay.minWordLength)) {
      return false;
    }
    const foundWords = session.foundWords.map(entry => entry.word);
    const validation = validateWord({ raw: candidate, level, foundWords });
    return validation.status === 'accepted';
  }, [level, session]);

  const nextHintCost = hintCost('reveal_letter');
  const canUseHint = coins >= nextHintCost && session?.status === 'playing';

  const hintOptions = useMemo<HintOption[]>(
    () =>
      enabledHintTypes().map(type => {
        const cost = hintCost(type);
        return {
          type,
          cost,
          affordable: coins >= cost,
          available: session?.status === 'playing',
        };
      }),
    [coins, session?.status],
  );

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
      feedback: state.feedback,
      revealedLetters,
      canUseHint,
      nextHintCost,
      activeHint,
      hintOptions,
      dismissHint,
      autoSubmitReady,
      startGame,
      abandonGame: abandonGameSession,
      leaveGame,
      selectTile,
      removeTile,
      removeLast,
      clearWord,
      replaceSelection,
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
      state.feedback,
      revealedLetters,
      canUseHint,
      nextHintCost,
      activeHint,
      hintOptions,
      dismissHint,
      autoSubmitReady,
      startGame,
      abandonGameSession,
      leaveGame,
      selectTile,
      removeTile,
      removeLast,
      clearWord,
      replaceSelection,
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
