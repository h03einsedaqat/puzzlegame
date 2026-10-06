/*
 * جدول هش بر پایه عملگرهای بیتی ساخته می‌شود؛ این تنها جای برنامه است که
 * استفاده از عملگرهای بیتی توجیه دارد.
 */
/* eslint-disable no-bitwise */
/**
 * تولیدکننده عدد شبه‌تصادفی با بذر (mulberry32).
 * برای چالش روزانه و پخش‌کردن قطعی مرحله‌ها لازم است: یک بذر، همیشه یک خروجی.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** هش FNV-1a برای تبدیل رشته (مثل تاریخ) به عدد قابل استفاده به‌عنوان بذر. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** پخش‌کردن قطعی یک آرایه با بذر مشخص (بدون تغییر آرایه ورودی) */
export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const random = createRandom(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    const swap = result[swapIndex];
    if (current === undefined || swap === undefined) {
      continue;
    }
    result[index] = swap;
    result[swapIndex] = current;
  }
  return result;
}

export function pickWithSeed<T>(items: readonly T[], seed: number): T | null {
  if (items.length === 0) {
    return null;
  }
  const random = createRandom(seed);
  return items[Math.floor(random() * items.length)] ?? null;
}
