import { GAME_CONFIG } from '../../constants/gameConfig';
import { SilentSoundBackend, type SoundBackend } from './SoundService';
import { createReactNativeSoundBackend, isReactNativeSoundAvailable } from './reactNativeSoundBackend';

/**
 * انتخاب خودکار پشتیبان صدا:
 * اگر کتابخانه صدا نصب و قابل بارگذاری باشد، از آن استفاده می‌شود؛ در غیر این
 * صورت بازی بی‌صدا اجرا می‌شود. این تصمیم در زمان اجرا گرفته می‌شود تا Build
 * برنامه به وابستگی صدا گره نخورد.
 */
export function createSoundBackend(): SoundBackend {
  if (GAME_CONFIG.sound.backend === 'none') {
    return new SilentSoundBackend();
  }
  if (isReactNativeSoundAvailable()) {
    return createReactNativeSoundBackend();
  }
  return new SilentSoundBackend();
}
