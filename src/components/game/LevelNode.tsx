import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DIFFICULTY_LABELS } from '../../types';
import { MAX_STARS } from '../../services/game/levelRating';
import { colors, radius, shadows, spacing } from '../../theme';
import { toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import type { Difficulty, LevelSummary } from '../../types';

export type LevelNodeState = 'completed' | 'current' | 'unlocked' | 'locked';

export interface LevelNodeProps {
  summary: LevelSummary;
  state: LevelNodeState;
  onPress: (levelId: number) => void;
  /** بهترین امتیاز ثبت‌شده برای این مرحله */
  bestScore?: number;
  /** بهترین ستاره این مرحله (۰ تا ۳) */
  stars?: number;
  accessibilityLabel: string;
}

/**
 * گره مرحله روی نقشه بازی.
 *
 * چهار وضعیت دیداری روشن دارد: تکمیل‌شده (سبز با تیک)، جاری (بنفش با درخشش)،
 * باز (سفید) و قفل (خاکستری با قفل). مسیر بین گره‌ها با خط‌های عمودی رسم
 * می‌شود تا حرکت روی نقشه قابل دنبال‌کردن باشد.
 */
export const LevelNode = React.memo(function LevelNode({
  summary,
  state,
  onPress,
  bestScore,
  stars = 0,
  accessibilityLabel,
}: LevelNodeProps) {
  const isLocked = state === 'locked';

  const background =
    state === 'completed'
      ? colors.levelCompleted
      : state === 'current'
        ? colors.levelCurrent
        : state === 'unlocked'
          ? colors.levelUnlocked
          : colors.levelLocked;

  const textColor = state === 'completed' || state === 'current' ? colors.textInverse : colors.textPrimary;

  // Locked nodes remain tappable so the map can explain how to unlock them.
  return (
    <PressableScale
      onPress={() => onPress(summary.id)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: false, selected: state === 'current' }}
      style={styles.pressable}
    >
      <View style={[styles.node, { backgroundColor: background, borderColor: isLocked ? colors.levelLockedBorder : background }]}>
        {isLocked ? (
          <Icon name="lock" size={20} color={colors.textSecondary} />
        ) : state === 'completed' ? (
          <Icon name="check" size={22} color={colors.textInverse} strokeWidth={2.6} />
        ) : (
          <AppText variant="numeric" color={textColor} allowFontScaling={false}>
            {toPersianDigits(summary.id)}
          </AppText>
        )}
      </View>

      <View style={styles.meta}>
        <AppText variant="caption" color={colors.textPrimary} numberOfLines={1} style={styles.title}>
          {summary.title}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {DIFFICULTY_LABELS[summary.difficulty as Difficulty]} · {toPersianDigits(summary.targetCount)} کلمه
        </AppText>
        {state === 'completed' ? (
          <View style={styles.starsRow}>
            {Array.from({ length: MAX_STARS }).map((_, index) => (
              <Icon
                key={index}
                name="star"
                size={13}
                color={index < stars ? colors.star : colors.border}
              />
            ))}
            {bestScore !== undefined && bestScore > 0 ? (
              <AppText variant="caption" color={colors.textSecondary}>
                {toPersianDigits(bestScore)}
              </AppText>
            ) : null}
          </View>
        ) : bestScore !== undefined && bestScore > 0 ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {toPersianDigits(bestScore)}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
});

const NODE_SIZE = 62;

const styles = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...shadows.soft,
  },
  meta: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 1,
  },
  title: {
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
