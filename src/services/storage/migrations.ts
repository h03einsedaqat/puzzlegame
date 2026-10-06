import { GAME_CONFIG } from '../../constants';

/**
 * مهاجرت داده‌های ذخیره‌شده میان نسخه‌های طرح‌واره.
 *
 * طرح‌واره فعلی نسخه ۱ است، بنابراین هنوز مهاجرت واقعی لازم نیست؛ ساختار آماده
 * است تا در نسخه‌های بعدی داده‌های کاربر بدون از دست رفتن پیشرفت ارتقا پیدا
 * کنند. هر مهاجرت، از نسخه n به n+1 را تبدیل می‌کند.
 */
export type MigrationMap = Record<number, (data: unknown) => unknown>;

export const MIGRATIONS: MigrationMap = {
  // نمونه برای نسخه‌های بعدی:
  // 1: data => ({ ...(data as UserProfile), membership: 'free' }),
};

export function migrateToCurrent<T>(
  data: unknown,
  migrations: MigrationMap = MIGRATIONS,
  targetVersion: number = GAME_CONFIG.storage.schemaVersion,
): T | undefined {
  let current = data;
  for (let version = 1; version < targetVersion; version += 1) {
    const migration = migrations[version];
    if (!migration) {
      return undefined;
    }
    current = migration(current);
  }
  return current as T;
}
