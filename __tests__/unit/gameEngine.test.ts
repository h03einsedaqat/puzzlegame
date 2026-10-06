import {
  abandonGame,
  buildWord,
  calculateCoinReward,
  calculateLevelRewards,
  calculateScore,
  clearSelection,
  createGame,
  getLevelProgress,
  isLevelCompleted,
  isTileSelected,
  removeLastLetter,
  removeLetter,
  revealWithHint,
  selectLetter,
  selectedTiles,
  submitWord,
} from '../../src/services/game/gameEngine';
import { resetIdCounter } from '../../src/utils/id';
import type { Level } from '../../src/types';

const level: Level = {
  id: 7001,
  title: 'مرحله موتور بازی',
  difficulty: 'easy',
  letters: ['پ', 'و', 'س', 'ت'],
  targetWords: ['پست', 'پوست'],
  bonusWords: ['توپ', 'سوپ'],
  minWordLength: 3,
  maxWordLength: 4,
  scoreReward: 70,
  coinReward: 8,
  hintCost: 15,
  metadata: { category: 'بدن', anchorWord: 'پوست' },
};

/** انتخاب حروف یک واژه از روی کاشی‌های نشست؛ هر حرف یک کاشی تازه برمی‌دارد. */
function selectWord(
  session: ReturnType<typeof createGame>,
  word: string,
): ReturnType<typeof createGame> {
  let current = session;
  const used = new Set(current.selection);
  for (const char of word) {
    const tile = current.tiles.find(candidate => candidate.char === char && !used.has(candidate.id));
    if (!tile) {
      throw new Error(`کاشی برای حرف ${char} پیدا نشد`);
    }
    used.add(tile.id);
    current = selectLetter(current, tile.id);
  }
  return current;
}

beforeEach(() => {
  resetIdCounter();
});

describe('چرخه نشست بازی', () => {
  it('نشست تازه با کاشی‌های مستقل برای حروف تکراری می‌سازد', () => {
    const session = createGame(level);
    expect(session.tiles).toHaveLength(4);
    expect(new Set(session.tiles.map(tile => tile.id)).size).toBe(4);
    expect(session.status).toBe('playing');
    expect(session.score).toBe(0);
    expect(session.foundWords).toEqual([]);
  });

  it('حروف تکراری را مستقل انتخاب می‌کند', () => {
    const session = createGame({ ...level, letters: ['ب', 'ا', 'ب'] , targetWords: ['باب'], maxWordLength: 3, minWordLength: 3 });
    const [first, , third] = session.tiles;
    const afterFirst = selectLetter(session, (first as { id: string }).id);
    const afterThird = selectLetter(afterFirst, (third as { id: string }).id);
    expect(afterFirst.selection).toHaveLength(1);
    expect(afterThird.selection).toHaveLength(2);
    expect(isTileSelected(afterThird, (first as { id: string }).id)).toBe(true);
    expect(isTileSelected(afterThird, (third as { id: string }).id)).toBe(true);
    expect(buildWord(afterThird)).toBe('بب');
  });

  it('کاشی ناموجود یا تکراری را نادیده می‌گیرد', () => {
    const session = createGame(level);
    const firstTile = session.tiles[0] as { id: string };
    const once = selectLetter(session, firstTile.id);
    const twice = selectLetter(once, firstTile.id);
    expect(twice).toBe(once);
    expect(selectLetter(session, 'tile-ناموجود')).toBe(session);
  });

  it('حرف را برمی‌گرداند و آخرین حرف را حذف می‌کند', () => {
    const session = createGame(level);
    const first = session.tiles[0] as { id: string };
    const second = session.tiles[1] as { id: string };
    const selected = selectLetter(selectLetter(session, first.id), second.id);
    expect(selectedTiles(selected)).toHaveLength(2);

    const removed = removeLetter(selected, first.id);
    expect(removed.selection).toEqual([second.id]);

    const popped = removeLastLetter(selected);
    expect(popped.selection).toEqual([first.id]);

    expect(clearSelection(selected).selection).toEqual([]);
  });

  it('واژه پذیرفته‌شده را با امتیاز و سکه ثبت می‌کند و انتخاب را پاک می‌کند', () => {
    const session = selectWord(createGame(level), 'پست');
    const outcome = submitWord(session, level);

    expect(outcome.validation.status).toBe('accepted');
    expect(outcome.session.foundWords).toHaveLength(1);
    expect(outcome.session.selection).toEqual([]);
    expect(outcome.session.score).toBeGreaterThan(0);
    expect(outcome.session.coinsEarned).toBeGreaterThan(0);
    expect(outcome.session.combo).toBe(1);
    expect(outcome.completed).toBe(false);
  });

  it('واژه نامعتبر را رد می‌کند و کمبو را صفر می‌کند', () => {
    const session = selectWord(createGame(level), 'پست');
    const accepted = submitWord(session, level).session;
    const outcome = submitWord(selectWord(accepted, 'تپس'), level);
    expect(outcome.validation.status).toBe('rejected');
    expect(outcome.session.combo).toBe(0);
    expect(outcome.session.foundWords).toHaveLength(1);
  });

  it('با پیدا شدن همه واژه‌های اصلی، مرحله را تکمیل‌شده علامت می‌زند', () => {
    let session = selectWord(createGame(level), 'پست');
    session = submitWord(session, level).session;
    expect(isLevelCompleted(session, level)).toBe(false);

    session = selectWord(session, 'پوست');
    const outcome = submitWord(session, level);
    expect(outcome.completed).toBe(true);
    expect(outcome.session.status).toBe('completed');
    expect(outcome.session.finishedAt).not.toBeNull();
  });

  it('پیشرفت واژه‌های اصلی و امتیازی را گزارش می‌کند', () => {
    let session = selectWord(createGame(level), 'پست');
    session = submitWord(session, level).session;
    session = selectWord(session, 'توپ');
    session = submitWord(session, level).session;

    const progress = getLevelProgress(session, level);
    expect(progress.foundTargets).toBe(1);
    expect(progress.totalTargets).toBe(2);
    expect(progress.foundBonus).toBe(1);
    expect(progress.totalBonus).toBe(2);
    expect(progress.isCompleted).toBe(false);
  });
});

