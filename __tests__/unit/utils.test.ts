import {
  dateKey,
  parseDateKey,
  daysBetween,
  isSameDay,
  isYesterday,
  addDays,
  startOfDay,
} from '../../src/utils/date';
import { format, formatDuration, formatNumber, formatPercent, toPersianDigits } from '../../src/utils/format';
import { createTileId, createLocalId, resetIdCounter } from '../../src/utils/id';
import { formatJalaliDate, formatJalaliShort, gregorianToJalali, jalaliToGregorian, weekdayName } from '../../src/utils/jalali';
import {
  isPersianLetter,
  isPersianWord,
  isWordBuildable,
  letterCounts,
  letterKey,
  lettersOf,
  normalizePersianText,
  normalizePersianWord,
  sameWord,
} from '../../src/utils/persian';
import { createRandom, hashString, pickWithSeed, shuffleWithSeed } from '../../src/utils/random';

describe('اعداد و قالب‌بندی', () => {
  it('ارقام لاتین را به فارسی تبدیل می‌کند و بقیه متن را دست‌نخورده می‌گذارد', () => {
    expect(toPersianDigits(1234)).toBe('۱۲۳۴');
    expect(toPersianDigits('ساعت 12:30')).toBe('ساعت ۱۲:۳۰');
  });

  it('مقدارها را در قالب ترجمه جای می‌گذارد', () => {
    expect(format('مرحله {number} از {total}', { number: 3, total: 50 })).toBe('مرحله ۳ از ۵۰');
    expect(format('امتیاز {score}', { score: '۹۰' })).toBe('امتیاز ۹۰');
    expect(format('مقدار {unknown}')).toBe('مقدار {unknown}');
  });

  it('عدد را با جداکننده هزارگان فارسی نمایش می‌دهد', () => {
    expect(formatNumber(999)).toBe('۹۹۹');
    expect(formatNumber(1234)).toBe('۱٬۲۳۴');
    expect(formatNumber(1234567)).toBe('۱٬۲۳۴٬۵۶۷');
  });

  it('مدت‌زمان را به دقیقه و ثانیه تبدیل می‌کند', () => {
    expect(formatDuration(65_000)).toBe('۱:۰۵');
    expect(formatDuration(3_725_000)).toBe('۱:۰۲:۰۵');
    expect(formatDuration(-5000)).toBe('۰:۰۰');
  });

  it('درصد را با علامت فارسی و بدون تقسیم بر صفر می‌سازد', () => {
    expect(formatPercent(1, 4)).toBe('۲۵٪');
    expect(formatPercent(0, 0)).toBe('۰٪');
  });
});

