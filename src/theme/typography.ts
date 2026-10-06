import { Platform, type TextStyle } from 'react-native';

/**
 * فونت وزیرمتن (مجوز SIL OFL 1.1). روی Android نام خانواده فونت همان نام فایل
 * است؛ بنابراین هر وزن فایل جداگانه دارد.
 */
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
    fontSize: 32,
    lineHeight: 44,
    color: '#241F35',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 36,
    color: '#241F35',
  },
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: 19,
    lineHeight: 30,
    color: '#241F35',
  },
  subheading: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 26,
    color: '#241F35',
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 26,
    color: '#241F35',
  },
  bodyStrong: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 26,
    color: '#241F35',
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    lineHeight: 21,
    color: '#6B647E',
  },
  button: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  /** اعداد و شمارنده‌ها؛ از ارقام فارسی استفاده می‌شود */
  numeric: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 24,
    color: '#241F35',
  },
  numericLarge: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    lineHeight: 36,
    color: '#241F35',
  },
  letter: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 40,
    color: '#2F2A3F',
    textAlign: 'center',
  },
  wordSlot: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    lineHeight: 34,
    color: '#2F2A3F',
    textAlign: 'center',
  },
};