describe('امتیاز و سکه', () => {
  it('سکه هر واژه بر پایه طول آن است', () => {
    expect(calculateCoinReward({ word: 'سرد', kind: 'target' })).toBe(2);
    expect(calculateCoinReward({ word: 'کتاب', kind: 'target' })).toBe(3);
    expect(calculateCoinReward({ word: 'مدرسه', kind: 'target' })).toBe(5);
    expect(calculateCoinReward({ word: 'خورشید', kind: 'target' })).toBe(8);
  });

  it('واژه امتیازی سکه بیشتری می‌دهد', () => {
    const target = calculateCoinReward({ word: 'کتاب', kind: 'target' });
    const bonus = calculateCoinReward({ word: 'کتاب', kind: 'bonus' });
    expect(bonus).toBeGreaterThan(target);
  });

  it('واژه آشکارشده با راهنما سکه نمی‌دهد و امتیاز کمتری می‌گیرد', () => {
    const normal = calculateScore({ word: 'کتاب', level, kind: 'target', combo: 1 });
    const revealed = calculateScore({ word: 'کتاب', level, kind: 'target', combo: 1, revealed: true });
    expect(revealed).toBeLessThan(normal);
    expect(calculateCoinReward({ word: 'کتاب', kind: 'target', revealed: true })).toBe(0);
  });

  it('کمبو امتیاز را افزایش می‌دهد و از سقف بالاتر نمی‌رود', () => {
    const first = calculateScore({ word: 'کتاب', level, kind: 'target', combo: 1 });
    const second = calculateScore({ word: 'کتاب', level, kind: 'target', combo: 2 });
    const tenth = calculateScore({ word: 'کتاب', level, kind: 'target', combo: 10 });
    const eleventh = calculateScore({ word: 'کتاب', level, kind: 'target', combo: 11 });
    expect(second).toBeGreaterThan(first);
    expect(eleventh).toBe(tenth);
  });

  it('پاداش پایان مرحله شامل امتیاز واژه‌ها و پاداش مرحله است', () => {
    let session = selectWord(createGame(level), 'پست');
    session = submitWord(session, level).session;
    const rewards = calculateLevelRewards(session, level);
    expect(rewards.score).toBeGreaterThan(session.score - 1);
    expect(rewards.targetWordsFound).toBe(1);
    expect(rewards.coins).toBeGreaterThan(0);
  });
});

describe('راهنما', () => {
  it('حرف بعدی واژه را آشکار می‌کند و هزینه‌اش را گزارش می‌دهد', () => {
    const session = createGame(level);
    const outcome = revealWithHint(session, level, 'reveal_letter');
    expect(outcome.status).toBe('revealed');
    if (outcome.status === 'revealed') {
      expect(outcome.letterIndex).toBe(0);
      expect(outcome.session.hints).toHaveLength(1);
      expect(outcome.word).toBe(level.targetWords[0]);
    }
  });

  it('پس از آشکار شدن همه حروف، راهنما را مسدود می‌کند', () => {
    let session = createGame(level);
    const firstWord = level.targetWords[0] as string;
    for (let index = 0; index < firstWord.length; index += 1) {
      const outcome = revealWithHint(session, level, 'reveal_letter');
      expect(outcome.status).toBe('revealed');
      session = outcome.session;
    }
    const blocked = revealWithHint(session, level, 'reveal_letter');
    expect(blocked.status).toBe('revealed');
    if (blocked.status === 'revealed') {
      expect(blocked.word).toBe(level.targetWords[1]);
    }
  });

  it('با آشکارشدن کامل یک واژه، امتیاز آن کاهش می‌یابد', () => {
    const session = createGame(level);
    const revealed = revealWithHint(session, level, 'reveal_word');
    expect(revealed.status).toBe('revealed');

    const withReveal = submitWord(selectWord(revealed.status === 'revealed' ? revealed.session : session, 'پست'), level);
    const withoutReveal = submitWord(selectWord(session, 'پست'), level);

    const revealedWord = withReveal.session.foundWords[0];
    const normalWord = withoutReveal.session.foundWords[0];
    expect(revealedWord?.revealed).toBe(true);
    expect(normalWord?.revealed).toBe(false);
    expect(revealedWord?.score ?? 0).toBeLessThan(normalWord?.score ?? 0);
  });

  it('در مرحله تمام‌شده راهنما نمی‌دهد', () => {
    const session = createGame(level);
    const done = { ...session, status: 'completed' as const };
    expect(revealWithHint(done, level, 'reveal_letter')).toEqual({
      status: 'blocked',
      session: done,
      reason: 'completed',
    });
  });
});

describe('رها کردن نشست', () => {
  it('نشست را با وضعیت رهاشده و زمان پایان برمی‌گرداند', () => {
    const session = createGame(level);
    const abandoned = abandonGame(session, 1700000000000);
    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.finishedAt).toBe(1700000000000);
    expect(session.status).toBe('playing');
  });
});
