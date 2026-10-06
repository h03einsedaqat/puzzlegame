import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen } from '@testing-library/react-native';

import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { GAME_CONFIG, strings } from '../../src/constants';
import { format } from '../../src/utils/format';
import type { GameProgress, UserProfile } from '../../src/types';
import { completeOnboarding, launchApp, resetDeviceStorage, waitForStored } from './helpers';

/** داده خراب یا ناسازگار نباید برنامه را از کار بیندازد */
jest.setTimeout(30000);

beforeEach(() => {
  resetDeviceStorage();
});

it('داده ذخیره‌شده خراب با مقدار پیش‌فرض جبران می‌شود', async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.profile, '{{{ داده خراب');
  await AsyncStorage.setItem(STORAGE_KEYS.settings, 'null');
  await AsyncStorage.setItem(
    STORAGE_KEYS.progress,
    JSON.stringify({ version: 1, savedAt: 0, data: { currentLevel: 'یک' } }),
  );

  await launchApp();
  // آموزش آغازین دوباره نشان داده می‌شود چون تنظیمات قابل خواندن نبود
  expect(screen.getByText(strings.onboarding.slide1Title)).toBeTruthy();
  await completeOnboarding();

  // سکه‌های شروع، نشانه جبران‌شدن پروفایل خراب است
  expect(screen.getByLabelText(format(strings.accessibility.coinCounter, { count: GAME_CONFIG.economy.initialCoins }))).toBeTruthy();
  expect(screen.getByText(strings.home.playNewButton)).toBeTruthy();

  // مقدار سالم روی حافظه نوشته می‌شود تا هر بار جبران لازم نباشد
  const profile = await waitForStored<UserProfile>(
    STORAGE_KEYS.profile,
    value => typeof value.coins === 'number',
  );
  expect(profile.coins).toBe(GAME_CONFIG.economy.initialCoins);

  const progress = await waitForStored<GameProgress>(
    STORAGE_KEYS.progress,
    value => typeof value.unlockedLevel === 'number',
  );
  expect(progress.unlockedLevel).toBe(1);
  expect(progress.records).toEqual([]);
});
