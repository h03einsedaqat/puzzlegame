export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** اندازه‌های حداقل برای لمس راحت (بر پایه راهنمای دسترس‌پذیری اندروید). */
export const MIN_TOUCH_TARGET = 48;
