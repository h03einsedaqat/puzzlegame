/**
 * تولید مرحله‌ها و چالش‌های روزانه از واژه‌نامه.
 *
 * اجرا:  npm run levels:build
 *
 * خروجی:
 *   src/data/levels/levels.ts        → مرحله‌های اصلی بازی
 *   src/data/daily/dailyPuzzles.ts   → پازل‌های چالش روزانه
 *
 * مرحله‌های اصلی: هر مرحله یک «واژه کلیدی» دارد که از همه کاشی‌های مرحله
 * استفاده می‌کند؛ همین واژه، تم و دسته‌بندی مرحله را تعیین می‌کند.
 *
 * پازل‌های روزانه: از مجموعه‌حروف ساخته می‌شوند (نه واژه کلیدی)، تا تنوع
 * کافی برای یک چرخه دو ماهه بدون تکرار وجود داشته باشد.
 *
 * هر خروجی پیش از نوشتن با validateLevel بررسی و توزیع سختی با منحنی مورد
 * نظر مقایسه می‌شود.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { DICTIONARY, type DictionaryWord } from '../src/data/words/dictionary';
import { DAILY_TITLES, LEVEL_TITLES } from '../src/data/levels/levelTitles';
import { GAME_CONFIG } from '../src/constants/gameConfig';
import {
  DIFFICULTY_THRESHOLDS,
  branchingRatio,
  computeDifficultyScore,
  difficultyFromScore,
  rareLetterCount,
  similarityRatio,
} from '../src/services/game/levelDifficulty';
import { validateLevel, validateLevels } from '../src/services/game/levelValidator';
import type { Difficulty, Level } from '../src/types';
import { isWordBuildable, lettersOf } from '../src/utils/persian';
import { createRandom } from '../src/utils/random';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 20261006;
const MIN_WORD_LENGTH = GAME_CONFIG.gameplay.minWordLength;

const SCHEDULE: { difficulty: Difficulty; count: number }[] = [
  { difficulty: 'easy', count: 15 },
  { difficulty: 'medium', count: 15 },
  { difficulty: 'hard', count: 10 },
  { difficulty: 'expert', count: 10 },
];

/** تعداد واژه اصلی در پازل چالش روزانه */
const DAILY_TARGET_COUNT = 4;

const TARGET_COUNT_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 3,
  medium: 4,
  hard: 4,
  expert: 5,
};

const HINT_COST_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 15,
  medium: 15,
  hard: 20,
  expert: 25,
};

interface LetterSet {
  letters: string[];
  solutions: string[];
  score: number;
  difficulty: Difficulty;
}

interface LevelCandidate extends LetterSet {
  anchor: DictionaryWord;
  targetCount: number;
}

