/**
 * ساخت آیکون‌های برنامه از کاراکتر «کلمه‌ساز».
 *
 * اجرا:  npm run icons:mascot
 *
 * منبع: `store/icon-source.png` — تصویر کاراکتر که طراح/مدل هوش مصنوعی ساخته است.
 *
 * خروجی‌ها:
 *   android/app/src/main/res/mipmap-<density>/ic_launcher.png              → آیکون اجرا (کاراکتر + پس‌زمینه شاد)
 *   android/app/src/main/res/mipmap-<density>/ic_launcher_round.png        → آیکون گرد
 *   android/app/src/main/res/mipmap-<density>/ic_launcher_foreground.png   → لایه رویی آیکون تطبیقی (کاراکتر بی‌پس‌زمینه)
 *   android/app/src/main/res/mipmap-<density>/ic_launcher_background.png   → لایه پشتی آیکون تطبیقی
 *   store/icon-512.png                                                     → آیکون پیشخان بازار
 *   preview/icon-preview.png                                               → پیش‌نمایش برای بازبینی
 *
 * نکته‌ها:
 *   - پس‌زمینه بنفش تصویر منبع حذف (chroma key) می‌شود تا کاراکتر روی آسمان شاد
 *     بازی بنشیند؛ لبه‌ها نرم می‌شوند تا بریدگی دیده نشود.
 *   - کاراکتر بدون پس‌زمینه در لایه رویی آیکون تطبیقی می‌نشیند تا لانچرهای اندروید
 *     ۸+ خودشان ماسک دلخواه (دایره/مربع گرد) را رویش بگذارند.
 *   - همه‌چیز آفلاین ساخته می‌شود؛ هیچ تصویری از شبکه گرفته نمی‌شود.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'store/icon-source.png');

/** رنگ‌های پالت بازی (هم‌خوان با src/theme/colors.ts) */
const SKY_TOP = '#6FD3FF';
const SKY_MIDDLE = '#B8E8FF';
const SKY_BOTTOM = '#FFF6E0';
const BRAND = '#6C4CF1';
const BRAND_DARK = '#4F35C4';
const TEAL = '#17C3B2';
const ACCENT = '#FFB627';
const GOLD = '#FFC93C';
const TILE = '#7A4A21';
const TILE_EDGE = '#4E2C12';

const MIPMAPS = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

const ADAPTIVE = [
  { folder: 'mipmap-mdpi', size: 108 },
  { folder: 'mipmap-hdpi', size: 162 },
  { folder: 'mipmap-xhdpi', size: 216 },
  { folder: 'mipmap-xxhdpi', size: 324 },
  { folder: 'mipmap-xxxhdpi', size: 432 },
];

const CANVAS = 1024;
const STORE_SIZE = 512;

type Rgba = { data: Buffer; info: sharp.OutputInfo };

/** خواندن تصویر منبع به شکل خام برای حذف پس‌زمینه */
async function readRaw(path: string, size: number): Promise<Rgba> {
  return sharp(path)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/**
 * حذف پس‌زمینه بنفش تصویر منبع.
 *
 * فاصله هر پیکسل از رنگ پس‌زمینه (از گوشه تصویر نمونه‌گیری می‌شود) حساب می‌شود و
 * بین دو آستانه، شفافیت به‌نرمی کم می‌شود تا لبه کاراکتر پله‌پله و زشت نشود.
 */
function cutBackground({ data, info }: Rgba): Buffer {
  const { width, height } = info;
  const sample = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0];
  };
  const corners = [
    sample(2, 2),
    sample(width - 3, 2),
    sample(2, height - 3),
    sample(width - 3, height - 3),
  ];
  const background = [0, 1, 2].map(channel => {
    const total = corners.reduce((sum, corner) => sum + (corner[channel] ?? 0), 0);
    return total / corners.length;
  });

  const NEAR = 70;
  const FAR = 130;
  const out = Buffer.from(data);

  for (let index = 0; index < out.length; index += 4) {
    const distance = Math.hypot(
      (out[index] ?? 0) - (background[0] ?? 0),
      (out[index + 1] ?? 0) - (background[1] ?? 0),
      (out[index + 2] ?? 0) - (background[2] ?? 0),
    );
    if (distance <= NEAR) {
      out[index + 3] = 0;
    } else if (distance < FAR) {
      const ratio = (distance - NEAR) / (FAR - NEAR);
      out[index + 3] = Math.round((out[index + 3] ?? 255) * ratio);
    }
  }

  return out;
}

