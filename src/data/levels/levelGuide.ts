import { LEVELS } from './levels';
import { DIFFICULTY_LABELS } from '../../types/game';
import { toPersianDigits } from '../../utils/format';
import type { Level } from '../../types/game';

/**
 * ساخت متن راهنمای تست مرحله‌ها.
 *
 * این متن برای بازیکن/تست‌کننده ساخته می‌شود تا بتواند همه مرحله‌ها را از اول
 * تا آخر بازی کند و بداند در هر مرحله چه واژه‌هایی باید پیدا شوند. خروجی در
 * `docs/LEVEL_WORDS_GUIDE.md` ذخیره می‌شود و با `npm run solutions:export`
 * دوباره ساخته می‌شود؛ پس همیشه با داده‌های واقعی بازی هم‌خوان است.
 */

function levelSection(level: Level): string {
  const targets = level.targetWords.map(word => `\`${word}\``).join(' · ');
  const bonus = level.bonusWords.length > 0 ? level.bonusWords.map(word => `\`${word}\``).join(' · ') : '—';

  return [
    `### مرحله ${toPersianDigits(level.id)} — ${level.title}`,
    '',
    `- سختی: ${DIFFICULTY_LABELS[level.difficulty]}`,
    `- حروف چرخ: ${level.letters.map(letter => `\`${letter}\``).join(' ')}`,
    `- ${toPersianDigits(level.targetWords.length)} واژه اصلی: ${targets}`,
    `- واژه‌های امتیازی (${toPersianDigits(level.bonusWords.length)} تا): ${bonus}`,
    `- طول واژه: از ${toPersianDigits(level.minWordLength)} تا ${toPersianDigits(level.maxWordLength)} حرف`,
    '',
    `- [ ] این مرحله بدون مشکل بازی شد`,
    '',
  ].join('\n');
}

export function buildLevelGuide(): string {
  const totalTargets = LEVELS.reduce((sum, level) => sum + level.targetWords.length, 0);
  const totalBonus = LEVELS.reduce((sum, level) => sum + level.bonusWords.length, 0);

  const header = [
    '# راهنمای واژه‌های مرحله‌ها (برای تست کامل بازی)',
    '',
    'این فایل همه واژه‌های ۵۰ مرحله بازی «کلمه‌ساز» را نشان می‌دهد تا بتوانی بازی را',
    'از مرحله اول تا آخر تست کنی و بدانی در هر مرحله باید چه واژه‌هایی ساخته شوند.',
    '',
    '> ⚠️ توجه: این فایل پاسخ‌ها را لو می‌دهد؛ برای تست است، نه برای بازیکن.',
    '',
    '## چطور تست کنم؟',
    '',
    '1. بازی را باز کن و مراحل را به ترتیب بازی کن.',
    '2. در هر مرحله، واژه‌های فهرست زیر را روی چرخ حروف بکش (یا یکی‌یکی بزن).',
    '3. با برداشتن انگشت، واژه خودش ثبت می‌شود؛ اگر واژه‌ای را کامل ساختی و کمی صبر کردی، خودش بررسی می‌شود.',
    '4. وقتی همه واژه‌های اصلی پیدا شدند، مرحله تمام می‌شود و صفحه نتیجه می‌آید.',
    '5. تیک هر مرحله را در پایین فهرست بزن.',
    '',
    '## چه چیزهایی را در تست نگاه کنم؟',
    '',
    '- کشیدن حروف: از کاشی اول بکش روی کاشی بعدی؛ با برگشتن روی حرف قبلی، آخرین حرف برداشته می‌شود.',
    '- ثبت خودکار: واژه‌ای که کامل شد، بدون زدن دکمه خودش ثبت می‌شود.',
    '- راهنما: با سکه خریداری می‌شود، هزینه همان لحظه کم می‌شود و روی چرخ کاشی بعدی چشمک می‌زند.',
    '- ستاره مرحله: بدون راهنما و با کشف نیمی از واژه‌های امتیازی، ۳ ستاره می‌گیری.',
    '- قلب: با شروع هر مرحله (جز مرحله ۱) یک قلب کم می‌شود و با تکمیل برمی‌گردد.',
    '- دکمه‌ها: هیچ‌وقت نباید بی‌واکنش شوند؛ نه وسط بازی، نه بعد از راهنما، نه بعد از تکمیل مرحله.',
    '',
    `## فهرست کلی`,
    '',
    `- تعداد مرحله: ${toPersianDigits(LEVELS.length)}`,
    `- واژه‌های اصلی: ${toPersianDigits(totalTargets)}`,
    `- واژه‌های امتیازی: ${toPersianDigits(totalBonus)}`,
    '',
    '---',
    '',
  ].join('\n');

  const body = LEVELS.map(levelSection).join('\n');

  return `${header}${body}`;
}
