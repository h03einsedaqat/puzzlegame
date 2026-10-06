import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { GAME_CONFIG } from '../../src/constants';
import {
  createDefaultAchievements,
  createDefaultDaily,
  createDefaultProfile,
  createDefaultProgress,
  createDefaultSettings,
} from '../../src/services/storage/defaults';
import { migrateToCurrent } from '../../src/services/storage/migrations';
import { achievementsRepository, profileRepository, progressRepository } from '../../src/services/storage/repositories';
import { clearAll, createEnvelope, loadData, readRawKey, removeData, saveData } from '../../src/services/storage/storage';

type TestGlobals = {
  __mockAsyncStorage: { setItem: jest.Mock };
  __resetAsyncStorage: () => void;
};

const testGlobals = globalThis as unknown as TestGlobals;

beforeEach(() => {
  testGlobals.__resetAsyncStorage();
  jest.clearAllMocks();
});

describe('پوشش نسخه‌دار ذخیره‌سازی', () => {
  it('پوشش را با نسخه طرح‌واره و زمان ذخیره می‌سازد', () => {
    const envelope = createEnvelope({ coins: 10 });
    expect(envelope.version).toBe(GAME_CONFIG.storage.schemaVersion);
    expect(envelope.data).toEqual({ coins: 10 });
    expect(envelope.savedAt).toBeGreaterThan(0);
  });

  it('داده را می‌نویسد و همان را برمی‌گرداند', async () => {
    await saveData(STORAGE_KEYS.profile, { coins: 25 });
    const result = await loadData(STORAGE_KEYS.profile, { coins: 0 });

    expect(result.found).toBe(true);
    expect(result.recovered).toBe(false);
    expect(result.migrated).toBe(false);
    expect(result.data).toEqual({ coins: 25 });
  });

  it('برای کلید خالی، مقدار پیش‌فرض را بدون پرچم بازیابی برمی‌گرداند', async () => {
    const result = await loadData(STORAGE_KEYS.profile, { coins: 7 });
    expect(result).toEqual({ data: { coins: 7 }, recovered: false, migrated: false, found: false });
  });

  it('داده خراب (JSON نامعتبر) را با پیش‌فرض جایگزین می‌کند', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.profile, '{invalid json');
    const result = await loadData(STORAGE_KEYS.profile, { coins: 1 });

    expect(result.data).toEqual({ coins: 1 });
    expect(result.recovered).toBe(true);
    expect(result.found).toBe(true);
  });

  it('پوشش بدون نسخه را خراب می‌داند', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify({ data: { coins: 3 } }));
    const result = await loadData(STORAGE_KEYS.profile, { coins: 1 });
    expect(result.recovered).toBe(true);
  });

  it('باید مهاجرت داده‌های نسخه قدیمی را انجام دهد', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify({ version: GAME_CONFIG.storage.schemaVersion - 1, savedAt: Date.now(), data: { coins: 5 } }),
    );

    const migrated = await loadData(STORAGE_KEYS.profile, { coins: 0 }, data => ({
      ...(data as { coins: number }),
      coins: (data as { coins: number }).coins + 1,
    }));
    expect(migrated.migrated).toBe(true);
    expect(migrated.data).toEqual({ coins: 6 });
  });

  it('نسخه قدیمی بدون مسیر مهاجرت را با پیش‌فرض جبران می‌کند', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify({ version: GAME_CONFIG.storage.schemaVersion - 1, savedAt: Date.now(), data: { coins: 5 } }),
    );
    const result = await loadData(STORAGE_KEYS.profile, { coins: 0 });
    expect(result.recovered).toBe(true);
    expect(result.data).toEqual({ coins: 0 });
  });

  it('خطای مهاجرت را بی‌خطر مدیریت می‌کند', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify({ version: 0, savedAt: Date.now(), data: { coins: 5 } }),
    );
    const result = await loadData(STORAGE_KEYS.profile, { coins: 2 }, () => {
      throw new Error('مهاجرت ناموفق');
    });
    expect(result.recovered).toBe(true);
    expect(result.data).toEqual({ coins: 2 });
  });

  it('نوشتن ناموفق جریان برنامه را متوقف نمی‌کند', async () => {
    testGlobals.__mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('حافظه پر است'));
    await expect(saveData(STORAGE_KEYS.profile, { coins: 1 })).resolves.toBeUndefined();
  });

  it('حذف کلید و پاک‌کردن همه داده‌ها را انجام می‌دهد', async () => {
    await saveData(STORAGE_KEYS.profile, { coins: 1 });
    await saveData(STORAGE_KEYS.settings, { soundEnabled: false });

    await removeData(STORAGE_KEYS.profile);
    expect(await readRawKey(STORAGE_KEYS.profile)).toBeUndefined();

    await clearAll();
    expect(await readRawKey(STORAGE_KEYS.settings)).toBeUndefined();
  });
});

