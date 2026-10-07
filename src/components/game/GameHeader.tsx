import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DIFFICULTY_LABELS } from '../../types';
import { strings } from '../../constants';
import { colors, radius, spacing } from '../../theme';
import { format, toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';
import { HeartCounter } from './HeartCounter';
import type { Difficulty } from '../../types';

export interface GameHeaderProps {
  title: string;
  difficulty: Difficulty;
  score: number;
  coins: number;
  foundTargets: number;
  totalTargets: number;
  hearts: number;
  maxHearts: number;
  nextRefillAt: number | null;
  onBack: () => void;
  backLabel: string;
}

/**
 * سرصفحه صفحه بازی.
 *
 * امتیاز، سکه، قلب و پیشرفت واژه‌ها در یک نگاه دیده می‌شوند تا بازیکن بدون
 * ترک صفحه از وضعیت خود باخبر باشد.
 */
export const GameHeader = React.memo(function GameHeader({
  title,
  difficulty,
  score,
  coins,
  foundTargets,
  totalTargets,
  hearts,
  maxHearts,
  nextRefillAt,
  onBack,
  backLabel,
}: GameHeaderProps) {
  const ratio = totalTargets === 0 ? 0 : foundTargets / totalTargets;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <IconButton icon="back" onPress={onBack} accessibilityLabel={backLabel} />
        <View style={styles.titleBlock}>
          <AppText variant="subheading" numberOfLines={1}>
            {title}
          </AppText>
          <View style={styles.difficultyPill}>
            <AppText variant="caption" color={colors.primaryDark}>
              {DIFFICULTY_LABELS[difficulty]}
            </AppText>
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Icon name="star" size={16} color={colors.star} />
            <AppText variant="numeric">{toPersianDigits(score)}</AppText>
          </View>
          <View style={styles.stat}>
            <Icon name="coin" size={16} color={colors.coin} />
            <AppText variant="numeric">{toPersianDigits(coins)}</AppText>
          </View>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBlock}>
          <AppText variant="caption" color={colors.textSecondary}>
            {strings.game.progressLabel}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {format(strings.game.targetProgress, { found: foundTargets, total: totalTargets })}
          </AppText>
        </View>
        <HeartCounter hearts={hearts} maxHearts={maxHearts} nextRefillAt={nextRefillAt} showCountdown={false} />
      </View>

      <ProgressBar ratio={ratio} accessibilityLabel={format(strings.game.targetProgress, { found: foundTargets, total: totalTargets })} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  difficultyPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  stats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBlock: {
    alignItems: 'flex-start',
  },
});
