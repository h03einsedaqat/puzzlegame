/**
 * کلمه‌ساز ۲ — Dark Premium visual tokens.
 *
 * تمام نقش‌های رنگی در یک محل‌اند؛ اجزای قدیمی‌تر نیز همین نام‌های معنایی را
 * مصرف می‌کنند تا مهاجرت صفحه‌ها بدون بازنویسی منطق بازی انجام شود.
 */
export const colors = {
  /* پس‌زمینه و سطوح */
  background: '#080B18',
  backgroundDeep: '#060814',
  backgroundGlow: '#7660F2',
  surface: '#10162A',
  surfaceMuted: '#141C32',
  surfaceElevated: '#1A2340',
  surfaceGlass: 'rgba(20, 28, 50, 0.88)',
  border: '#27314D',
  borderStrong: '#394665',

  /* glowهای پس‌زمینه؛ نام‌های قدیمی حفظ شده‌اند تا API تم نشکند */
  skyTop: '#12172F',
  skyMiddle: '#0C1226',
  skyBottom: '#080B18',
  cloud: '#A9A0FF',
  cloudSoft: 'rgba(169, 160, 255, 0.12)',
  sunbeam: 'rgba(128, 95, 255, 0.12)',
  confettiYellow: '#F4CB72',
  confettiCoral: '#FF8398',
  confettiGreen: '#48D5B2',
  confettiPurple: '#A98DFF',
  confettiBlue: '#65C7F3',

  /* برند */
  primary: '#9B7AFF',
  primaryDark: '#6E50DC',
  primaryLight: '#261F41',
  onPrimary: '#FFFFFF',
  secondary: '#35D2C0',
  brandTeal: '#35D2C0',
  brandSky: '#63BDF7',
  accent: '#F1C76C',
  accentDark: '#EAC15D',
  accentLight: '#302919',

  /* وضعیت */
  success: '#48D5B2',
  successLight: '#15322E',
  error: '#FF738D',
  errorLight: '#3B202D',
  danger: '#FF738D',
  dangerLight: '#3B202D',
  warning: '#F4B96D',
  heart: '#FF7895',
  heartLight: '#3B202D',
  coin: '#F4CB72',
  coinDark: '#DDAE46',
  star: '#F4CB72',

  /* متن */
  text: '#F2EFFF',
  textPrimary: '#F2EFFF',
  textSecondary: '#BBC4DA',
  textMuted: '#8792AE',
  textInverse: '#FFFFFF',
  textOnDark: '#F2EFFF',

  /* چرخ و کاشی حروف */
  tileDeep: '#171F39',
  tileDeepTop: '#293454',
  tileDeepBorder: '#3C496B',
  tileDeepShadow: '#0A1021',
  tileBackground: '#171F39',
  tileBorder: '#3C496B',
  tileText: '#F6D993',
  tileSelectedBackground: '#167E74',
  tileSelectedBorder: '#35D2C0',
  tileSelectedText: '#F5FFFD',
  tileHintBackground: '#39301D',
  tileHintBorder: '#D4A94E',
  letterGold: '#F6D993',
  letterGoldGlow: '#FFE7A8',

  /* Word Board */
  slotBackground: '#141C32',
  slotBorder: '#343E5B',
  slotActiveBorder: '#A58BFF',
  slotText: '#F4F0FF',
  slotFilledBackground: '#211D38',

  /* سایه/Overlay و فصل‌ها */
  screenOverlay: 'rgba(3, 5, 14, 0.78)',
  shadow: 'rgba(0, 0, 0, 0.48)',
  shadowSoft: 'rgba(0, 0, 0, 0.28)',
  levelLocked: '#11172A',
  levelLockedBorder: '#28314A',
  levelUnlocked: '#171F39',
  levelCompleted: '#167E74',
  levelCurrent: '#7458E9',
  pathStep: '#28233B',
  pathStepBorder: '#453B63',
} as const;

export type AppColors = typeof colors;
