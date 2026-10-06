import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { HAPTIC_PATTERNS, patternFor } from '../../src/constants/haptics';
import { AdService, NoopAdProvider, type AdProvider } from '../../src/services/ads/AdService';
import { AnalyticsService, DevLogAnalyticsProvider, NoopAnalyticsProvider, type AnalyticsProvider } from '../../src/services/analytics/AnalyticsService';
import { ClockService } from '../../src/services/clock/ClockService';
import { PurchaseService, type PurchaseProvider } from '../../src/services/purchase/PurchaseService';
import { createServices } from '../../src/services';
import { SilentSoundBackend, createSoundService, type SoundBackend, type SoundEvent } from '../../src/services/sound/SoundService';
import { VibrationService, type VibrationDriver } from '../../src/services/vibration/VibrationService';

type TestGlobals = { __resetAsyncStorage: () => void };
const testGlobals = globalThis as unknown as TestGlobals;

beforeEach(() => {
  testGlobals.__resetAsyncStorage();
});

describe('سرویس صدا', () => {
  it('پس‌زمینه بی‌صدا خطا نمی‌دهد و برنامه بدون کتابخانه صدا کامل کار می‌کند', async () => {
    const backend = new SilentSoundBackend();
    expect(backend.isAvailable()).toBe(true);
    expect(backend.name).toBe('silent');
    await expect(backend.preload({ button_press: 1 })).resolves.toBeUndefined();
    expect(() => backend.play('button_press')).not.toThrow();
    expect(() => backend.setEnabled(true)).not.toThrow();
    expect(() => backend.release()).not.toThrow();
  });

  it('رویدادها را به پیاده‌سازی صدا می‌فرستد', () => {
    const played: SoundEvent[] = [];
    const backend: SoundBackend = {
      name: 'fake',
      isAvailable: () => true,
      preload: async () => undefined,
      play: event => played.push(event),
      setEnabled: () => undefined,
      release: () => undefined,
    };
    const service = createSoundService(backend, true, { button_press: 1, correct: 2 });

    service.play('button_press');
    service.play('correct');
    expect(played).toEqual(['button_press', 'correct']);
    expect(service.isAvailable()).toBe(true);
    expect(service.backendName).toBe('fake');
  });

  it('وقتی صدا خاموش است چیزی پخش نمی‌کند', () => {
    const played: SoundEvent[] = [];
    const backend: SoundBackend = {
      name: 'fake',
      isAvailable: () => true,
      preload: async () => undefined,
      play: event => played.push(event),
      setEnabled: () => undefined,
      release: () => undefined,
    };
    const service = createSoundService(backend, false, { button_press: 1 });

    service.play('button_press');
    expect(played).toEqual([]);

    service.setEnabled(true);
    service.play('button_press');
    expect(played).toEqual(['button_press']);
  });

  it('رویداد بدون فایل صوتی را نادیده می‌گیرد', () => {
    const played: SoundEvent[] = [];
    const backend: SoundBackend = {
      name: 'fake',
      isAvailable: () => true,
      preload: async () => undefined,
      play: event => played.push(event),
      setEnabled: () => undefined,
      release: () => undefined,
    };
    const service = createSoundService(backend, true, {});
    service.play('reward');
    expect(played).toEqual([]);
    expect(service.isEnabled()).toBe(true);
  });
});

describe('سرویس لرزش', () => {
  const driver = () => {
    const calls: (number | readonly number[])[] = [];
    let cancelled = 0;
    const fake: VibrationDriver = {
      vibrate: pattern => calls.push(pattern),
      cancel: () => {
        cancelled += 1;
      },
    };
    return { fake, calls, cancelled: () => cancelled };
  };

  it('الگوی رویداد را به درایور می‌دهد', () => {
    const { fake, calls } = driver();
    const service = new VibrationService(true, fake);

    service.trigger('letter_select');
    service.trigger('correct');

    expect(calls).toEqual([HAPTIC_PATTERNS.letter_select, HAPTIC_PATTERNS.correct]);
    expect(patternFor('wrong')).toEqual(HAPTIC_PATTERNS.wrong);
  });

  it('وقتی لرزش خاموش است چیزی نمی‌فرستد و پس از روشن‌شدن کار می‌کند', () => {
    const { fake, calls } = driver();
    const service = new VibrationService(false, fake);

    service.trigger('button');
    expect(calls).toEqual([]);

    service.setEnabled(true);
    expect(service.isEnabled()).toBe(true);
    service.trigger('button');
    expect(calls.length).toBe(1);
  });

  it('لغو لرزش را به درایور می‌سپارد', () => {
    const { fake, cancelled } = driver();
    new VibrationService(true, fake).cancel();
    expect(cancelled()).toBe(1);
  });

  /**
   * رگرسیون: روی اندروید اگر مجوز VIBRATE در Manifest نباشد، فراخوانی لرزش
   * SecurityException می‌دهد و چون از ماژول بومی بالا می‌آید برنامه را می‌بندد؛
   * بازیکن آن را به‌صورت «با هر لمس، برنامه بسته می‌شود» می‌دید. حالا لایه سرویس
   * باید هر خطای درایور را در خودش خفه کند و هرگز به رابط کاربری نرساند.
   */
  it('خطای درایور لرزش را هرگز به رابط کاربری نمی‌دهد (بازی بدون لرزش ادامه می‌دهد)', () => {
    const failing: VibrationDriver = {
      vibrate: () => {
        throw new Error('SecurityException: Requires VIBRATE permission');
      },
      cancel: () => {
        throw new Error('SecurityException: Requires VIBRATE permission');
      },
    };
    const service = new VibrationService(true, failing);

    expect(() => service.trigger('button')).not.toThrow();
    expect(() => service.trigger('letter_select')).not.toThrow();
    expect(() => service.cancel()).not.toThrow();
    expect(() => service.setEnabled(false)).not.toThrow();
  });

  it('سرویس پیش‌فرض هم با درایور بومی خطا نمی‌دهد', () => {
    const service = createServices().vibration;
    expect(() => service.trigger('button')).not.toThrow();
    expect(() => service.cancel()).not.toThrow();
  });
});

