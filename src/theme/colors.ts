/**
 * پالت رنگی بازی: شاد، آفتابی و کارتونی — همان حال‌وهوای بازی‌های کلمه‌ای محبوب.
 *
 * قاعده‌ها:
 *   • پس‌زمینه آسمانیِ روشن، سطح‌ها سفید و براق، متن‌ها تیره و خوانا.
 *   • حروف روی کاشی‌های قهوه‌ایِ عمیق با رنگ طلایی نوشته می‌شوند (کنتراست بالا
 *     و همان حس «آب‌نباتی» که بازیکن ایرانی می‌شناسد).
 *   • رنگ‌های اصلی با فایل android/app/src/main/res/values/colors.xml هم‌راستا
 *     هستند تا رنگ نوار وضعیت با خودِ برنامه یکی باشد.
 */
export const colors = {
  /* ---------- پس‌زمینه و سطح‌ها ---------- */
  background: '#EAF6FF',
  backgroundDeep: '#CFEAFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F7FC',
  border: '#D7E7F5',
  borderStrong: '#B9D6EC',

  /* ---------- رنگ آسمان و تزئین پس‌زمینه ---------- */
  skyTop: '#6FD3FF',
  skyMiddle: '#B8E8FF',
  skyBottom: '#FFF6E0',
  cloud: '#FFFFFF',
  cloudSoft: 'rgba(255, 255, 255, 0.75)',
  sunbeam: 'rgba(255, 214, 102, 0.35)',
  confettiYellow: '#FFC93C',
  confettiCoral: '#FF7A85',
  confettiGreen: '#5FD068',
  confettiPurple: '#A78BFA',
  confettiBlue: '#4FC3F7',

  /* ---------- رنگ برند ---------- */
  primary: '#6C4CF1',
  primaryDark: '#4F35C4',
  primaryLight: '#EDE7FF',
  onPrimary: '#FFFFFF',
  brandTeal: '#17C3B2',
  brandSky: '#35A7FF',

  accent: '#FFB627',
  accentDark: '#E08E00',
  accentLight: '#FFF3D6',

  success: '#2FBF71',
  successLight: '#DFF7E9',
  danger: '#FF5A5F',
  dangerLight: '#FFE8E9',
  warning: '#F08A24',

  heart: '#FF4D6D',
  heartLight: '#FFE5EA',
  coin: '#FFC93C',
  coinDark: '#E0A100',
  star: '#FFD84D',

  /* ---------- متن ---------- */
  textPrimary: '#1F2D3D',
  textSecondary: '#5A6B7D',
  textMuted: '#8A9BAB',
  textInverse: '#FFFFFF',
  textOnDark: '#FFF6DE',

  /* ---------- کاشی‌های حروف (سبک آب‌نباتی/آمیرزایی) ---------- */
  tileDeep: '#7A4A21',
  tileDeepTop: '#9A6231',
  tileDeepBorder: '#4E2C12',
  tileDeepShadow: '#3A1F0B',
  tileBackground: '#7A4A21',
  tileBorder: '#4E2C12',
  tileText: '#FFC93C',
  tileSelectedBackground: '#17C3B2',
  tileSelectedBorder: '#0E8C80',
  tileSelectedText: '#FFFFFF',
  tileHintBackground: '#FFE08A',
  tileHintBorder: '#E0A100',
  letterGold: '#FFC93C',
  letterGoldGlow: '#FFE9A8',

  /* ---------- جای خالی کلمه‌ها ---------- */
  slotBackground: '#FFFDF6',
  slotBorder: '#E5D3AE',
  slotActiveBorder: '#6C4CF1',
  slotText: '#7A4A21',
  slotFilledBackground: '#FFF1CE',

  /* ---------- سایر ---------- */
  screenOverlay: 'rgba(31, 45, 61, 0.55)',
  shadow: 'rgba(31, 45, 61, 0.22)',
  shadowSoft: 'rgba(31, 45, 61, 0.12)',

  levelLocked: '#DDE7EF',
  levelLockedBorder: '#C3D3E0',
  levelUnlocked: '#FFFFFF',
  levelCompleted: '#2FBF71',
  levelCurrent: '#6C4CF1',

  /** رنگ پله‌های مسیر مرحله‌ها (نقشه) */
  pathStep: '#FFE9B8',
  pathStepBorder: '#E8C97A',
} as const;

export type AppColors = typeof colors;
