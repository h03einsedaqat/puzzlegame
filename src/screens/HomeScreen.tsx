import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { APP_INFO } from '../constants/appInfo';
import { strings } from '../constants';
import { useAchievements, useDaily, useProfile, useProgress } from '../context';
import { LEVELS, getLevelById } from '../data/levels/levels';
import { useCountdown } from '../hooks/useCountdown';
import { colors, radius, spacing } from '../theme';
import { format, formatNumber, toPersianDigits } from '../utils/format';
import { formatJalaliDate, weekdayName } from '../utils/jalali';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { StatChip } from '../components/ui/StatChip';
import { HeartCounter } from '../components/game/HeartCounter';
import type { IconName } from '../types';
import type { RootScreenProps } from '../navigation/types';

interface HomeAction {
  key: string;
  label: string;
  icon: IconName;
  badge?: string;
  onPress: () => void;
}

/**
 * صفحه خانه.
 *
 * صفحه اصلی بازی: وضعیت بازیکن (سکه، قلب، امتیاز، استریک) در بالای صفحه،
 * دکمه «ادامه بازی» برای ورود سریع به مرحله جاری و مسیرهای فرعی (نقشه مراحل،
 * چالش روزانه، جایزه روزانه، دستاوردها، تنظیمات) در پایین.
 */
