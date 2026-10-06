import { GAME_CONFIG } from '../../constants/gameConfig';

/**
 * رویدادهای صوتی بازی. هر رویداد یک فایل صوتی کوتاه دارد.
 */
export type SoundEvent =
  | 'button_press'
  | 'letter_select'
  | 'letter_remove'
  | 'correct'
  | 'wrong'
  | 'reward'
  | 'unlock'
  | 'level_complete'
  | 'combo';

export type SoundSource = number | { uri: string };

export interface SoundBackend {
  readonly name: string;
  isAvailable(): boolean;
  preload(sources: Partial<Record<SoundEvent, SoundSource>>): Promise<void>;
  play(event: SoundEvent): void;
  setEnabled(enabled: boolean): void;
  release(): void;
}

/** پیاده‌سازی پیش‌فرض: بی‌صدا. برنامه بدون آن هم کامل کار می‌کند. */
export class SilentSoundBackend implements SoundBackend {
  readonly name = 'silent';

  isAvailable(): boolean {
    return true;
  }

  async preload(_sources: Partial<Record<SoundEvent, SoundSource>>): Promise<void> {
    // هیچ فایلی بارگذاری نمی‌شود
  }

  play(_event: SoundEvent): void {
    // بی‌صدا
  }

  setEnabled(_enabled: boolean): void {
    // بی‌صدا
  }

  release(): void {
    // چیزی برای آزادکردن نیست
  }
}

export interface SoundServiceOptions {
  backend: SoundBackend;
  enabled?: boolean;
  sources?: Partial<Record<SoundEvent, SoundSource>>;
}

/**
 * لایه صدا.
 *
 * رابط برنامه مستقل از کتابخانه پخش صدا است: اگر ماژول بومی صدا نصب نباشد،
 * پیاده‌سازی بی‌صدا استفاده می‌شود و بازی بدون خطا ادامه پیدا می‌کند. با نصب
 * کتابخانه صدا، همان لحظه پخش واقعی فعال می‌شود (راهنمای فعال‌سازی در README).
 */
export class SoundService {
  private backend: SoundBackend;
  private enabled: boolean;
  private sources: Partial<Record<SoundEvent, SoundSource>>;
  private preloaded = false;

  constructor({ backend, enabled = true, sources = {} }: SoundServiceOptions) {
    this.backend = backend;
    this.enabled = enabled;
    this.sources = sources;
    this.backend.setEnabled(enabled);
  }

  get backendName(): string {
    return this.backend.name;
  }

  isAvailable(): boolean {
    return this.backend.isAvailable();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.backend.setEnabled(enabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async preload(): Promise<void> {
    if (this.preloaded || !this.enabled) {
      return;
    }
    await this.backend.preload(this.sources);
    this.preloaded = true;
  }

  play(event: SoundEvent): void {
    // رویدادی که فایل صوتی ندارد، به لایه پخش هم فرستاده نمی‌شود.
    if (!this.enabled || this.sources[event] === undefined) {
      return;
    }
    this.backend.play(event);
  }

  release(): void {
    this.backend.release();
    this.preloaded = false;
  }
}

export function createSoundService(
  backend: SoundBackend,
  enabled: boolean = true,
  sources: Partial<Record<SoundEvent, SoundSource>> = {},
): SoundService {
  return new SoundService({
    backend,
    enabled: enabled && GAME_CONFIG.sound.backend !== 'none',
    sources,
  });
}
