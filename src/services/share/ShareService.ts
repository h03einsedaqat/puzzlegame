import { Linking, Share } from 'react-native';

export interface SharePayload {
  /** عنوان پنجره اشتراک‌گذاری */
  title: string;
  /** متن نهایی که برای دوستان فرستاده می‌شود */
  message: string;
}

/**
 * اشتراک‌گذاری متن با پنجره بومی اندروید.
 *
 * هیچ شبکه‌ای در خود بازی زده نمی‌شود؛ فقط قصد (Intent) بومی سیستم باز می‌شود و
 * انتخاب اینکه متن کجا برود با بازیکن است. در صورت نبود برنامه مناسب، به‌جای
 * خطا، `false` برگردانده می‌شود تا صفحه بتواند پیام راهنما نشان دهد.
 */
export async function shareText(payload: SharePayload): Promise<boolean> {
  try {
    const result = await Share.share({ title: payload.title, message: payload.message });
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

/**
 * باز کردن صفحه بازی در فروشگاه.
 *
 * اول با طرح‌واره داخلی کافه‌بازار (`bazaar://`) تلاش می‌شود و اگر نصب نبود،
 * نسخه وب فروشگاه باز می‌شود. هیچ داده‌ای از بازی فرستاده نمی‌شود.
 */
export async function openStorePage(storeUrl: string, deepLink?: string): Promise<boolean> {
  const candidates = [deepLink, storeUrl].filter((url): url is string => typeof url === 'string' && url.length > 0);

  for (const url of candidates) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        continue;
      }
      await Linking.openURL(url);
      return true;
    } catch {
      // سراغ گزینه بعدی می‌رویم؛ نبود فروشگاه نباید برنامه را متوقف کند.
    }
  }
  return false;
}
