import { GAME_CONFIG } from '../../constants';
import { DAILY_PUZZLES, getDailyPuzzleByIndex } from '../../data/daily/dailyPuzzles';
import type { DailyState, Level } from '../../types';
import { dateKey, daysBetween, isYesterday } from '../../utils/date';
import { hashString } from '../../utils/random';

/**
 * چالش روزانه.
 *
 * انتخاب پازل قطعی است: از تاریخ میلادی روز (YYYY-MM-DD) یک عدد مشتق می‌شود و
 * همان عدد، پازل روز را انتخاب می‌کند. پس در یک روز، هر بار و برای همه
 * کاربران همان پازل برمی‌گردد و نیازی به سرور نیست.
 */

export function dailyPuzzleIndex(date: string, puzzleCount: number = DAILY_PUZZLES.length): number {
  if (puzzleCount <= 0) {
    return 0;
  }
  return hashString(`kalamesaz-daily-${date}`) % puzzleCount;
}

export function getDailyPuzzleForDate(date: string): Level {
  return getDailyPuzzleByIndex(dailyPuzzleIndex(date));
}

export function getTodayPuzzle(now: Date = new Date()): Level {
  return getDailyPuzzleForDate(dateKey(now));
}

/** آیا چالش امروز هنوز انجام نشده است؟ */
export function canPlayDailyChallenge(daily: DailyState, today: string = dateKey()): boolean {
  return daily.lastChallengeDate !== today;
}

export function isDailyChallengeCompleted(daily: DailyState, today: string = dateKey()): boolean {
  return daily.completedChallengeDates.includes(today);
}

/** ثبت انجام چالش امروز و به‌روزرسانی استریک */
export function markDailyChallengeCompleted(daily: DailyState, today: string = dateKey()): DailyState {
  if (daily.completedChallengeDates.includes(today)) {
    return daily;
  }

  const streak = daily.lastChallengeDate !== null && isYesterday(daily.lastChallengeDate, today)
    ? daily.streak + 1
    : 1;

  return {
    ...daily,
    lastChallengeDate: today,
    completedChallengeDates: [...daily.completedChallengeDates, today].slice(-120),
    streak,
    longestStreak: Math.max(daily.longestStreak, streak),
  };
}

/** استریک بر پایه تاریخ امروز: اگر روزی از دست رفته باشد، صفر نمایش داده می‌شود */
export function effectiveStreak(daily: DailyState, today: string = dateKey()): number {
  if (daily.lastChallengeDate === null) {
    return 0;
  }
  if (daily.lastChallengeDate === today) {
    return daily.streak;
  }
  if (isYesterday(daily.lastChallengeDate, today)) {
    return daily.streak;
  }
  return GAME_CONFIG.daily.streakResetValue;
}

export interface DailyReward {
  day: number;
  coins: number;
  totalDays: number;
}

/** جایزه امروز و روز جاری در چرخه ۷ روزه */
export function getDailyReward(daily: DailyState, today: string = dateKey()): DailyReward {
  const rewards = GAME_CONFIG.daily.rewards;
  const totalDays = rewards.length;

  let day = 1;
  if (daily.lastRewardClaimDate !== null) {
    if (daily.lastRewardClaimDate === today) {
      day = daily.rewardCycleDay;
    } else if (isYesterday(daily.lastRewardClaimDate, today)) {
      day = daily.rewardCycleDay >= totalDays ? 1 : daily.rewardCycleDay + 1;
    }
  }

  return { day, coins: rewards[day - 1] ?? rewards[0] ?? 10, totalDays };
}

export function canClaimDailyReward(daily: DailyState, today: string = dateKey()): boolean {
  return daily.lastRewardClaimDate !== today;
}

export interface DailyClaimResult {
  daily: DailyState;
  reward: DailyReward;
}

export function claimDailyReward(daily: DailyState, today: string = dateKey()): DailyClaimResult | null {
  if (!canClaimDailyReward(daily, today)) {
    return null;
  }
  const reward = getDailyReward(daily, today);
  const streak = daily.lastChallengeDate !== null && isYesterday(daily.lastChallengeDate, today)
    ? daily.streak + 1
    : 1;

  return {
    reward,
    daily: {
      ...daily,
      lastRewardClaimDate: today,
      rewardCycleDay: reward.day,
      totalRewardsClaimed: daily.totalRewardsClaimed + 1,
      // ورود روزانه هم استریک را زنده نگه می‌دارد
      lastChallengeDate: daily.lastChallengeDate ?? today,
      streak: daily.lastChallengeDate === today ? daily.streak : Math.max(daily.streak, streak),
      longestStreak: Math.max(daily.longestStreak, Math.max(daily.streak, streak)),
    },
  };
}

export function daysSinceLastPlay(daily: DailyState, today: string = dateKey()): number {
  if (daily.lastPlayedDate === null) {
    return Number.NaN;
  }
  return daysBetween(daily.lastPlayedDate, today);
}
