/**
 * نرمال‌سازی متن فارسی.
 *
 * همه اعتبارسنجی‌ها روی شکل متعارف (canonical) کلمه انجام می‌شود تا هماهنگی
 * میان دیکشنری، مرحله‌ها و ورودی بازیکن تضمین شود. حروف فارسی پس از
 * نرمال‌سازی همیشه یک کدپوینت هستند؛ بنابراین هر حرف یک کاشی مستقل است.
 */

/** نگاشت حروف عربی به معادل فارسی */
const ARABIC_VARIANTS: Record<string, string> = {
  '\u064A': '\u06CC', // ي → ی
  '\u0649': '\u06CC', // ى → ی
  '\u0626': '\u06CC', // ئ → ی
  '\u0643': '\u06A9', // ك → ک
  '\u0629': '\u0647', // ة → ه
  '\u06C0': '\u0647', // ۀ → ه
  '\u0624': '\u0648', // ؤ → و
  '\u0623': '\u0627', // أ → ا
  '\u0625': '\u0627', // إ → ا
  '\u0671': '\u0627', // ٱ → ا
  '\u06BE': '\u0647', // ھ → ه
  '\u06D5': '\u0647', // ە → ه
};

/** اعراب و نشانه‌های ترکیبی که در شکل متعارف حذف می‌شوند */
const DIACRITICS = /[\u064B-\u0652\u0653-\u0655\u0670\u0640]/g;

/** نویسه‌های بی‌عرض: نیم‌فاصله، اتصال‌دهنده و فاصله بی‌عرض */
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

/** حروف الفبای فارسی که به‌عنوان کاشی بازی پذیرفته می‌شوند */
export const PERSIAN_LETTERS = [
  'ا',
  'ب',
  'پ',
  'ت',
  'ث',
  'ج',
  'چ',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'ژ',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ک',
  'گ',
  'ل',
  'م',
  'ن',
  'و',
  'ه',
  'ی',
  'آ',
] as const;

const PERSIAN_LETTER_SET = new Set<string>(PERSIAN_LETTERS);

/** نویسه‌های ویژه‌ای که پیش از پذیرش به کاشی تبدیل می‌شوند */
const EXTRA_LETTERS = new Set<string>(['ء']);

/**
 * شکل متعارف یک کلمه برای اعتبارسنجی: حروف عربی اصلاح می‌شوند، اعراب و
 * نویسه‌های بی‌عرض حذف می‌شوند و فاصله‌ها برداشته می‌شوند (بازی حرف‌محور است
 * و فاصله کاشی ندارد).
 */
export function normalizePersianWord(raw: string): string {
  if (!raw) {
    return '';
  }
  const normalizedUnicode = raw.normalize('NFC');
  const mapped = normalizedUnicode.replace(/[\s\u3000]+/g, '').replace(/\u0622\u0653/g, '\u0622');

  let result = '';
  for (const char of mapped.replace(ZERO_WIDTH, '').replace(DIACRITICS, '')) {
    result += ARABIC_VARIANTS[char] ?? char;
  }
  return result.replace(/\s+/g, '');
}

/**
 * نرمال‌سازی متن نمایشی (عنوان، توضیح، تاریخ): نیم‌فاصله حفظ می‌شود و فقط
 * فاصله‌های اضافی جمع می‌شوند.
 */
export function normalizePersianText(raw: string): string {
  if (!raw) {
    return '';
  }
  const mapped = raw.normalize('NFC').replace(/\u0622\u0653/g, '\u0622');
  let result = '';
  for (const char of mapped) {
    if (char === '\u200C' || char === '\u200D') {
      result += char;
      continue;
    }
    if (ZERO_WIDTH.test(char)) {
      continue;
    }
    result += ARABIC_VARIANTS[char] ?? char;
  }
  return result.replace(/[\s\u3000]+/g, ' ').trim();
}

/** حذف اعراب و یکسان‌سازی نویسه‌ها؛ برای مقایسه‌های تحمل‌پذیر */
export function foldPersianWord(raw: string): string {
  return normalizePersianWord(raw);
}

export function isPersianLetter(char: string): boolean {
  return PERSIAN_LETTER_SET.has(char) || EXTRA_LETTERS.has(char);
}

export function isPersianWord(raw: string): boolean {
  const normalized = normalizePersianWord(raw);
  if (normalized.length === 0) {
    return false;
  }
  return Array.from(normalized).every(isPersianLetter);
}

/** حروف یک کلمه را جدا می‌کند؛ روی شکل متعارف انجام می‌شود. */
export function lettersOf(word: string): string[] {
  return Array.from(normalizePersianWord(word));
}

/**
 * آیا کلمه تنها با حروف موجود ساخته می‌شود؟ تکرار حروف در نظر گرفته می‌شود،
 * بنابراین با حروف «ا ب ا ر» کلمه «اااب» پذیرفته نمی‌شود.
 */
export function isWordBuildable(word: string, availableLetters: readonly string[]): boolean {
  const remaining = new Map<string, number>();
  for (const letter of availableLetters) {
    remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
  }
  for (const letter of lettersOf(word)) {
    const count = remaining.get(letter) ?? 0;
    if (count <= 0) {
      return false;
    }
    remaining.set(letter, count - 1);
  }
  return true;
}

/** چند بار هر حرف در کلمه یا مجموعه حروف تکرار شده است */
export function letterCounts(letters: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const letter of letters) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return counts;
}

/** کلید مرتب‌شده حروف؛ برای مقایسه سریع دو مجموعه حرف */
export function letterKey(letters: readonly string[]): string {
  return [...letters].sort().join('');
}

/** مقایسه دو کلمه بر پایه شکل متعارف */
export function sameWord(a: string, b: string): boolean {
  return normalizePersianWord(a) === normalizePersianWord(b);
}
