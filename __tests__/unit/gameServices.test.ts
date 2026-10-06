import { GAME_CONFIG } from '../../src/constants';
import { DAILY_PUZZLES } from '../../src/data/daily/dailyPuzzles';
import { LEVELS } from '../../src/data/levels/levels';
import { isDictionaryWord } from '../../src/data/words/dictionary';
import { DIFFICULTY_THRESHOLDS, branchingRatio, computeDifficultyScore, difficultyFromScore, editDistance, rareLetterCount, similarityRatio } from '../../src/services/game/levelDifficulty';
import { validateLevel, validateLevels } from '../../src/services/game/levelValidator';
import {
  computeHeartState,
  grantHearts,
  isFreeAttemptLevel,
  refillHearts,
  refundHeart,
  spendHeart,
} from '../../src/services/game/heartService';
import { evaluateClock, isLocked } from '../../src/services/game/clockGuard';
import { dailyPuzzleIndex, getDailyPuzzleForDate } from '../../src/services/game/dailySeed';
import { createDefaultProfile } from '../../src/services/storage/defaults';
import { isWordBuildable } from '../../src/utils/persian';
import type { Level } from '../../src/types';

const MINUTE = 60 * 1000;
const REFILL_MS = GAME_CONFIG.economy.heartRefillMinutes * MINUTE;
const START = 1_700_000_000_000;

describe('قلب‌ها', () => {
  it('وقتی قلب‌ها پر است، تایمر بعدی ندارد', () => {
    const state = computeHeartState({ hearts: 5, maxHearts: 5, lastRefillAt: null, now: START });
    expect(state.isFull).toBe(true);
    expect(state.nextRefillAt).toBeNull();
    expect(state.msUntilNextHeart).toBe(0);
  });

  it('پس از گذشت زمان لازم، یک قلب اضافه می‌شود', () => {
    const state = computeHeartState({ hearts: 2, maxHearts: 5, lastRefillAt: START, now: START + REFILL_MS });
    expect(state.hearts).toBe(3);
    expect(state.gained).toBe(1);
    expect(state.isFull).toBe(false);
    expect(state.msUntilNextHeart).toBe(REFILL_MS);
  });

  it('چند قلب به‌طور هم‌زمان پر می‌شود و از سقف بالاتر نمی‌رود', () => {
    const state = computeHeartState({ hearts: 1, maxHearts: 5, lastRefillAt: START, now: START + REFILL_MS * 4 });
    expect(state.hearts).toBe(5);
    expect(state.isFull).toBe(true);
    expect(state.lastRefillAt).toBeNull();
  });

  it('اگر ساعت دستگاه عقب رفته باشد، قلبی هدیه نمی‌دهد', () => {
    const state = computeHeartState({ hearts: 2, maxHearts: 5, lastRefillAt: START + REFILL_MS * 10, now: START });
    expect(state.gained).toBe(0);
    expect(state.hearts).toBe(2);
  });

  it('شمارش معکوس تا قلب بعدی را گزارش می‌کند', () => {
    const state = computeHeartState({ hearts: 3, maxHearts: 5, lastRefillAt: START, now: START + 10 * MINUTE });
    expect(state.msUntilNextHeart).toBe(REFILL_MS - 10 * MINUTE);
    expect(state.nextRefillAt).toBe(START + REFILL_MS);
  });
});

describe('خرج‌کردن و برگرداندن قلب', () => {
  it('مرحله آموزشی قلب کم نمی‌کند', () => {
    const profile = createDefaultProfile(START);
    expect(isFreeAttemptLevel(1)).toBe(true);
    const result = spendHeart(profile, 1, START);
    expect(result.ok).toBe(true);
    expect(result.profile.hearts).toBe(profile.hearts);
  });

  it('با نبود قلب، تلاش تازه شروع نمی‌شود', () => {
    const profile = { ...createDefaultProfile(START), hearts: 0, lastHeartRefillAt: null };
    const result = spendHeart(profile, 8, START);
    expect(result.ok).toBe(false);
    expect(result.profile.hearts).toBe(0);
  });

  it('با خرج‌شدن قلب، تایمر پر شدن از همان لحظه شروع می‌شود', () => {
    const profile = { ...createDefaultProfile(START), hearts: 3, lastHeartRefillAt: null };
    const result = spendHeart(profile, 8, START);
    expect(result.ok).toBe(true);
    expect(result.profile.hearts).toBe(2);
    expect(result.profile.lastHeartRefillAt).toBe(START);
  });

  it('تکمیل مرحله قلب خرج‌شده را برمی‌گرداند', () => {
    const profile = { ...createDefaultProfile(START), hearts: 2, lastHeartRefillAt: START };
    expect(refundHeart(profile, 8, START + MINUTE).hearts).toBe(3);
    expect(refundHeart(profile, 1, START + MINUTE).hearts).toBe(2);
  });

  it('قلب هدیه از سقف بیشتر نمی‌شود', () => {
    const profile = { ...createDefaultProfile(START), hearts: 4, lastHeartRefillAt: START };
    const granted = grantHearts(profile, 5, START);
    expect(granted.hearts).toBe(GAME_CONFIG.economy.maxHearts);
    expect(granted.lastHeartRefillAt).toBeNull();
  });

  it('پرشدن کامل، تایمر را پاک می‌کند', () => {
    const profile = { ...createDefaultProfile(START), hearts: 1, lastHeartRefillAt: START };
    expect(refillHearts(profile)).toEqual({ ...profile, hearts: profile.maxHearts, lastHeartRefillAt: null });
  });
});