function writeSource(relativePath: string, content: string): void {
  const target = path.join(ROOT, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

function letterSignature(letters: readonly string[]): string {
  return [...letters].sort().join('');
}

function solutionsFor(letters: readonly string[]): string[] {
  return DICTIONARY.filter(
    entry => entry.word.length >= MIN_WORD_LENGTH && isWordBuildable(entry.word, letters),
  ).map(entry => entry.word);
}

function maxLetterRepeat(letters: readonly string[]): number {
  const counts = new Map<string, number>();
  for (const letter of letters) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return Math.max(...counts.values());
}

function distinctLetters(letters: readonly string[]): number {
  return new Set(letters).size;
}

function unusedLetters(letters: readonly string[], solutions: readonly string[]): string[] {
  return letters.filter(letter => !solutions.some(solution => solution.includes(letter)));
}

function scoreLetterSet(letters: readonly string[], solutions: readonly string[]): number {
  return computeDifficultyScore({
    letterCount: letters.length,
    solutionCount: solutions.length,
    targetCount: TARGET_COUNT_BY_DIFFICULTY.easy,
    averageSolutionLength:
      solutions.reduce((total, solution) => total + solution.length, 0) / solutions.length,
    longWordRatio: solutions.filter(solution => solution.length >= 5).length / solutions.length,
    rareLetterRatio: rareLetterCount(letters) / letters.length,
    similarity: similarityRatio(solutions),
    branching: branchingRatio(solutions),
  });
}

function isSolutionsSane(solutions: readonly string[]): boolean {
  if (solutions.length < 5 || solutions.length > 20) {
    return false;
  }
  // اگر بیشتر جواب‌ها هم‌طول کاشی‌ها باشند، مرحله به جای کشف، جست‌وجوی خسته‌کننده می‌شود
  const fullLength = solutions.filter(solution => solution.length === solutions[0]?.length).length;
  return fullLength <= 4;
}

function buildLevelCandidate(anchor: DictionaryWord): LevelCandidate | null {
  const letters = lettersOf(anchor.word);
  if (letters.length < 4 || letters.length > 7) {
    return null;
  }
  if (maxLetterRepeat(letters) > 2 || distinctLetters(letters) < 3) {
    return null;
  }

  const solutions = solutionsFor(letters);
  if (!solutions.includes(anchor.word)) {
    return null;
  }
  if (!isSolutionsSane(solutions) || unusedLetters(letters, solutions).length > 0) {
    return null;
  }

  const score = scoreLetterSet(letters, solutions);
  const difficulty = difficultyFromScore(score);
  // هر مرحله باید دست‌کم یک واژه امتیازی داشته باشد تا مفهوم «واژه‌های اضافه»
  // در همه مسیر بازی حفظ شود.
  if (solutions.length <= TARGET_COUNT_BY_DIFFICULTY[difficulty]) {
    return null;
  }
  return {
    anchor,
    letters,
    solutions,
    score,
    difficulty,
    targetCount: TARGET_COUNT_BY_DIFFICULTY[difficulty],
  };
}

/**
 * نامزدهای بدون واژه کلیدی: هر مجموعه‌حرف تازه‌ای که جواب‌های کافی دارد.
 * برای واژه کلیدی، بلندترین جواب انتخاب می‌شود.
 */
function buildLetterSetCandidates(): LetterSet[] {
  const sets = new Map<string, string[]>();
  const frequent = ['ا', 'ر', 'س', 'م', 'ن', 'ت', 'ب', 'د', 'ک', 'ی', 'و', 'ه', 'ل', 'ش', 'پ', 'ز', 'گ', 'ف'];

  const consider = (letters: string[]) => {
    if (letters.length < 4 || letters.length > 6) {
      return;
    }
    if (maxLetterRepeat(letters) > 2 || distinctLetters(letters) < 3) {
      return;
    }
    const signature = letterSignature(letters);
    if (!sets.has(signature)) {
      sets.set(signature, letters);
    }
  };

  const random = createRandom(SEED + 13);
  for (const entry of DICTIONARY) {
    const letters = lettersOf(entry.word);
    consider([...letters]);
    // جابه‌جایی یک حرف با حروف پرکاربرد، مجموعه‌های تازه می‌سازد
    for (let index = 0; index < letters.length; index += 1) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const swap = frequent[Math.floor(random() * frequent.length)];
        if (!swap) {
          continue;
        }
        const mutated = [...letters];
        mutated[index] = swap;
        consider(mutated);
      }
    }
  }

  const candidates: LetterSet[] = [];
  for (const letters of sets.values()) {
    const solutions = solutionsFor(letters);
    if (!isSolutionsSane(solutions) || unusedLetters(letters, solutions).length > 0) {
      continue;
    }
    const score = scoreLetterSet(letters, solutions);
    candidates.push({
      letters,
      solutions,
      score,
      difficulty: difficultyFromScore(score),
    });
  }
  return candidates;
}

function sortSolutions(solutions: readonly string[]): string[] {
  return [...solutions].sort((a, b) => b.length - a.length || a.localeCompare(b, 'fa'));
}

