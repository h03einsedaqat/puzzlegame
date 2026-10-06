/**
 * تبدیل تقویم میلادی و هجری شمسی.
 * پیاده‌سازی بر پایه الگوریتم استاندارد تقویم شمسی (چرخه‌های ۳۳ساله) است و
 * درستی آن با تست رفت‌وبرگشت میلادی → شمسی → میلادی بررسی می‌شود.
 */

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
  2456, 3178,
];

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const WEEKDAYS = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
] as const;

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

interface JalCalResult {
  leap: number;
  gy: number;
  march: number;
}

function jalCal(jy: number): JalCalResult {
  const firstBreak = BREAKS[0] ?? -61;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = firstBreak;
  let jump = 0;

  for (let index = 1; index < BREAKS.length; index += 1) {
    const jm = BREAKS[index];
    if (jm === undefined) {
      break;
    }
    jump = jm - jp;
    if (jy < jm) {
      break;
    }
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }

  return { leap, gy, march };
}

/** شماره روز جولیَنی از تاریخ میلادی */
function gregorianToDayNumber(gy: number, gm: number, gd: number): number {
  let day =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  day = day - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return day;
}

function dayNumberToGregorian(dayNumber: number): { gy: number; gm: number; gd: number } {
  let j = 4 * dayNumber + 139361631;
  j = j + div(div(4 * dayNumber + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function jalaliToDayNumber(jy: number, jm: number, jd: number): number {
  const { gy, march } = jalCal(jy);
  return gregorianToDayNumber(gy, 3, march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export function jalaliToGregorian({ year, month, day }: JalaliDate): Date {
  const { gy, gm, gd } = dayNumberToGregorian(jalaliToDayNumber(year, month, day));
  return new Date(gy, gm - 1, gd, 0, 0, 0, 0);
}

export function gregorianToJalali(date: Date): JalaliDate {
  const dayNumber = gregorianToDayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const gy = dayNumberToGregorian(dayNumber).gy;
  const year = jalCal(gy - 621);
  let jy = gy - 621;
  let offset = dayNumber - gregorianToDayNumber(gy, 3, year.march);

  if (offset >= 0) {
    if (offset <= 185) {
      return { year: jy, month: 1 + div(offset, 31), day: mod(offset, 31) + 1 };
    }
    offset -= 186;
  } else {
    // تاریخ پیش از نوروز همین سال شمسی است؛ متعلق به اسفند سال قبل است.
    jy -= 1;
    offset += 179;
    if (year.leap === 1) {
      offset += 1;
    }
  }

  return { year: jy, month: 7 + div(offset, 30), day: mod(offset, 30) + 1 };
}

/** «۱۴ مهر ۱۴۰۵» */
export function formatJalaliDate(date: Date): string {
  const { year, month, day } = gregorianToJalali(date);
  const monthName = JALALI_MONTHS[month - 1] ?? '';
  return `${toPersianDigits(day)} ${monthName} ${toPersianDigits(year)}`;
}

/** «سه‌شنبه ۱۴ مهر» */
export function formatJalaliShort(date: Date): string {
  const { month, day } = gregorianToJalali(date);
  const monthName = JALALI_MONTHS[month - 1] ?? '';
  return `${weekdayName(date)} ${toPersianDigits(day)} ${monthName}`;
}

/** نام روز هفته به فارسی؛ هفته از شنبه شروع می‌شود. */
export function weekdayName(date: Date): string {
  const index = (date.getDay() + 1) % 7;
  return WEEKDAYS[index] ?? '';
}

function toPersianDigits(value: number): string {
  return String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] ?? digit);
}
