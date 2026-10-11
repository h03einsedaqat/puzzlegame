import { isPersianWord, lettersOf, normalizePersianWord } from '../../utils/persian';
import { WORDS } from './words';
import type { WordCategory, WordEntry, WordTier } from './types';

const ZWNJ = '\u200c';

export const MIN_DICTIONARY_WORD_LENGTH = 3;
export const MAX_DICTIONARY_WORD_LENGTH = 10;

export interface DictionaryWord {
  word: string;
  letters: string[];
  category: WordCategory;
  tier: WordTier;
}

/**
 * نمایه جست‌وجوی واژه‌ها. واژه‌های تکراری در دسته‌های مختلف یک‌بار شمرده
 * می‌شوند و سطح پرکاربردتر (basic) اولویت دارد.
 *
 * ⚠️ این ساخت هیچ مرتب‌سازی محلی‌وابسته (localeCompare) ندارد. در Hermes روی
 * اندروید، `localeCompare` گاهی چند ثانیه طول می‌کشد؛ اگر در مسیر بازی اجرا
 * شود، اولین ثبت واژه پس از شروع برنامه را کند می‌کند. ترتیب مرتب‌شده فقط
 * برای ابزار ساخت مرحله لازم است و تنها بار اول و خارج از بازی ساخته می‌شود
 * (ببینید getSortedDictionary).
 */
function buildDictionary(entries: readonly WordEntry[]): {
  words: DictionaryWord[];
  lookup: Map<string, DictionaryWord>;
  byLength: Map<number, DictionaryWord[]>;
} {
  const collected = new Map<string, DictionaryWord>();
  const rejected: string[] = [];

  for (const entry of entries) {
    // واژه‌های دارای نیم‌فاصله هرگز روی کاشی‌های مرحله ساخته نمی‌شوند، پس
    // وارد واژه‌نامه بازی نمی‌شوند تا شکل بی‌نیم‌فاصله‌شان پذیرفته نشود.
    if (entry.word.includes(ZWNJ)) {
      rejected.push(entry.word);
      continue;
    }
    const word = normalizePersianWord(entry.word);
    if (!isPersianWord(entry.word) || word.length > MAX_DICTIONARY_WORD_LENGTH || word.length < 2) {
      rejected.push(entry.word);
      continue;
    }
    const existing = collected.get(word);
    if (existing) {
      if (existing.tier === 'extended' && entry.tier === 'basic') {
        collected.set(word, { ...existing, tier: 'basic', category: entry.category });
      }
      continue;
    }
    collected.set(word, {
      word,
      letters: lettersOf(word),
      category: entry.category,
      tier: entry.tier,
    });
  }

  if (rejected.length > 0 && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`واژه‌های نامعتبر در واژه‌نامه نادیده گرفته شدند: ${rejected.join('، ')}`);
  }

  const words = [...collected.values()];
  const byLength = new Map<number, DictionaryWord[]>();
  for (const entry of words) {
    const bucket = byLength.get(entry.word.length);
    if (bucket) {
      bucket.push(entry);
    } else {
      byLength.set(entry.word.length, [entry]);
    }
  }

  return {
    words,
    lookup: new Map(words.map(entry => [entry.word, entry])),
    byLength,
  };
}

const dictionary = buildDictionary(WORDS);

/** همه واژه‌ها به ترتیب ورود (بدون مرتب‌سازی؛ برای بررسی‌های بدون ترتیب) */
export const DICTIONARY_WORDS: readonly DictionaryWord[] = dictionary.words;
export const DICTIONARY_SIZE = DICTIONARY_WORDS.length;

let sortedDictionary: DictionaryWord[] | null = null;

/**
 * واژه‌ها به ترتیب فارسی مرتب‌شده. فقط ابزارهای ساخت مرحله (Node) به آن نیاز
 * دارند و در مسیر بازی فراخوانی نمی‌شود؛ نتیجه کش می‌شود.
 */
export function getSortedDictionary(): readonly DictionaryWord[] {
  if (!sortedDictionary) {
    sortedDictionary = [...dictionary.words].sort((a, b) => a.word.localeCompare(b.word, 'fa'));
  }
  return sortedDictionary;
}

/** پیش‌گرم‌سازی: ماژول دیکشنری را هنگام شروع برنامه (نه اولین ثبت واژه) ارزیابی می‌کند. */
export function warmUpDictionary(): number {
  return DICTIONARY_SIZE;
}

export function isDictionaryWord(word: string): boolean {
  return dictionary.lookup.has(normalizePersianWord(word));
}

export function getDictionaryWord(word: string): DictionaryWord | undefined {
  return dictionary.lookup.get(normalizePersianWord(word));
}

export function wordsOfLength(length: number): readonly DictionaryWord[] {
  return dictionary.byLength.get(length) ?? [];
}

export function getCategoryWords(category: WordCategory): readonly DictionaryWord[] {
  return getSortedDictionary().filter(entry => entry.category === category);
}

export type { WordCategory, WordTier };