function buildLevel(candidate: LevelCandidate, id: number, title: string, isTutorial: boolean): Level {
  const ordered = sortSolutions(candidate.solutions);
  const targets = [candidate.anchor.word, ...ordered.filter(word => word !== candidate.anchor.word)]
    .slice(0, candidate.targetCount)
    .filter((word, index, all) => all.indexOf(word) === index);

  const finalTargets = isTutorial
    ? [...targets].sort((a, b) => a.length - b.length || a.localeCompare(b, 'fa'))
    : targets;

  const bonus = ordered.filter(word => !finalTargets.includes(word));

  return {
    id,
    title,
    difficulty: candidate.difficulty,
    letters: candidate.letters,
    targetWords: finalTargets,
    bonusWords: bonus,
    minWordLength: MIN_WORD_LENGTH,
    maxWordLength: candidate.letters.length,
    scoreReward: GAME_CONFIG.levelRewardByDifficulty[candidate.difficulty].score + bonus.length * 5,
    coinReward: GAME_CONFIG.levelRewardByDifficulty[candidate.difficulty].coins,
    hintCost: HINT_COST_BY_DIFFICULTY[candidate.difficulty],
    metadata: {
      category: candidate.anchor.category,
      anchorWord: candidate.anchor.word,
      ...(isTutorial ? { isTutorial: true } : {}),
    },
  };
}

function buildDailyPuzzle(set: LetterSet, id: number, title: string): Level {
  const ordered = sortSolutions(set.solutions);
  // چهار واژه اصلی و بقیه امتیازی: چالش روزانه هم مثل مرحله‌های اصلی مفهوم
  // «واژه امتیازی» را دارد.
  const targets = ordered.slice(0, DAILY_TARGET_COUNT);
  const anchor = targets[0] ?? ordered[0] ?? '';
  const anchorEntry = DICTIONARY.find(entry => entry.word === anchor);

  return {
    id,
    title,
    difficulty: set.difficulty,
    letters: set.letters,
    targetWords: targets,
    bonusWords: ordered.filter(word => !targets.includes(word)),
    minWordLength: MIN_WORD_LENGTH,
    maxWordLength: set.letters.length,
    scoreReward: GAME_CONFIG.daily.challengeScoreReward,
    coinReward: GAME_CONFIG.daily.challengeCoinReward,
    hintCost: HINT_COST_BY_DIFFICULTY[set.difficulty],
    metadata: {
      category: anchorEntry?.category ?? 'عمومی',
      anchorWord: anchor,
    },
  };
}

/** مرحله آموزشی: کوچک، ساده و با واژه‌های پرکاربرد. */
function pickTutorialCandidate(
  candidates: readonly LevelCandidate[],
  used: ReadonlySet<string>,
): LevelCandidate | null {
  const friendlyCategories = new Set(['خانه', 'خوراکی', 'حیوانات', 'طبیعت', 'بدن', 'اشیا', 'مدرسه']);
  const options = candidates.filter(
    candidate =>
      !used.has(candidate.anchor.word) &&
      candidate.letters.length === 4 &&
      candidate.solutions.length >= 3 &&
      candidate.solutions.length <= 6 &&
      candidate.solutions.some(solution => solution.length === 3) &&
      candidate.solutions.every(
        solution => DICTIONARY.find(entry => entry.word === solution)?.tier === 'basic',
      ) &&
      friendlyCategories.has(candidate.anchor.category),
  );

  // بازی آموزشی باید ساده باشد اما یک واژه امتیازی هم داشته باشد تا هر دو
  // مفهوم «همه واژه‌های اصلی» و «واژه امتیازی» در همان مرحله آموزش داده شود.
  options.sort(
    (a, b) =>
      a.solutions.length - b.solutions.length ||
      a.score - b.score ||
      a.anchor.word.localeCompare(b.anchor.word, 'fa'),
  );
  return options[0] ?? null;
}

