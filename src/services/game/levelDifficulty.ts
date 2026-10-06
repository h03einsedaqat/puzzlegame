import type { Difficulty } from '../../types';

/**
 * مدل سختی مرحله.
 *
 * سختی فقط به تعداد حروف وابسته نیست؛ تعداد جواب‌ها، طول واژه‌ها، حضور حروف
 * کم‌کاربرد، شباهت جواب‌ها به هم و میزان انشعاب (تعداد شروع‌های متفاوت) هم
 * در محاسبه اثر دارند.
 */

/** حروفی که در فارسی کم‌کاربردترند و مرحله را سخت‌تر می‌کنند */
export const RARE_LETTERS = ['ژ', 'ذ', 'ض', 'ظ', 'ث', 'غ', 'ح', 'ص', 'ط', 'ع', 'ق'] as const;

export interface DifficultyFactors {
  /** تعداد کاشی‌های حروف مرحله */
  letterCount: number;
  /** تعداد کل واژه‌های قابل ساخت از حروف مرحله */
  solutionCount: number;
  /** تعداد واژه‌های اصلی */
  targetCount: number;
  /** میانگین طول همه جواب‌ها */
  averageSolutionLength: number;
  /** نسبت جواب‌های پنج‌حرفی و بلندتر */
  longWordRatio: number;
  /** نسبت حروف کم‌کاربرد در مجموعه حروف */
  rareLetterRatio: number;
  /** نسبت جواب‌هایی که با جوابی دیگر فقط یک حرف تفاوت دارند */
  similarity: number;
  /** تنوع شروع جواب‌ها؛ انشعاب کمتر یعنی مسیر روشن‌تر */
  branching: number;
}

/**
 * آستانه‌ها روی مجموعه مرحله‌های فعلی کالیبره شده‌اند (ابزار levels:build
 * توزیع سختی را گزارش می‌دهد). با تغییر واژه‌نامه یا مدل، این اعداد باید
 * دوباره کالیبره شوند.
 */
export const DIFFICULTY_THRESHOLDS = {
  medium: 39,
  hard: 47,
  expert: 52,
} as const;

const RARE_LETTER_SET = new Set<string>(RARE_LETTERS);

export function rareLetterCount(letters: readonly string[]): number {
  return letters.filter(letter => RARE_LETTER_SET.has(letter)).length;
}

/** فاصله ویرایشی (لِوِنشتاین) برای سنجش شباهت جواب‌ها */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);

  for (let row = 1; row < rows; row += 1) {
    const current: number[] = [row];
    for (let col = 1; col < cols; col += 1) {
      const substitution = (previous[col - 1] ?? 0) + (a[row - 1] === b[col - 1] ? 0 : 1);
      const insertion = (previous[col] ?? 0) + 1;
      const deletion = (current[col - 1] ?? 0) + 1;
      current[col] = Math.min(substitution, insertion, deletion);
    }
    previous = current;
  }

  return previous[cols - 1] ?? 0;
}

export function similarityRatio(solutions: readonly string[]): number {
  if (solutions.length < 2) {
    return 0;
  }
  let close = 0;
  let pairs = 0;
  for (let i = 0; i < solutions.length; i += 1) {
    for (let j = i + 1; j < solutions.length; j += 1) {
      const a = solutions[i];
      const b = solutions[j];
      if (a === undefined || b === undefined) {
        continue;
      }
      pairs += 1;
      if (editDistance(a, b) <= 1) {
        close += 1;
      }
    }
  }
  return pairs === 0 ? 0 : close / pairs;
}

export function branchingRatio(solutions: readonly string[]): number {
  if (solutions.length === 0) {
    return 0;
  }
  const starts = new Set(solutions.map(solution => solution[0] ?? ''));
  return starts.size / solutions.length;
}

export function computeDifficultyScore(factors: DifficultyFactors): number {
  const letterPressure = Math.max(0, factors.letterCount - 3) * 9;
  const lengthPressure = Math.max(0, factors.averageSolutionLength - 3.2) * 8;
  const solutionRelief = Math.max(0, 9 - factors.solutionCount) * 2.4;
  const targetLoad = Math.max(0, factors.targetCount - 3) * 1.6;

  const raw =
    letterPressure +
    lengthPressure +
    solutionRelief +
    targetLoad +
    factors.longWordRatio * 16 +
    factors.rareLetterRatio * 26 +
    factors.similarity * 12 +
    (1 - Math.min(factors.branching, 1)) * 8;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function difficultyFromScore(score: number): Difficulty {
  if (score < DIFFICULTY_THRESHOLDS.medium) {
    return 'easy';
  }
  if (score < DIFFICULTY_THRESHOLDS.hard) {
    return 'medium';
  }
  if (score < DIFFICULTY_THRESHOLDS.expert) {
    return 'hard';
  }
  return 'expert';
}
