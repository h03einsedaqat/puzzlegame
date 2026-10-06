import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { GAME_CONFIG, strings } from '../constants';
import { useDaily, useProfile, useProgress, useServices } from '../context';
import { colors, radius, spacing } from '../theme';
import { format, toPersianDigits } from '../utils/format';
import { formatJalaliDate, weekdayName } from '../utils/jalali';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { HeartCounter } from '../components/game/HeartCounter';
import type { RootScreenProps } from '../navigation/types';

/**
 * معرفی چالش روزانه.
 *
 * یک پازل در روز که برای همه یکسان است و از تاریخ روز ساخته می‌شود. این صفحه
 * وضعیت امروز، استریک و نردبان جایزه هفت‌روزه را نشان می‌دهد و راه ورود به
 * چالش را در دسترس می‌گذارد.
 */
export function DailyChallengeIntroScreen({ navigation }: RootScreenProps<'DailyChallengeIntro'>) {
  const { puzzle, streak, longestStreak, reward, canPlay, canClaim, isCompletedToday, claimReward, rewardsLocked } =
    useDaily();
  const { hearts, startAttempt } = useProfile();
  const { enterLevel } = useProgress();
  const { analytics } = useServices();
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  const [claimedCoins, setClaimedCoins] = useState<number | null>(null);
  const todayLabel = useMemo(() => `${weekdayName(new Date())}، ${formatJalaliDate(new Date())}`, []);

  const ladder = useMemo(
    () =>
      GAME_CONFIG.daily.rewards.map((coins, index) => ({ day: index + 1, coins })),
    [],
  );

  const start = useCallback(() => {
    if (!canPlay) {
      return;
    }
    if (!startAttempt(puzzle.id)) {
      setNoHeartsVisible(true);
      return;
    }
    analytics.track('daily_start', { levelId: puzzle.id });
    enterLevel(puzzle.id);
    navigation.navigate('Game', { levelId: puzzle.id, mode: 'daily' });
  }, [analytics, canPlay, enterLevel, navigation, puzzle.id, startAttempt]);

  const claim = useCallback(() => {
    const claimed = claimReward();
    if (claimed) {
      setClaimedCoins(claimed.coins);
    }
  }, [claimReward]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={strings.daily.title}
        subtitle={todayLabel}
        onBack={() => navigation.goBack()}
        backLabel={strings.common.back}
        action={
          <HeartCounter hearts={hearts.hearts} maxHearts={hearts.maxHearts} nextRefillAt={hearts.nextRefillAt} showCountdown={false} />
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant={isCompletedToday ? 'muted' : 'accent'} padding="lg" style={styles.mainCard}>
          <View style={styles.mainHeader}>
            <Icon name={isCompletedToday ? 'check' : 'calendar'} size={26} color={isCompletedToday ? colors.success : colors.accentDark} />
            <View style={styles.mainTexts}>
              <AppText variant="subheading">
                {isCompletedToday ? strings.daily.completedTitle : strings.daily.subtitle}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {isCompletedToday ? strings.daily.completedBody : strings.daily.subtitle}
              </AppText>
            </View>
          </View>

          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Icon name="flame" size={18} color={colors.warning} />
              <AppText variant="bodyStrong">{format(strings.daily.streakValue, { days: streak })}</AppText>
            </View>
            <AppText variant="caption" color={colors.textMuted}>
              {strings.daily.streakTitle} · {toPersianDigits(longestStreak)}
            </AppText>
          </View>

          <Button
            label={isCompletedToday ? strings.daily.alreadyCompleted : strings.daily.startButton}
            icon={isCompletedToday ? 'check' : 'play'}
            disabled={isCompletedToday}
            onPress={start}
          />
          {isCompletedToday ? (
            <AppText variant="caption" color={colors.textMuted} align="center">
              {strings.daily.comeBackTomorrow}
            </AppText>
          ) : null}
        </Card>

        <Card variant="surface" padding="lg" style={styles.rewardCard}>
          <View style={styles.rewardHeader}>
            <Icon name="gift" size={22} color={colors.primary} />
            <View style={styles.mainTexts}>
              <AppText variant="subheading">{strings.daily.rewardTitle}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {format(strings.daily.rewardDayLabel, { day: reward.day, total: reward.totalDays })}
              </AppText>
            </View>
          </View>

          <View style={styles.ladder}>
            {ladder.map(item => (
              <View
                key={`day-${item.day}`}
                style={[styles.ladderItem, item.day === reward.day ? styles.ladderItemCurrent : null]}
              >
                <AppText variant="caption" color={item.day === reward.day ? colors.primaryDark : colors.textMuted}>
                  {toPersianDigits(item.day)}
                </AppText>
                <Icon
                  name="coin"
                  size={14}
                  color={item.day === reward.day ? colors.coin : colors.textMuted}
                />
                <AppText variant="caption" color={item.day === reward.day ? colors.textPrimary : colors.textMuted}>
                  {toPersianDigits(item.coins)}
                </AppText>
              </View>
            ))}
          </View>

          {canClaim ? (
            <Button label={format(strings.daily.rewardClaimButton, { coins: reward.coins })} icon="coin" onPress={claim} />
          ) : (
            <AppText variant="caption" color={colors.textMuted} align="center">
              {rewardsLocked ? strings.errors.genericBody : strings.daily.nextRewardIn}
            </AppText>
          )}
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={noHeartsVisible}
        title={strings.hearts.noHeartsTitle}
        body={strings.hearts.noHeartsBody}
        confirmLabel={strings.common.gotIt}
        cancelLabel={strings.common.close}
        onConfirm={() => setNoHeartsVisible(false)}
        onCancel={() => setNoHeartsVisible(false)}
      />

      <ConfirmDialog
        visible={claimedCoins !== null}
        title={strings.daily.claimedMessage}
        body={format(strings.daily.rewardClaimButton, { coins: claimedCoins ?? 0 })}
        confirmLabel={strings.common.gotIt}
        cancelLabel={strings.common.close}
        onConfirm={() => setClaimedCoins(null)}
        onCancel={() => setClaimedCoins(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  mainCard: {
    gap: spacing.md,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mainTexts: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rewardCard: {
    gap: spacing.md,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ladder: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  ladderItem: {
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 44,
  },
  ladderItemCurrent: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
});
