import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { strings } from '../../src/constants';
import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { LEVELS } from '../../src/data/levels/levels';
import { createDefaultSettings } from '../../src/services/storage/defaults';
import { getTodayPuzzle } from '../../src/services/game/dailySeed';
import type { AppSettings, DailyState, GameProgress } from '../../src/types';
import { format } from '../../src/utils/format';
import { dateKey } from '../../src/utils/date';
import {
  completeFirstLevel,
  completeOnboarding,
  launchApp,
  primeReducedMotion,
  readStored,
  resetDeviceStorage,
  submitWord,
  waitForStored,
  writeStored,
} from './helpers';

jest.setTimeout(30000);

beforeEach(() => {
  resetDeviceStorage();
});

it('پس از تبریک پایان هر مرحله، خودکار مرحله بعد را شروع می‌کند', async () => {
  await primeReducedMotion();
  const view = await launchApp();
  await completeOnboarding();

  await completeFirstLevel();
  expect(screen.getByText(strings.result.completedTitle)).toBeTruthy();
  expect(screen.getByText(strings.result.autoNextLevelHint.replace('{number}', '۲'))).toBeTruthy();

  await waitFor(
    () => expect(screen.getByText(format(strings.common.levelNumber, { number: 2 }))).toBeTruthy(),
    { timeout: 7000 },
  );
  const progress = await waitForStored<GameProgress>(
    STORAGE_KEYS.progress,
    value => value.unlockedLevel >= 2,
  );
  expect(progress.records.some(record => record.levelId === 1)).toBe(true);
  expect(progress.currentLevel).toBe(2);
  view.unmount();
});

it('پایان مرحلهٔ ۵۰ را تبریک می‌گوید و خودکار به خانه برمی‌گردد', async () => {
  const now = Date.now();
  await writeStored<AppSettings>(STORAGE_KEYS.settings, {
    ...createDefaultSettings(),
    onboardingCompleted: false,
    reducedMotion: true,
  });
  await writeStored<GameProgress>(STORAGE_KEYS.progress, {
    currentLevel: 50,
    unlockedLevel: 50,
    lastPlayedLevelId: 49,
    records: LEVELS.slice(0, -1).map(level => ({
      levelId: level.id,
      bestScore: 0,
      completedAt: now - 1000,
      attempts: 1,
      stars: 0,
    })),
  });

  const view = await launchApp();
  await fireEvent.press(screen.getByLabelText(strings.onboarding.skip));
  await waitFor(() => expect(screen.getByText(strings.home.playButton)).toBeTruthy());
  await fireEvent.press(screen.getByText(strings.home.playButton));
  await waitFor(() =>
    expect(screen.getByText(format(strings.common.levelNumber, { number: 50 }))).toBeTruthy(),
  );

  const finalLevel = LEVELS[LEVELS.length - 1]!;
  let found = 0;
  for (const word of finalLevel.targetWords) {
    found += 1;
    await submitWord(word, found, finalLevel.targetWords.length, found === finalLevel.targetWords.length);
  }

  expect(screen.getByText(strings.result.gameFinishedTitle)).toBeTruthy();
  expect(screen.getByText(format(strings.result.gameFinishedSubtitle, { total: '۵۰' }))).toBeTruthy();
  await waitFor(() => expect(screen.getByText(strings.home.gameFinishedTitle)).toBeTruthy(), { timeout: 7000 });

  const progress = await waitForStored<GameProgress>(
    STORAGE_KEYS.progress,
    value => value.records.some(record => record.levelId === 50),
  );
  expect(progress.records).toHaveLength(50);
  view.unmount();
});

it('چالش روزانه را بدون انتقال مرحله‌ای یا تغییر پیشرفت عادی نگه می‌دارد', async () => {
  await primeReducedMotion();
  const view = await launchApp();
  await completeOnboarding();
  const dailyPuzzle = getTodayPuzzle();
  const laterButton = screen.queryAllByLabelText(strings.common.later)[0];
  if (laterButton) await fireEvent.press(laterButton);
  await fireEvent.press(screen.getByLabelText(strings.daily.startButton));
  await waitFor(() => expect(screen.getByText(strings.daily.rewardTitle)).toBeTruthy());
  await fireEvent.press(screen.getByLabelText(strings.daily.startButton));
  await waitFor(() =>
    expect(
      screen.getAllByLabelText(format(strings.accessibility.letterTile, { letter: dailyPuzzle.letters[0]! })).length,
    ).toBeGreaterThan(0),
  );

  let found = 0;
  for (const word of dailyPuzzle.targetWords) {
    found += 1;
    await submitWord(word, found, dailyPuzzle.targetWords.length, found === dailyPuzzle.targetWords.length);
  }

  expect(screen.getByText(strings.result.completedTitle)).toBeTruthy();
  await new Promise<void>(resolve => setTimeout(resolve, 5200));
  expect(screen.getByText(strings.result.homeButton)).toBeTruthy();
  expect(screen.queryByText(strings.result.autoNextLevelHint.replace('{number}', '۲'))).toBeNull();

  const today = dateKey();
  const daily = await waitForStored<DailyState>(
    STORAGE_KEYS.daily,
    value => value.completedChallengeDates.includes(today),
  );
  expect(daily.completedChallengeDates).toContain(today);
  const progress = await readStored<GameProgress>(STORAGE_KEYS.progress);
  expect(progress?.records ?? []).toHaveLength(0);
  expect(progress?.unlockedLevel).toBe(1);
  view.unmount();
});