describe('محافظ ساعت دستگاه', () => {
  it('نخستین اجرا زمان فعلی را ثبت می‌کند', () => {
    const check = evaluateClock(null, START);
    expect(check.rollbackDetected).toBe(false);
    expect(check.locked).toBe(false);
    expect(check.record).toEqual({ lastSeenAt: START, lockedUntil: null });
  });

  it('گذر عادی زمان را می‌پذیرد و به‌روز نگه می‌دارد', () => {
    const check = evaluateClock({ lastSeenAt: START, lockedUntil: null }, START + 2 * MINUTE);
    expect(check.rollbackDetected).toBe(false);
    expect(check.record.lastSeenAt).toBe(START + 2 * MINUTE);
  });

  it('عقب‌بردن ساعت را تشخیص می‌دهد و پاداش‌ها را موقتاً قفل می‌کند', () => {
    const now = START - 10 * MINUTE;
    const check = evaluateClock({ lastSeenAt: START, lockedUntil: null }, now, MINUTE, 5 * MINUTE);
    expect(check.rollbackDetected).toBe(true);
    expect(check.locked).toBe(true);
    expect(check.record.lockedUntil).toBe(now + 5 * MINUTE);
  });

  it('اختلاف کمتر از حد تحمل، تقلب شمرده نمی‌شود', () => {
    const check = evaluateClock({ lastSeenAt: START, lockedUntil: null }, START - 1000, MINUTE, 5 * MINUTE);
    expect(check.rollbackDetected).toBe(false);
    expect(check.locked).toBe(false);
  });

  it('وضعیت قفل تا پایان مهلت ادامه دارد', () => {
    expect(isLocked({ lastSeenAt: 0, lockedUntil: 5000 }, 4000)).toBe(true);
    expect(isLocked({ lastSeenAt: 0, lockedUntil: 5000 }, 6000)).toBe(false);
    expect(isLocked(null, 4000)).toBe(false);
    expect(isLocked({ lastSeenAt: 0, lockedUntil: null }, 4000)).toBe(false);
  });
});

describe('چالش روزانه', () => {
  it('برای یک تاریخ همیشه یک پازل برمی‌گرداند', () => {
    const first = getDailyPuzzleForDate('2026-10-06');
    const second = getDailyPuzzleForDate('2026-10-06');
    expect(first.id).toBe(second.id);
    expect(dailyPuzzleIndex('2026-10-06')).toBe(dailyPuzzleIndex('2026-10-06'));
  });

  it('شماره پازل در بازه فهرست پازل‌ها می‌ماند', () => {
    for (let day = 1; day <= 28; day += 1) {
      const index = dailyPuzzleIndex(`2026-02-${day.toString().padStart(2, '0')}`);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(DAILY_PUZZLES.length);
    }
  });

  it('در یک ماه، پازل‌ها متنوع می‌مانند', () => {
    const indices = new Set<number>();
    for (let day = 1; day <= 30; day += 1) {
      indices.add(dailyPuzzleIndex(`2026-04-${day.toString().padStart(2, '0')}`));
    }
    expect(indices.size).toBeGreaterThan(5);
  });

  it('پازل روز، مرحله‌ای سالم و ساخته‌شدنی است', () => {
    const puzzle = getDailyPuzzleForDate('2026-10-06');
    expect(validateLevel(puzzle).valid).toBe(true);
    expect(puzzle.targetWords.length).toBeGreaterThan(0);
    for (const word of [...puzzle.targetWords, ...puzzle.bonusWords]) {
      expect(isWordBuildable(word, puzzle.letters)).toBe(true);
    }
  });
});

