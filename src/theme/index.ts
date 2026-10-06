import { colors } from './colors';
import { getLayoutMetrics, scaleSize, useLayout } from './layout';
import { MIN_TOUCH_TARGET, radius, spacing } from './spacing';
import { fontFamily, typography } from './typography';
import { shadows } from './shadows';

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
  shadows,
} as const;

export { colors, radius, spacing, typography, fontFamily, shadows, MIN_TOUCH_TARGET };
export { getLayoutMetrics, scaleSize, useLayout };
export type { LayoutMetrics } from './layout';
export type { AppColors } from './colors';
export type { TypographyVariant } from './typography';
