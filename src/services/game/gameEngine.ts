import {
  GAME_CONFIG,
  coinsForWordLength,
  comboBonus,
  scoreForWordLength,
} from '../../constants/gameConfig';
import type {
  FoundWord,
  LevelProgress,
  GameRewards,
  GameSession,
  HintRecord,
  HintType,
  Level,
  LetterTileData,
  WordKind,
  WordValidation,
} from '../../types';
import { createTileId } from '../../utils/id';
import { remainingTargetWords, validateWord } from './wordValidator';

/**
 * موتور بازی.
 *
 * همه توابع این فایل خالص‌اند: وضعیت نشست می‌گیرند و وضعیت تازه برمی‌گردانند.
 * هیچ وابستگی به React، ذخیره‌سازی یا انیمیشن وجود ندارد؛ همین باعث می‌شود
 * منطق بازی مستقل و کامل تست‌پذیر باشد.
 */

export function createGame(level: Level, now: number = Date.now()): GameSession {
  const tiles: LetterTileData[] = level.letters.map(char => ({
    id: createTileId('tile'),
    char,
  }));

  return {
    levelId: level.id,
    tiles,
    selection: [],
    foundWords: [],
    score: 0,
    coinsEarned: 0,
    combo: 0,
    maxCombo: 0,
    hints: [],
    startedAt: now,
    finishedAt: null,
    status: 'playing',
  };
}

export function tileById(session: GameSession, tileId: string): LetterTileData | undefined {
  return session.tiles.find(tile => tile.id === tileId);
}

export function isTileSelected(session: GameSession, tileId: string): boolean {
  return session.selection.includes(tileId);
}

/** انتخاب یک کاشی حرف. انتخاب دوباره همان کاشی نادیده گرفته می‌شود. */
export function selectLetter(session: GameSession, tileId: string): GameSession {
  if (session.status !== 'playing') {
    return session;
  }
  if (isTileSelected(session, tileId) || !tileById(session, tileId)) {
    return session;
  }
  if (session.selection.length >= GAME_CONFIG.gameplay.maxSelectionLength) {
    return session;
  }
  return { ...session, selection: [...session.selection, tileId] };
}

export function removeLetter(session: GameSession, tileId: string): GameSession {
  if (!isTileSelected(session, tileId)) {
    return session;
  }
  return { ...session, selection: session.selection.filter(id => id !== tileId) };
}

export function removeLastLetter(session: GameSession): GameSession {
  if (session.selection.length === 0) {
    return session;
  }
  return { ...session, selection: session.selection.slice(0, -1) };
}

export function clearSelection(session: GameSession): GameSession {
  if (session.selection.length === 0) {
    return session;
  }
  return { ...session, selection: [] };
}

/** واژه‌ای که از کاشی‌های انتخاب‌شده ساخته می‌شود */
export function buildWord(session: GameSession): string {
  return session.selection
    .map(tileId => tileById(session, tileId)?.char ?? '')
    .join('');
}

export function selectedTiles(session: GameSession): LetterTileData[] {
  return session.selection
    .map(tileId => tileById(session, tileId))
    .filter((tile): tile is LetterTileData => tile !== undefined);
}

export interface SubmitOutcome {
  session: GameSession;
  validation: WordValidation;
  /** واژه پذیرفته‌شده و امتیازش، برای نمایش بازخورد */
  reward: { score: number; coins: number; kind: WordKind; combo: number } | null;
  completed: boolean;
}

/**
 * ثبت واژه ساخته‌شده.
 * نشست تازه برمی‌گرداند؛ حتی در رد شدن واژه، انتخاب پاک می‌شود تا بازیکن
 * بتواند فوراً واژه بعدی را بسازد.
 */
export function submitWord(session: GameSession, level: Level, now: number = Date.now()): SubmitOutcome {
  const word = buildWord(session);
  const foundWords = session.foundWords.map(entry => entry.word);
  const validation = validateWord({ raw: word, level, foundWords });

  if (validation.status === 'rejected') {
    return {
      session: { ...clearSelection(session), combo: 0 },
      validation,
      reward: null,
      completed: false,
    };
  }

  const kind = validation.kind;
  const combo = session.combo + 1;
  const revealed = isWordRevealed(session, validation.word);
  const score = calculateScore({
    word: validation.word,
    level,
    kind,
    combo,
    revealed,
  });
  const coins = calculateCoinReward({ word: validation.word, kind, revealed });

  const found: FoundWord = {
    word: validation.word,
    kind,
    score,
    coins,
    combo,
    revealed,
    foundAt: now,
  };

  const next: GameSession = {
    ...session,
    selection: [],
    foundWords: [...session.foundWords, found],
    score: session.score + score,
    coinsEarned: session.coinsEarned + coins,
    combo,
    maxCombo: Math.max(session.maxCombo, combo),
  };

  const completed = isLevelCompleted(next, level);
  return {
    session: completed
      ? { ...next, status: 'completed', finishedAt: now }
      : next,
    validation,
    reward: { score, coins, kind, combo },
    completed,
  };
}

export interface ScoreInput {
  word: string;
  level: Level;
  kind: WordKind;
  combo: number;
  /** واژه‌ای که با راهنما آشکار شده باشد امتیاز کمتری می‌دهد */
  revealed?: boolean;
}

