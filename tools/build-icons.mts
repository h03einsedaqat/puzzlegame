/**
 * ساخت آیکون‌های برنامه و آیکون فروشگاه.
 *
 * اجرا:  npm run icons:build
 *
 * خروجی‌ها:
 *   android/app/src/main/res/mipmap-<density>/ic_launcher.png        → آیکون اجرا
 *   android/app/src/main/res/mipmap-<density>/ic_launcher_round.png  → آیکون گرد اجرا
 *   android/app/src/main/res/mipmap-<density>/ic_launcher_foreground.png → لایه رویی آیکون تطبیقی
 *   android/app/src/main/res/mipmap-<density>/ic_launcher_background.png → لایه پشتی آیکون تطبیقی
 *   store/icon-512.png                                              → آیکون پیشخان بازار
 *
 * طرح: آسمانی آبی‌فیروزه‌ای با پرتوهای خورشید و کاغذرنگی‌های شاد، و در وسط یک
 * کاشی قهوه‌ایِ براق با حرف طلایی «ک» — همان حال‌وهوای شادی که از یک بازی
 * کلمه‌ای انتظار می‌رود. طرح کاملاً برداری است و حرف با مسیر خودِ گلیف رسم
 * می‌شود، پس در ۴۸ پیکسل هم تیز و خوانا می‌ماند.
 *
 * آیکون تطبیقی (adaptive) هم ساخته می‌شود: لایه پشتی پس‌زمینه شاد و لایه رویی
 * کاشی و حرف در محدوده امن. کافه‌بازار و لانچرهای اندروید ۸+ همین را نشان
 * می‌دهند و خودشان گوشه‌ها را گرد یا ماسک می‌کنند.
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
const LETTER_SCALE = 0.52;
const TILE_INSET = 74;
const TILE_RADIUS = 118;

/** اندازه‌های آیکون اجرا در هر چگالی صفحه */
const MIPMAPS: readonly { folder: string; size: number }[] = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

/** اندازه لایه‌های آیکون تطبیقی (۱۰۸dp استاندارد اندروید) */
const ADAPTIVE_MIPMAPS: readonly { folder: string; size: number }[] = [
  { folder: 'mipmap-mdpi', size: 108 },
  { folder: 'mipmap-hdpi', size: 162 },
  { folder: 'mipmap-xhdpi', size: 216 },
  { folder: 'mipmap-xxhdpi', size: 324 },
  { folder: 'mipmap-xxxhdpi', size: 432 },
];

/** کاغذرنگی‌ها: چند شکل ساده که حس جشن می‌دهند، بدون شلوغی */
const CONFETTI: readonly { x: number; y: number; r: number; fill: string; opacity: number }[] = [
  { x: 96, y: 104, r: 22, fill: colors.confettiYellow, opacity: 0.95 },
  { x: 420, y: 92, r: 16, fill: colors.confettiCoral, opacity: 0.95 },
  { x: 452, y: 250, r: 20, fill: colors.confettiPurple, opacity: 0.9 },
  { x: 66, y: 268, r: 14, fill: colors.confettiGreen, opacity: 0.95 },
  { x: 128, y: 424, r: 18, fill: colors.confettiPurple, opacity: 0.85 },
  { x: 398, y: 430, r: 24, fill: colors.confettiYellow, opacity: 0.95 },
  { x: 250, y: 66, r: 12, fill: colors.confettiGreen, opacity: 0.9 },
  { x: 268, y: 456, r: 15, fill: colors.confettiCoral, opacity: 0.9 },
];

function letterPathData(): { pathData: string; bounds: opentype.BoundingBox } {
  const file = resolve(root, 'src/assets/fonts/Vazirmatn-Bold.ttf');
  const buffer = readFileSync(file);
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const glyph = font.charToGlyph(LETTER);
  if (!glyph || glyph.index === 0) {
    throw new Error(`گلیف «${LETTER}» در فونت وزیرمتن پیدا نشد.`);
  }
  const path = glyph.getPath(0, 0, 1000);
  return { pathData: path.toPathData(2), bounds: path.getBoundingBox() };
}