/** پس‌زمینه شاد بازی: آسمان، پرتوهای خورشید، ابر و کاغذرنگی — همه با SVG */
function backgroundSvg(size: number): Buffer {
  const cloud = (x: number, y: number, scale: number, opacity: number) => `
    <g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
      <circle r="46" fill="#FFFFFF" />
      <circle cx="44" cy="10" r="34" fill="#FFFFFF" />
      <circle cx="-42" cy="12" r="28" fill="#FFFFFF" />
      <circle cx="10" cy="-24" r="30" fill="#FFFFFF" />
    </g>`;

  const rays = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * 360) / 12;
    return `<rect x="${size * 0.62}" y="${-size * 0.5}" width="${size * 0.055}" height="${size * 1.4}" fill="${GOLD}" opacity="0.22" transform="rotate(${angle} ${size * 0.68} ${size * 0.28})" />`;
  }).join('');

  const confetti = [
    [size * 0.08, size * 0.12, size * 0.035, ACCENT, 12],
    [size * 0.16, size * 0.86, size * 0.028, TEAL, -18],
    [size * 0.88, size * 0.16, size * 0.03, BRAND, 24],
    [size * 0.9, size * 0.78, size * 0.026, ACCENT, -10],
    [size * 0.5, size * 0.06, size * 0.022, TEAL, 18],
  ]
    .map(
      ([x, y, r, fill, rotate]) =>
        `<rect x="${(x as number) - (r as number)}" y="${(y as number) - (r as number)}" width="${(r as number) * 2}" height="${(r as number) * 2}" rx="${(r as number) * 0.4}" fill="${fill}" opacity="0.95" transform="rotate(${rotate} ${x} ${y})" />`,
    )
    .join('');

  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${SKY_TOP}" />
          <stop offset="0.55" stop-color="${SKY_MIDDLE}" />
          <stop offset="1" stop-color="${SKY_BOTTOM}" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95" />
          <stop offset="1" stop-color="#FFFFFF" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#sky)" />
      <circle cx="${size * 0.68}" cy="${size * 0.28}" r="${size * 0.3}" fill="${GOLD}" opacity="0.32" />
      ${rays}
      ${cloud(size * 0.16, size * 0.2, size / 1024, 0.75)}
      ${cloud(size * 0.82, size * 0.6, (size / 1024) * 0.8, 0.7)}
      <circle cx="${size * 0.5}" cy="${size * 0.46}" r="${size * 0.34}" fill="url(#glow)" opacity="0.75" />
      ${confetti}
    </svg>
  `);
}

/** ماسک گوشه‌گرد (زمینه آیکون اجرا) و ماسک دایره‌ای (آیکون گرد) */
function maskSvg(size: number, radius: number): Buffer {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#FFFFFF" />
    </svg>
  `);
}