export function calculateScore({ word, level, kind, combo, revealed = false }: ScoreInput): number {
  const base = scoreForWordLength(word.length);
  const difficulty = GAME_CONFIG.difficultyMultiplier[level.difficulty];
  const kindMultiplier = kind === 'bonus' ? GAME_CONFIG.bonusWordScoreMultiplier : 1;
  const raw = (base + comboBonus(combo)) * difficulty * kindMultiplier;
  const value = revealed ? raw * GAME_CONFIG.gameplay.revealedWordScoreRatio : raw;
  return Math.max(1, Math.round(value));
}

export interface CoinInput {
  word: string;
  kind: WordKind;
  revealed?: boolean;
}

export function calculateCoinReward({ word, kind, revealed = false }: CoinInput): number {
  if (revealed) {
    return 0;
  }
  const base = coinsForWordLength(word.length);
  return kind === 'bonus' ? Math.round(base * GAME_CONFIG.bonusWordScoreMultiplier) : base;
}

/** پاداش پایان مرحله: تکمیل مرحله به‌اندازه خودِ کلمات ارزش دارد */
export function calculateLevelRewards(session: GameSession, level: Level): GameRewards {
  const targetWordsFound = session.foundWords.filter(entry => entry.kind === 'target').length;
  const bonusWordsFound = session.foundWords.filter(entry => entry.kind === 'bonus').length;
  const completionRatio = level.targetWords.length === 0
    ? 0
    : targetWordsFound / level.targetWords.length;

  return {
    score: session.score + Math.round(level.scoreReward * completionRatio),
    coins: session.coinsEarned + Math.round(level.coinReward * completionRatio),
    targetWordsFound,
    bonusWordsFound,
    maxCombo: session.maxCombo,
  };
}

export function isLevelCompleted(session: GameSession, level: Level): boolean {
  return remainingTargetWords(level, session.foundWords.map(entry => entry.word)).length === 0;
}

export function getLevelProgress(session: GameSession, level: Level): LevelProgress {
  const foundWords = session.foundWords.map(entry => entry.word);
  const foundTargets = level.targetWords.filter(word => foundWords.includes(word)).length;
  const foundBonus = level.bonusWords.filter(word => foundWords.includes(word)).length;
  return {
    foundTargets,
    totalTargets: level.targetWords.length,
    foundBonus,
    totalBonus: level.bonusWords.length,
    isCompleted: foundTargets === level.targetWords.length,
  };
}

export type HintOutcome =
  | {
      status: 'revealed';
      session: GameSession;
      type: HintType;
      word: string;
      /** شماره حرف آشکارشده؛ برای راهنمای واژه‌ی کامل null است */
      letterIndex: number | null;
    }
  | { status: 'blocked'; session: GameSession; reason: 'completed' | 'nothing_to_reveal' };

/**
 * راهنما.
 *
 * reveal_letter: آشکار کردن حرف بعدی نخستین واژه‌ای که بازیکن پیدا نکرده است.
 * reveal_word: آشکار کردن کامل واژه (امتیاز کاهش‌یافته و بدون سکه).
 * smart_help: نشان دادن بلندترین واژه باقی‌مانده همراه با حرف بعدی آن.
 */
export function revealWithHint(
  session: GameSession,
  level: Level,
  type: HintType,
  now: number = Date.now(),
): HintOutcome {
  if (session.status !== 'playing') {
    return { status: 'blocked', session, reason: 'completed' };
  }

  const foundWords = session.foundWords.map(entry => entry.word);
  const remaining = remainingTargetWords(level, foundWords);
  if (remaining.length === 0) {
    return { status: 'blocked', session, reason: 'nothing_to_reveal' };
  }

  if (type === 'reveal_word') {
    const word = remaining[0] ?? '';
    if (isWordRevealed(session, word)) {
      return { status: 'blocked', session, reason: 'nothing_to_reveal' };
    }
    const record: HintRecord = { type, word, letterIndex: null, at: now };
    return {
      status: 'revealed',
      session: { ...session, hints: [...session.hints, record] },
      type,
      word,
      letterIndex: null,
    };
  }

  const word =
    type === 'smart_help'
      ? [...remaining].sort((a, b) => b.length - a.length)[0] ?? ''
      : remaining[0] ?? '';

  const nextIndex = nextRevealIndex(session, word);
  if (nextIndex < 0) {
    return { status: 'blocked', session, reason: 'nothing_to_reveal' };
  }

  const record: HintRecord = { type, word, letterIndex: nextIndex, at: now };
  return {
    status: 'revealed',
    session: { ...session, hints: [...session.hints, record] },
    type,
    word,
    letterIndex: nextIndex,
  };
}

/** حرف آشکارشده بعدی یک واژه؛ ‎-۱ یعنی همه حروف آشکار شده‌اند */
export function nextRevealIndex(session: GameSession, word: string): number {
  const revealed = revealedIndices(session, word);
  for (let index = 0; index < word.length; index += 1) {
    if (!revealed.has(index)) {
      return index;
    }
  }
  return -1;
}

export function revealedIndices(session: GameSession, word: string): Set<number> {
  const indices = new Set<number>();
  for (const hint of session.hints) {
    if (hint.word === word && hint.letterIndex !== null) {
      indices.add(hint.letterIndex);
    }
  }
  return indices;
}

/** آیا این واژه با راهنما (واژه کامل) آشکار شده است؟ */
export function isWordRevealed(session: GameSession, word: string): boolean {
  return session.hints.some(hint => hint.word === word && hint.letterIndex === null);
}

export function abandonGame(session: GameSession, now: number = Date.now()): GameSession {
  return { ...session, status: 'abandoned', finishedAt: now, selection: [] };
}
