import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { strings } from '../../src/constants';
import { format } from '../../src/utils/format';
import type { UserProfile } from '../../src/types';
import {
  ECONOMY,
  LEVEL_TWO,
  completeFirstLevel,
  completeOnboarding,
  launchApp,
  resetDeviceStorage,
  returnHomeFromResult,
  waitForHomeWithProgress,
  waitForStored,
} from './helpers';

/** اقتصاد قلب: شروع مرحله قلب می‌گیرد، تکمیل مرحله قلب را برمی‌گرداند */
jest.setTimeout(30000);

beforeEach(() => {
  resetDeviceStorage();
});

it('قلب با شروع مرحله خرج می‌شود و با تکمیل مرحله برمی‌گردد', async () => {
  const view = await launchApp();
  await completeOnboarding();

  // مرحله یک رایگان است و قلبی خرج نمی‌کند
  await completeFirstLevel();
  const afterCompletion = await waitForStored<UserProfile>(
    STORAGE_KEYS.profile,
    value => value.totalGamesCompleted > 0,
  );
  expect(afterCompletion.hearts).toBe(ECONOMY.initialHearts);

  await returnHomeFromResult();

  // «ادامه بازی» پس از تکمیل مرحله، مرحله بعد را باز می‌کند
  await fireEvent.press(screen.getByText(strings.home.playButton));
  const levelTwoHeader = format(strings.common.levelNumber, { number: LEVEL_TWO.id });
  await waitFor(() => expect(screen.getAllByText(levelTwoHeader).length).toBeGreaterThan(0));

  const afterAttempt = await waitForStored<UserProfile>(
    STORAGE_KEYS.profile,
    value => value.hearts < ECONOMY.initialHearts,
  );
  expect(afterAttempt.hearts).toBe(ECONOMY.initialHearts - ECONOMY.heartCostPerAttempt);
  expect(afterAttempt.lastHeartRefillAt).not.toBeNull();

  // صفحه بازی، شمارش معکوس قلب بعدی را نشان می‌دهد
  expect(screen.getByLabelText(format(strings.accessibility.heartCounter, {
    count: afterAttempt.hearts,
    max: afterAttempt.maxHearts,
  }))).toBeTruthy();

  // خروج با دکمه بازگشت: پیشرفت نیمه‌کاره رها می‌شود و به خانه برمی‌گردیم
  await fireEvent.press(screen.getAllByLabelText(strings.common.back)[0]!);
  await waitFor(() => expect(screen.getByText(strings.game.leaveTitle)).toBeTruthy());
  await fireEvent.press(screen.getByText(strings.common.confirm));
  await waitForHomeWithProgress();

  view.unmount();
});