describe('کار با تاریخ', () => {
  it('کلید تاریخ را در قالب YYYY-MM-DD می‌سازد', () => {
    expect(dateKey(new Date(2026, 9, 6))).toBe('2026-10-06');
    expect(dateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('کلید تاریخ نامعتبر را null می‌کند', () => {
    expect(parseDateKey('2026-10-06')).toBeInstanceOf(Date);
    expect(parseDateKey('2026/10/06')).toBeNull();
    expect(parseDateKey('')).toBeNull();
  });

  it('اختلاف روزها را مستقل از ساعت محاسبه می‌کند', () => {
    expect(daysBetween('2026-10-05', '2026-10-06')).toBe(1);
    expect(daysBetween('2026-10-06', '2026-10-06')).toBe(0);
    expect(daysBetween('2026-10-06', '2026-10-04')).toBe(-2);
    expect(Number.isNaN(daysBetween('نامعتبر', '2026-10-06'))).toBe(true);
  });

  it('دیروز و امروز را می‌شناسد', () => {
    expect(isSameDay('2026-10-06', '2026-10-06')).toBe(true);
    expect(isSameDay('2026-10-06', '2026-10-07')).toBe(false);
    expect(isYesterday('2026-10-05', '2026-10-06')).toBe(true);
    expect(isYesterday('2026-10-06', '2026-10-05')).toBe(false);
  });

  it('روزها را کم و زیاد می‌کند', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('نامعتبر', 1)).toBe('نامعتبر');
  });

  it('آغاز روز را از یک timestamp می‌سازد', () => {
    const noon = new Date(2026, 9, 6, 12, 30, 15).getTime();
    const start = startOfDay(noon);
    expect(new Date(start).getHours()).toBe(0);
    expect(dateKey(new Date(start))).toBe('2026-10-06');
  });
});

describe('تقویم جلالی', () => {
  it('نوروز ۱۴۰۴ را درست تبدیل می‌کند', () => {
    expect(gregorianToJalali(new Date(2025, 2, 21))).toEqual({ year: 1404, month: 1, day: 1 });
    expect(gregorianToJalali(new Date(2026, 9, 6))).toEqual({ year: 1405, month: 7, day: 14 });
  });

  it('تبدیل معکوس با تبدیل مستقیم هم‌خوان است', () => {
    const gregorian = new Date(2026, 5, 15);
    const jalali = gregorianToJalali(gregorian);
    const back = jalaliToGregorian(jalali);
    expect(dateKey(back)).toBe(dateKey(gregorian));
  });

  it('تاریخ جلالی را با نام ماه و ارقام فارسی می‌نویسد', () => {
    expect(formatJalaliDate(new Date(2025, 2, 21))).toBe('۱ فروردین ۱۴۰۴');
    expect(formatJalaliShort(new Date(2025, 2, 21))).toContain('۱ فروردین');
  });

  it('نام روز هفته را از شنبه شروع می‌کند', () => {
    expect(weekdayName(new Date(2025, 2, 21))).toBe('جمعه');
    expect(weekdayName(new Date(2025, 2, 22))).toBe('شنبه');
  });
});

describe('تصادفی‌سازی قطعی', () => {
  it('با یک بذر، همیشه یک دنباله می‌سازد', () => {
    const first = createRandom(42);
    const second = createRandom(42);
    const sequence = Array.from({ length: 5 }, () => first());
    expect(sequence).toEqual(Array.from({ length: 5 }, () => second()));
    expect(sequence.every(value => value >= 0 && value < 1)).toBe(true);
  });

  it('رشته را به عدد ثابت هش می‌کند', () => {
    expect(hashString('2026-10-06')).toBe(hashString('2026-10-06'));
    expect(hashString('2026-10-06')).not.toBe(hashString('2026-10-07'));
    expect(hashString('تاریخ')).toBeGreaterThanOrEqual(0);
  });

  it('آرایه را بدون تغییر ورودی و به‌صورت قطعی پخش می‌کند', () => {
    const source = [1, 2, 3, 4, 5];
    const shuffled = shuffleWithSeed(source, 7);
    expect(source).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(shuffleWithSeed(source, 7)).toEqual(shuffled);
  });

  it('انتخاب با بذر برای آرایه خالی null می‌دهد', () => {
    expect(pickWithSeed([], 3)).toBeNull();
    expect(['آ', 'ب', 'پ']).toContain(pickWithSeed(['آ', 'ب', 'پ'], 11));
  });
});

describe('شناسه‌های محلی', () => {
  it('شناسه کاربر را یکتا و بدون اطلاعات هویتی می‌سازد', () => {
    const first = createLocalId('device-seed');
    const second = createLocalId('device-seed');
    expect(first.startsWith('u_')).toBe(true);
    expect(second.startsWith('u_')).toBe(true);
    expect(first).not.toBe(second);
  });

  it('شناسه کاشی‌ها یکتا است و با بازنشانی از نو شروع می‌شود', () => {
    resetIdCounter();
    expect(createTileId()).toBe('t_1');
    expect(createTileId('l')).toBe('l_2');
    resetIdCounter();
    expect(createTileId()).toBe('t_1');
  });
});

describe('نرمال‌سازی فارسی', () => {
  it('نویسه‌های عربی و اعراب را یکسان می‌کند', () => {
    expect(normalizePersianWord('كِتاب')).toBe('کتاب');
    expect(normalizePersianWord('مىرود')).toBe('میرود');
    expect(normalizePersianWord('خانة')).toBe('خانه');
    expect(normalizePersianWord('  کتاب  ')).toBe('کتاب');
  });

  it('متن آزاد را با فاصله یکدست می‌کند', () => {
    expect(normalizePersianText('سلام   دنیا')).toBe('سلام دنیا');
    expect(normalizePersianText('كتابِ من')).toBe('کتابِ من');
    expect(normalizePersianText('  سلام\n\nدنیا  ')).toBe('سلام دنیا');
  });

  it('حرف و واژه فارسی را تشخیص می‌دهد', () => {
    expect(isPersianLetter('ک')).toBe(true);
    expect(isPersianLetter('آ')).toBe(true);
    expect(isPersianLetter('a')).toBe(false);
    expect(isPersianWord('کتاب')).toBe(true);
    expect(isPersianWord('کتاب4')).toBe(false);
    expect(isPersianWord('')).toBe(false);
  });

  it('حروف واژه را با حفظ ترتیب برمی‌گرداند', () => {
    expect(lettersOf('آب')).toEqual(['آ', 'ب']);
    expect(lettersOf('بابا')).toEqual(['ب', 'ا', 'ب', 'ا']);
  });

  it('واژه را با کاشی‌های موجود می‌سنجد', () => {
    expect(isWordBuildable('کتاب', ['ک', 'ت', 'ا', 'ب'])).toBe(true);
    expect(isWordBuildable('کتاب', ['ک', 'ت', 'ا'])).toBe(false);
    expect(isWordBuildable('کتاب', ['ک', 'ک', 'ت', 'ا', 'ب'])).toBe(true);
    expect(isWordBuildable('', ['ک', 'ت'])).toBe(false);
  });

  it('شمار حروف و کلید حروف را می‌سازد', () => {
    const counts = letterCounts(['ب', 'ا', 'ب', 'ا']);
    expect(counts.get('ب')).toBe(2);
    expect(counts.get('ا')).toBe(2);
    expect(letterKey(['ب', 'ا', 'ب', 'ا'])).toBe(letterKey(['ا', 'ا', 'ب', 'ب']));
    expect(letterKey(['ب', 'ا'])).not.toBe(letterKey(['ب', 'ا', 'ب']));
  });

  it('واژه‌ها را با تحمل نویسه‌های عربی مقایسه می‌کند', () => {
    expect(sameWord('كتاب', 'کتاب')).toBe(true);
    expect(sameWord('کتاب', 'کتب')).toBe(false);
  });
});
