import { Platform, Vibration } from 'react-native';

import { patternFor, type HapticEvent } from '../../constants/haptics';

/**
 * بازخورد لمسی.
 *
 * روی Android از Vibration API استفاده می‌شود؛ اگر کاربر لرزش را خاموش کرده
 * باشد یا دستگاه پشتیبانی نکند، فراخوانی‌ها بی‌اثر می‌شوند.
 */
export interface VibrationDriver {
  vibrate(pattern: number | readonly number[]): void;
  cancel(): void;
}

export const reactNativeVibrationDriver: VibrationDriver = {
  vibrate: pattern => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(pattern as number | number[]);
    }
  },
  cancel: () => Vibration.cancel(),
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
      this.driver.cancel();
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
    this.driver.vibrate(patternFor(event));
  }

  cancel(): void {
    this.driver.cancel();
  }
}
