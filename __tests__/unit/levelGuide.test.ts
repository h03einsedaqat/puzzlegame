import { buildLevelGuide } from '../../src/data/levels/levelGuide';
import { LEVELS } from '../../src/data/levels/levels';

/**
 * راهنمای واژه‌ها (فایل تست مرحله‌ها) باید همیشه با داده‌های واقعی مرحله‌ها
 * هم‌خوان باشد؛ اگر مرحله‌ای عوض شد و فایل به‌روز نشد، این آزمون می‌گیرد.
 */
// خواندن فایل با API قدیمی Node تا به تایپ‌های Node وابسته نباشیم (مثل بقیه آزمون‌ها)
const fs = require('fs') as { readFileSync: (path: string, encoding: string) => string };

describe('راهنمای واژه‌های مرحله‌ها', () => {
  it('فایل راهنما با داده‌های مرحله‌ها یکی است', () => {
    const saved = fs.readFileSync('docs/LEVEL_WORDS_GUIDE.md', 'utf8');
    expect(saved).toBe(buildLevelGuide());
  });

  it('برای هر مرحله، همه واژه‌های اصلی و امتیازی را فهرست می‌کند', () => {
    const guide = buildLevelGuide();
    for (const level of LEVELS) {
      for (const word of [...level.targetWords, ...level.bonusWords]) {
        expect(guide).toContain(`\`${word}\``);
      }
    }
  });

  it('برای هر مرحله جای تیک‌زدن دارد', () => {
    const guide = buildLevelGuide();
    expect(guide.match(/- \[ \] این مرحله/g)?.length).toBe(LEVELS.length);
  });
});
