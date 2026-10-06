import { GAME_CONFIG } from '../../constants/gameConfig';
import type { SoundBackend, SoundEvent, SoundSource } from './SoundService';

/**
 * پیاده‌سازی پخش صدا روی کتابخانه react-native-sound.
 *
 * این فایل عمداً وابستگی سخت به کتابخانه ندارد: ماژول با try/catch بارگذاری
 * می‌شود و اگر نصب نباشد، پیاده‌سازی بی‌صدا فعال می‌ماند. به این ترتیب Build
 * برنامه هرگز به خاطر صدا شکسته نمی‌شود.
 */

interface SoundInstance {
  play(callback?: (success: boolean) => void): void;
  stop(callback?: () => void): void;
  release(): void;
  setVolume(volume: number): void;
}

type SoundConstructor = new (
  filename: SoundSource,
  onError: (error: Error | null) => void,
  onLoad?: () => void,
) => SoundInstance;

interface SoundModule {
  default?: SoundConstructor;
  (filename: SoundSource, onError: (error: Error | null) => void, onLoad?: () => void): SoundInstance;
}

function loadSoundModule(): SoundConstructor | null {
  try {
    const module = require('react-native-sound') as SoundModule;
    const constructor = (module.default ?? module) as SoundConstructor;
    return typeof constructor === 'function' ? constructor : null;
  } catch {
    return null;
  }
}

export function isReactNativeSoundAvailable(): boolean {
  return loadSoundModule() !== null;
}

export class ReactNativeSoundBackend implements SoundBackend {
  readonly name = 'react-native-sound';

  private Sound: SoundConstructor | null;
  private sounds = new Map<SoundEvent, SoundInstance>();
  private enabled = true;

  constructor() {
    this.Sound = loadSoundModule();
  }

  isAvailable(): boolean {
    return this.Sound !== null;
  }

  async preload(sources: Partial<Record<SoundEvent, SoundSource>>): Promise<void> {
    if (!this.Sound) {
      return;
    }
    const Sound = this.Sound;
    await Promise.all(
      Object.entries(sources).map(
        ([event, source]) =>
          new Promise<void>(resolve => {
            if (source === undefined) {
              resolve();
              return;
            }
            const instance = new Sound(source, error => {
              if (error) {
                resolve();
                return;
              }
              instance.setVolume(GAME_CONFIG.sound.defaultVolume);
              this.sounds.set(event as SoundEvent, instance);
              resolve();
            });
          }),
      ),
    );
  }

  play(event: SoundEvent): void {
    if (!this.enabled) {
      return;
    }
    const sound = this.sounds.get(event);
    if (!sound) {
      return;
    }
    sound.stop();
    sound.play();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  release(): void {
    for (const sound of this.sounds.values()) {
      sound.release();
    }
    this.sounds.clear();
  }
}

export function createReactNativeSoundBackend(): SoundBackend {
  return new ReactNativeSoundBackend();
}