function pickLevelCandidates(): {
  levels: Level[];
  usedAnchors: Set<string>;
  usedSignatures: Set<string>;
  thresholds: { medium: number; hard: number; expert: number };
  candidateScores: number[];
} {
  const candidates = DICTIONARY.map(buildLevelCandidate).filter(
    (candidate): candidate is LevelCandidate => candidate !== null,
  );

  const candidateScores = candidates.map(candidate => candidate.score);
  const usedAnchors = new Set<string>();
  const usedSignatures = new Set<string>();
  const tutorial = pickTutorialCandidate(candidates, usedAnchors);
  if (tutorial) {
    usedAnchors.add(tutorial.anchor.word);
    usedSignatures.add(letterSignature(tutorial.letters));
  }

  // نامزدها بر پایه مدل سختی در چهار پله دسته‌بندی می‌شوند. آستانه‌ها روی
  // صدک‌های ۳۰، ۶۰ و ۸۰ مجموعه نامزدها کالیبره شده‌اند.
  const bands: Record<Difficulty, LevelCandidate[]> = {
    easy: [],
    medium: [],
    hard: [],
    expert: [],
  };
  for (const candidate of candidates) {
    if (usedAnchors.has(candidate.anchor.word)) {
      continue;
    }
    bands[candidate.difficulty].push(candidate);
  }
  for (const band of Object.values(bands)) {
    band.sort((a, b) => a.score - b.score || a.anchor.word.localeCompare(b.anchor.word, 'fa'));
  }

  const plan: { difficulty: Difficulty; count: number }[] = [
    { difficulty: 'easy', count: SCHEDULE[0]!.count - (tutorial ? 1 : 0) },
    { difficulty: 'medium', count: SCHEDULE[1]!.count },
    { difficulty: 'hard', count: SCHEDULE[2]!.count },
    { difficulty: 'expert', count: SCHEDULE[3]!.count },
  ];
  const fallbackOrder: Record<Difficulty, Difficulty[]> = {
    easy: ['easy', 'medium', 'hard', 'expert'],
    medium: ['medium', 'hard', 'easy', 'expert'],
    hard: ['hard', 'expert', 'medium', 'easy'],
    expert: ['expert', 'hard', 'medium', 'easy'],
  };

  const chosen: LevelCandidate[] = [];
  for (const step of plan) {
    let remaining = step.count;
    for (const band of fallbackOrder[step.difficulty]) {
      const queue = bands[band];
      while (remaining > 0 && queue.length > 0) {
        const candidate = queue.shift();
        if (!candidate) {
          break;
        }
        if (usedAnchors.has(candidate.anchor.word)) {
          continue;
        }
        const signature = letterSignature(candidate.letters);
        if (usedSignatures.has(signature)) {
          continue;
        }
        usedAnchors.add(candidate.anchor.word);
        usedSignatures.add(signature);
        chosen.push(candidate);
        remaining -= 1;
      }
      if (remaining === 0) {
        break;
      }
    }
    if (remaining > 0) {
      throw new Error(`برای پله ${step.difficulty} به ${remaining} مرحله کم داریم.`);
    }
  }

  chosen.sort((a, b) => a.score - b.score);

  const levels: Level[] = [];
  if (tutorial) {
    levels.push(
      buildLevel(
        {
          ...tutorial,
          difficulty: 'easy',
          targetCount: Math.max(1, tutorial.solutions.length - 1),
        },
        1,
        LEVEL_TITLES[0] ?? 'شروعی تازه',
        true,
      ),
    );
  }
  for (const candidate of chosen) {
    levels.push(
      buildLevel(
        candidate,
        levels.length + 1,
        LEVEL_TITLES[levels.length % LEVEL_TITLES.length] ?? `مرحله ${levels.length + 1}`,
        false,
      ),
    );
  }

  const mismatches = levels.filter((level, index) => {
    const candidate = index === 0 && tutorial ? tutorial : chosen[index - (tutorial ? 1 : 0)];
    if (!candidate) {
      return false;
    }
    return difficultyFromScore(candidate.score) !== level.difficulty;
  });
  if (mismatches.length > 0) {
    throw new Error(
      `درجه سختی این مرحله‌ها با مدل ناسازگار است: ${mismatches.map(level => level.id).join('، ')}`,
    );
  }

  return {
    levels,
    usedAnchors,
    usedSignatures,
    thresholds: DIFFICULTY_THRESHOLDS,
    candidateScores,
  };
}