/** مسیر حرف را با اندازه و جای مشخص، در نقطه خواسته‌شده می‌گذارد */
function letterElement(
  pathData: string,
  bounds: opentype.BoundingBox,
  size: number,
  color: string,
  centerY: number,
): string {
  const width = bounds.x2 - bounds.x1;
  const height = bounds.y2 - bounds.y1;
  const factor = (size * LETTER_SCALE) / Math.max(width, height);
  const x = size / 2 - (bounds.x1 + width / 2) * factor;
  const y = centerY + (bounds.y1 + height / 2) * factor;
  return `<path d="${pathData}" fill="${color}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${factor.toFixed(6)} ${(-factor).toFixed(6)})"/>`;
}

function defs(idPrefix: string): string {
  return `<defs>
    <linearGradient id="${idPrefix}sky" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="${colors.brandSky}"/>
      <stop offset="0.55" stop-color="${colors.skyTop}"/>
      <stop offset="1" stop-color="${colors.brandTeal}"/>
    </linearGradient>
    <linearGradient id="${idPrefix}tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${colors.tileDeepTop}"/>
      <stop offset="1" stop-color="${colors.tileDeep}"/>
    </linearGradient>
    <radialGradient id="${idPrefix}glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>`;
}

/** پرتوهای آفتاب از مرکز؛ ساده ولی شاد */
function sunbeams(color: string): string {
  const center = CANVAS / 2;
  const rays: string[] = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = (index * Math.PI) / 6;
    const spread = 0.12;
    const long = CANVAS * 0.95;
    const x1 = center + Math.cos(angle - spread) * long;
    const y1 = center + Math.sin(angle - spread) * long;
    const x2 = center + Math.cos(angle + spread) * long;
    const y2 = center + Math.sin(angle + spread) * long;
    rays.push(`<polygon points="${center},${center} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${color}" opacity="0.16"/>`);
  }
  return rays.join('');
}

function confetti(): string {
  return CONFETTI.map(
    dot => `<circle cx="${dot.x}" cy="${dot.y}" r="${dot.r}" fill="${dot.fill}" opacity="${dot.opacity}"/>`,
  ).join('');
}

/** پس‌زمینه شاد (آسمان + پرتو + کاغذرنگی)؛ در آیکون مربعی و گرد هم همین است */
function backgroundSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  ${defs('bg')}
  <rect width="${CANVAS}" height="${CANVAS}" fill="url(#bgsky)"/>
  ${sunbeams('#FFFFFF')}
  <circle cx="${CANVAS * 0.5}" cy="${CANVAS * 0.06}" r="${CANVAS * 0.34}" fill="url(#bgglow)"/>
  ${confetti()}
</svg>`;
}

/** کاشی براق قهوه‌ای با حرف طلایی؛ برای آیکون‌های قدیمی مربع/گرد و لایه رویی تطبیقی */
function tileSvg(pathData: string, bounds: opentype.BoundingBox, options: { inset: number; shadow: boolean }): string {
  const inset = options.inset;
  const side = CANVAS - inset * 2;
  const radiusTile = Math.round(TILE_RADIUS * (side / (CANVAS - TILE_INSET * 2)));
  const edge = Math.round(side * 0.05);
  const shadow = options.shadow
    ? `<rect x="${inset}" y="${inset + edge * 0.9}" width="${side}" height="${side}" rx="${radiusTile}" fill="${colors.tileDeepShadow}" opacity="0.35"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  ${defs('tile')}
  ${shadow}
  <rect x="${inset}" y="${inset}" width="${side}" height="${side}" rx="${radiusTile}" fill="url(#tiletile)" stroke="${colors.tileDeepBorder}" stroke-width="${Math.round(side * 0.02)}"/>
  <rect x="${inset + edge}" y="${inset + edge}" width="${side - edge * 2}" height="${Math.round(side * 0.34)}" rx="${Math.round(radiusTile * 0.7)}" fill="#FFFFFF" opacity="0.14"/>
  ${letterElement(pathData, bounds, CANVAS, colors.letterGold, CANVAS / 2 + CANVAS * 0.03)}
