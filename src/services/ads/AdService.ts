import { GAME_CONFIG } from '../../constants/gameConfig';

/**
 * جایگاه‌های تبلیغاتی برنامه. نام‌گذاری بر پایه «پاداشی که کاربر می‌گیرد» است،
 * نه بر پایه شبکه تبلیغاتی؛ تا تعویض شبکه، تغییری در کد بازی ایجاد نکند.
 */
export type AdPlacement =
  | 'extra_heart'
  | 'double_level_reward'
  | 'daily_bonus'
  | 'interstitial_level_end';

export type AdStatus = 'completed' | 'dismissed' | 'unavailable' | 'failed';

export interface AdResult {
  status: AdStatus;
  placement: AdPlacement;
}

export interface AdProvider {
  readonly name: string;
  initialize(): Promise<void>;
  isAvailable(placement: AdPlacement): Promise<boolean>;
  showRewarded(placement: AdPlacement): Promise<AdResult>;
  showInterstitial(): Promise<AdStatus>;
}

/** پیاده‌سازی پیش‌فرض: هیچ تبلیغی نمایش داده نمی‌شود. */
export class NoopAdProvider implements AdProvider {
  readonly name = 'noop';

  async initialize(): Promise<void> {
    // کاری لازم نیست
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async showRewarded(placement: AdPlacement): Promise<AdResult> {
    return { status: 'unavailable', placement };
  }

  async showInterstitial(): Promise<AdStatus> {
    return 'unavailable';
  }
}

/**
 * سرویس تبلیغات.
 *
 * در MVP تبلیغی پخش نمی‌شود (GAME_CONFIG.ads.enabled === false) و همه فراخوانی‌ها
 * «در دسترس نیست» برمی‌گردانند. با افزودن یک AdProvider واقعی و روشن‌کردن
 * پیکربندی، دکمه‌های پاداشی (مثل «دریافت یک قلب») خودشان فعال می‌شوند؛ بدون
 * هیچ تغییری در کد صفحه‌ها.
 */
export class AdService {
  private provider: AdProvider;
  private initialized = false;
  private levelCounter = 0;

  constructor(provider: AdProvider = new NoopAdProvider()) {
    this.provider = provider;
  }

  get providerName(): string {
    return this.provider.name;
  }

  isEnabled(): boolean {
    return GAME_CONFIG.ads.enabled && this.provider.name !== 'noop';
  }

  async initialize(): Promise<void> {
    if (this.initialized || !this.isEnabled()) {
      return;
    }
    await this.provider.initialize();
    this.initialized = true;
  }

  async isAdAvailable(placement: AdPlacement): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }
    if (placement === 'extra_heart' && !GAME_CONFIG.ads.rewardedHeartEnabled) {
      return false;
    }
    if (placement === 'double_level_reward' && !GAME_CONFIG.ads.doubleRewardEnabled) {
      return false;
    }
    return this.provider.isAvailable(placement);
  }

  async showRewardedAd(placement: AdPlacement): Promise<AdResult> {
    if (!(await this.isAdAvailable(placement))) {
      return { status: 'unavailable', placement };
    }
    return this.provider.showRewarded(placement);
  }

  async showInterstitial(): Promise<AdStatus> {
    if (!this.isEnabled() || !GAME_CONFIG.ads.interstitialEnabled) {
      return 'unavailable';
    }
    return this.provider.showInterstitial();
  }

  /**
   * شمارش مرحله‌ها برای نمایش تبلیغ میان‌صفحه‌ای در فواصل مشخص. همیشه اول
   * بازی‌کننده در اولویت است: تبلیغ در پایان مرحله و نه در میانه آن.
   */
  shouldShowInterstitialAfterLevel(): boolean {
    if (!this.isEnabled() || !GAME_CONFIG.ads.interstitialEnabled) {
      return false;
    }
    this.levelCounter += 1;
    return this.levelCounter % GAME_CONFIG.ads.interstitialEveryNLevels === 0;
  }
}
