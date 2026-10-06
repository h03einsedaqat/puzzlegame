import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { strings } from '../constants';
import { useDaily, useProfile, useProgress } from '../context';
import { LEVELS } from '../data/levels/levels';
import { averageStars, MAX_STARS } from '../services';
import { colors, radius, spacing } from '../theme';
import { format, toPersianDigits } from '../utils/format';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import type { RootScreenProps } from '../navigation/types';

/**
 * صفحه آمار.
 *
 * همه اعداد از پروفایل، پیشرفت و وضعیت روزانه خوانده می‌شود؛ چیزی جداگانه ذخیره
 * نمی‌شود تا آمار هرگز با بازی واقعی ناهماهنگ نشود. هدف این است که بازیکن حس
 * پیشرفت را ببیند: چند کلمه، چند مرحله، چند ستاره و میانگین عملکردش.
 */
export function StatsScreen({ navigation }: RootScreenProps<'Stats'>) {
  const { profile } = useProfile();
  const { progress } = useProgress();
  const daily = useDaily();

  const records = progress.records;
  const stars = useMemo(() => averageStars(records), [records]);
  const totalStars = useMemo(
    () => records.reduce((sum, record) => sum + (record.stars ?? 0), 0),
    [records],
  );

  const completion = LEVELS.length === 0 ? 0 : records.length / LEVELS.length;
  const wordsPerGame =
    profile.totalGamesPlayed === 0
      ? 0
      : Math.round((profile.totalWordsFound / profile.totalGamesPlayed) * 10) / 10;

  return (
    <ScreenContainer>
      <ScreenHeader
        title={strings.stats.title}
        subtitle={strings.stats.subtitle}
        onBack={() => navigation.goBack()}
        backLabel={strings.common.back}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="accent" padding="lg">
          <View style={styles.progressHeader}>
            <AppText variant="bodyStrong" color={colors.accentDark}>
              {strings.stats.completion}
            </AppText>
            <AppText variant="caption" color={colors.accentDark}>
              {format(strings.home.progressOfLevels, {
                completed: toPersianDigits(records.length),
                total: toPersianDigits(LEVELS.length),
              })}
            </AppText>
          </View>
          <ProgressBar ratio={completion} color={colors.accentDark} />
          <AppText variant="caption" color={colors.accentDark}>
            {toPersianDigits(Math.round(completion * 100))}٪
          </AppText>
        </Card>

        <View style={styles.grid}>
          <StatCard icon="word" label={strings.stats.wordsFound} value={profile.totalWordsFound} />
          <StatCard icon="sparkle" label={strings.stats.bonusWords} value={profile.bonusWordsFound} />
          <StatCard icon="flame" label={strings.stats.bestCombo} value={profile.bestCombo} />
          <StatCard icon="play" label={strings.stats.gamesPlayed} value={profile.totalGamesPlayed} />
          <StatCard icon="check" label={strings.stats.gamesCompleted} value={profile.totalGamesCompleted} />
          <StatCard icon="bulb" label={strings.stats.hintsUsed} value={profile.totalHintsUsed} />
          <StatCard icon="star" label={strings.stats.totalScore} value={profile.score} />
          <StatCard icon="coin" label={strings.stats.coins} value={profile.coins} />
          <StatCard icon="calendar" label={strings.stats.streak} value={daily.streak} />
        </View>

        <Card variant="surface" padding="lg">
          <View style={styles.starsHeader}>
            <Icon name="star" size={20} color={colors.star} />
            <AppText variant="bodyStrong">
              {format(strings.accessibility.starEarned, { count: toPersianDigits(Math.round(stars)) })}
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textSecondary}>
            {format(strings.stats.wordsPerGame, { count: toPersianDigits(wordsPerGame) })}
          </AppText>
          <View style={styles.starsRow}>
            {Array.from({ length: MAX_STARS }).map((_, index) => (
              <Icon
                key={index}
                name="star"
                size={22}
                color={index < Math.round(stars) ? colors.star : colors.border}
              />
            ))}
            <AppText variant="caption" color={colors.textMuted}>
              {format(strings.stats.starsTotal, {
                earned: toPersianDigits(totalStars),
                possible: toPersianDigits(MAX_STARS * Math.max(1, LEVELS.length)),
              })}
            </AppText>
          </View>
        </Card>

        {records.length === 0 ? (
          <Card variant="muted" padding="lg">
            <AppText variant="bodyStrong">{strings.stats.emptyTitle}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {strings.stats.emptyBody}
            </AppText>
          </Card>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

interface StatCardProps {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  value: number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card
      variant="surface"
      padding="md"
      style={styles.statCard}
      accessibilityLabel={format(strings.accessibility.statCard, {
        label,
        value: toPersianDigits(value),
      })}
    >
      <View style={styles.statIcon}>
        <Icon name={icon} size={18} color={colors.primary} />
      </View>
      <AppText variant="numericLarge">{toPersianDigits(value)}</AppText>
      <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '31%',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
