import { fireEvent, screen } from '@testing-library/react-native';

import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { strings } from '../../src/constants';
import type { GameProgress, UserProfile } from '../../src/types';
import {
  primeReducedMotion,
  LEVEL_ONE,
  completeFirstLevel,
  completeOnboarding,
  launchApp,
  resetDeviceStorage,
  returnHomeFromResult,
  waitForHomeWithProgress,
  waitForStored,
} from './helpers';

/** بستن و باز کردن دوباره برنامه: پیشرفت باید دست‌نخورده برگردد */
jest.setTimeout(30000);

beforeEach(() => {
  resetDeviceStorage();
});

it('پیشرفت پس از بستن و باز کردن دوباره برنامه بازیابی می‌شود', async () => {
  await primeReducedMotion();
  const firstRun = await launchApp();
  await completeOnboarding();
  await completeFirstLevel();
  await returnHomeFromResult();

  const completedProfile = await waitForStored<UserProfile>(
    STORAGE_KEYS.profile,
    value => value.totalWordsFound >= LEVEL_ONE.targetWords.length,
  );
  const coinsBeforeRestart = completedProfile.coins;

  // «بستن برنامه»: درخت رابط پاک می‌شود اما حافظه دستگاه می‌ماند
  firstRun.unmount();

  await launchApp();
  await waitForHomeWithProgress();
  expect(screen.queryByText(strings.onboarding.slide1Title)).toBeNull();
  expect(screen.queryByText(strings.home.playNewButton)).toBeNull();

  const profile = await waitForStored<UserProfile>(
    STORAGE_KEYS.profile,
    value => value.totalWordsFound >= LEVEL_ONE.targetWords.length,
  );
  expect(profile.coins).toBe(coinsBeforeRestart);

  const progress = await waitForStored<GameProgress>(
    STORAGE_KEYS.progress,
    value => value.unlockedLevel > LEVEL_ONE.id,
  );
  expect(progress.records.some(record => record.levelId === LEVEL_ONE.id)).toBe(true);

  // مرحله ذخیره‌شده از نقشه هم قابل شروع است
  await fireEvent.press(screen.getByText(strings.home.levelsButton));
  expect(screen.getByText(strings.levelMap.title)).toBeTruthy();
});
