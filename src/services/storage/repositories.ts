import { STORAGE_KEYS, type StorageKey } from '../../constants/storageKeys';
import type { AchievementState, AppSettings, DailyState, GameProgress, UserProfile } from '../../types';
import {
  createDefaultAchievements,
  createDefaultDaily,
  createDefaultProfile,
  createDefaultProgress,
  createDefaultSettings,
} from './defaults';
import { migrateToCurrent } from './migrations';
import { loadData, removeData, saveData, type LoadResult } from './storage';

/**
 * هر بخش از داده بازی یک مخزن دارد. مخزن، کلید ذخیره‌سازی، مقدار پیش‌فرض و
 * اعتبارسنجی داده بازیابی‌شده را می‌شناسد؛ صفحه‌ها و سرویس‌ها فقط با API همین
 * مخزن‌ها کار می‌کنند.
 */
interface Repository<T> {
  key: StorageKey;
  createDefault: () => T;
  isValid: (value: unknown) => value is T;
  load: () => Promise<LoadResult<T>>;
  save: (value: T) => Promise<void>;
  clear: () => Promise<void>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createRepository<T>(
  key: StorageKey,
  createDefault: () => T,
  isValid: (value: unknown) => value is T,
): Repository<T> {
  /**
   * داده نسخه‌قدیمی‌تر از مسیر مهاجرت عبور می‌کند و بعد اعتبارسنجی می‌شود؛
   * مهاجرتی که خروجی نامعتبر بدهد، مثل داده خراب رفتار می‌کند و پیشرفت کاربر
   * را با داده ناسازگار جایگزین نمی‌کند.
   */
  const migrate = (data: unknown): T | undefined => {
    const migrated = migrateToCurrent<unknown>(data);
    return isValid(migrated) ? migrated : undefined;
  };

  return {
    key,
    createDefault,
    isValid,
    load: async () => {
      const result = await loadData<T>(key, createDefault(), migrate);
      if (!result.found) {
        return result;
      }
      if (!isValid(result.data)) {
        return { data: createDefault(), recovered: true, migrated: false, found: true };
      }
      return result;
    },
    save: (value: T) => saveData(key, value),
    clear: () => removeData(key),
  };
}

export const profileRepository = createRepository<UserProfile>(
  STORAGE_KEYS.profile,
  () => createDefaultProfile(),
  (value): value is UserProfile =>
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.coins === 'number' &&
    typeof value.hearts === 'number',
);

export const progressRepository = createRepository<GameProgress>(
  STORAGE_KEYS.progress,
  createDefaultProgress,
  (value): value is GameProgress =>
    isObject(value) &&
    typeof value.currentLevel === 'number' &&
    typeof value.unlockedLevel === 'number' &&
    Array.isArray(value.records),
);

export const settingsRepository = createRepository<AppSettings>(
  STORAGE_KEYS.settings,
  createDefaultSettings,
  (value): value is AppSettings =>
    isObject(value) &&
    typeof value.soundEnabled === 'boolean' &&
    typeof value.onboardingCompleted === 'boolean',
);

export const dailyRepository = createRepository<DailyState>(
  STORAGE_KEYS.daily,
  () => createDefaultDaily(),
  (value): value is DailyState =>
    isObject(value) &&
    typeof value.streak === 'number' &&
    Array.isArray(value.completedChallengeDates),
);

export const achievementsRepository = createRepository<AchievementState>(
  STORAGE_KEYS.achievements,
  createDefaultAchievements,
  (value): value is AchievementState =>
    isObject(value) && Array.isArray(value.unlockedIds),
);

export const repositories = {
  profile: profileRepository,
  progress: progressRepository,
  settings: settingsRepository,
  daily: dailyRepository,
  achievements: achievementsRepository,
} as const;

export type { Repository };
