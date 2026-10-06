import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { GAME_CONFIG, strings } from '../constants';
import { LEVELS } from '../data/levels/levels';
import { useProfile, useProgress, useServices } from '../context';
import { colors, radius, spacing } from '../theme';
import { format } from '../utils/format';
import { AppText } from '../components/ui/AppText';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { HeartCounter } from '../components/game/HeartCounter';
import { LevelNode, type LevelNodeState } from '../components/game/LevelNode';
import type { LevelSummary } from '../types';
import type { RootScreenProps } from '../navigation/types';

/**
 * نقشه مرحله‌ها.
 *
 * مرحله‌ها در جهان‌های ده‌تایی گروه‌بندی شده‌اند و هر گره وضعیت روشنی دارد.
 * لمس مرحله قفل، پیام راهنما نشان می‌دهد؛ لمس مرحله باز، در صورت وجود قلب،
 * بازی را شروع می‌کند.
 */
export function LevelMapScreen({ navigation }: RootScreenProps<'LevelMap'>) {
  const { progress, isLevelUnlocked, isLevelCompleted, getRecord, enterLevel, buildSummaries } = useProgress();
  const { hearts, startAttempt } = useProfile();
  const { analytics } = useServices();
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);

  const summaries = useMemo(() => buildSummaries(LEVELS), [buildSummaries]);

  const startLevel = useCallback(
    (levelId: number) => {
      if (!isLevelUnlocked(levelId)) {
        setMessage({ text: strings.levelMap.lockedMessage, id: Date.now() });
        return;
      }
      if (!startAttempt(levelId)) {
        setNoHeartsVisible(true);
        return;
      }
      enterLevel(levelId);
      analytics.track('level_start', { levelId, source: 'level_map' });
      navigation.navigate('Game', { levelId, mode: 'level' });
    },
    [analytics, enterLevel, isLevelUnlocked, navigation, startAttempt],
  );

  const worlds = useMemo(() => {
    const size = GAME_CONFIG.progression.levelsPerWorld;
    const grouped: LevelSummary[][] = [];
    for (let index = 0; index < summaries.length; index += size) {
      grouped.push(summaries.slice(index, index + size));
    }
    return grouped;
  }, [summaries]);

  const renderNode = useCallback(
    (summary: LevelSummary): React.ReactElement => {
      const completed = isLevelCompleted(summary.id);
      const unlocked = isLevelUnlocked(summary.id);
      const state: LevelNodeState = completed
        ? 'completed'
        : summary.id === progress.currentLevel && unlocked
          ? 'current'
          : unlocked
            ? 'unlocked'
            : 'locked';

      const accessibilityLabel = completed
        ? format(strings.accessibility.completedLevel, { number: summary.id })
        : state === 'current'
          ? format(strings.accessibility.currentLevel, { number: summary.id })
          : unlocked
            ? format(strings.common.levelNumber, { number: summary.id })
            : format(strings.accessibility.lockedLevel, { number: summary.id });

      return (
        <LevelNode
          summary={summary}
          state={state}
          onPress={startLevel}
          bestScore={getRecord(summary.id)?.bestScore}
          accessibilityLabel={accessibilityLabel}
        />
      );
    },
    [getRecord, isLevelCompleted, isLevelUnlocked, progress.currentLevel, startLevel],
  );

  return (
    <ScreenContainer>
      <ScreenHeader
        title={strings.levelMap.title}
        subtitle={format(strings.home.progressOfLevels, {
          completed: progress.records.length,
          total: LEVELS.length,
        })}
        onBack={() => navigation.goBack()}
        backLabel={strings.common.back}
        action={
          <HeartCounter
            hearts={hearts.hearts}
            maxHearts={hearts.maxHearts}
            nextRefillAt={hearts.nextRefillAt}
          />
        }
      />

      {message ? (
        <View style={styles.bannerWrapper}>
          <FeedbackBanner message={message.text} tone="info" messageId={message.id} />
        </View>
      ) : null}

      <FlatList
        data={worlds}
        keyExtractor={(_, index) => `world-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: world, index: worldIndex }) => (
          <View style={styles.world}>
            <View style={styles.worldHeader}>
              <AppText variant="bodyStrong">
                {format(strings.levelMap.worldLabel, {
                  from: worldIndex * GAME_CONFIG.progression.levelsPerWorld + 1,
                  to: worldIndex * GAME_CONFIG.progression.levelsPerWorld + world.length,
                })}
              </AppText>
            </View>
            <View style={styles.nodes}>
              {world.map((summary, nodeIndex) => (
                <View key={summary.id} style={styles.nodeRow}>
                  {nodeIndex > 0 ? <View style={styles.connector} /> : null}
                  {renderNode(summary)}
                </View>
              ))}
            </View>
          </View>
        )}
      />

      <ConfirmDialog
        visible={noHeartsVisible}
        title={strings.hearts.noHeartsTitle}
        body={strings.hearts.noHeartsBody}
        confirmLabel={strings.common.gotIt}
        cancelLabel={strings.common.close}
        onConfirm={() => setNoHeartsVisible(false)}
        onCancel={() => setNoHeartsVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bannerWrapper: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  world: {
    gap: spacing.sm,
  },
  worldHeader: {
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  nodes: {
    gap: 0,
  },
  nodeRow: {
    alignItems: 'center',
  },
  connector: {
    width: 2,
    height: spacing.lg,
    backgroundColor: colors.border,
  },
});
