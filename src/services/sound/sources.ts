import type { SoundEvent, SoundSource } from './SoundService';

/**
 * نگاشت رویدادهای صوتی به فایل‌های صوتی. فایل‌ها در src/assets/sounds قرار
 * دارند و با اسکریپت «npm run sounds:build» تولید می‌شوند (بدون هیچ منبع
 * صوتی شخص ثالث).
 */
export const SOUND_SOURCES: Partial<Record<SoundEvent, SoundSource>> = {
  button_press: require('../../assets/sounds/button_press.wav'),
  letter_select: require('../../assets/sounds/letter_select.wav'),
  letter_remove: require('../../assets/sounds/letter_remove.wav'),
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  reward: require('../../assets/sounds/reward.wav'),
  unlock: require('../../assets/sounds/unlock.wav'),
  level_complete: require('../../assets/sounds/level_complete.wav'),
  combo: require('../../assets/sounds/combo.wav'),
};
