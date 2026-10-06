/**
 * آماده‌سازی assets اندروید.
 *
 * اجرا:  npm run fonts:link
 *
 * فونت‌ها یک‌بار در مخزن نگهداری می‌شوند (src/assets/fonts) و پیش از ساخت
 * بسته به پوشه assets اندروید کپی می‌شوند. Android برای `fontFamily` فقط
 * فونت‌های داخل `assets/fonts` بسته را می‌شناسد؛ پس این کپی لازم است.
 *
 * همین کار در build.gradle هم به‌صورت خودکار انجام می‌شود تا ساخت بسته هرگز
 * بدون فونت وزیرمتن انجام نشود؛ این ابزار برای اجرای دستی و بررسی سریع است.
 */
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'src/assets/fonts');
const target = resolve(root, 'android/app/src/main/assets/fonts');

mkdirSync(target, { recursive: true });

const fonts = readdirSync(source).filter(file => file.toLowerCase().endsWith('.ttf'));
if (fonts.length === 0) {
  throw new Error('هیچ فونت TTF در src/assets/fonts پیدا نشد.');
}

let copied = 0;
for (const file of fonts) {
  const from = resolve(source, file);
  const to = resolve(target, file);
  const exists = (() => {
    try {
      return statSync(to).size === statSync(from).size;
    } catch {
      return false;
    }
  })();
  if (!exists) {
    copyFileSync(from, to);
    copied += 1;
  }
}

console.log(`فونت‌ها در بسته اندروید آماده‌اند (${fonts.length} فایل، ${copied} فایل تازه کپی شد).`);
console.log(target);