describe('مقدارهای پیش‌فرض', () => {
  it('پروفایل تازه با سکه، قلب و شمارنده‌های صفر ساخته می‌شود', () => {
    const profile = createDefaultProfile(1_700_000_000_000);
    expect(profile.coins).toBe(GAME_CONFIG.economy.initialCoins);
    expect(profile.hearts).toBe(GAME_CONFIG.economy.initialHearts);
    expect(profile.maxHearts).toBe(GAME_CONFIG.economy.maxHearts);
    expect(profile.totalWordsFound).toBe(0);
    expect(profile.createdAt).toBe(1_700_000_000_000);
    expect(profile.membership).toBe('free');
  });

  it('پیشرفت، تنظیمات، چالش روزانه و دستاوردها با مقدار خالی شروع می‌شوند', () => {
    const progress = createDefaultProgress();
    expect(progress.currentLevel).toBe(1);
    expect(progress.unlockedLevel).toBe(1);
    expect(progress.records).toEqual([]);
    expect(progress.lastPlayedLevelId).toBeNull();

    const settings = createDefaultSettings();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.vibrationEnabled).toBe(true);
    expect(settings.onboardingCompleted).toBe(false);

    const daily = createDefaultDaily();
    expect(daily.streak).toBe(0);
    expect(daily.rewardCycleDay).toBe(1);
    expect(daily.completedChallengeDates).toEqual([]);

    const achievements = createDefaultAchievements();
    expect(achievements.unlockedIds).toEqual([]);
    expect(achievements.unseenIds).toEqual([]);
  });
});

describe('مهاجرت طرح‌واره', () => {
  it('مهاجرت‌های پیوسته را تا نسخه هدف اجرا می‌کند', () => {
    const result = migrateToCurrent<{ coins: number; membership?: string }>(
      { coins: 4 },
      { 1: data => ({ ...(data as { coins: number }), membership: 'free' }) },
      2,
    );
    expect(result).toEqual({ coins: 4, membership: 'free' });
  });

  it('اگر مهاجرت لازم نباشد داده را دست‌نخورده برمی‌گرداند', () => {
    const data = { coins: 9 };
    expect(migrateToCurrent(data, {}, GAME_CONFIG.storage.schemaVersion)).toEqual(data);
  });

  it('نبود مهاجرت لازم را با undefined اعلام می‌کند', () => {
    expect(migrateToCurrent({ coins: 1 }, {}, 2)).toBeUndefined();
  });
});

describe('مخزن‌ها', () => {
  it('پروفایل را ذخیره و با همان شکل بازیابی می‌کند', async () => {
    const profile = createDefaultProfile();
    const updated = { ...profile, coins: 120, totalWordsFound: 8 };

    await profileRepository.save(updated);
    const result = await profileRepository.load();

    expect(result.found).toBe(true);
    expect(result.data.coins).toBe(120);
    expect(result.data.totalWordsFound).toBe(8);
  });

  it('داده ناسازگار ذخیره‌شده را با پیش‌فرض جایگزین می‌کند', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.progress,
      JSON.stringify({ version: GAME_CONFIG.storage.schemaVersion, savedAt: Date.now(), data: { currentLevel: 'یک' } }),
    );

    const result = await progressRepository.load();
    expect(result.recovered).toBe(true);
    expect(result.data.currentLevel).toBe(1);
    expect(result.data.unlockedLevel).toBe(1);
  });

  it('پاک‌کردن مخزن، پیشرفت را به حالت اول برمی‌گرداند', async () => {
    await progressRepository.save({ ...createDefaultProgress(), currentLevel: 12, unlockedLevel: 12 });
    await progressRepository.clear();

    const result = await progressRepository.load();
    expect(result.data.currentLevel).toBe(1);
  });

  it('مقدار پیش‌فرض ساختنی هر مخزن معتبر است', () => {
    expect(achievementsRepository.createDefault()).toEqual(createDefaultAchievements());
    expect(achievementsRepository.isValid(achievementsRepository.createDefault())).toBe(true);
    expect(achievementsRepository.isValid(null)).toBe(false);
  });
});
