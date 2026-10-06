import { DICTIONARY, getDictionaryWord, MIN_DICTIONARY_WORD_LENGTH } from '../../data/words/dictionary';
import type { Level } from '../../types';
import { isPersianLetter, isWordBuildable, lettersOf } from '../../utils/persian';

export interface LevelValidationIssue {
  levelId: number;
  message: string;
}

export interface LevelValidationResult {
  valid: boolean;
  errors: LevelValidationIssue[];
  warnings: LevelValidationIssue[];
}

const MIN_TARGET_WORDS = 3;
const MIN_TOTAL_SOLUTIONS = 5;

/**
 * اعتبارسنجی مرحله.
 *
 * این تابع در تولید مرحله‌ها و در تست‌ها استفاده می‌شود تا هیچ مرحله
 * غیرقابل‌حل، تکراری یا ناسازگار با دیکشنری وارد بازی نشود.
 */
export function validateLevel(level: Level): LevelValidationResult {
  const errors: LevelValidationIssue[] = [];
  const warnings: LevelValidationIssue[] = [];
  const fail = (message: string) => errors.push({ levelId: level.id, message });
  const warn = (message: string) => warnings.push({ levelId: level.id, message });

  if (!Number.isInteger(level.id) || level.id < 1) {
    fail('شناسه مرحله باید عددی مثبت باشد.');
  }
  if (level.title.trim().length === 0) {
    fail('عنوان مرحله خالی است.');
  }

  if (level.letters.length < 3) {
    fail('مرحله باید حداقل سه کاشی حرف داشته باشد.');
  }

  const invalidLetters = level.letters.filter(letter => !isPersianLetter(letter));
  if (invalidLetters.length > 0) {
    fail(`حروف نامعتبر در مرحله: ${invalidLetters.join('، ')}`);
  }

  const duplicateTiles = level.letters.filter(
    (letter, index) => level.letters.indexOf(letter) !== index,
  );
  const hasIntentionalDuplicates = duplicateTiles.length > 0;
  if (hasIntentionalDuplicates) {
    warnings.push({
      levelId: level.id,
      message: `مرحله حروف تکراری دارد (${[...new Set(duplicateTiles)].join('، ')})؛ این مجاز است و باید در انتساب کاشی‌ها درست مدیریت شود.`,
    });
  }

  if (level.maxWordLength !== level.letters.length) {
    fail('بیشترین طول کلمه باید برابر تعداد کاشی‌های مرحله باشد.');
  }
  if (level.minWordLength < MIN_DICTIONARY_WORD_LENGTH) {
    fail('کمترین طول کلمه نباید از حد دیکشنری کمتر باشد.');
  }
  if (level.minWordLength > level.maxWordLength) {
    fail('کمترین طول کلمه از بیشترین طول بزرگ‌تر است.');
  }

  if (level.targetWords.length < MIN_TARGET_WORDS) {
    fail(`مرحله باید حداقل ${MIN_TARGET_WORDS} واژه اصلی داشته باشد.`);
  }

  const uniqueTargets = new Set(level.targetWords);
  if (uniqueTargets.size !== level.targetWords.length) {
    fail('واژه‌های اصلی تکراری هستند.');
  }

  const uniqueBonus = new Set(level.bonusWords);
  if (uniqueBonus.size !== level.bonusWords.length) {
    fail('واژه‌های امتیازی تکراری هستند.');
  }

  for (const word of level.targetWords) {
    if (!getDictionaryWord(word)) {
      fail(`واژه اصلی «${word}» در دیکشنری نیست.`);
      continue;
    }
    if (!isWordBuildable(word, level.letters)) {
      fail(`واژه اصلی «${word}» از حروف مرحله ساخته نمی‌شود.`);
    }
    if (lettersOf(word).length < level.minWordLength) {
      fail(`واژه اصلی «${word}» کوتاه‌تر از حد مرحله است.`);
    }
    if (uniqueBonus.has(word)) {
      fail(`واژه «${word}» هم اصلی و هم امتیازی است.`);
    }
  }

  for (const word of level.bonusWords) {
    if (!getDictionaryWord(word)) {
      fail(`واژه امتیازی «${word}» در دیکشنری نیست.`);
      continue;
    }
    if (!isWordBuildable(word, level.letters)) {
      fail(`واژه امتیازی «${word}» از حروف مرحله ساخته نمی‌شود.`);
    }
  }

  const anchor = level.metadata.anchorWord;
  if (!anchor) {
    fail('واژه کلیدی مرحله (anchorWord) تعیین نشده است.');
  } else if (!uniqueTargets.has(anchor)) {
    fail(`واژه کلیدی «${anchor}» در فهرست واژه‌های اصلی نیست.`);
  } else if (lettersOf(anchor).length !== level.letters.length) {
    warn(`واژه کلیدی «${anchor}» از همه کاشی‌های مرحله استفاده نمی‌کند.`);
  }

  const allSolutions = new Set([...level.targetWords, ...level.bonusWords]);
  if (allSolutions.size < MIN_TOTAL_SOLUTIONS) {
    fail(`مرحله فقط ${allSolutions.size} جواب دارد؛ حداقل ${MIN_TOTAL_SOLUTIONS} لازم است.`);
  }

  const unusedLetters = level.letters.filter(
    letter => ![...allSolutions].some(solution => solution.includes(letter)),
  );
  if (unusedLetters.length > 0) {
    fail(`این حروف در هیچ جوابی استفاده نشده‌اند: ${[...new Set(unusedLetters)].join('، ')}`);
  }

  if (level.scoreReward <= 0 || level.coinReward <= 0 || level.hintCost <= 0) {
    fail('پاداش‌ها و هزینه راهنما باید مقدار مثبت داشته باشند.');
  }

  if (level.coinReward >= level.hintCost * 3) {
    warn('پاداش سکه مرحله در مقایسه با هزینه راهنما زیاد است.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateLevels(levels: readonly Level[]): LevelValidationResult {
  const errors: LevelValidationIssue[] = [];
  const warnings: LevelValidationIssue[] = [];

  const ids = new Set<number>();
  const letterSignatures = new Map<string, number>();

  for (const level of levels) {
    if (ids.has(level.id)) {
      errors.push({ levelId: level.id, message: 'شناسه مرحله تکراری است.' });
    }
    ids.add(level.id);

    const signature = [...level.letters].sort().join('');
    const previousId = letterSignatures.get(signature);
    if (previousId !== undefined) {
      warnings.push({
        levelId: level.id,
        message: `مجموعه حروف با مرحله ${previousId} یکسان است.`,
      });
    } else {
      letterSignatures.set(signature, level.id);
    }

    const result = validateLevel(level);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  const dictionaryWords = new Set(DICTIONARY.map(entry => entry.word));
  const usedWords = new Set(levels.flatMap(level => [...level.targetWords, ...level.bonusWords]));
  const unknown = [...usedWords].filter(word => !dictionaryWords.has(word));
  if (unknown.length > 0) {
    warnings.push({ levelId: 0, message: `واژه‌های خارج از دیکشنری: ${unknown.join('، ')}` });
  }

  return { valid: errors.length === 0, errors, warnings };
}