/**
 * رگرسیون Manifest: مجوز VIBRATE باید در فایل اصلی AndroidManifest باشد؛
 * نبودنش باعث بسته‌شدن برنامه روی هر لمس دکمه می‌شود.
 */
describe('Manifest اندروید', () => {
  it('مجوز VIBRATE را اعلام می‌کند', () => {
    const manifest = readFileSync(resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    expect(manifest).toContain('android.permission.VIBRATE');
  });

  it('برای انتشار به اینترنت نیازی ندارد (بازی آفلاین است)', () => {
    const manifest = readFileSync(resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    expect(manifest).not.toContain('android.permission.INTERNET');
  });
});

describe('تبلیغات', () => {
  it('در MVP هیچ تبلیغی نمایش داده نمی‌شود', async () => {
    const service = new AdService();
    await service.initialize();

    expect(service.isEnabled()).toBe(false);
    expect(service.providerName).toBe('noop');
    expect(await service.isAdAvailable('extra_heart')).toBe(false);
    expect(await service.showRewardedAd('extra_heart')).toEqual({ status: 'unavailable', placement: 'extra_heart' });
    expect(await service.showInterstitial()).toBe('unavailable');
    expect(service.shouldShowInterstitialAfterLevel()).toBe(false);
  });

  it('با ارائه‌دهنده تازه هم تا وقتی پیکربندی خاموش است فعال نمی‌شود', async () => {
    const provider: AdProvider = {
      name: 'test-network',
      initialize: async () => undefined,
      isAvailable: async () => true,
      showRewarded: async placement => ({ status: 'completed', placement }),
      showInterstitial: async () => 'completed',
    };
    const service = new AdService(provider);
    await service.initialize();

    expect(service.providerName).toBe('test-network');
    expect(service.isEnabled()).toBe(false);
    expect(await service.isAdAvailable('daily_bonus')).toBe(false);
  });

  it('ارائه‌دهنده پیش‌فرض همیشه در دسترس نیست', async () => {
    const provider = new NoopAdProvider();
    expect(provider.name).toBe('noop');
    expect(await provider.isAvailable()).toBe(false);
    expect(await provider.showRewarded('extra_heart')).toEqual({ status: 'unavailable', placement: 'extra_heart' });
    expect(await provider.showInterstitial()).toBe('unavailable');
    await expect(provider.initialize()).resolves.toBeUndefined();
  });
});

describe('تحلیل رویدادها', () => {
  it('رویداد را به همه ارائه‌دهنده‌ها می‌فرستد', () => {
    const seen: string[] = [];
    const provider: AnalyticsProvider = {
      name: 'test',
      initialize: async () => undefined,
      track: event => seen.push(event),
      setUserId: id => seen.push(`user:${id}`),
      flush: async () => undefined,
    };
    const service = new AnalyticsService([provider], true);

    service.track('level_start', { levelId: 3 });
    service.setUserId('u_1');
    service.track('word_correct', { length: 4 });

    expect(seen).toEqual(['level_start', 'user:u_1', 'word_correct']);
  });

  it('خطای یک ارائه‌دهنده بازی را متوقف نمی‌کند', () => {
    const failing: AnalyticsProvider = {
      name: 'failing',
      initialize: async () => undefined,
      track: () => {
        throw new Error('شبکه قطع است');
      },
      setUserId: () => undefined,
      flush: async () => undefined,
    };
    const seen: string[] = [];
    const healthy: AnalyticsProvider = {
      name: 'healthy',
      initialize: async () => undefined,
      track: event => seen.push(event),
      setUserId: () => undefined,
      flush: async () => undefined,
    };
    const service = new AnalyticsService([failing, healthy], true);

    expect(() => service.track('app_open')).not.toThrow();
    expect(seen).toEqual(['app_open']);
  });

  it('وقتی تحلیل خاموش است چیزی ثبت نمی‌شود', () => {
    const seen: string[] = [];
    const provider: AnalyticsProvider = {
      name: 'test',
      initialize: async () => undefined,
      track: event => seen.push(event),
      setUserId: () => undefined,
      flush: async () => undefined,
    };
    const service = new AnalyticsService([provider], false);
    service.track('app_open');
    expect(seen).toEqual([]);
  });

  it('ارائه‌دهنده‌های پیش‌فرض بی‌خطرند', async () => {
    const noop = new NoopAnalyticsProvider();
    const dev = new DevLogAnalyticsProvider();
    await expect(noop.initialize()).resolves.toBeUndefined();
    await expect(dev.flush()).resolves.toBeUndefined();
    expect(noop.name).toBe('noop');
    expect(dev.name).toBe('dev-log');
  });
});

describe('خرید درون‌برنامه‌ای', () => {
  it('در MVP غیرفعال است و محصولی نمی‌فروشد', async () => {
    const service = new PurchaseService();
    await service.initialize();

    expect(service.isEnabled()).toBe(false);
    expect(service.providerName).toBe('noop');
    expect(await service.getProducts()).toEqual([]);
    expect(await service.purchase('coinsSmall')).toEqual({ status: 'unavailable', productId: 'coinsSmall' });
    expect(service.findProduct('coinsLarge')?.kind).toBe('consumable');
    expect(service.findProduct('removeAds')?.kind).toBe('non_consumable');
  });

  it('فهرست محصول‌ها برای پیشخان آماده است', () => {
    const service = new PurchaseService();
    expect(service.findProduct('coinsMedium')).toBeDefined();
    expect(service.findProduct('premium')?.kind).toBe('non_consumable');
  });

  it('با ارائه‌دهنده تازه، تا روشن‌بودن پیکربندی فعال نمی‌شود', () => {
    const provider: PurchaseProvider = {
      name: 'poolakey',
      initialize: async () => undefined,
      isAvailable: async () => true,
      getProducts: async () => [],
      purchase: async productId => ({ status: 'success', productId }),
      consume: async () => true,
      restore: async () => [],
    };
    const service = new PurchaseService(provider);
    expect(service.providerName).toBe('poolakey');
    expect(service.isEnabled()).toBe(false);
  });
});

describe('سرویس زمان', () => {
  it('زمان را ثبت می‌کند و عقب‌رفتن ساعت را می‌گیرد', async () => {
    const clock = new ClockService();
    const now = 1_700_000_000_000;

    const first = await clock.check(now);
    expect(first.rollbackDetected).toBe(false);
    expect(clock.toleranceMs).toBeGreaterThan(0);

    const second = await clock.check(now + 60_000);
    expect(second.rollbackDetected).toBe(false);
    expect(clock.isLocked(now + 60_000)).toBe(false);

    const rollback = await clock.check(now - 60 * 60 * 1000);
    expect(rollback.rollbackDetected).toBe(true);
    expect(clock.isLocked(now - 60 * 60 * 1000)).toBe(true);
  });

  it('وضعیت ذخیره‌شده را پس از راه‌اندازی مجدد بازیابی می‌کند', async () => {
    const now = 1_700_000_000_000;
    const first = new ClockService();
    await first.check(now);

    const restored = new ClockService();
    const loaded = await restored.load();
    expect(loaded.lastSeenAt).toBeGreaterThan(0);
  });
});

describe('سبد سرویس‌ها', () => {
  it('همه سرویس‌ها را با پیش‌فرض‌های ایمن می‌سازد', () => {
    const services = createServices();
    expect(services.sound).toBeDefined();
    expect(services.vibration).toBeDefined();
    expect(services.ads).toBeDefined();
    expect(services.analytics).toBeDefined();
    expect(services.purchase).toBeDefined();
    expect(services.clock).toBeDefined();
    expect(services.ads.isEnabled()).toBe(false);
    expect(services.purchase.isEnabled()).toBe(false);
  });

  it('امکان تزریق نسخه‌های آزمایشی را می‌دهد', () => {
    const driver: VibrationDriver = { vibrate: () => undefined, cancel: () => undefined };
    const services = createServices({
      vibrationDriver: driver,
      vibrationEnabled: false,
      soundEnabled: false,
      analyticsProviders: [new NoopAnalyticsProvider()],
    });

    expect(services.vibration.isEnabled()).toBe(false);
    expect(services.sound.isEnabled()).toBe(false);
  });
});
