import { Platform, Vibration } from 'react-native';

import { patternFor, type HapticEvent } from '../../constants/haptics';

/**
 * بازخورد لمسی.
 *
 * روی Android از Vibration API استفاده می‌شود؛ اگر کاربر لرزش را خاموش کرده
 * باشد یا دستگاه پشتیبانی نکند، فراخوانی‌ها بی‌اثر می‌شوند.
 *
 * ⚠️ نکته حیاتی: فراخوانی Vibration روی اندروید بدون مجوز
 * `android.permission.VIBRATE` خطای SecurityException می‌دهد و چون از داخل
 * ماژول بومی بالا می‌آید، برنامه را می‌بندد (نه فقط یک خطای جاوااسکریپت).
 * مجوز در AndroidManifest اعلام شده است (و بازی هم در حالت عادی هیچ مجوز
 * دیگری نمی‌خواهد)؛ ولی برای اینکه یک اشتباه در Manifest هرگز برنامه را روی
 * گوشی کاربر نبندد، هر فراخوانی در همین لایه در try/catch پیچیده شده است.
 */
export interface VibrationDriver {
  vibrate(pattern: number | readonly number[]): void;
  cancel(): void;
}

export const reactNativeVibrationDriver: VibrationDriver = {
  vibrate: pattern => {
    if (Platform.OS !== 'android') {
      return;
    }
    try {
      Vibration.vibrate(pattern as number | number[]);
    } catch {
      // نبود مجوز/پشتیبانی‌نشدن دستگاه نباید هیچ‌وقت برنامه را ببندد.
    }
  },
  cancel: () => {
    try {
      Vibration.cancel();
    } catch {
      // همان دلیل بالا.
    }
  },
};

export class VibrationService {
  private enabled: boolean;
  private driver: VibrationDriver;
  private lastEvent: { event: HapticEvent; at: number } | null = null;

  constructor(enabled: boolean, driver: VibrationDriver = reactNativeVibrationDriver) {
    this.enabled = enabled;
    this.driver = driver;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** لرزش کوتاه برای یک رویداد بازی؛ رویدادهای پرتکرار در بازه کوتاه نادیده می‌شوند */
  trigger(event: HapticEvent): void {
    if (!this.enabled) {
      return;
    }
    const now = Date.now();
    if (this.lastEvent && this.lastEvent.event === event && now - this.lastEvent.at < 90) {
      return;
    }
    this.lastEvent = { event, at: now };
    try {
      this.driver.vibrate(patternFor(event));
    } catch {
      // هیچ خطای درایور نباید به رابط کاربری برسد؛ بازی بدون لرزش ادامه می‌دهد.
    }
  }

  cancel(): void {
    try {
      this.driver.cancel();
    } catch {
      // بی‌اثر بودن cancel مشکلی نیست.
    }
  }
}
