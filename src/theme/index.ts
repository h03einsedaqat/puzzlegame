import { colors } from './colors';
import {
  computeGameLayout,
  getLayoutMetrics,
  scaleSize,
  STATUS_SLOT_TWO_LINE_MIN,
  useLayout,
} from './layout';
import { MIN_TOUCH_TARGET, radius, spacing } from './spacing';
import { fontFamily, typography } from './typography';
import { shadows } from './shadows';
import { motion } from './motion';

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
  shadows,
  motion,
} as const;

export { colors, radius, spacing, typography, fontFamily, shadows, motion, MIN_TOUCH_TARGET };
export { computeGameLayout, getLayoutMetrics, scaleSize, STATUS_SLOT_TWO_LINE_MIN, useLayout };
export type { GameLayout, GameLayoutInput, LayoutMetrics } from './layout';
export type { AppColors } from './colors';
export type { TypographyVariant } from './typography';
