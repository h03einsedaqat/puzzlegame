import type { Difficulty } from './game';
import type { AppSettings, DailyState, GameProgress, UserProfile, AchievementState } from './user';

/** ساختار ذخیره‌شده در AsyncStorage؛ نسخه برای مهاجرت‌های آینده نگه داشته می‌شود. */
export interface StorageEnvelope<T> {
  version: number;
  savedAt: number;
  data: T;
}

export interface StorageSnapshot {
  profile: UserProfile;
  progress: GameProgress;
  settings: AppSettings;
  daily: DailyState;
  achievements: AchievementState;
}

export type PersistedSlice = keyof StorageSnapshot;

export interface LevelSummary {
  id: number;
  title: string;
  difficulty: Difficulty;
  targetCount: number;
  isCompleted: boolean;
}