function cumulative(index: number): number {
  let total = 0;
  for (let step = 0; step <= index && step < SCHEDULE.length; step += 1) {
    total += SCHEDULE[step]?.count ?? 0;
  }
  return total;
}

function pickDailyPuzzles(
  usedSignatures: ReadonlySet<string>,
): Level[] {
  const candidates = buildLetterSetCandidates()
    .filter(candidate => !usedSignatures.has(letterSignature(candidate.letters)))
    .sort((a, b) => a.score - b.score);

  const random = createRandom(SEED + 29);
  const wanted = GAME_CONFIG.daily.puzzleCount;
  const seen = new Set<string>();
  const chosen: LetterSet[] = [];

  // یک‌سوم آسان/متوسط و دو‌سوم سخت‌تر، تا چالش روزانه حس ویژه داشته باشد
  const bands: Record<Difficulty, LetterSet[]> = { easy: [], medium: [], hard: [], expert: [] };
  for (const candidate of candidates) {
    bands[candidate.difficulty].push(candidate);
  }
  const plan: { difficulty: Difficulty; count: number }[] = [
    { difficulty: 'medium', count: Math.round(wanted * 0.25) },
    { difficulty: 'hard', count: Math.round(wanted * 0.4) },
    { difficulty: 'expert', count: Math.round(wanted * 0.35) },
  ];

  for (const step of plan) {
    const queues = [bands[step.difficulty], bands.easy, bands.medium, bands.hard, bands.expert];
    let remaining = step.count;
    for (const queue of queues) {
      while (remaining > 0 && queue.length > 0) {
        const candidate = queue.shift();
        if (!candidate) {
          break;
        }
        const signature = letterSignature(candidate.letters);
        if (seen.has(signature)) {
          continue;
        }
        seen.add(signature);
        chosen.push(candidate);
        remaining -= 1;
      }
      if (remaining === 0) {
        break;
      }
    }
    if (remaining > 0) {
      throw new Error(`برای پازل روزانه ${step.difficulty} به ${remaining} مورد کم داریم.`);
    }
  }

  chosen.sort((a, b) => a.score - b.score);
  return chosen.map((set, index) =>
    buildDailyPuzzle(set, 1000 + index + 1, DAILY_TITLES[index % DAILY_TITLES.length] ?? 'پازل امروز'),
  );
}

function formatLevel(level: Level): string {
  const letters = level.letters.map(letter => `'${letter}'`).join(', ');
  const targets = level.targetWords.map(word => `'${word}'`).join(', ');
  const bonus = level.bonusWords.map(word => `'${word}'`).join(', ');
  const tutorial = level.metadata.isTutorial ? '\n      isTutorial: true,' : '';
  return `  {
    id: ${level.id},
    title: '${level.title}',
    difficulty: '${level.difficulty}',
    letters: [${letters}],
    targetWords: [${targets}],
    bonusWords: [${bonus}],
    minWordLength: ${level.minWordLength},
    maxWordLength: ${level.maxWordLength},
    scoreReward: ${level.scoreReward},
    coinReward: ${level.coinReward},
    hintCost: ${level.hintCost},
    metadata: {
      category: '${level.metadata.category}',
      anchorWord: '${level.metadata.anchorWord}',${tutorial}
    },
  },`;
}

