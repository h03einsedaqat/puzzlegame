import AsyncStorage from '@react-native-async-storage/async-storage';

import { GAME_CONFIG } from '../../constants';
import { STORAGE_KEYS, type StorageKey } from '../../constants/storageKeys';
import type { StorageEnvelope } from '../../types';

/**
 * دسترسی به ذخیره‌سازی محلی در یک نقطه متمرکز شده است.
 *
 * هر مقدار با یک پوشش نسخه‌دار ذخیره می‌شود تا مهاجرت داده‌ها در نسخه‌های بعدی
 * ممکن باشد. اگر داده ذخیره‌شده خراب یا ناسازگار باشد، به‌جای کرش‌کردن، مقدار
 * پیش‌فرض برگردانده می‌شود و پرچم «بازیابی» گزارش می‌شود.
 */

export interface LoadResult<T> {
  data: T;
  /** داده خراب بود و مقدار پیش‌فرض جایگزین شد */
  recovered: boolean;
  /** داده از نسخه قدیمی‌تر مهاجرت داده شد */
  migrated: boolean;
  found: boolean;
}

export function createEnvelope<T>(data: T): StorageEnvelope<T> {
  return {
    version: GAME_CONFIG.storage.schemaVersion,
    savedAt: Date.now(),
    data,
  };
}

async function readRaw(key: StorageKey): Promise<unknown> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export async function loadData<T>(
  key: StorageKey,
  fallback: T,
  migrate?: (data: unknown) => T | undefined,
): Promise<LoadResult<T>> {
  const parsed = await readRaw(key);
  if (parsed === undefined) {
    return { data: fallback, recovered: false, migrated: false, found: false };
  }

  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed) || !('data' in parsed)) {
    return { data: fallback, recovered: true, migrated: false, found: true };
  }

  const envelope = parsed as StorageEnvelope<unknown>;
  if (envelope.version === GAME_CONFIG.storage.schemaVersion) {
    return { data: envelope.data as T, recovered: false, migrated: false, found: true };
  }

  if (migrate) {
    try {
      const migrated = migrate(envelope.data);
      if (migrated !== undefined) {
        return { data: migrated, recovered: false, migrated: true, found: true };
      }
    } catch {
      return { data: fallback, recovered: true, migrated: false, found: true };
    }
  }

  return { data: fallback, recovered: true, migrated: false, found: true };
}

export async function saveData<T>(key: StorageKey, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(createEnvelope(data)));
  } catch {
    // نوشتن ناموفق نباید جریان بازی را متوقف کند؛ مقدار بعدی دوباره تلاش می‌شود.
  }
}

export async function removeData(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // حذف ناموفق فقط در پاک‌کردن پیشرفت رخ می‌دهد و خطای آن بی‌خطر است.
  }
}

export async function clearAll(): Promise<void> {
  await Promise.all(Object.values(STORAGE_KEYS).map(key => removeData(key)));
}

/** فقط برای تست‌ها و ابزار توسعه: خواندن خام یک کلید */
export async function readRawKey(key: StorageKey): Promise<unknown> {
  return readRaw(key);
}
