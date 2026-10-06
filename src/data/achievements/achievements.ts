import type { IconName } from '../../types/icons';

/** شاخص‌هایی که برای باز شدن دستاورد سنجیده می‌شوند */
export type AchievementMetric =
  | 'wordsFound'
  | 'levelsCompleted'
  | 'dailyStreak'
  | 'bestCombo'
  | 'bonusWordsFound'
  | 'dailyCompleted';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  metric: AchievementMetric;
  target: number;
  coinReward: number;
  icon: IconName;
}

/**
 * دستاوردها.
 *
 * تعداد و پاداش‌ها طوری انتخاب شده‌اند که بازیکن در هفته اول چند دستاورد
 * بگیرد و دستاوردهای بلندمدت هم معنادار بمانند.
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first_word',
    title: 'اولین کلمه',
    description: 'نخستین کلمه‌ات را بساز',
    metric: 'wordsFound',
    target: 1,
    coinReward: 5,
    icon: 'sparkle',
  },
  {
    id: 'first_level',
    title: 'اولین مرحله',
    description: 'نخستین مرحله را کامل کن',
    metric: 'levelsCompleted',
    target: 1,
    coinReward: 10,
    icon: 'check',
  },
  {
    id: 'words_25',
    title: '۲۵ کلمه',
    description: 'در مجموع ۲۵ کلمه پیدا کن',
    metric: 'wordsFound',
    target: 25,
    coinReward: 15,
    icon: 'word',
  },
  {
    id: 'levels_10',
    title: '۱۰ مرحله',
    description: '۱۰ مرحله را کامل کن',
    metric: 'levelsCompleted',
    target: 10,
    coinReward: 30,
    icon: 'medal',
  },
  {
    id: 'streak_3',
    title: '۳ روز متوالی',
    description: 'سه روز پشت‌سرهم وارد بازی شو',
    metric: 'dailyStreak',
    target: 3,
    coinReward: 20,
    icon: 'flame',
  },
  {
    id: 'combo_5',
    title: 'کمبو پنج‌تایی',
    description: 'پنج کلمه را پشت‌سرهم درست بساز',
    metric: 'bestCombo',
    target: 5,
    coinReward: 25,
    icon: 'star',
  },
  {
    id: 'words_100',
    title: '۱۰۰ کلمه',
    description: 'در مجموع ۱۰۰ کلمه پیدا کن',
    metric: 'wordsFound',
    target: 100,
    coinReward: 35,
    icon: 'word',
  },
  {
    id: 'bonus_25',
    title: 'شکارچی کلمات امتیازی',
    description: '۲۵ کلمه امتیازی پیدا کن',
    metric: 'bonusWordsFound',
    target: 25,
    coinReward: 40,
    icon: 'sparkle',
  },
  {
    id: 'levels_25',
    title: '۲۵ مرحله',
    description: '۲۵ مرحله را کامل کن',
    metric: 'levelsCompleted',
    target: 25,
    coinReward: 60,
    icon: 'medal',
  },
  {
    id: 'streak_7',
    title: '۷ روز متوالی',
    description: 'یک هفته پیوسته بازی کن',
    metric: 'dailyStreak',
    target: 7,
    coinReward: 70,
    icon: 'flame',
  },
  {
    id: 'daily_10',
    title: 'چالش‌شناس',
    description: '۱۰ چالش روزانه را کامل کن',
    metric: 'dailyCompleted',
    target: 10,
    coinReward: 60,
    icon: 'calendar',
  },
  {
    id: 'words_500',
    title: '۵۰۰ کلمه',
    description: 'در مجموع ۵۰۰ کلمه پیدا کن',
    metric: 'wordsFound',
    target: 500,
    coinReward: 120,
    icon: 'trophy',
  },
  {
    id: 'levels_50',
    title: '۵۰ مرحله',
    description: 'همه مرحله‌های بازی را کامل کن',
    metric: 'levelsCompleted',
    target: 50,
    coinReward: 200,
    icon: 'trophy',
  },
  {
    id: 'streak_30',
    title: '۳۰ روز متوالی',
    description: 'یک ماه پیوسته بازی کن',
    metric: 'dailyStreak',
    target: 30,
    coinReward: 250,
    icon: 'trophy',
  },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
