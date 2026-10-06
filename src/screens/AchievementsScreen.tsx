import React, { useEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { strings } from '../constants';
import { useAchievements } from '../context';
import { colors, radius, spacing } from '../theme';
import { format, toPersianDigits } from '../utils/format';
import { formatJalaliDate } from '../utils/jalali';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import type { AchievementView } from '../context';
import type { RootScreenProps } from '../navigation/types';

/**
 * دستاوردها.
 *
 * فهرست دستاوردها با پیشرفت هرکدام نمایش داده می‌شود. نشان «جدید» تا نخستین
 * بازدید از این صفحه می‌ماند و پس از آن پاک می‌شود.
 */
export function AchievementsScreen({ navigation }: RootScreenProps<'Achievements'>) {
  const { achievements, unlockedCount, totalCount, markSeen } = useAchievements();

  useEffect(() => {
    const timer = setTimeout(() => markSeen(), 1200);
    return () => clearTimeout(timer);
  }, [markSeen]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={strings.achievements.title}
        subtitle={format(strings.achievements.subtitle, { unlocked: unlockedCount, total: totalCount })}
        onBack={() => navigation.goBack()}
        backLabel={strings.common.back}
      />

      <FlatList
        data={achievements}
        keyExtractor={item => item.definition.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <AchievementRow item={item} />}
      />
    </ScreenContainer>
  );
}

function AchievementRow({ item }: { item: AchievementView }) {
  return (
    <Card variant={item.unlocked ? 'surface' : 'muted'} padding="md" style={styles.row}>
      <View style={[styles.badge, item.unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
        <Icon
          name={item.unlocked ? item.definition.icon : 'lock'}
          size={22}
          color={item.unlocked ? colors.onPrimary : colors.textMuted}
        />
      </View>

      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong">{item.definition.title}</AppText>
          {item.isNew ? (
            <View style={styles.newBadge}>
              <AppText variant="caption" color={colors.onPrimary}>
                {strings.achievements.newBadge}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" color={colors.textSecondary}>
          {item.definition.description}
        </AppText>

        <ProgressBar
          ratio={item.ratio}
          height={8}
          color={item.unlocked ? colors.success : colors.primary}
          accessibilityLabel={format(strings.achievements.progress, { current: item.current, target: item.target })}
        />
        <View style={styles.metaRow}>
          <AppText variant="caption" color={colors.textMuted}>
            {format(strings.achievements.progress, { current: item.current, target: item.target })}
          </AppText>
          {item.unlockedAt ? (
            <AppText variant="caption" color={colors.textMuted}>
              {strings.achievements.unlockedAt} · {formatJalaliDate(new Date(item.unlockedAt))}
            </AppText>
          ) : (
            <AppText variant="caption" color={colors.coin}>
              {toPersianDigits(item.definition.coinReward)} {strings.result.coinsLabel}
            </AppText>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeUnlocked: {
    backgroundColor: colors.primary,
  },
  badgeLocked: {
    backgroundColor: colors.surfaceMuted,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  newBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
