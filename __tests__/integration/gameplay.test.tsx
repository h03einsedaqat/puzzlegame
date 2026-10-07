import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { strings } from '../../src/constants';
import { format } from '../../src/utils/format';
import {
  LEVEL_ONE,
  completeFirstLevel,
  completeOnboarding,
  launchApp,
  resetDeviceStorage,
  submitWord,
  typeWord,
} from './helpers';

/**
 * چرخه کامل یک مرحله: ورود، ساختن واژه‌ها، تماشای نتیجه و ورود دوباره.
 *
 * این آزمون همان مسیری را می‌رود که بازیکن روی گوشی می‌رود و مهم‌ترین تنظیم
 * رفتار بازی را تضمین می‌کند: هر ورود به یک مرحله، نشست تازه می‌گیرد. اگر
 * نشستِ تمام‌شده یا رهاشده دوباره استفاده شود، همه دکمه‌ها غیرفعال می‌مانند —
 * همان «کار نکردن دکمه‌ها»یی که بازیکن گزارش کرد.
 */
jest.setTimeout(30000);

beforeEach(() => {
  resetDeviceStorage();
});

it('پس از تکمیل مرحله، تکرار همان مرحله با نشست تازه و دکمه‌های فعال است', async () => {
  const view = await launchApp();
  await completeOnboarding();

  await completeFirstLevel();

  // از صفحه نتیجه، همان مرحله دوباره شروع می‌شود (همان کاری که بازیکن می‌کند)
  await fireEvent.press(screen.getByText(strings.result.retryButton));
  await waitFor(() => expect(screen.getByText(strings.game.tutorialStepLetters)).toBeTruthy(), {
    timeout: 8000,
  });

  // کاشی‌ها فعال‌اند و واژه‌ها دوباره ساخته می‌شوند
  await submitWord(LEVEL_ONE.targetWords[0]!, 1, LEVEL_ONE.targetWords.length);

  const progressLabel = format(strings.game.targetProgress, {
    found: 1,
    total: LEVEL_ONE.targetWords.length,
  });
  expect(screen.getAllByLabelText(progressLabel).length).toBeGreaterThan(0);

  view.unmount();
});

it('خروج از مرحله با دکمه بازگشت، ورود دوباره به همان مرحله را خراب نمی‌کند', async () => {
  const view = await launchApp();
  await completeOnboarding();

  await fireEvent.press(screen.getByText(strings.home.playNewButton));
  await waitFor(() => expect(screen.getByText(strings.game.tutorialStepLetters)).toBeTruthy());

  await typeWord(LEVEL_ONE.targetWords[0]![0]!);
  await fireEvent.press(screen.getByLabelText(strings.common.back));
  await waitFor(() => expect(screen.getByText(strings.game.leaveTitle)).toBeTruthy());
  await fireEvent.press(screen.getByText(strings.common.confirm));
  // مرحله نیمه‌کاره رها شده است؛ در خانه دکمه «ادامه بازی» همان مرحله را باز می‌کند.
  await waitFor(() => expect(screen.getByText(strings.home.playButton)).toBeTruthy(), {
    timeout: 8000,
  });

  // ورود دوباره به همان مرحله (مرحله‌ای که نیمه‌کاره رها شد): دکمه‌ها باید کار کنند
  await fireEvent.press(screen.getByText(strings.home.playButton));
  await waitFor(() => expect(screen.getByText(strings.game.tutorialStepLetters)).toBeTruthy(), {
    timeout: 8000,
  });

  await typeWord(LEVEL_ONE.targetWords[0]![0]!);
  const submit = screen.getByLabelText(strings.accessibility.submitButton);
  expect(submit.props.accessibilityState?.disabled).toBeFalsy();

  view.unmount();
});
