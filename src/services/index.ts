import { GAME_CONFIG } from '../constants';
import { AdService, type AdProvider } from './ads/AdService';
import { AnalyticsService, type AnalyticsProvider, DevLogAnalyticsProvider } from './analytics/AnalyticsService';
import { ClockService } from './clock/ClockService';
import { PurchaseService, type PurchaseProvider } from './purchase/PurchaseService';
import { createSoundBackend } from './sound/createSoundBackend';
import { SOUND_SOURCES } from './sound/sources';
import { createSoundService, SoundService, type SoundBackend } from './sound/SoundService';
import { VibrationService, type VibrationDriver } from './vibration/VibrationService';

/**
 * سبد سرویس‌های برنامه.
 *
 * همه سرویس‌ها از بیرون قابل تزریق‌اند؛ در تست‌ها نسخه‌های ساده/بی‌اثر تزریق
 * می‌شود و در اجرای واقعی پیاده‌سازی پیش‌فرض ساخته می‌شود. صفحه‌ها هیچ‌گاه
 * مستقیم سرویس نمی‌سازند و همیشه از همین سبد استفاده می‌کنند.
 */
export interface AppServices {
  sound: SoundService;
  vibration: VibrationService;
  ads: AdService;
  analytics: AnalyticsService;
  purchase: PurchaseService;
  clock: ClockService;
}

export interface ServicesOverrides {
  soundBackend?: SoundBackend;
  adProvider?: AdProvider;
  analyticsProviders?: AnalyticsProvider[];
  purchaseProvider?: PurchaseProvider;
  vibrationDriver?: VibrationDriver;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

export function createServices(overrides: ServicesOverrides = {}): AppServices {
  const sound = createSoundService(
    overrides.soundBackend ?? createSoundBackend(),
    overrides.soundEnabled ?? true,
    SOUND_SOURCES,
  );

  const analyticsProviders = overrides.analyticsProviders ?? [
    ...(GAME_CONFIG.analytics.logInDev && __DEV__ ? [new DevLogAnalyticsProvider()] : []),
  ];

  return {
    sound,
    vibration: new VibrationService(overrides.vibrationEnabled ?? true, overrides.vibrationDriver),
    ads: new AdService(overrides.adProvider),
    analytics: new AnalyticsService(analyticsProviders),
    purchase: new PurchaseService(overrides.purchaseProvider),
    clock: new ClockService(),
  };
}

export { SoundService, createSoundService } from './sound/SoundService';
export type { SoundBackend, SoundEvent } from './sound/SoundService';
export { AdService, NoopAdProvider } from './ads/AdService';
export type { AdPlacement, AdProvider, AdResult, AdStatus } from './ads/AdService';
export { AnalyticsService, NoopAnalyticsProvider } from './analytics/AnalyticsService';
export type { AnalyticsProvider } from './analytics/AnalyticsService';
export { PurchaseService, NoopPurchaseProvider, PRODUCTS } from './purchase/PurchaseService';
export type { ProductId, PurchaseProvider, PurchaseProduct, PurchaseResult } from './purchase/PurchaseService';
export { VibrationService } from './vibration/VibrationService';
export { ClockService } from './clock/ClockService';
export { repositories, profileRepository, progressRepository, settingsRepository, dailyRepository, achievementsRepository } from './storage/repositories';
export { clearAll, loadData, removeData, saveData } from './storage/storage';
export { migrateToCurrent, MIGRATIONS } from './storage/migrations';
export * from './game/gameEngine';
export {
  validateWord,
  wordKind,
  isTargetWord,
  remainingTargetWords,
  levelSolutions,
  wordLength,
} from './game/wordValidator';
export { validateLevel, validateLevels } from './game/levelValidator';
export type { LevelValidationResult } from './game/levelValidator';
export {
  computeHeartState,
  applyHeartState,
  spendHeart,
  refundHeart,
  grantHearts,
  refillHearts,
  isFreeAttemptLevel,
} from './game/heartService';
export type { HeartState } from './game/heartService';
export { evaluateClock, isLocked } from './game/clockGuard';
export {
  dailyPuzzleIndex,
  getDailyPuzzleForDate,
  getTodayPuzzle,
  canPlayDailyChallenge,
  isDailyChallengeCompleted,
  markDailyChallengeCompleted,
  effectiveStreak,
  getDailyReward,
  canClaimDailyReward,
  claimDailyReward,
} from './game/dailySeed';
export {
  buildAchievementStats,
  achievementProgress,
  evaluateAchievements,
  markAchievementsSeen,
} from './game/achievementService';
export type { AchievementStats } from './game/achievementService';
export {
  applyWheelTouch,
  computeWheelGeometry,
  distanceBetween,
  getTileAtPoint,
  nearestTileId,
  positionOf,
  preferredTileSizeFor,
  resolveWheelTouch,
} from './game/wheelGesture';
export type {
  WheelGeometry,
  WheelGeometryInput,
  WheelPoint,
  WheelTilePosition,
  WheelTouchAction,
} from './game/wheelGesture';
export {
  adoptSelection,
  createWheelInteractionState,
  wheelGestureCancel,
  wheelGestureDown,
  wheelGestureEnd,
  wheelGestureMove,
} from './game/wheelInteraction';
export type {
  WheelInteractionPhase,
  WheelInteractionResult,
  WheelInteractionState,
} from './game/wheelInteraction';
export { computeStars, starLabel, averageStars, MAX_STARS } from './game/levelRating';
export type { StarInput } from './game/levelRating';
export { shareText, openStorePage } from './share/ShareService';
export type { SharePayload } from './share/ShareService';
export {
  computeDifficultyScore,
  difficultyFromScore,
  editDistance,
  similarityRatio,
} from './game/levelDifficulty';
