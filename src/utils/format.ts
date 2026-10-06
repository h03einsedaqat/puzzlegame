const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** تبدیل ارقام لاتین به ارقام فارسی برای نمایش. */
export function toPersianDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, digit => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

/** جای‌گذاری مقدار در قالب رشته‌های ترجمه: format('مرحله {number}', { number: 3 }) */
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      return match;
    }
    return typeof value === 'number' ? toPersianDigits(value) : value;
  });
}

export function formatNumber(value: number): string {
  const grouped = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toPersianDigits(grouped);
}

/** تبدیل میلی‌ثانیه به متن کوتاه فارسی: «۱۲:۰۵» یا «۱:۰۲:۳۰» */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  const text = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
  return toPersianDigits(text);
}

export function formatPercent(value: number, total: number): string {
  if (total <= 0) {
    return toPersianDigits(0) + '٪';
  }
  const percent = Math.round((value / total) * 100);
  return toPersianDigits(percent) + '٪';
}
