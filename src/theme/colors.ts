/**
 * پالت رنگی بازی: روشن، گرم و دوستانه؛ با کنتراست کافی برای متن‌ها.
 * رنگ‌های اصلی با فایل android/app/src/main/res/values/colors.xml هم‌راستا هستند.
 */
export const colors = {
  background: '#FBF7F0',
  backgroundDeep: '#F2EADD',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F1EA',
  border: '#E7DFD2',
  borderStrong: '#D6CBB8',

  primary: '#4C3FBF',
  primaryDark: '#3A2F99',
  primaryLight: '#EAE7FF',
  onPrimary: '#FFFFFF',

  accent: '#F5B942',
  accentDark: '#D9971B',
  accentLight: '#FDF1D8',

  success: '#2FA36B',
  successLight: '#E3F5EC',
  danger: '#D9483B',
  dangerLight: '#FBE6E3',
  warning: '#E08A1E',

  heart: '#EF4F6B',
  heartLight: '#FDE7EC',
  coin: '#F5B942',
  star: '#F7C948',

  textPrimary: '#241F35',
  textSecondary: '#6B647E',
  textMuted: '#9A93A8',
  textInverse: '#FFFFFF',

  tileBackground: '#FFFFFF',
  tileBorder: '#E3DACA',
  tileText: '#2F2A3F',
  tileSelectedBackground: '#4C3FBF',
  tileSelectedText: '#FFFFFF',
  tileHintBackground: '#FDF1D8',

  slotBackground: '#FFFFFF',
  slotBorder: '#E1D7C6',
  slotActiveBorder: '#4C3FBF',
  slotText: '#2F2A3F',

  screenOverlay: 'rgba(36, 31, 53, 0.55)',
  shadow: '#3A2F99',

  levelLocked: '#D8D2E0',
  levelLockedBorder: '#C7C0D2',
  levelUnlocked: '#FFFFFF',
  levelCompleted: '#2FA36B',
  levelCurrent: '#4C3FBF',
} as const;

export type AppColors = typeof colors;
