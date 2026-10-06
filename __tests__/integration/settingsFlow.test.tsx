import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { strings } from '../../src/constants';
import {
  completeOnboarding,
  launchApp,
  primeReducedMotion,
  resetDeviceStorage,
  waitForStored,
} from './helpers';

/** تنظیمات باید ذخیره شود و پس از راه‌اندازی مجدد بماند */
jest.setTimeout(30000);

beforeEach(() => {
  resetDeviceStorage();
});

it('تنظیمات صدا ذخیره می‌شود و در اجرای بعدی می‌ماند', async () => {
  await primeReducedMotion();
  const view = await launchApp();
  await completeOnboarding();

  await fireEvent.press(screen.getByLabelText(strings.settings.title));
  await waitFor(() => expect(screen.getByLabelText(strings.settings.soundLabel)).toBeTruthy());

  const soundRow = screen.getByLabelText(strings.settings.soundLabel);
  expect(soundRow.props.accessibilityState?.checked).toBe(true);
  await fireEvent.press(soundRow);

  const stored = await waitForStored<{ soundEnabled: boolean }>(
    STORAGE_KEYS.settings,
    value => value.soundEnabled === false,
  );
  expect(stored.soundEnabled).toBe(false);

  view.unmount();
  await launchApp();
  expect(screen.queryByText(strings.onboarding.slide1Title)).toBeNull();
  expect(screen.getByText(strings.home.playNewButton)).toBeTruthy();

  await fireEvent.press(screen.getByLabelText(strings.settings.title));
  await waitFor(() => expect(screen.getByLabelText(strings.settings.soundLabel)).toBeTruthy());
  expect(screen.getByLabelText(strings.settings.soundLabel).props.accessibilityState?.checked).toBe(false);
});
