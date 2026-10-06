import { strings } from '../constants';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ACHIEVEMENTS, type AchievementDefinition } from '../data/achievements/achievements';
import { useAchievements, useProfile, useProgress } from '../context';
import { MAX_STARS, shareText } from '../services';
import { colors, radius, spacing } from '../theme';
import { format, toPersianDigits } from '../utils/format';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ConfettiCelebration } from '../components/ui/ConfettiCelebration';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { HeartCounter } from '../components/game/HeartCounter';
import { HeartRefillDialog } from '../components/game/HeartRefillDialog';
import type { RootScreenProps } from '../navigation/types';

/**
 * صفحه نتیجه.
 *
 * خلاصه‌ای از عملکرد مرحله، فهرست واژه‌های پیداشده و مسیرهای بعدی (مرحله بعد،
 * تکرار، خانه). دستاوردهای تازه‌بازشده هم همین‌جا اعلام می‌شوند تا بازیکن بلافاصله
 * بازخورد پیشرفتش را ببیند.
 */
export function ResultScreen({ navigation, route }: RootScreenProps<'Result'>) {
  const params = route.params;
  const { hearts, startAttempt } = useProfile();
  const { enterLevel } = useProgress();
  const { achievements, sync } = useAchievements();
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  const [newAchievement, setNewAchievement] = useState<AchievementDefinition | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    const unlocked = sync();
    const first = unlocked[0];
    if (first) {
      setNewAchievement(first);
    }
  }, [sync]);

  const isDaily = params.mode === 'daily';
  const targetWords = useMemo(() => params.words.filter(entry => entry.kind === 'target'), [params.words]);
  const bonusWords = useMemo(() => params.words.filter(entry => entry.kind === 'bonus'), [params.words]);

  const goToLevel = useCallback(
    (levelId: number) => {
      if (!startAttempt(levelId)) {
        setNoHeartsVisible(true);
        return;
      }
      enterLevel(levelId);
      navigation.replace('Game', { levelId, mode: 'level' });
    },
    [enterLevel, navigation, startAttempt],
  );

  const completionRatio = params.targetTotal === 0 ? 1 : params.targetFound / params.targetTotal;
  const stars = typeof params.stars === 'number' ? params.stars : 0;

  const handleShareResult = useCallback(async () => {
    const done = await shareText({
      title: strings.result.shareResult,
      message: format(strings.result.shareMessage, {
        level: toPersianDigits(params.levelId),
        score: toPersianDigits(params.score),
        stars: toPersianDigits(Math.max(1, stars)),
      }),
    });
    setShareNote(done ? null : strings.errors.genericBody);
  }, [params.levelId, params.score, stars]);

  return (
    <ScreenContainer>
      {/* لحظه برد: بارش کاغذرنگی روی صفحه (بدون گرفتن لمس دکمه‌ها) */}
      <ConfettiCelebration active={completionRatio >= 1} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.heroBadge, completionRatio >= 1 ? styles.heroBadgeComplete : styles.heroBadgePartial]}>
            <Icon
              name={completionRatio >= 1 ? 'success' : 'refresh'}
              size={34}
              color={completionRatio >= 1 ? colors.success : colors.warning}
            />
          </View>
          <AppText variant="title" align="center">
            {params.isNewBestScore ? strings.result.newBestScore : strings.result.completedTitle}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} align="center">
            {format(strings.common.levelNumber, { number: params.levelId })} · {params.levelTitle}
          </AppText>
          {params.unlockedLevelId ? (
            <View style={styles.unlockPill}>
              <Icon name="success" size={16} color={colors.success} />
              <AppText variant="caption" color={colors.success}>
                {format(strings.result.levelUnlocked, { number: params.unlockedLevelId })}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.starsRow} accessibilityLabel={strings.result.starsLabel}>
          {Array.from({ length: MAX_STARS }).map((_, index) => (
            <Icon
              key={index}
              name="star"
              size={30}
              color={index < stars ? colors.star : colors.border}
            />
          ))}
        </View>

        <View style={styles.statsRow}>
          <Card variant="surface" padding="md" style={styles.statCard}>
            <Icon name="star" size={20} color={colors.star} />
            <AppText variant="numericLarge">{toPersianDigits(params.score)}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {strings.result.scoreLabel}
            </AppText>
          </Card>
          <Card variant="surface" padding="md" style={styles.statCard}>
            <Icon name="coin" size={20} color={colors.coin} />
            <AppText variant="numericLarge">{toPersianDigits(params.coins)}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {strings.result.coinsLabel}
            </AppText>
          </Card>
          <Card variant="surface" padding="md" style={styles.statCard}>
            <Icon name="sparkle" size={20} color={colors.accentDark} />
            <AppText variant="numericLarge">{toPersianDigits(params.maxCombo)}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {strings.result.maxComboLabel}
            </AppText>
          </Card>
        </View>

        {isDaily && params.dailyBonusCoins > 0 ? (
          <Card variant="accent" padding="md">
            <View style={styles.dailyBonus}>
              <Icon name="gift" size={18} color={colors.accentDark} />
              <AppText variant="bodyStrong" color={colors.accentDark}>
                {format(strings.daily.rewardClaimButton, { coins: params.dailyBonusCoins })}
              </AppText>
            </View>
          </Card>
        ) : null}

        {newAchievement ? (
          <Card variant="muted" padding="md">
            <View style={styles.achievementRow}>
              <Icon name={newAchievement.icon} size={20} color={colors.primary} />
              <View style={styles.achievementTexts}>
                <AppText variant="bodyStrong">{newAchievement.title}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {newAchievement.description}
                </AppText>
              </View>
              <AppText variant="caption" color={colors.textMuted}>
                {toPersianDigits(newAchievement.coinReward)} {strings.result.coinsLabel}
              </AppText>
            </View>
          </Card>
        ) : null}

        <Card variant="surface" padding="lg">
          <AppText variant="subheading">{strings.result.wordsTitle}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {format(strings.result.wordsFoundOf, { found: params.targetFound, total: params.targetTotal })}
          </AppText>
          <View style={styles.wordChips}>
            {targetWords.map(entry => (
              <View key={entry.word} style={styles.wordChip}>
                <Icon name="check" size={14} color={colors.success} />
                <AppText variant="caption">{entry.word}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {toPersianDigits(entry.score)}
                </AppText>
              </View>
            ))}
          </View>

          {bonusWords.length > 0 ? (
            <>
              <AppText variant="bodyStrong" style={styles.bonusTitle}>
                {strings.result.bonusLabel}
              </AppText>
              <View style={styles.wordChips}>
                {bonusWords.map(entry => (
                  <View key={entry.word} style={[styles.wordChip, styles.bonusChip]}>
                    <Icon name="sparkle" size={14} color={colors.accentDark} />
                    <AppText variant="caption" color={colors.accentDark}>
                      {entry.word}
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </Card>

        <View style={styles.actions}>
          {!isDaily && params.nextLevelId ? (
            <Button
              label={strings.result.nextLevelButton}
              icon="play"
              onPress={() => goToLevel(params.nextLevelId as number)}
            />
          ) : null}
          {!isDaily ? (
            <Button
              label={strings.result.retryButton}
              variant="secondary"
              icon="refresh"
              onPress={() => goToLevel(params.levelId)}
            />
          ) : null}
          <Button
            label={strings.result.shareResult}
            variant="secondary"
            icon="gift"
            onPress={handleShareResult}
          />
          <Button
            label={strings.result.homeButton}
            variant="ghost"
            icon="home"
            onPress={() => navigation.navigate('Home')}
          />
          {shareNote ? (
            <AppText variant="caption" color={colors.textMuted} align="center">
              {shareNote}
            </AppText>
          ) : null}
        </View>

        <View style={styles.heartsRow}>
          <HeartCounter hearts={hearts.hearts} maxHearts={hearts.maxHearts} nextRefillAt={hearts.nextRefillAt} />
          <AppText variant="caption" color={colors.textMuted}>
            {format(strings.achievements.subtitle, {
              unlocked: achievements.filter(item => item.unlocked).length,
              total: ACHIEVEMENTS.length,
            })}
          </AppText>
        </View>
      </ScrollView>

      <HeartRefillDialog visible={noHeartsVisible} onClose={() => setNoHeartsVisible(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  heroBadge: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroBadgeComplete: {
    backgroundColor: colors.successLight,
  },
  heroBadgePartial: {
    backgroundColor: colors.accentLight,
  },
  unlockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dailyBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  achievementTexts: {
    flex: 1,
    alignItems: 'flex-start',
  },
  wordChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bonusChip: {
    backgroundColor: colors.accentLight,
  },
  bonusTitle: {
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  heartsRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
});
