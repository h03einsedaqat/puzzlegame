import { isDictionaryWord, MIN_DICTIONARY_WORD_LENGTH } from '../../data/words/dictionary';
import type { Level, WordKind, WordValidation } from '../../types';
import { isPersianWord, isWordBuildable, lettersOf, normalizePersianWord } from '../../utils/persian';

export interface ValidateWordInput {
  /** ورودی خام بازیکن (ممکن است شکل عربی یا دارای فاصله باشد) */
  raw: string;
  level: Level;
  /** واژه‌هایی که پیش‌تر در همین مرحله پیدا شده‌اند */
  foundWords: readonly string[];
}

/**
 * اعتبارسنجی واژه.
 *
 * ترتیب بررسی‌ها مهم است: نخست شکل واژه و طول آن، بعد امکان ساخت از حروف
 * مرحله، سپس بودن آن در واژه‌نامه و در پایان تکراری نبودن. همه مقایسه‌ها روی
 * شکل متعارف واژه انجام می‌شود.
 */
export function validateWord({ raw, level, foundWords }: ValidateWordInput): WordValidation {
  const word = normalizePersianWord(raw);

  if (word.length === 0) {
    return { status: 'rejected', word, reason: 'empty' };
  }
  if (!isPersianWord(word)) {
    return { status: 'rejected', word, reason: 'invalid_characters' };
  }
  if (word.length < Math.max(level.minWordLength, MIN_DICTIONARY_WORD_LENGTH)) {
    return { status: 'rejected', word, reason: 'too_short' };
  }
  if (word.length > level.maxWordLength) {
    return { status: 'rejected', word, reason: 'too_long' };
  }
  if (!isWordBuildable(word, level.letters)) {
    return { status: 'rejected', word, reason: 'letters_unavailable' };
  }
  if (!isDictionaryWord(word)) {
    return { status: 'rejected', word, reason: 'not_in_dictionary' };
  }
  if (foundWords.includes(word)) {
    return { status: 'rejected', word, reason: 'already_found' };
  }

  return { status: 'accepted', word, kind: wordKind(word, level) };
}

export function wordKind(word: string, level: Level): WordKind {
  const normalized = normalizePersianWord(word);
  return level.targetWords.includes(normalized) ? 'target' : 'bonus';
}

export function isTargetWord(word: string, level: Level): boolean {
  return wordKind(word, level) === 'target';
}

/** واژه‌های اصلی که هنوز پیدا نشده‌اند */
export function remainingTargetWords(level: Level, foundWords: readonly string[]): string[] {
  return level.targetWords.filter(word => !foundWords.includes(word));
}

/** همه واژه‌های قابل ساخت از حروف مرحله، بر پایه فهرست مرحله */
export function levelSolutions(level: Level): string[] {
  return [...level.targetWords, ...level.bonusWords];
}

export function wordLength(word: string): number {
  return lettersOf(word).length;
}