</svg>`;
}

function squareIcon(pathData: string, bounds: opentype.BoundingBox): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  ${defs('ic')}
  <rect width="${CANVAS}" height="${CANVAS}" fill="url(#icsky)"/>
  ${sunbeams('#FFFFFF')}
  ${confetti()}
  <rect x="${TILE_INSET}" y="${TILE_INSET + 8}" width="${CANVAS - TILE_INSET * 2}" height="${CANVAS - TILE_INSET * 2}" rx="${TILE_RADIUS}" fill="${colors.tileDeepShadow}" opacity="0.35"/>
  <rect x="${TILE_INSET}" y="${TILE_INSET}" width="${CANVAS - TILE_INSET * 2}" height="${CANVAS - TILE_INSET * 2}" rx="${TILE_RADIUS}" fill="url(#ictile)" stroke="${colors.tileDeepBorder}" stroke-width="8"/>
  <rect x="${TILE_INSET + 14}" y="${TILE_INSET + 14}" width="${CANVAS - TILE_INSET * 2 - 28}" height="${(CANVAS - TILE_INSET * 2) * 0.32}" rx="${TILE_RADIUS * 0.7}" fill="#FFFFFF" opacity="0.14"/>
  ${letterElement(pathData, bounds, CANVAS, colors.letterGold, CANVAS / 2 + 14)}
</svg>`;
}

function roundIcon(pathData: string, bounds: opentype.BoundingBox): string {
  const radiusOuter = CANVAS / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  ${defs('ic')}
  <circle cx="${CANVAS / 2}" cy="${CANVAS / 2}" r="${radiusOuter}" fill="url(#icsky)"/>
  <circle cx="${CANVAS / 2}" cy="${CANVAS / 2}" r="${radiusOuter * 0.92}" fill="${colors.brandTeal}" opacity="0.25"/>
  ${confetti()}
  <circle cx="${CANVAS / 2}" cy="${CANVAS / 2}" r="${radiusOuter - TILE_INSET}" fill="url(#ictile)" stroke="${colors.tileDeepBorder}" stroke-width="8"/>
  <circle cx="${CANVAS / 2}" cy="${CANVAS / 2 - TILE_INSET * 0.45}" r="${(radiusOuter - TILE_INSET) * 0.62}" fill="#FFFFFF" opacity="0.12"/>
  ${letterElement(pathData, bounds, CANVAS, colors.letterGold, CANVAS / 2 + 14)}
</svg>`;
}

async function writePng(svg: string, size: number, file: string): Promise<void> {
  mkdirSync(dirname(file), { recursive: true });
  const buffer = await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(file, buffer);
}

/** آیکون تطبیقی: لایه‌ها ۱۰۸dp هستند و لانچر خودش ماسک می‌کند */
const ADAPTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- آیکون تطبیقی اندروید ۸+: پس‌زمینه شاد + لایه رویی کاشی و حرف -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

async function main(): Promise<void> {
  const { pathData, bounds } = letterPathData();

  const square = squareIcon(pathData, bounds);
  const round = roundIcon(pathData, bounds);
  const background = backgroundSvg();
  // لایه رویی: کاشی و حرف کوچک‌تر تا داخل «محدوده امن» ۶۶٪ بماند
  const foreground = tileSvg(pathData, bounds, { inset: CANVAS * 0.26, shadow: false });

  for (const { folder, size } of MIPMAPS) {
    await writePng(square, size, resolve(root, 'android/app/src/main/res', folder, 'ic_launcher.png'));
    await writePng(round, size, resolve(root, 'android/app/src/main/res', folder, 'ic_launcher_round.png'));
  }

  for (const { folder, size } of ADAPTIVE_MIPMAPS) {
    await writePng(background, size, resolve(root, 'android/app/src/main/res', folder, 'ic_launcher_background.png'));
    await writePng(foreground, size, resolve(root, 'android/app/src/main/res', folder, 'ic_launcher_foreground.png'));
  }

  for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const target = resolve(root, 'android/app/src/main/res/mipmap-anydpi-v26', file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, ADAPTIVE_XML);
  }

  await writePng(square, 512, resolve(root, 'store/icon-512.png'));

  console.log(`آیکون‌های اجرا در ${MIPMAPS.length} چگالی ساخته شد.`);
  console.log(`آیکون تطبیقی (پس‌زمینه + لایه رویی) در ${ADAPTIVE_MIPMAPS.length} چگالی ساخته شد.`);
  console.log('آیکون پیشخان: store/icon-512.png (۵۱۲×۵۱۲، مربع، بدون سایه)');
}

main().catch(error => {
  console.error('ساخت آیکون‌ها ناموفق بود:', error);
  process.exitCode = 1;
});