function writeLevelsFile(levels: readonly Level[]): void {
  const header = `import type { Level } from '../../types';

/**
 * این فایل با اجرای «npm run levels:build» تولید می‌شود؛ ویرایش دستی آن با
 * اجرای بعدی ابزار از بین می‌رود. برای تغییر مرحله‌ها، واژه‌نامه یا مدل سختی را
 * به‌روزرسانی کن و ابزار را دوباره اجرا کن.
 *
 * هر مرحله با validateLevel اعتبارسنجی شده است: همه واژه‌ها از حروف مرحله
 * ساخته می‌شوند، تکراری نیستند و هیچ حرفی بدون استفاده نمی‌ماند.
 */
export const LEVELS: readonly Level[] = [`;

  const body = levels.map(formatLevel).join('\n');
  const footer = `];

export const LEVEL_COUNT = LEVELS.length;

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find(level => level.id === id);
}

export function getFirstLevelId(): number {
  return LEVELS[0]?.id ?? 1;
}

export function getNextLevelId(currentId: number): number | null {
  const index = LEVELS.findIndex(level => level.id === currentId);
  if (index < 0 || index + 1 >= LEVELS.length) {
    return null;
  }
  return LEVELS[index + 1]?.id ?? null;
}

export function getLevelsByDifficulty(difficulty: Level['difficulty']): readonly Level[] {
  return LEVELS.filter(level => level.difficulty === difficulty);
}
`;

  writeSource('src/data/levels/levels.ts', `${header}\n${body}\n${footer}`);
}

function writeDailyFile(puzzles: readonly Level[]): void {
  const header = `import type { Level } from '../../types';

/**
 * پازل‌های چالش روزانه. تولید با «npm run levels:build».
 *
 * انتخاب پازل هر روز قطعی است و از تاریخ میلادی (YYYY-MM-DD) مشتق می‌شود؛
 * بنابراین همه کاربران در یک روز پازل یکسان می‌بینند و پاداش فقط یک بار در
 * روز قابل دریافت است. پس از پایان چرخه، پازل‌ها از ابتدا تکرار می‌شوند.
 */
export const DAILY_PUZZLES: readonly Level[] = [`;

  const body = puzzles.map(formatLevel).join('\n');
  const footer = `];

export const DAILY_PUZZLE_COUNT = DAILY_PUZZLES.length;

export function getDailyPuzzleByIndex(index: number): Level {
  const normalized = ((index % DAILY_PUZZLE_COUNT) + DAILY_PUZZLE_COUNT) % DAILY_PUZZLE_COUNT;
  const puzzle = DAILY_PUZZLES[normalized];
  if (!puzzle) {
    throw new Error('فهرست پازل‌های روزانه خالی است.');
  }
  return puzzle;
}
`;

  writeSource('src/data/daily/dailyPuzzles.ts', `${header}\n${body}\n${footer}`);
}

function quantile(sortedValues: readonly number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = Math.min(sortedValues.length - 1, Math.floor(ratio * sortedValues.length));
  return sortedValues[index] ?? 0;
}

/**
 * گزارش کالیبراسیون سختی.
 *
 * آستانه‌های مدل باید روی صدک‌های ۳۰، ۶۰ و ۸۰ مجموعه نامزدها بنشینند تا
 * ترتیب مرحله‌ها با سختی حس‌شده هم‌خوان باشد. اگر واژه‌نامه یا مدل تغییر کند،
 * همین گزارش اعداد تازه را پیشنهاد می‌دهد.
 */
