/** کلیدهای ذخیره‌سازی در یک نقطه متمرکز شده‌اند تا از پراکندگی رشته‌ها جلوگیری شود. */
export const STORAGE_KEYS = {
  profile: 'kalamesaz:profile',
  progress: 'kalamesaz:progress',
  settings: 'kalamesaz:settings',
  daily: 'kalamesaz:daily',
  achievements: 'kalamesaz:achievements',
  /** زمان آخرین مشاهده برنامه؛ برای تشخیص عقب‌بردن ساعت دستگاه */
  clock: 'kalamesaz:clock',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
