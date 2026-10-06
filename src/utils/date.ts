const DAY_MS = 24 * 60 * 60 * 1000;

/** کلید تاریخ محلی به قالب YYYY-MM-DD؛ مبنای چالش روزانه، استریک و جایزه است. */
export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  if (year === undefined || month === undefined || day === undefined) {
    return null;
  }
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** اختلاف روز میان دو تاریخ محلی (روزهای تقویمی، مستقل از ساعت) */
export function daysBetween(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) {
    return Number.NaN;
  }
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / DAY_MS);
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function isYesterday(previousKey: string, currentKey: string): boolean {
  return daysBetween(previousKey, currentKey) === 1;
}

export function addDays(key: string, amount: number): string {
  const date = parseDateKey(key);
  if (!date) {
    return key;
  }
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