describe('مدل سختی', () => {
  it('حروف کم‌کاربرد را می‌شمارد', () => {
    expect(rareLetterCount(['ک', 'ژ', 'ب'])).toBe(1);
    expect(rareLetterCount(['ک', 'ب', 'ا'])).toBe(0);
    expect(rareLetterCount([])).toBe(0);
  });

  it('فاصله ویرایشی را درست حساب می‌کند', () => {
    expect(editDistance('کتاب', 'کتاب')).toBe(0);
    expect(editDistance('کتاب', 'کتب')).toBe(1);
    expect(editDistance('کتاب', 'تکاب')).toBe(2);
    expect(editDistance('', 'کتاب')).toBe(4);
  });

  it('شباهت و انشعاب جواب‌ها را اندازه می‌گیرد', () => {
    expect(similarityRatio(['کتاب', 'کتب'])).toBe(1);
    expect(similarityRatio(['کتاب', 'ماه'])).toBe(0);
    expect(similarityRatio(['کتاب'])).toBe(0);
    expect(similarityRatio([])).toBe(0);

    expect(branchingRatio(['کتاب', 'کبر'])).toBe(0.5);
    expect(branchingRatio(['سیب', 'ماه', 'کتاب'])).toBe(1);
    expect(branchingRatio([])).toBe(0);
  });

  it('امتیاز سختی با عوامل دشوارتر بالاتر می‌رود و در بازه ۰..۱۰۰ می‌ماند', () => {
    const easy = computeDifficultyScore({
      letterCount: 4,
      solutionCount: 9,
      targetCount: 3,
      averageSolutionLength: 3.2,
      longWordRatio: 0,
      rareLetterRatio: 0,
      similarity: 0,
      branching: 1,
    });
    const hard = computeDifficultyScore({
      letterCount: 7,
      solutionCount: 4,
      targetCount: 5,
      averageSolutionLength: 5.5,
      longWordRatio: 0.8,
      rareLetterRatio: 0.5,
      similarity: 0.6,
      branching: 0.4,
    });
    expect(hard).toBeGreaterThan(easy);
    expect(easy).toBeGreaterThanOrEqual(0);
    expect(hard).toBeLessThanOrEqual(100);
  });

  it('آستانه‌های سختی پله‌ها را درست جدا می‌کنند', () => {
    expect(difficultyFromScore(0)).toBe('easy');
    expect(difficultyFromScore(DIFFICULTY_THRESHOLDS.medium - 1)).toBe('easy');
    expect(difficultyFromScore(DIFFICULTY_THRESHOLDS.medium)).toBe('medium');
    expect(difficultyFromScore(DIFFICULTY_THRESHOLDS.hard)).toBe('hard');
    expect(difficultyFromScore(DIFFICULTY_THRESHOLDS.expert)).toBe('expert');
    expect(difficultyFromScore(100)).toBe('expert');
  });
});

describe('مرحله‌های تولیدشده', () => {
  it('دست‌کم ۵۰ مرحله با شناسه یکتا وجود دارد', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(LEVELS.map(level => level.id)).size).toBe(LEVELS.length);
  });

  it('منحنی سختی مطابق برنامه است', () => {
    const distribution = LEVELS.reduce<Record<string, number>>((accumulator, level) => {
      accumulator[level.difficulty] = (accumulator[level.difficulty] ?? 0) + 1;
      return accumulator;
    }, {});
    expect(distribution).toEqual({ easy: 15, medium: 15, hard: 10, expert: 10 });
  });

  it('همه مرحله‌ها و پازل‌های روزانه معتبرند', () => {
    expect(validateLevels(LEVELS).valid).toBe(true);
    expect(validateLevels(DAILY_PUZZLES).valid).toBe(true);
    expect(DAILY_PUZZLES.length).toBe(GAME_CONFIG.daily.puzzleCount);
  });

  it('هر مرحله واژه کلیدی، جواب ساخته‌شدنی و واژه امتیازی دارد', () => {
    for (const level of LEVELS) {
      expect(level.metadata.anchorWord).toBeTruthy();
      expect(level.targetWords).toContain(level.metadata.anchorWord);
      expect(level.bonusWords.length).toBeGreaterThan(0);
      expect(level.maxWordLength).toBe(level.letters.length);
      for (const word of [...level.targetWords, ...level.bonusWords]) {
        expect(isWordBuildable(word, level.letters)).toBe(true);
        expect(isDictionaryWord(word)).toBe(true);
      }
    }
  });

  it('واژه‌های کلیدی میان مرحله‌ها تکرار نمی‌شوند', () => {
    const anchors = LEVELS.map(level => level.metadata.anchorWord);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it('مرحله نخست، آموزشی و ساده است', () => {
    const first = LEVELS[0] as Level;
    expect(first.metadata.isTutorial).toBe(true);
    expect(first.letters.length).toBe(4);
    expect(first.targetWords.length).toBeLessThanOrEqual(4);
    expect(first.targetWords.some(word => word.length === 3)).toBe(true);
  });

  it('مرحله ناسالم رد می‌شود', () => {
    const base = LEVELS[0] as Level;

    const unbuildableTarget: Level = { ...base, targetWords: ['ژاله'] };
    expect(validateLevel(unbuildableTarget).valid).toBe(false);

    const emptyTargets: Level = { ...base, targetWords: [] };
    expect(validateLevel(emptyTargets).valid).toBe(false);

    const duplicateIds = validateLevels([base, { ...base }]);
    expect(duplicateIds.valid).toBe(false);
  });
});
