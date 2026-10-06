/**
 * الگوهای لرزش. مدت‌ها کوتاه نگه داشته شده‌اند تا حس «فیدبک» بدهند و آزاردهنده نباشند.
 * نام‌ها با رویدادهای بازی هم‌راستا هستند.
 */
export const HAPTIC_PATTERNS = {
  button: 10,
  letter_select: 8,
  letter_remove: 6,
  correct: [0, 18, 40, 24],
  wrong: [0, 45, 60, 45],
  reward: [0, 14, 30, 14],
  unlock: [0, 20, 40, 30],
  level_complete: [0, 25, 50, 25, 50, 40],
} as const;

export type HapticEvent = keyof typeof HAPTIC_PATTERNS;

export function patternFor(event: HapticEvent): number | readonly number[] {
  return HAPTIC_PATTERNS[event];
}