import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { GAME_CONFIG, strings } from '../../src/constants';
import { format } from '../../src/utils/format';
import type { GameProgress, UserProfile } from '../../src/types';
import {
  primeReducedMotion,
  LEVEL_ONE,
  launchApp,
  readStored,
  resetDeviceStorage,
  submitWord,
  waitForHomeWithProgress,
  waitForStored,
} from './helpers';

/** نخستین اجرا: آموزش آغازین، مرحله آموزشی، پاداش و بازگشت به خانه */
jest.setTimeout(30000);

beforeEach(() => {
  resetDeviceStorage();
});

it('از راه‌اندازی تا پایان مرحله نخست و ثبت پاداش', async () => {
  await primeReducedMotion();
  await launchApp();

  // ۱) نخستین اجرا: آموزش آغازین، سه صفحه، سپس بازی
  expect(screen.getByText(strings.onboarding.slide1Title)).toBeTruthy();
  await fireEvent.press(screen.getByText(strings.common.continue));
  expect(screen.getByText(strings.onboarding.slide2Title)).toBeTruthy();
  await fireEvent.press(screen.getByText(strings.common.continue));
  expect(screen.getByText(strings.onboarding.slide3Title)).toBeTruthy();
  await fireEvent.press(screen.getByText(strings.onboarding.startGame));

  // ۲) خانه: بازیکن تازه «شروع بازی» می‌بیند و تنظیمات آموزش ذخیره شده است
  await waitFor(() => expect(screen.getByText(strings.home.playNewButton)).toBeTruthy());
  const settings = await waitForStored<{ onboardingCompleted: boolean }>(
    STORAGE_KEYS.settings,
    value => value.onboardingCompleted,
  );
  expect(settings.onboardingCompleted).toBe(true);

  // ۳) مرحله یک هم‌زمان آموزش تعاملی است
  await fireEvent.press(screen.getByText(strings.home.playNewButton));
  await waitFor(() =>
    expect(screen.getByText(format(strings.common.levelNumber, { number: LEVEL_ONE.id }))).toBeTruthy(),
  );
  expect(screen.getByText(strings.game.tutorialStepLetters)).toBeTruthy();
  for (const letter of LEVEL_ONE.letters) {
    expect(screen.getAllByLabelText(format(strings.accessibility.letterTile, { letter })).length).toBeGreaterThan(0);
  }

  // ۴) ساخت و ثبت همه واژه‌های اصلی تا تکمیل مرحله
  let found = 0;
  for (const word of LEVEL_ONE.targetWords) {
    found += 1;
    await submitWord(word, found, LEVEL_ONE.targetWords.length, found === LEVEL_ONE.targetWords.length);
  }

  // ۵) صفحه نتیجه: امتیاز، سکه و شمار واژه‌ها
  expect(screen.getByText(strings.result.scoreLabel)).toBeTruthy();
  expect(screen.getByText(strings.result.coinsLabel)).toBeTruthy();
  expect(screen.getByText(format(strings.result.wordsFoundOf, {
    found: LEVEL_ONE.targetWords.length,
    total: LEVEL_ONE.targetWords.length,
  }))).toBeTruthy();

  // ۶) پاداش و پیشرفت روی حافظه دستگاه نوشته شده است
  const profile = await waitForStored<UserProfile>(
    STORAGE_KEYS.profile,
    value => value.totalWordsFound >= LEVEL_ONE.targetWords.length,
  );
  expect(profile.coins).toBeGreaterThan(GAME_CONFIG.economy.initialCoins);
  expect(profile.score).toBeGreaterThan(0);
  expect(profile.totalGamesCompleted).toBe(1);

  const progress = await waitForStored<GameProgress>(
    STORAGE_KEYS.progress,
    value => value.unlockedLevel > LEVEL_ONE.id,
  );
  const record = progress.records.find(entry => entry.levelId === LEVEL_ONE.id);
  expect(record?.completedAt).toBeGreaterThan(0);
  expect(record?.bestScore).toBeGreaterThan(0);

  // ۷) بازگشت به خانه: «ادامه بازی» به مرحله بعد می‌رود
  await fireEvent.press(screen.getByText(strings.result.homeButton));
  await waitForHomeWithProgress();
  expect(screen.queryByText(strings.home.playNewButton)).toBeNull();
  const storedAgain = await readStored<GameProgress>(STORAGE_KEYS.progress);
  expect(storedAgain?.currentLevel).toBe(LEVEL_ONE.id + 1);
});
