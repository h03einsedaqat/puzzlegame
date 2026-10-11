import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { APP_INFO } from '../constants/appInfo';
import { strings } from '../constants';
import { useAchievements, useDaily, useGame, useProfile, useProgress } from '../context';
import { LEVELS, getLevelById } from '../data/levels/levels';
import { useCountdown } from '../hooks/useCountdown';
import { colors, radius, shadows, spacing } from '../theme';
import { format, formatNumber, toPersianDigits } from '../utils/format';
import { formatJalaliDate, weekdayName } from '../utils/jalali';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { HeartRefillDialog } from '../components/game/HeartRefillDialog';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { StatChip } from '../components/ui/StatChip';
import { HeartCounter } from '../components/game/HeartCounter';
import type { RootScreenProps } from '../navigation/types';

/** Home 2.0: «ادامه بازی» قهرمان صفحه است؛ موتور و مسیرهای موجود حفظ شده‌اند. */
export function HomeScreen({ navigation }: RootScreenProps<'Home'>) {
  const { profile, hearts, startAttempt, refreshHearts } = useProfile();
  const { progress, continueLevelId, enterLevel } = useProgress();
  const { startGame } = useGame();
  const daily = useDaily();
  const { unlockedCount, totalCount } = useAchievements();
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [claimedCoins, setClaimedCoins] = useState<number | null>(null);

  const countdown = useCountdown(hearts.nextRefillAt);
  const todayLabel = useMemo(() => `${weekdayName(new Date())}، ${formatJalaliDate(new Date())}`, []);
  const currentLevel = useMemo(() => getLevelById(continueLevelId) ?? LEVELS[0], [continueLevelId]);
  const completedCount = progress.records.length;
  const gameFinished = LEVELS.length > 0 && completedCount >= LEVELS.length;
  const levelsRatio = LEVELS.length === 0 ? 0 : Math.min(1, completedCount / LEVELS.length);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshHearts();
      if (daily.canClaim) {
        setRewardVisible(true);
      }
    });
    return unsubscribe;
  }, [daily.canClaim, navigation, refreshHearts]);

  const playLevel = useCallback(
    (levelId: number) => {
      if (!startAttempt(levelId)) {
        setNoHeartsVisible(true);
        return;
      }
      enterLevel(levelId);
      const level = getLevelById(levelId);
      if (level) startGame(level);
      navigation.navigate('Game', { levelId, mode: 'level' });
    },
    [enterLevel, navigation, startAttempt, startGame],
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

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <View style={styles.greeting}>
            <AppText variant="caption" color={colors.textMuted}>
              {todayLabel}
            </AppText>
            <AppText variant="heading">{strings.home.greeting}</AppText>
          </View>
          <IconButton
            icon="settings"
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel={strings.settings.title}
            background={colors.surfaceElevated}
            color={colors.textPrimary}
          />
        </View>

        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <AppText variant="title" color={colors.letterGold} allowFontScaling={false}>
              ک
            </AppText>
          </View>
          <View style={styles.brandCopy}>
            <AppText variant="subheading">{strings.app.name}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {strings.app.tagline}
            </AppText>
          </View>
          <View style={styles.streakPill}>
            <Icon name="flame" size={17} color={colors.accent} />
            <AppText variant="numeric" color={colors.accent}>
              {toPersianDigits(daily.streak)}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              روز
            </AppText>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <View style={styles.heroEyebrow}>
            <View style={styles.liveDot} />
            <AppText variant="caption" color={colors.textSecondary}>
              {gameFinished ? strings.home.gameFinishedKicker : 'مسیر تو ادامه دارد'}
            </AppText>
          </View>
          <View style={styles.levelIntro}>
            <View style={styles.levelBadge}>
              <AppText variant="numericLarge" color={colors.textInverse} allowFontScaling={false}>
                {toPersianDigits(currentLevel?.id ?? 1)}
              </AppText>
            </View>
            <View style={styles.levelCopy}>
              <AppText variant="title" numberOfLines={1}>
                {gameFinished ? strings.home.gameFinishedTitle : currentLevel?.title ?? strings.app.name}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {gameFinished
                  ? format(strings.home.gameFinishedBody, { total: toPersianDigits(LEVELS.length) })
                  : format(strings.home.currentLevelLabel, { number: currentLevel?.id ?? 1 })}
              </AppText>
            </View>
          </View>

          <View style={styles.progressLabels}>
            <AppText variant="caption" color={colors.textSecondary}>
              پیشرفت مسیر
            </AppText>
            <AppText variant="caption" color={colors.textPrimary}>
              {format(strings.home.progressOfLevels, { completed: completedCount, total: LEVELS.length })}
            </AppText>
          </View>
          <ProgressBar
            ratio={levelsRatio}
            height={8}
            color={colors.brandTeal}
            trackColor={colors.surfaceElevated}
            accessibilityLabel={format(strings.home.progressOfLevels, {
              completed: completedCount,
              total: LEVELS.length,
            })}
          />

          <Button
            label={
              gameFinished
                ? strings.home.gameFinishedButton
                : completedCount > 0 || progress.lastPlayedLevelId !== null
                  ? strings.home.playButton
                  : strings.home.playNewButton
            }
            variant="primary"
            icon={gameFinished ? 'grid' : 'play'}
            size="large"
            onPress={() => {
              if (gameFinished) {
                navigation.navigate('LevelMap', { focusLevelId: LEVELS[LEVELS.length - 1]?.id ?? 1 });
                return;
              }
              playLevel(continueLevelId);
            }}
            style={styles.continueButton}
          />
          {hearts.hearts === 0 && hearts.nextRefillAt ? (
            <AppText variant="caption" color={colors.warning} align="center">
              {format(strings.hearts.nextHeartIn, { time: countdown.text })}
            </AppText>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <StatChip
            icon="coin"
            value={formatNumber(profile.coins)}
            iconColor={colors.coin}
            label={format(strings.accessibility.coinCounter, { count: profile.coins })}
            style={styles.statCell}
          />
          <StatChip
            icon="star"
            value={formatNumber(profile.score)}
            iconColor={colors.primary}
            label={format(strings.accessibility.scoreCounter, { count: profile.score })}
            style={styles.statCell}
          />
          <View style={styles.heartCell}>
            <HeartCounter
              hearts={hearts.hearts}
              maxHearts={hearts.maxHearts}
              nextRefillAt={hearts.nextRefillAt}
              showCountdown={false}
            />
          </View>
        </View>

        <View style={[styles.dailyCard, daily.canClaim ? styles.dailyCardReady : null]}>
          <View style={styles.dailyHeader}>
            <View style={styles.dailyIcon}>
              <Icon
                name={daily.canClaim ? 'gift' : 'calendar'}
                size={21}
                color={daily.canClaim ? colors.accent : colors.brandTeal}
              />
            </View>
            <View style={styles.dailyCopy}>
              <View style={styles.dailyTitleRow}>
                <AppText variant="subheading">{strings.daily.title}</AppText>
                {daily.isCompletedToday ? <Icon name="check" size={17} color={colors.success} /> : null}
              </View>
              <AppText variant="caption" color={colors.textMuted}>
                {daily.isCompletedToday ? strings.daily.completedBody : strings.daily.subtitle}
              </AppText>
            </View>
          </View>

          <View style={styles.dailyMeta}>
            <View style={styles.dailyMetric}>
              <Icon name="flame" size={16} color={colors.accent} />
              <AppText variant="caption" color={colors.textSecondary}>
                {format(strings.daily.streakValue, { days: daily.streak })}
              </AppText>
            </View>
            <View style={styles.dailyMetric}>
              <Icon name="coin" size={15} color={colors.coin} />
              <AppText variant="caption" color={colors.textSecondary}>
                {format(strings.daily.rewardClaimButton, { coins: daily.reward.coins })}
              </AppText>
            </View>
          </View>

          <ProgressBar
            ratio={daily.isCompletedToday ? 1 : 0.38}
            height={5}
            color={colors.accent}
            trackColor={colors.surfaceElevated}
          />
          <View style={styles.dailyActions}>
            <Button
              label={daily.isCompletedToday ? strings.daily.comeBackTomorrow : strings.daily.startButton}
              variant="secondary"
              icon={daily.isCompletedToday ? 'check' : 'play'}
              size="medium"
              fullWidth={false}
              disabled={daily.isCompletedToday}
              onPress={startDaily}
              style={styles.dailyButton}
            />
            {daily.canClaim ? (
              <Button
                label={strings.common.claim}
                variant="sunny"
                icon="coin"
                size="medium"
                fullWidth={false}
                onPress={claimReward}
                style={styles.dailyButton}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.shortcuts}>
          <Shortcut
            icon="grid"
            title={strings.home.levelsButton}
            detail={format(strings.home.progressOfLevels, { completed: completedCount, total: LEVELS.length })}
            onPress={() => navigation.navigate('LevelMap', { focusLevelId: continueLevelId })}
          />
          <Shortcut
            icon="medal"
            title={strings.home.achievementsButton}
            detail={`${toPersianDigits(unlockedCount)} / ${toPersianDigits(totalCount)}`}
            onPress={() => navigation.navigate('Achievements')}
          />
        </View>

        <AppText variant="caption" color={colors.textMuted} align="center" style={styles.version}>
          {format(strings.settings.versionLabel, { version: APP_INFO.version })}
        </AppText>
      </ScrollView>

      <HeartRefillDialog
        visible={noHeartsVisible}
        onClose={() => setNoHeartsVisible(false)}
        note={
          hearts.nextRefillAt
            ? format(strings.hearts.nextHeartIn, { time: countdown.text })
            : undefined
        }
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

function Shortcut({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Button
      label={title}
      onPress={onPress}
      variant="ghost"
      icon={icon}
      iconPosition="start"
      size="medium"
      fullWidth={false}
      style={styles.shortcutButton}
      accessibilityLabel={`${title}، ${detail}`}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  greeting: {
    alignItems: 'flex-start',
    gap: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCopy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  streakPill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...shadows.card,
  },
  heroGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    top: -128,
    right: -85,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTeal,
  },
  levelIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  levelBadge: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  levelCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  continueButton: {
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  heartCell: {
    flex: 1.25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    minHeight: 48,
  },
  dailyCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  dailyCardReady: {
    borderColor: colors.accentDark,
    backgroundColor: '#17182A',
  },
  dailyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dailyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  dailyCopy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  dailyTitleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dailyMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dailyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dailyButton: {
    flex: 1,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcutButton: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  version: {
    paddingTop: spacing.xs,
  },
});