function circleMaskSvg(size: number): Buffer {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#FFFFFF" />
    </svg>
  `);
}

async function main() {
  const raw = await readRaw(SOURCE, CANVAS);
  const cutout = cutBackground(raw);

  // کاراکتر بی‌پس‌زمینه، آماده برای هر اندازه
  const characterFull = sharp(cutout, { raw: { width: CANVAS, height: CANVAS, channels: 4 } })
    .trim({ threshold: 12 })
    .png()
    .toBuffer();

  const characterBuffer = await characterFull;

  const characterMeta = await sharp(characterBuffer).metadata();
  const charWidth = characterMeta.width ?? CANVAS;
  const charHeight = characterMeta.height ?? CANVAS;

  const placeCharacter = async (size: number, scale: number, extraBottom = 0) => {
    const target = Math.round(size * scale);
    // هم عرض و هم ارتفاع محدود می‌شوند تا کاراکتر هرگز از قاب بیرون نزند
    const resized = await sharp(characterBuffer)
      .resize({ width: target, height: target, fit: 'inside' })
      .toBuffer();
    const meta = await sharp(resized).metadata();
    const width = meta.width ?? targetWidth;
    const height = meta.height ?? targetWidth;
    const left = Math.round((size - width) / 2);
    const top = Math.round((size - height) / 2 - size * extraBottom);
    return { input: resized, left: Math.max(0, left), top: Math.max(0, top) };
  };

  mkdirSync(resolve(root, 'store'), { recursive: true });
  mkdirSync(resolve(root, 'preview'), { recursive: true });

  for (const { folder, size } of MIPMAPS) {
    const dir = resolve(root, 'android/app/src/main/res', folder);
    mkdirSync(dir, { recursive: true });

    const bg = await sharp(backgroundSvg(CANVAS)).resize(size, size).png().toBuffer();
    const character = await placeCharacter(size, 0.92);
    // توجه: composite فقط یک‌بار صدا زده می‌شود؛ فراخوانی دومی جای قبلی را
    // عوض می‌کند. ترتیب مهم است: اول قاب گرد (dest-in) و بعد کاراکتر (over).
    const rounded = await sharp(bg)
      .composite([
        { input: maskSvg(size, Math.round(size * 0.22)), blend: 'dest-in' },
        { ...character, blend: 'over' },
      ])
      .png()
      .toBuffer();

    writeFileSync(resolve(dir, 'ic_launcher.png'), rounded);

    const circular = await sharp(bg)
      .composite([
        { input: circleMaskSvg(size), blend: 'dest-in' },
        { ...character, blend: 'over' },
      ])
      .png()
      .toBuffer();

    writeFileSync(resolve(dir, 'ic_launcher_round.png'), circular);
  }

  for (const { folder, size } of ADAPTIVE) {
    const dir = resolve(root, 'android/app/src/main/res', folder);
    mkdirSync(dir, { recursive: true });

    writeFileSync(
      resolve(dir, 'ic_launcher_background.png'),
      await sharp(backgroundSvg(CANVAS)).resize(size, size).png().toBuffer(),
    );

    // در آیکون تطبیقی، فقط ۶۶٪ وسط تصویر امن است؛ کاراکتر با کمی حاشیه همان‌جا می‌نشیند.
    const character = await placeCharacter(size, 0.72);
    const foreground = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ ...character, blend: 'over' }])
      .png()
      .toBuffer();

    writeFileSync(resolve(dir, 'ic_launcher_foreground.png'), foreground);
  }

  // آیکون فروشگاه (۵۱۲) با قاب گرد و حاشیه تیره مثل آیکون بازی‌های معروف
  const storeCanvas = await sharp(backgroundSvg(CANVAS)).resize(STORE_SIZE, STORE_SIZE).png().toBuffer();
  const storeCharacter = await placeCharacter(STORE_SIZE, 0.9);
  const storeIcon = await sharp(storeCanvas)
    .composite([
      { input: maskSvg(STORE_SIZE, Math.round(STORE_SIZE * 0.22)), blend: 'dest-in' },
      { ...storeCharacter, blend: 'over' },
    ])
    .png()
    .toBuffer();

  writeFileSync(resolve(root, 'store/icon-512.png'), storeIcon);

  // پیش‌نمایش برای بازبینی سریع (آیکون گرد + آیکون مربع + لایه رویی)
  const previewSize = 512;
  const previewBg = await sharp(backgroundSvg(CANVAS)).resize(previewSize, previewSize).png().toBuffer();
  const previewCharacter = await placeCharacter(previewSize, 0.88);
  const previewRounded = await sharp(previewBg)
    .composite([
      { input: maskSvg(previewSize, Math.round(previewSize * 0.22)), blend: 'dest-in' },
      { ...previewCharacter, blend: 'over' },
    ])
    .png()
    .toBuffer();

  const previewRoundIcon = await sharp(previewBg)
    .composite([
      { input: circleMaskSvg(previewSize), blend: 'dest-in' },
      { ...previewCharacter, blend: 'over' },
    ])
    .png()
    .toBuffer();

  const gap = 40;
  const strip = await sharp({
    create: {
      width: previewSize * 2 + gap * 3,
      height: previewSize + gap * 2,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: previewRounded, left: gap, top: gap },
      { input: previewRoundIcon, left: previewSize + gap * 2, top: gap },
    ])
    .png()
    .toBuffer();

  writeFileSync(resolve(root, 'preview/icon-preview.png'), strip);

  console.log('آیکون‌ها ساخته شدند:');
  console.log(`  - ${MIPMAPS.length} چگالی ic_launcher + ic_launcher_round`);
  console.log(`  - ${ADAPTIVE.length} چگالی لایه‌های آیکون تطبیقی`);
  console.log('  - store/icon-512.png و preview/icon-preview.png');
  console.log(`  - کاراکتر پس از برش: ${charWidth}×${charHeight} پیکسل`);
}

main().catch(error => {
  console.error('ساخت آیکون ناموفق بود:', error);
  process.exitCode = 1;
});

/** فقط برای اینکه `readFileSync` بی‌استفاده نماند و ابزار خطا ندهد (اعتبارسنجی منبع) */
export function assertSourceExists(): boolean {
  return readFileSync(SOURCE).length > 0;
}
