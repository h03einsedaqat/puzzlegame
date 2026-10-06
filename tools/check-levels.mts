/**
 * اعتبارسنجی مرحله‌ها و پازل‌های روزانه.
 *
 * اجرا:  npm run levels:check
 *
 * این ابزار همان بررسی‌هایی را انجام می‌دهد که پیش از ساخت بسته لازم است:
 * منحنی سختی، ساخته‌شدن جواب‌ها از کاشی‌ها، وجود واژه کلیدی، یکتایی شناسه‌ها و
 * نبود مرحله بدون واژه امتیازی. اگر ایرادی پیدا شود، با کد خروج ناموفق پایان
 * می‌یابد تا در مسیر انتشار نادیده گرفته نشود.
 */
import { GAME_CONFIG } from '../src/constants/gameConfig';
import { DAILY_PUZZLES } from '../src/data/daily/dailyPuzzles';
import { LEVELS } from '../src/data/levels/levels';
import { isDictionaryWord } from '../src/data/words/dictionary';
import { validateLevel, validateLevels } from '../src/services/game/levelValidator';
import { isWordBuildable } from '../src/utils/persian';
import type { Difficulty, Level } from '../src/types';

const EXPECTED_CURVE: Record<Difficulty, number> = { easy: 15, medium: 15, hard: 10, expert: 10 };
const MIN_LEVELS = 50;

const problems: string[] = [];

function check(message: string, condition: boolean): void {
  if (!condition) {
    problems.push(message);
  }
}

function report(label: string, value: string | number): void {
  console.log(`${label}: ${value}`);
}

function inspect(levels: readonly Level[], label: string): void {
  for (const level of levels) {
    const report_ = validateLevel(level);
    if (!report_.valid) {
      problems.push(`${label} ${level.id}: ${report_.errors.map(issue => issue.message).join(' | ')}`);
      continue;
    }
    for (const word of [...level.targetWords, ...level.bonusWords]) {
      if (!isWordBuildable(word, level.letters)) {
        problems.push(`${label} ${level.id}: واژه «${word}» از کاشی‌های مرحله ساخته نمی‌شود`);
      }
      if (!isDictionaryWord(word)) {
        problems.push(`${label} ${level.id}: واژه «${word}» در واژه‌نامه نیست`);
      }
    }
    if (level.bonusWords.length === 0) {
      problems.push(`${label} ${level.id}: واژه امتیازی ندارد`);
    }
    if (level.metadata.anchorWord && !level.targetWords.includes(level.metadata.anchorWord)) {
      problems.push(`${label} ${level.id}: واژه کلیدی در فهرست واژه‌های اصلی نیست`);
    }
  }
}

function main(): void {
  console.log('— بررسی مرحله‌ها —');
  check(`تعداد مرحله‌ها کمتر از ${MIN_LEVELS} است`, LEVELS.length >= MIN_LEVELS);

  const distribution = LEVELS.reduce<Record<string, number>>((accumulator, level) => {
    accumulator[level.difficulty] = (accumulator[level.difficulty] ?? 0) + 1;
    return accumulator;
  }, {});
  for (const [difficulty, expected] of Object.entries(EXPECTED_CURVE)) {
    check(
      `تعداد مرحله‌های ${difficulty} با منحنی مورد نظر یکسان نیست (${distribution[difficulty] ?? 0} به‌جای ${expected})`,
      (distribution[difficulty] ?? 0) === expected,
    );
  }

  check('شناسه مرحله‌ها یکتا نیست', new Set(LEVELS.map(level => level.id)).size === LEVELS.length);
  check(
    'واژه کلیدی میان مرحله‌ها تکرار شده است',
    new Set(LEVELS.map(level => level.metadata.anchorWord)).size === LEVELS.length,
  );
  check('مجموعه مرحله‌ها معتبر نیست', validateLevels(LEVELS).valid);

  console.log('— بررسی پازل‌های روزانه —');
  check(
    `تعداد پازل‌های روزانه با پیکربندی یکسان نیست (${DAILY_PUZZLES.length} به‌جای ${GAME_CONFIG.daily.puzzleCount})`,
    DAILY_PUZZLES.length === GAME_CONFIG.daily.puzzleCount,
  );
  check('شناسه پازل‌ها یکتا نیست', new Set(DAILY_PUZZLES.map(puzzle => puzzle.id)).size === DAILY_PUZZLES.length);
  check('مجموعه پازل‌های روزانه معتبر نیست', validateLevels(DAILY_PUZZLES).valid);

  inspect(LEVELS, 'مرحله');
  inspect(DAILY_PUZZLES, 'پازل');

  const totalWords =
    LEVELS.reduce((total, level) => total + level.targetWords.length + level.bonusWords.length, 0) +
    DAILY_PUZZLES.reduce((total, puzzle) => total + puzzle.targetWords.length + puzzle.bonusWords.length, 0);

  report('مرحله‌ها', LEVELS.length);
  report('پازل‌های روزانه', DAILY_PUZZLES.length);
  report('کل جواب‌های تعریف‌شده', totalWords);
  report('توزیع سختی', JSON.stringify(distribution));

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`✗ ${problem}`);
    }
    throw new Error(`${problems.length} ایراد در داده مرحله‌ها پیدا شد.`);
  }

  console.log('✓ همه مرحله‌ها و پازل‌های روزانه سالم‌اند.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
