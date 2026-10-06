import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import App from '../../App';
import { GAME_CONFIG, strings } from '../../src/constants';
import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { LEVELS } from '../../src/data/levels/levels';
import { createDefaultSettings } from '../../src/services/storage/defaults';
import { createEnvelope } from '../../src/services/storage/storage';
import { format } from '../../src/utils/format';
import type { AppSettings } from '../../src/types';

/**
 * ابزارهای مشترک آزمون‌های یکپارچه.
 *
 * هر آزمون یک چرخه واقعی بازی را از راه رابط کاربری اجرا می‌کند: راه‌اندازی
 * برنامه، گذر از آموزش آغازین، ساختن واژه و خواندن حافظه دستگاه. این ابزارها
 * همان کارهایی را انجام می‌دهند که بازیکن انجام می‌دهد.
 *
 * توجه: هر پرونده آزمون یک نمونه برنامه را می‌سازد؛ ساخت پیاپی نمونه‌های
 * بیشتر در یک پرونده، به دلیل چرخه حیات موتور آزمون، قابل اتکا نیست.
 */

export const LEVEL_ONE = LEVELS[0]!;
export const LEVEL_TWO = LEVELS[1]!;

type TestGlobals = { __resetAsyncStorage: () => void };

/** پاک‌کردن حافظه دستگاه؛ پیش از هر آزمون صدا زده می‌شود */
export function resetDeviceStorage(): void {
  (globalThis as unknown as TestGlobals).__resetAsyncStorage();
}

/** نوشتن یک مقدار در حافظه دستگاه با همان قالب نسخه‌دار برنامه */
export async function writeStored<T>(key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(createEnvelope(data)));
}

/**
 * روشن‌کردن «کاهش انیمیشن» پیش از راه‌اندازی برنامه.
 *
 * آزمون‌های یکپارچه رفتار بازی را می‌سنجند، نه انیمیشن‌ها؛ با این تنظیم،
 * قاب‌های انیمیشن در پایان آزمون رها نمی‌شوند.
 */
export async function primeReducedMotion(): Promise<void> {
  await writeStored<AppSettings>(STORAGE_KEYS.settings, {
    ...createDefaultSettings(),
    reducedMotion: true,
  });
}

/** راه‌اندازی برنامه و انتظار برای پایان صفحه آغازین */
export async function launchApp(timeout = 8000) {
  const view = await render(<App />);
  await waitFor(
    () => {
      const landed =
        screen.queryByText(strings.onboarding.slide1Title) ??
        screen.queryByText(strings.home.playButton) ??
        screen.queryByText(strings.home.playNewButton);
      expect(landed).not.toBeNull();
    },
    { timeout },
  );
  return view;
}

export async function readStored<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) {
    return null;
  }
  try {
    const envelope = JSON.parse(raw) as { data: T };
    return envelope.data;
  } catch {
    return null;
  }
}

/** انتظار برای رسیدن یک مقدار ذخیره‌شده (نوشتن‌ها با تأخیر انجام می‌شود) */
export async function waitForStored<T>(
  key: string,
  predicate: (value: T) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await readStored<T>(key);
    if (value !== null && predicate(value)) {
      return value;
    }
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 25);
    });
  }
  throw new Error(`مقدار ذخیره‌شده «${key}» در زمان مقرر آماده نشد.`);
}

/**
 * ساخت یک واژه با زدن کاشی‌ها.
 *
 * هر حرف تکراری کاشی مستقل خود را دارد، پس برای هر حرف، کاشی بعدی همان حرف
 * زده می‌شود؛ همان‌طور که بازیکن واقعی روی کاشی بعدی می‌زند.
 */
export async function typeWord(word: string): Promise<void> {
  const usedPerLetter = new Map<string, number>();
  for (const letter of word) {
    const index = usedPerLetter.get(letter) ?? 0;
    usedPerLetter.set(letter, index + 1);
    const tiles = screen.getAllByLabelText(format(strings.accessibility.letterTile, { letter }));
    const target = tiles[index] ?? tiles[tiles.length - 1];
    if (!target) {
      throw new Error(`کاشی حرف «${letter}» در مرحله پیدا نشد.`);
    }
    await fireEvent.press(target);
  }
}

/**
 * ساخت و ثبت یک واژه.
 *
 * واژه آخر پیش از به‌روزشدن شمارنده، مرحله را کامل و صفحه نتیجه را باز می‌کند؛
 * پس در آن حالت انتظار برای صفحه نتیجه انجام می‌شود.
 */
export async function submitWord(
  word: string,
  expectedFound: number,
  totalTargets: number,
  completesLevel = false,
): Promise<void> {
  await typeWord(word);
  await fireEvent.press(screen.getByLabelText(strings.accessibility.submitButton));

  if (completesLevel) {
    await waitFor(() => expect(screen.getByText(strings.result.homeButton)).toBeTruthy());
    return;
  }

  await waitFor(() => {
    const label = format(strings.game.targetProgress, { found: expectedFound, total: totalTargets });
    expect(screen.getAllByLabelText(label).length).toBeGreaterThan(0);
  });
}

/** گذر از آموزش آغازین */
export async function completeOnboarding(): Promise<void> {
  await fireEvent.press(screen.getByLabelText(strings.onboarding.skip));
  await waitFor(() => expect(screen.getByText(strings.home.playNewButton)).toBeTruthy());
}

/** انتظار برای خانه‌ای که پیشرفت ذخیره‌شده را بارگذاری کرده است */
export async function waitForHomeWithProgress(): Promise<void> {
  await waitFor(() => expect(screen.getByText(strings.home.playButton)).toBeTruthy(), { timeout: 8000 });
}

/** بازی کامل مرحله یک (آموزشی و رایگان) تا صفحه نتیجه */
export async function completeFirstLevel(): Promise<void> {
  await fireEvent.press(screen.getByText(strings.home.playNewButton));
  await waitFor(() => expect(screen.getByText(strings.game.tutorialStepLetters)).toBeTruthy());

  let found = 0;
  for (const word of LEVEL_ONE.targetWords) {
    found += 1;
    await submitWord(word, found, LEVEL_ONE.targetWords.length, found === LEVEL_ONE.targetWords.length);
  }
}

/** دکمه «ادامه بازی» روی صفحه نتیجه */
export async function returnHomeFromResult(): Promise<void> {
  await fireEvent.press(screen.getByText(strings.result.homeButton));
  await waitForHomeWithProgress();
}

export const ECONOMY = GAME_CONFIG.economy;
