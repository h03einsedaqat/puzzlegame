import type { LevelRecord } from './game';

/** سطح‌های عضویت آینده؛ در MVP همه کاربران «free» هستند. */
export type MembershipTier = 'free' | 'premium';

export interface UserProfile {
  id: string;
  createdAt: number;
  score: number;
  coins: number;
  hearts: number;
  maxHearts: number;
  /** زمان شروع تایمر قلب بعدی؛ null یعنی قلب‌ها پر است یا هرگز خرج نشده است */
  lastHeartRefillAt: number | null;
  totalWordsFound: number;
  bonusWordsFound: number;
  totalGamesPlayed: number;
  totalGamesCompleted: number;
  totalHintsUsed: number;
  bestCombo: number;
  membership: MembershipTier;
  adsRemoved: boolean;
}

export interface GameProgress {
  /** مرحله‌ای که با «ادامه بازی» باز می‌شود */
  currentLevel: number;
  /** بالاترین مرحله باز‌شده */
  unlockedLevel: number;
  records: LevelRecord[];
  /** آخرین مرحله‌ای که بازیکن وارد آن شده است */
  lastPlayedLevelId: number | null;
}

export interface AppSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  /** کاهش انیمیشن‌ها برای کاربران حساس به حرکت */
  reducedMotion: boolean;
  /** برای اطلاع‌رسانی‌های آینده رزرو شده است */
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface DailyState {
  /** تاریخ شمسی-بی‌ارتباط؛ قالب YYYY-MM-DD میلادی مبنای seed و مقایسه است */
  lastChallengeDate: string | null;
  completedChallengeDates: string[];
  lastRewardClaimDate: string | null;
  /** روز جاری در چرخه ۷ روزه جایزه (۱ تا ۷) */
  rewardCycleDay: number;
  streak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  totalRewardsClaimed: number;
}

export interface AchievementState {
  unlockedIds: string[];
  unlockedAt: Record<string, number>;
  /** دستاوردهایی که بازیکن هنوز ندیده است؛ برای نشان «جدید» */
  unseenIds: string[];
}
