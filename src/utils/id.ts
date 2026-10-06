import { hashString } from './random';

/**
 * شناسه محلی کاربر. هیچ اطلاعات هویتی در آن نیست و فقط برای تفکیک داده‌های
 * ذخیره‌شده روی دستگاه استفاده می‌شود.
 */
export function createLocalId(seed: string = `${Date.now()}`): string {
  const random = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `u_${hashString(seed).toString(36)}${random}`;
}

let counter = 0;

/** شناسه یکتای کاشی‌های حروف و عناصر لیست */
export function createTileId(prefix = 't'): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function resetIdCounter(): void {
  counter = 0;
}
