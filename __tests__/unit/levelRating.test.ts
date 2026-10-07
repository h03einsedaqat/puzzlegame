import { averageStars, computeStars, MAX_STARS, starLabel } from '../../src/services/game/levelRating';

describe('computeStars', () => {
  it('مرحله نیمه‌کاره ستاره نمی‌گیرد', () => {
    expect(
      computeStars({ targetFound: 3, targetTotal: 6, bonusFound: 0, bonusTotal: 2, hintsUsed: 0 }),
    ).toBe(0);
  });

  it('مرحله کامل بدون راهنما و با نیمی از کلمات امتیازی سه ستاره می‌گیرد', () => {
    expect(
      computeStars({ targetFound: 6, targetTotal: 6, bonusFound: 1, bonusTotal: 2, hintsUsed: 0 }),
    ).toBe(MAX_STARS);
  });

  it('استفاده از راهنما سقف ستاره را کم می‌کند', () => {
    expect(
      computeStars({ targetFound: 6, targetTotal: 6, bonusFound: 2, bonusTotal: 2, hintsUsed: 1 }),
    ).toBe(2);
    expect(
      computeStars({ targetFound: 6, targetTotal: 6, bonusFound: 2, bonusTotal: 2, hintsUsed: 3 }),
    ).toBe(1);
  });

  it('کم‌کاری در کلمات امتیازی مانع سه ستاره می‌شود ولی ستاره را صفر نمی‌کند', () => {
    expect(
      computeStars({ targetFound: 5, targetTotal: 5, bonusFound: 0, bonusTotal: 4, hintsUsed: 0 }),
    ).toBe(2);
  });

  it('مرحله بدون کلمه امتیازی هم می‌تواند سه ستاره بگیرد', () => {
    expect(
      computeStars({ targetFound: 4, targetTotal: 4, bonusFound: 0, bonusTotal: 0, hintsUsed: 0 }),
    ).toBe(MAX_STARS);
  });
});

describe('averageStars', () => {
  it('برای فهرست خالی صفر برمی‌گرداند', () => {
    expect(averageStars([])).toBe(0);
  });

  it('میانگین را با یک رقم اعشار گرد می‌کند و ستاره نبود را صفر می‌شمارد', () => {
    expect(averageStars([{ stars: 3 }, { stars: 2 }, {}])).toBeCloseTo(1.7, 5);
  });
});

describe('starLabel', () => {
  it('متن خلاصه ستاره را می‌سازد', () => {
    expect(starLabel(2)).toBe('2/3');
    expect(starLabel(9)).toBe('3/3');
  });
});
