import type { AnalyticsEventName, AnalyticsParams } from '../../constants/analyticsEvents';
import { GAME_CONFIG } from '../../constants/gameConfig';

export interface AnalyticsProvider {
  readonly name: string;
  initialize(): Promise<void>;
  track(event: AnalyticsEventName, params?: AnalyticsParams): void;
  setUserId(userId: string): void;
  flush(): Promise<void>;
}

/** پیاده‌سازی پیش‌فرض: هیچ رویدادی ارسال نمی‌شود. */
export class NoopAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'noop';

  async initialize(): Promise<void> {}

  track(): void {}

  setUserId(): void {}

  async flush(): Promise<void> {}
}

/**
 * ثبت‌کننده محلی برای توسعه: رویدادها را در کنسول چاپ می‌کند تا جریان بازی
 * در زمان توسعه قابل رصد باشد.
 */
export class DevLogAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'dev-log';

  async initialize(): Promise<void> {}

  track(event: AnalyticsEventName, params?: AnalyticsParams): void {
    if (__DEV__) {
      console.log(`[analytics] ${event}`, params ?? {});
    }
  }

  setUserId(userId: string): void {
    if (__DEV__) {
      console.log(`[analytics] userId=${userId}`);
    }
  }

  async flush(): Promise<void> {}
}

/**
 * سرویس تحلیلی.
 *
 * از چند ارائه‌دهنده پشتیبانی می‌کند (fan-out) و هیچ‌گاه خطای یک ارائه‌دهنده
 * باعث توقف بازی نمی‌شود. افزودن سرویس واقعی فقط با ساخت یک ارائه‌دهنده تازه
 * و ثبت آن در این سرویس انجام می‌شود.
 */
export class AnalyticsService {
  private providers: AnalyticsProvider[];
  private enabled: boolean;

  constructor(providers: AnalyticsProvider[] = [], enabled: boolean = GAME_CONFIG.analytics.enabled) {
    this.providers = providers;
    this.enabled = enabled;
  }

  get providerNames(): string[] {
    return this.providers.map(provider => provider.name);
  }

  async initialize(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await Promise.all(this.providers.map(provider => provider.initialize().catch(() => undefined)));
  }

  track(event: AnalyticsEventName, params?: AnalyticsParams): void {
    if (!this.enabled) {
      return;
    }
    for (const provider of this.providers) {
      try {
        provider.track(event, params);
      } catch {
        // خطای تحلیلی هرگز نباید تجربه بازی را مختل کند
      }
    }
  }

  setUserId(userId: string): void {
    if (!this.enabled) {
      return;
    }
    for (const provider of this.providers) {
      try {
        provider.setUserId(userId);
      } catch {
        // نادیده گرفته می‌شود
      }
    }
  }

  async flush(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await Promise.all(this.providers.map(provider => provider.flush().catch(() => undefined)));
  }
}
