/**
 * ساخت فایل راهنمای واژه‌های مرحله‌ها.
 *
 * اجرا:  npm run solutions:export
 * خروجی: docs/LEVEL_WORDS_GUIDE.md
 *
 * متن از داده‌های واقعی مرحله‌ها ساخته می‌شود تا اگر مرحله‌ای عوض شد، راهنما
 * هم به‌روز شود و هرگز کهنه نماند.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildLevelGuide } from '../src/data/levels/levelGuide';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'docs/LEVEL_WORDS_GUIDE.md');

writeFileSync(target, buildLevelGuide(), 'utf8');
console.log(`راهنمای واژه‌ها نوشته شد: ${target}`);
