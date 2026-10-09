import { Platform, type TextStyle } from 'react-native';
import { colors } from './colors';

/** وزیرمتن، همراه با وزن‌های جداگانه برای رندر پایدار فارسی. */
export const fontFamily = {
  regular: Platform.select({ android: 'Vazirmatn-Regular', default: 'Vazirmatn' }) as string,
  medium: Platform.select({ android: 'Vazirmatn-Medium', default: 'Vazirmatn' }) as string,
  bold: Platform.select({ android: 'Vazirmatn-Bold', default: 'Vazirmatn' }) as string,
} as const;

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'button'
  | 'numeric'
  | 'numericLarge'
  | 'letter'
  | 'wordSlot';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: 34,
    lineHeight: 48,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 25,
    lineHeight: 38,
    color: colors.textPrimary,
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: 19,
    lineHeight: 30,
    color: colors.textPrimary,
  },
  subheading: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  bodyStrong: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  button: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textInverse,
  },
  numeric: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  numericLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 27,
    lineHeight: 38,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  letter: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 40,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  wordSlot: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    lineHeight: 34,
    color: colors.textPrimary,
    textAlign: 'center',
  },
};
