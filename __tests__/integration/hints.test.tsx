import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { GAME_CONFIG, strings } from '../../src/constants';
import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { format, toPersianDigits } from '../../src/utils/format';
import type { UserProfile } from '../../src/types';
import { completeOnboarding, launchApp, resetDeviceStorage, waitForStored } from './helpers';

/**
 * آزمون راهنمای هوشمند.
 *
 * سه چیز را تضمین می‌کند: برگه راهنما قیمت‌ها را نشان می‌دهد، هر خرید همان لحظه
 * از سکه‌ها کم می‌کند و پس از خرید، راهنمای گام‌به‌گام روی صفحه بازی ظاهر می‌شود.
 * همچنین وقتی سکه‌ها تمام شود، دکمه‌ها غیرفعال و راهنمای سکه‌گرفتن نشان داده می‌شود.
 */
jest.setTimeout(30000);

beforeEach(() => {
  resetDeviceStorage();
});

it('هر راهنما سکه کم می‌کند و راهنمای گام‌به‌گام نشان می‌دهد', async () => {
  const view = await launchApp();
  await completeOnboarding();

  await fireEvent.press(screen.getByText(strings.home.playNewButton));
  await waitFor(() => expect(screen.getByText(strings.game.tutorialStepLetters)).toBeTruthy());

  const initialCoins = GAME_CONFIG.economy.initialCoins;
  const before = await waitForStored<UserProfile>(STORAGE_KEYS.profile, value => value.coins > 0);
  expect(before.coins).toBe(initialCoins);

  // باز کردن برگه راهنما از دکمه بازی
  const letterCost = GAME_CONFIG.hints.costs.reveal_letter;
  await fireEvent.press(
    screen.getByLabelText(format(strings.accessibility.hintButton, { cost: toPersianDigits(letterCost) })),
  );
  await waitFor(() => expect(screen.getByText(strings.game.hintSheetTitle)).toBeTruthy());

  // قیمت هر سه راهنما روی برگه دیده می‌شود
  for (const cost of Object.values(GAME_CONFIG.hints.costs)) {
    expect(screen.getAllByText(format(strings.game.hintCostLabel, { cost })).length).toBeGreaterThan(0);
  }

  // خرید «حرف بعدی»: سکه همان لحظه کم می‌شود
  const buyLetterLabel = format(strings.game.hintUseLabel, {
    title: strings.game.hintRevealLetterTitle,
  });
  await fireEvent.press(screen.getByLabelText(buyLetterLabel));

  const afterFirst = await waitForStored<UserProfile>(
    STORAGE_KEYS.profile,
    value => value.coins === initialCoins - letterCost,
  );
  expect(afterFirst.coins).toBe(initialCoins - letterCost);

  // راهنمای گام‌به‌گام با الگوی واژه روی صفحه بازی ظاهر می‌شود
  await waitFor(() => expect(screen.getByText(strings.game.hintGuideTitle)).toBeTruthy());

  // خرید دوم: سکه‌ها به صفر می‌رسد
  await fireEvent.press(screen.getByLabelText(buyLetterLabel));
  await waitForStored<UserProfile>(STORAGE_KEYS.profile, value => value.coins === 0);

  // با سکه صفر، همه دکمه‌ها غیرفعال‌اند و راهنمای سکه‌گرفتن نشان داده می‌شود
  await waitFor(() => expect(screen.getByText(strings.game.hintEarnCoinsTip)).toBeTruthy());
  expect(screen.getAllByText(strings.game.hintNoCoinsButton).length).toBeGreaterThan(0);

  view.unmount();
});
