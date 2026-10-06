/**
 * ساخت آیکون‌های برنامه و آیکون فروشگاه.
 *
 * اجرا:  npm run icons:build
 *
 * خروجی‌ها:
 *   android/app/src/main/res/mipmap-<density>/ic_launcher.png        → آیکون اجرا
 *   android/app/src/main/res/mipmap-<density>/ic_launcher_round.png  → آیکون گرد اجرا
 *   store/icon-512.png                                        → آیکون پیشخان بازار
 *
 * طرح: یک کاشی گرد کرمرنگ روی پس‌زمینه بنفش برند، با حرف «ک» از فونت وزیرمتن.
 * حرف با مسیر برداری خودِ گلیف رسم می‌شود تا در همه اندازه‌ها تیز بماند و
 * کوچک‌شدن کیفیت آن را خراب نکند. هیچ جزئیات ریزی در طرح نیست تا در ۴۸ پیکسل
 * هم خوانا بماند؛ کافه‌بازار خودش گوشه‌ها را گرد می‌کند و سایه می‌افزاید، پس
 * گوشه‌های همین فایل مربع و بدون سایه‌اند.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import opentype from 'opentype.js';
import sharp from 'sharp';

import { colors } from '../src/theme/colors';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CANVAS = 512;
const LETTER = 'ک';
const LETTER_SCALE = 0.46;
const TILE_INSET = 60;
const TILE_RADIUS = 96;

/** اندازه‌های آیکون اجرا در هر چگالی صفحه */
const MIPMAPS: readonly { folder: string; size: number }[] = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

function letterPathData(): string {
  const file = resolve(root, 'src/assets/fonts/Vazirmatn-Bold.ttf');
  const buffer = readFileSync(file);
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const glyph = font.charToGlyph(LETTER);
  if (!glyph || glyph.index === 0) {
    throw new Error(`گلیف «${LETTER}» در فونت وزیرمتن پیدا نشد.`);
  }
  return glyph.getPath(0, 0, 1000).toPathData(2);
}

/** مسیر حرف را با اندازه و جای مشخص، در مرکز کاشی می‌گذارد */
function letterElement(pathData: string, bounds: opentype.BoundingBox, size: number, color: string, centerY: number): string {
  const width = bounds.x2 - bounds.x1;
  const height = bounds.y2 - bounds.y1;
  const factor = (size * LETTER_SCALE) / Math.max(width, height);
  const x = size / 2 - (bounds.x1 + width / 2) * factor;
  const y = centerY + (bounds.y1 + height / 2) * factor;
  return `<path d="${pathData}" fill="${color}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${factor.toFixed(6)} ${(-factor).toFixed(6)})"/>`;
}

function iconSvg(pathData: string, bounds: opentype.BoundingBox, round: boolean): string {
  const rounded = round
    ? `<circle cx="${CANVAS / 2}" cy="${CANVAS / 2}" r="${CANVAS / 2}" fill="${colors.primary}"/>
       <circle cx="${CANVAS / 2}" cy="${CANVAS / 2}" r="${CANVAS / 2 - TILE_INSET}" fill="${colors.background}"/>`
    : `<rect width="${CANVAS}" height="${CANVAS}" fill="${colors.primary}"/>
       <rect x="${TILE_INSET}" y="${TILE_INSET}" width="${CANVAS - TILE_INSET * 2}" height="${CANVAS - TILE_INSET * 2}" rx="${TILE_RADIUS}" fill="${colors.background}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  ${rounded}
  ${letterElement(pathData, bounds, CANVAS, colors.primary, CANVAS / 2 + 16)}
</svg>`;
}

async function writePng(svg: string, size: number, file: string): Promise<void> {
  mkdirSync(dirname(file), { recursive: true });
  const buffer = await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(file, buffer);
}

async function main(): Promise<void> {
  const buffer = readFileSync(resolve(root, 'src/assets/fonts/Vazirmatn-Bold.ttf'));
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const glyph = font.charToGlyph(LETTER);
  const bounds = glyph.getPath(0, 0, 1000).getBoundingBox();
  const pathData = glyph.getPath(0, 0, 1000).toPathData(2);

  const square = iconSvg(pathData, bounds, false);
  const round = iconSvg(pathData, bounds, true);

  for (const { folder, size } of MIPMAPS) {
    await writePng(square, size, resolve(root, 'android/app/src/main/res', folder, 'ic_launcher.png'));
    await writePng(round, size, resolve(root, 'android/app/src/main/res', folder, 'ic_launcher_round.png'));
  }

  await writePng(square, 512, resolve(root, 'store/icon-512.png'));

  console.log(`آیکون‌های اجرا در ${MIPMAPS.length} چگالی ساخته شد.`);
  console.log('آیکون پیشخان: store/icon-512.png (۵۱۲×۵۱۲، مربع، بدون سایه)');
}

main().catch(error => {
  console.error('ساخت آیکون‌ها ناموفق بود:', error);
  process.exitCode = 1;
});
