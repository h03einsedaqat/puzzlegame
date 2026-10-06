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

describe('نرمال‌سازی نوشتار فارسی', () => {
  it('حروف عربی هم‌معنی را به شکل فارسی تبدیل می‌کند', () => {
    expect(normalizePersianWord('كتاب')).toBe('کتاب');
    expect(normalizePersianWord('مى‌رود')).toBe('میرود');
    expect(normalizePersianWord('مديره')).toBe('مدیره');
    expect(normalizePersianWord('خانة')).toBe('خانه');
    expect(normalizePersianWord('چهارگانه')).toBe('چهارگانه');
  });

  it('نیم‌فاصله، فاصله و اعراب را حذف می‌کند', () => {
    expect(normalizePersianWord('می‌رود')).toBe('میرود');
    expect(normalizePersianWord('کِتاب')).toBe('کتاب');
    expect(normalizePersianWord(' ک تاب ')).toBe('کتاب');
    expect(normalizePersianWord('مُدَرِّس')).toBe('مدرس');
  });

  it('«آ» را حرف مستقل نگه می‌دارد و آن را به «ا» تبدیل نمی‌کند', () => {
    expect(normalizePersianWord('آب')).toBe('آب');
    expect(normalizePersianWord('ا+آ')).toBe('ا+آ');
    expect(lettersOf('آب')).toEqual(['آ', 'ب']);
    expect(lettersOf('کتاب')).toEqual(['ک', 'ت', 'ا', 'ب']);
  });

  it('متن چندکلمه‌ای فاصله‌های داخلی را حفظ می‌کند', () => {
    expect(normalizePersianText('  مرحله   اول  ')).toBe('مرحله اول');
    expect(normalizePersianText('حرف‌های فارسی')).toBe('حرف‌های فارسی');
  });

  it('حرف فارسی را از نویسه غیرفارسی تشخیص می‌دهد', () => {
    expect(isPersianLetter('ک')).toBe(true);
    expect(isPersianLetter('آ')).toBe(true);
    expect(isPersianLetter('A')).toBe(false);
    expect(isPersianLetter('3')).toBe(false);
    expect(isPersianWord('کتاب')).toBe(true);
    expect(isPersianWord('کتاب1')).toBe(false);
    expect(isPersianWord('')).toBe(false);
  });

  it('واژه‌های یکسان را پس از نرمال‌سازی برابر می‌داند', () => {
    expect(sameWord('كتاب', 'کِتاب')).toBe(true);
    expect(sameWord('کتاب', 'کاتب')).toBe(false);
  });
});

describe('ساخت واژه از کاشی‌های حروف', () => {
  it('واژه را با حروف در دسترس می‌سازد', () => {
    expect(isWordBuildable('کتاب', ['ک', 'ت', 'ا', 'ب'])).toBe(true);
    expect(isWordBuildable('آب', ['آ', 'ب'])).toBe(true);
  });

  it('حروف تکراری را جدا از هم می‌شمارد', () => {
    expect(isWordBuildable('سلام', ['س', 'ل', 'ا', 'م'])).toBe(true);
    expect(isWordBuildable('مدرسه', ['م', 'د', 'ر', 'س', 'ه'])).toBe(true);
    // واژه «آلما» به هر چهار حرف نیاز دارد و ساخته می‌شود
    expect(isWordBuildable('آلما', ['آ', 'ل', 'م', 'ا'])).toBe(true);
    // واژه به دو «ا» نیاز دارد اما فقط یک کاشی «ا» موجود است
    expect(isWordBuildable('مادا', ['م', 'ا', 'د'])).toBe(false);
    expect(isWordBuildable('بابا', ['ب', 'ا', 'ب', 'ا'])).toBe(true);
    expect(isWordBuildable('بابا', ['ب', 'ا', 'ب'])).toBe(false);
  });

  it('واژه بلندتر از کاشی‌ها را رد می‌کند', () => {
    expect(isWordBuildable('کتابخانه', ['ک', 'ت', 'ا', 'ب'])).toBe(false);
  });

  it('واژه خالی را قابل ساخت نمی‌داند', () => {
    expect(isWordBuildable('', ['ا', 'ب'])).toBe(false);
  });

  it('شمارش حروف و امضای حروف را درست می‌سازد', () => {
    const counts = letterCounts(['ب', 'ا', 'ب']);
    expect(counts.get('ب')).toBe(2);
    expect(counts.get('ا')).toBe(1);
    expect(counts.get('ک')).toBeUndefined();

    expect(letterKey(['ک', 'ت', 'ا', 'ب'])).toBe(letterKey(['ب', 'ا', 'ت', 'ک']));
    expect(letterKey(lettersOf('کتاب'))).toBe(letterKey(['ا', 'ب', 'ت', 'ک']));
  });
});