export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const { profile, hearts, startAttempt, refreshHearts } = useProfile();
  const { progress, continueLevelId, enterLevel } = useProgress();
  const daily = useDaily();
  const { newCount, unlockedCount, totalCount } = useAchievements();
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [claimedCoins, setClaimedCoins] = useState<number | null>(null);

  const countdown = useCountdown(hearts.nextRefillAt);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshHearts();
      if (daily.canClaim) {
        setRewardVisible(true);
      }
    });
    return unsubscribe;
  }, [daily.canClaim, navigation, refreshHearts]);

  const todayLabel = useMemo(() => `${weekdayName(new Date())}، ${formatJalaliDate(new Date())}`, []);
  const currentLevel = useMemo(() => getLevelById(continueLevelId) ?? LEVELS[0], [continueLevelId]);
  const completedCount = progress.records.length;
  const levelsRatio = LEVELS.length === 0 ? 0 : completedCount / LEVELS.length;

  const playLevel = useCallback(
    (levelId: number) => {
      if (!startAttempt(levelId)) {
        setNoHeartsVisible(true);
        return;
      }
      enterLevel(levelId);
      navigation.navigate('Game', { levelId, mode: 'level' });
    },
    [enterLevel, navigation, startAttempt],
  );

  const startDaily = useCallback(() => {
    navigation.navigate('DailyChallengeIntro');
  }, [navigation]);

  const claimReward = useCallback(() => {
    const reward = daily.claimReward();
    if (reward) {
      setClaimedCoins(reward.coins);
    }
    setRewardVisible(false);
  }, [daily]);

  const actions: HomeAction[] = useMemo(
    () => [
      {
        key: 'levels',
        label: strings.home.levelsButton,
        icon: 'grid',
        badge: format(strings.common.levelNumber, { number: continueLevelId }),
        onPress: () => navigation.navigate('LevelMap', { focusLevelId: continueLevelId }),
      },
      {
        key: 'daily',
        label: strings.home.dailyChallengeButton,
        icon: 'calendar',
        badge: daily.isCompletedToday ? strings.home.dailyChallengeDone : strings.common.new,
        onPress: startDaily,
      },
      {
        key: 'achievements',
        label: strings.home.achievementsButton,
        icon: 'medal',
        badge: newCount > 0 ? toPersianDigits(newCount) : `${toPersianDigits(unlockedCount)}/${toPersianDigits(totalCount)}`,
        onPress: () => navigation.navigate('Achievements'),
      },
      {
        key: 'about',
        label: strings.settings.aboutLabel,
        icon: 'info',
        onPress: () => navigation.navigate('About'),
      },
    ],
    [continueLevelId, daily.isCompletedToday, navigation, newCount, startDaily, totalCount, unlockedCount],
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <AppText variant="title">{strings.app.name}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {todayLabel}
            </AppText>
          </View>
          <IconButton
            icon="settings"
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel={strings.settings.title}
          />
        </View>

        <View style={styles.statsRow}>
          <StatChip
            icon="coin"
            value={formatNumber(profile.coins)}
            label={format(strings.accessibility.coinCounter, { count: profile.coins })}
          />
          <StatChip
            icon="star"
            value={formatNumber(profile.score)}
            label={format(strings.accessibility.scoreCounter, { count: profile.score })}
          />
          <View style={styles.heartChip}>
            <HeartCounter
              hearts={hearts.hearts}
              maxHearts={hearts.maxHearts}
              nextRefillAt={hearts.nextRefillAt}
            />
          </View>
          <StatChip
            icon="flame"
            value={toPersianDigits(daily.streak)}
            hint={strings.home.streakLabel}
            iconColor={colors.warning}
            label={format(strings.daily.streakValue, { days: daily.streak })}
          />
        </View>

        <Card variant="surface" padding="lg" style={styles.playCard}>
          <View style={styles.playHeader}>
            <View style={styles.playBadge}>
              <AppText variant="numericLarge" color={colors.onPrimary}>
                {toPersianDigits(currentLevel?.id ?? 1)}
              </AppText>
            </View>
            <View style={styles.playTexts}>
              <AppText variant="subheading">{currentLevel?.title ?? strings.app.name}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {format(strings.home.currentLevelLabel, { number: currentLevel?.id ?? 1 })}
              </AppText>
            </View>
          </View>

          <ProgressBar
            ratio={levelsRatio}
            accessibilityLabel={format(strings.home.progressOfLevels, {
              completed: completedCount,
              total: LEVELS.length,
            })}
          />
          <AppText variant="caption" color={colors.textMuted}>
            {format(strings.home.progressOfLevels, { completed: completedCount, total: LEVELS.length })}
          </AppText>

          <Button
            label={completedCount > 0 ? strings.home.playButton : strings.home.playNewButton}
            icon="play"
            onPress={() => playLevel(continueLevelId)}
          />
          {hearts.hearts === 0 && hearts.nextRefillAt ? (
            <AppText variant="caption" color={colors.warning} align="center">
              {format(strings.hearts.nextHeartIn, { time: countdown.text })}
            </AppText>
          ) : null}
        </Card>

        <Card variant={daily.canClaim ? 'accent' : 'muted'} padding="lg" style={styles.dailyCard}>
          <View style={styles.dailyHeader}>
            <Icon name={daily.canClaim ? 'gift' : 'calendar'} size={22} color={daily.canClaim ? colors.accentDark : colors.primary} />
            <View style={styles.dailyTexts}>
              <AppText variant="subheading">
                {daily.canClaim ? strings.home.dailyRewardReady : strings.daily.rewardTitle}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {daily.isCompletedToday ? strings.daily.completedBody : strings.daily.subtitle}
              </AppText>
            </View>
          </View>
          <View style={styles.dailyActions}>
            <Button
              label={strings.daily.startButton}
              variant="secondary"
              icon="play"
              size="medium"
              fullWidth={false}
              onPress={startDaily}
              style={styles.dailyButton}
            />
            {daily.canClaim ? (
              <Button
                label={format(strings.daily.rewardClaimButton, { coins: daily.reward.coins })}
                icon="coin"
                size="medium"
                fullWidth={false}
                onPress={claimReward}
                style={styles.dailyButton}
              />
            ) : null}
          </View>
          <AppText variant="caption" color={colors.textMuted}>
            {format(strings.daily.rewardDayLabel, { day: daily.reward.day, total: daily.reward.totalDays })}
          </AppText>
        </Card>

        <View style={styles.actionsGrid}>
          {actions.map(action => (
            <Card key={action.key} variant="surface" padding="md" style={styles.actionCard}>
              <Icon name={action.icon} size={22} color={colors.primary} />
              <AppText variant="bodyStrong" align="center">
                {action.label}
              </AppText>
              {action.badge ? (
                <View style={styles.actionBadge}>
                  <AppText variant="caption" color={colors.primaryDark}>
                    {action.badge}
                  </AppText>
                </View>
              ) : null}
              <Button label={strings.common.continue} variant="ghost" size="small" onPress={action.onPress} />
            </Card>
          ))}
        </View>

        <AppText variant="caption" color={colors.textMuted} align="center">
          {format(strings.settings.versionLabel, { version: APP_INFO.version })}
        </AppText>
      </ScrollView>

      <ConfirmDialog
        visible={noHeartsVisible}
        title={strings.hearts.noHeartsTitle}
        body={
          hearts.nextRefillAt
            ? `${strings.hearts.noHeartsBody} ${format(strings.hearts.nextHeartIn, { time: countdown.text })}`
            : strings.hearts.noHeartsBody
        }
        confirmLabel={strings.common.gotIt}
        cancelLabel={strings.common.close}
        onConfirm={() => setNoHeartsVisible(false)}
        onCancel={() => setNoHeartsVisible(false)}
      />

      <ConfirmDialog
        visible={rewardVisible}
        title={strings.daily.rewardTitle}
        body={format(strings.daily.rewardClaimButton, { coins: daily.reward.coins })}
        confirmLabel={strings.common.claim}
        cancelLabel={strings.common.later}
        onConfirm={claimReward}
        onCancel={() => setRewardVisible(false)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTexts: {
    gap: 2,
    alignItems: 'flex-start',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  heartChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  playCard: {
    gap: spacing.md,
  },
  playHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTexts: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  dailyCard: {
    gap: spacing.md,
  },
  dailyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dailyTexts: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  dailyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dailyButton: {
    minWidth: 150,
    flexGrow: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    flexGrow: 1,
    flexBasis: 150,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
});
