/**
 * ساخت آیکون‌های کلمه‌ساز از تصویر نهایی کافه‌خانهٔ ایرانی.
 *
 * ورودی اصلی: `store/icon-source.png` (تصویر کامل و مربعی آیکون).
 * خروجی: آیکون‌های فروشگاه، پیش‌نمایش، چگالی‌های مختلف اندروید و لایه‌های adaptive.
 * اجرا: `npm run icons:build` یا `npm run icons:mascot`.
 *
 * لایهٔ پس‌زمینهٔ adaptive خودِ اثر کامل را نگه می‌دارد تا نقش و رنگ پس‌زمینه
 * در ماسک‌های مختلف اندروید بریده یا کوچک نشود؛ لایهٔ foreground شفاف است.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'store/icon-source.png');
const STORE_SIZE = 512;

const MIPMAPS = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
] as const;

// Android adaptive icon artwork canvas is 108dp at each density.
const ADAPTIVE = [
  { folder: 'mipmap-mdpi', size: 108 },
  { folder: 'mipmap-hdpi', size: 162 },
  { folder: 'mipmap-xhdpi', size: 216 },
  { folder: 'mipmap-xxhdpi', size: 324 },
  { folder: 'mipmap-xxxhdpi', size: 432 },
] as const;

const ADAPTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

async function renderIcon(size: number, circular = false): Promise<Buffer> {
  const base = sharp(SOURCE).resize(size, size, { fit: 'cover', position: 'centre' }).png();
  if (!circular) return base.toBuffer();

  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  return base
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function main(): Promise<void> {
  readFileSync(SOURCE); // Fail early with a clear filesystem error if the master is missing.
  for (const { folder, size } of MIPMAPS) {
    const dir = resolve(root, 'android/app/src/main/res', folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'ic_launcher.png'), await renderIcon(size));
    writeFileSync(resolve(dir, 'ic_launcher_round.png'), await renderIcon(size, true));
  }

  for (const { folder, size } of ADAPTIVE) {
    const dir = resolve(root, 'android/app/src/main/res', folder);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'ic_launcher_background.png'), await renderIcon(size));
    // کل تصویر داخل adaptive background است؛ شفاف‌بودن این لایه اجازه می‌دهد
    // Android ماسک‌های دایره‌ای/گردگوشه را بدون تکرار یا کوچک‌کردن طرح اعمال کند.
    const transparent = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    writeFileSync(resolve(dir, 'ic_launcher_foreground.png'), transparent);
  }

  const adaptiveDir = resolve(root, 'android/app/src/main/res/mipmap-anydpi-v26');
  mkdirSync(adaptiveDir, { recursive: true });
  for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    writeFileSync(resolve(adaptiveDir, file), ADAPTIVE_XML);
  }

  const storeIcon = await renderIcon(STORE_SIZE);
  writeFileSync(resolve(root, 'store/icon-512.png'), storeIcon);
  writeFileSync(resolve(root, 'preview/icon-preview.png'), storeIcon);

  console.log('آیکون کافه‌خانه ساخته شد:');
  console.log(`  - آیکون مربعی و گرد اندروید در ${MIPMAPS.length} چگالی`);
  console.log(`  - لایه‌های adaptive در ${ADAPTIVE.length} چگالی`);
  console.log('  - store/icon-512.png و preview/icon-preview.png (۵۱۲×۵۱۲)');
}

main().catch(error => {
  console.error('ساخت آیکون ناموفق بود:', error);
  process.exitCode = 1;
});
