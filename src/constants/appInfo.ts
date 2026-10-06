/**
 * اطلاعات ثابت برنامه.
 *
 * نسخه در سه جا باید یکی بماند: android/app/build.gradle (versionName)،
 * همین فایل و متن فروشگاه. این فایل مرجع نمایش نسخه در خود بازی است.
 */
export const APP_INFO = {
  name: 'کلمه‌ساز',
  version: '1.0.0',
  versionCode: 1,
  packageName: 'ir.kalamesaz.game',
  /** نشانی پشتیبانی؛ در صفحه «درباره» نمایش داده می‌شود */
  contactEmail: 'support@kalamesaz.ir',
  fontCredit: 'فونت: وزیرمتن با مجوز SIL OFL 1.1',
} as const;
