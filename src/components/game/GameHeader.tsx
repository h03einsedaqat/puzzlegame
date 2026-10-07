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
  /** صفحه کوچک: فقط اطلاعات لازم، بقیه جمع‌وجور */
  compact?: boolean;
  /** ارتفاع ثابت سرصفحه؛ از چیدمان صفحه می‌آید تا هیچ‌وقت صفحه را بیرون نزند */
  height?: number;
}

/**
 * سرصفحه صفحه بازی.
 *
 * امتیاز، سکه، قلب و پیشرفت واژه‌ها در یک نگاه دیده می‌شوند. ارتفاعش ثابت و از
 * بیرون تعیین می‌شود و تعداد پیشرفت واژه‌ها روی خودِ نوار پیشرفت (برچسب
 * دسترس‌پذیری) و در نشان وسط چرخ است؛ پس این عدد دو بار در دو جا نمایش داده
 * نمی‌شود و در صفحه کوچک هم چیزی بیرون نمی‌زند.
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
  compact = false,
  height = compact ? 64 : 78,
}: GameHeaderProps) {
  const ratio = totalTargets === 0 ? 0 : foundTargets / totalTargets;
  const progressLabel = format(strings.game.targetProgress, {
    found: foundTargets,
    total: totalTargets,
  });
  const progressText = format(strings.game.targetProgress, {
    found: toPersianDigits(foundTargets),
    total: toPersianDigits(totalTargets),
  });

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.topRow}>
        <IconButton
          icon="back"
          size={compact ? 18 : 20}
          onPress={onBack}
          accessibilityLabel={backLabel}
          style={styles.back}
        />
        <View style={styles.titleBlock}>
          <AppText
            variant={compact ? 'subheading' : 'heading'}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={styles.title}
          >
            {title}
          </AppText>
          <View style={styles.difficultyPill}>
            <AppText variant="caption" color={colors.primaryDark} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {DIFFICULTY_LABELS[difficulty]}
            </AppText>
          </View>
        </View>
        <View style={styles.stat}>
          <Icon name="star" size={16} color={colors.star} />
          <AppText variant="numeric" allowFontScaling={false}>
            {toPersianDigits(score)}
          </AppText>
        </View>
        <View style={styles.stat}>
          <Icon name="coin" size={16} color={colors.coin} />
          <AppText variant="numeric" allowFontScaling={false}>
            {toPersianDigits(coins)}
          </AppText>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <ProgressBar ratio={ratio} height={compact ? 10 : 12} accessibilityLabel={progressLabel} />
        </View>
        {!compact ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {progressText}
          </AppText>
        ) : null}
        <HeartCounter hearts={hearts} maxHearts={maxHearts} nextRefillAt={nextRefillAt} showCountdown={false} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    alignSelf: 'stretch',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  back: {
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 1,
  },
  title: {
    alignSelf: 'stretch',
  },
  difficultyPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  progressBar: {
    flex: 1,
  },
});
