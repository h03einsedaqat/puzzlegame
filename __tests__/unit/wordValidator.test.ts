import { getLevelById } from '../../src/data/levels/levels';
import { levelSolutions, remainingTargetWords, validateWord, wordKind } from '../../src/services/game/wordValidator';
import type { Level } from '../../src/types';

const level: Level = {
  id: 9001,
  title: 'مرحله آزمایشی',
  difficulty: 'easy',
  letters: ['ک', 'ت', 'ا', 'ب'],
  targetWords: ['کتاب'],
  bonusWords: ['تاب'],
  minWordLength: 3,
  maxWordLength: 4,
  scoreReward: 60,
  coinReward: 8,
  hintCost: 15,
  metadata: { category: 'مدرسه', anchorWord: 'کتاب' },
};

function reasonOf(result: ReturnType<typeof validateWord>): string {
  return result.status === 'rejected' ? result.reason : `accepted:${result.word}`;
}

describe('اعتبارسنجی واژه — هفت بررسی به ترتیب', () => {
  it('۱) واژه خالی را رد می‌کند', () => {
    const result = validateWord({ raw: '   ', level, foundWords: [] });
    expect(result).toEqual({ status: 'rejected', word: '', reason: 'empty' });
  });

  it('۲) نویسه غیرفارسی را رد می‌کند', () => {
    expect(reasonOf(validateWord({ raw: 'کت4ب', level, foundWords: [] }))).toBe('invalid_characters');
    expect(reasonOf(validateWord({ raw: 'book', level, foundWords: [] }))).toBe('invalid_characters');
  });

  it('۳) واژه کوتاه‌تر از حد مرحله را رد می‌کند', () => {
    expect(reasonOf(validateWord({ raw: 'تب', level, foundWords: [] }))).toBe('too_short');
    expect(reasonOf(validateWord({ raw: 'تب', level: { ...level, minWordLength: 2 }, foundWords: [] }))).toBe('too_short');
  });

  it('۴) واژه بلندتر از کاشی‌های مرحله را رد می‌کند', () => {
    expect(reasonOf(validateWord({ raw: 'کتابخانه', level, foundWords: [] }))).toBe('too_long');
  });

  it('۵) واژه‌ای که با حروف مرحله ساخته نمی‌شود را رد می‌کند', () => {
    // «کار» به حرف «ر» نیاز دارد که در کاشی‌های مرحله نیست
    expect(reasonOf(validateWord({ raw: 'کار', level, foundWords: [] }))).toBe('letters_unavailable');
    // «کتابها» به دو «ا» نیاز دارد اما یک کاشی «ا» موجود است
    expect(reasonOf(validateWord({ raw: 'کتابا', level: { ...level, maxWordLength: 5 }, foundWords: [] }))).toBe('letters_unavailable');
  });

  it('۶) واژه ساخته‌شدنی که در واژه‌نامه نیست را رد می‌کند', () => {
    expect(reasonOf(validateWord({ raw: 'بتکا', level, foundWords: [] }))).toBe('not_in_dictionary');
  });

  it('۷) واژه تکراری را رد می‌کند', () => {
    expect(reasonOf(validateWord({ raw: 'کتاب', level, foundWords: ['کتاب'] }))).toBe('already_found');
    expect(reasonOf(validateWord({ raw: 'كِتاب', level, foundWords: ['کتاب'] }))).toBe('already_found');
  });

  it('واژه اصلی مرحله را می‌پذیرد و شکل متعارف را برمی‌گرداند', () => {
    expect(validateWord({ raw: 'كِتاب', level, foundWords: [] })).toEqual({
      status: 'accepted',
      word: 'کتاب',
      kind: 'target',
    });
  });

  it('واژه معتبر خارج از فهرست مرحله را «امتیازی» می‌داند', () => {
    const result = validateWord({ raw: 'تاب', level: { ...level, bonusWords: [] }, foundWords: [] });
    expect(result).toEqual({ status: 'accepted', word: 'تاب', kind: 'bonus' });
  });
});

describe('حروف تکراری', () => {
  const doubleLevel: Level = {
    ...level,
    letters: ['ا', 'ن', 'ا', 'ر'],
    targetWords: ['انار'],
    bonusWords: [],
    maxWordLength: 4,
  };

  it('واژه با دو حرف یکسان را وقتی دو کاشی موجود است می‌پذیرد', () => {
    expect(validateWord({ raw: 'انار', level: doubleLevel, foundWords: [] })).toEqual({
      status: 'accepted',
      word: 'انار',
      kind: 'target',
    });
  });

  it('همان واژه را با یک کاشی کمتر رد می‌کند', () => {
    const single = { ...doubleLevel, letters: ['ا', 'ن', 'ر'] };
    expect(reasonOf(validateWord({ raw: 'انار', level: single, foundWords: [] }))).toBe('letters_unavailable');
  });
});

describe('کمکی‌های اعتبارسنجی', () => {
  const realLevel = getLevelById(1) as Level;

  it('نوع واژه را از فهرست مرحله تشخیص می‌دهد', () => {
    expect(wordKind(realLevel.targetWords[0] as string, realLevel)).toBe('target');
    expect(wordKind(realLevel.bonusWords[0] as string, realLevel)).toBe('bonus');
  });

  it('واژه‌های اصلی باقی‌مانده را برمی‌گرداند', () => {
    const [first, ...rest] = realLevel.targetWords;
    expect(remainingTargetWords(realLevel, [first as string])).toEqual(rest);
  });

  it('فهرست جواب‌های مرحله شامل واژه‌های اصلی و امتیازی است', () => {
    const solutions = levelSolutions(realLevel);
    for (const word of realLevel.targetWords) {
      expect(solutions).toContain(word);
    }
    for (const word of realLevel.bonusWords) {
      expect(solutions).toContain(word);
    }
  });
});