function reportCalibration(
  levels: readonly Level[],
  thresholds: { medium: number; hard: number; expert: number },
  candidateScores: readonly number[],
): void {
  const distribution = levels.reduce<Record<string, number>>((accumulator, level) => {
    accumulator[level.difficulty] = (accumulator[level.difficulty] ?? 0) + 1;
    return accumulator;
  }, {});

  const expected = SCHEDULE.reduce<Record<string, number>>((accumulator, step) => {
    accumulator[step.difficulty] = (accumulator[step.difficulty] ?? 0) + step.count;
    return accumulator;
  }, {});

  console.log('توزیع سختی مرحله‌ها:', distribution);
  console.log('منحنی مورد انتظار:', expected);
  console.log('آستانه‌های مدل سختی (کالیبره‌شده):', thresholds);

  const sortedScores = [...candidateScores].sort((a, b) => a - b);
  const suggested = {
    medium: quantile(sortedScores, 0.3),
    hard: quantile(sortedScores, 0.6),
    expert: quantile(sortedScores, 0.8),
  };
  console.log(
    `نامزدها: ${sortedScores.length} | بازه امتیاز: ${sortedScores[0] ?? 0}..${sortedScores[sortedScores.length - 1] ?? 0}`,
  );
  console.log(`صدک‌های مجموعه نامزدها (پیشنهاد کالیبراسیون): ${JSON.stringify(suggested)}`);
  const drift = Math.abs(suggested.medium - thresholds.medium) > 1 ||
    Math.abs(suggested.hard - thresholds.hard) > 1 ||
    Math.abs(suggested.expert - thresholds.expert) > 1;
  if (drift) {
    console.warn(
      'هشدار: آستانه‌های مدل با صدک‌های مجموعه نامزدها فاصله دارند؛ آستانه‌ها را بازکالیبره کن.',
    );
  }

  const matchesExpected = Object.entries(expected).every(
    ([difficulty, count]) => (distribution[difficulty] ?? 0) === count,
  );
  if (!matchesExpected) {
    throw new Error('توزیع سختی با منحنی مورد نظر یکسان نیست؛ آستانه‌ها را کالیبره کن.');
  }
}

function main(): void {
  const { levels, usedAnchors, usedSignatures, thresholds, candidateScores } = pickLevelCandidates();

  for (const level of levels) {
    const report = validateLevel(level);
    if (!report.valid) {
      console.error(`مرحله ${level.id}:`, report.errors.map(issue => issue.message).join(' | '));
      throw new Error('اعتبارسنجی مرحله‌ها ناموفق بود.');
    }
  }

  const puzzles = pickDailyPuzzles(usedSignatures);
  for (const puzzle of puzzles) {
    const report = validateLevel(puzzle);
    if (!report.valid) {
      console.error(`پازل ${puzzle.id}:`, report.errors.map(issue => issue.message).join(' | '));
      throw new Error('اعتبارسنجی پازل‌های روزانه ناموفق بود.');
    }
  }

  const suite = validateLevels([...levels, ...puzzles]);
  if (!suite.valid) {
    console.error(suite.errors.map(issue => `#${issue.levelId}: ${issue.message}`).join('\n'));
    throw new Error('اعتبارسنجی مجموعه ناموفق بود.');
  }

  writeLevelsFile(levels);
  writeDailyFile(puzzles);
  reportCalibration(levels, thresholds, candidateScores);

  const totalSolutions = levels.reduce(
    (total, level) => total + level.targetWords.length + level.bonusWords.length,
    0,
  );
  console.log(`مرحله‌ها: ${levels.length}`);
  console.log(
    'میانگین جواب هر مرحله:',
    (totalSolutions / levels.length).toFixed(1),
    '| میانگین واژه اصلی:',
    (levels.reduce((total, level) => total + level.targetWords.length, 0) / levels.length).toFixed(1),
    '| واژه کلیدی تکراری:',
    levels.length - usedAnchors.size,
  );
  console.log(`پازل‌های روزانه: ${puzzles.length}`);
  console.log(
    'مرحله‌های نمونه:',
    levels
      .slice(0, 3)
      .map(level => `${level.id}) ${level.letters.join('')} → ${level.targetWords.join('، ')}`)
      .join('  |  '),
  );
  const last = levels[levels.length - 1];
  console.log('آخرین مرحله:', last ? `${last.letters.join('')} → ${last.targetWords.join('، ')}` : '-');
}

main();
