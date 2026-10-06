import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { GAME_CONFIG, hintCost, strings } from '../constants';
import { useAchievements, useDaily, useGame, useProfile, useProgress } from '../context';
import { getLevelById, getNextLevelId } from '../data/levels/levels';
import { calculateLevelRewards } from '../services/game/gameEngine';
import { colors, radius, spacing } from '../theme';
import { format, toPersianDigits } from '../utils/format';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { FoundWordsList } from '../components/game/FoundWordsList';
import { GameHeader } from '../components/game/GameHeader';
import { LetterWheel } from '../components/game/LetterWheel';
import { WordSlots } from '../components/game/WordSlots';
import type { GameFeedback } from '../context';
import type { Level, WordRejectionReason } from '../types';
import type { ResultParams, ResultWordSummary, RootScreenProps } from '../navigation/types';

function rejectionMessage(reason: WordRejectionReason, level: Level): string {
  switch (reason) {
    case 'too_short':
      return format(strings.game.tooShort, { length: level.minWordLength });
    case 'too_long':
      return strings.game.tooLong;
    case 'invalid_characters':
      return strings.game.invalidCharacters;
    case 'letters_unavailable':
      return strings.game.lettersUnavailable;
    case 'not_in_dictionary':
      return strings.game.notInDictionary;
    case 'already_found':
      return strings.game.alreadyFound;
    case 'empty':
      return strings.game.emptyWord;
    default:
      return strings.game.wrong;
  }
}

function feedbackText(feedback: GameFeedback, level: Level): string {
  if (feedback.status === 'rejected') {
    return feedback.reason ? rejectionMessage(feedback.reason, level) : strings.game.wrong;
  }
  if (feedback.kind === 'bonus') {
    return strings.game.bonusFound;
  }
  return (feedback.combo ?? 1) >= 2
    ? format(strings.game.combo, { value: feedback.combo ?? 1 })
    : strings.game.correct;
}

/**
 * صفحه بازی.
 *
 * منطق بازی در سرویس موتور و وضعیت در GameProvider است؛ این صفحه فقط چیدمان و
 * واکنش به رویدادها را انجام می‌دهد. مرحله آموزشی (مرحله ۱) راهنمای گام‌به‌گام
 * نشان می‌دهد و بقیه مرحله‌ها آزادند.
 */
export function GameScreen({ navigation, route }: RootScreenProps<'Game'>) {
  const { levelId, mode } = route.params;
  const { width } = useWindowDimensions();
  const { puzzle, completeChallenge } = useDaily();
  const { profile, hearts, recordLevelCompletion } = useProfile();
  const { completeLevel, getRecord } = useProgress();
  const { sync: syncAchievements } = useAchievements();

  const level = useMemo<Level | undefined>(
    () => (mode === 'daily' ? puzzle : getLevelById(levelId)),
    [levelId, mode, puzzle],
  );

  const {
    session,
    selectedTiles,
    word,
    feedback,
    progress,
    revealedLetters,
    startGame,
    abandonGame,
    leaveGame,
    selectTile,
    removeTile,
    clearWord,
    submit,
    requestHint,
    dismissFeedback,
    canUseHint,
    nextHintCost,
  } = useGame();

  const [hintMessage, setHintMessage] = useState<{ text: string; tone: 'success' | 'error' | 'info'; id: number } | null>(null);
  const [leaveVisible, setLeaveVisible] = useState(false);
  const [noCoinsVisible, setNoCoinsVisible] = useState(false);
  const completedRef = useRef(false);
  const bestScoreBeforeRef = useRef<number>(0);

  const activeLevel = level;
  const isDaily = mode === 'daily';

  // اگر نشست فعلی متعلق به این مرحله نباشد (ورود تازه یا تکرار مرحله)، تازه ساخته می‌شود.
  useEffect(() => {
    if (!activeLevel) {
      return;
    }
    if (session?.levelId !== activeLevel.id) {
      completedRef.current = false;
      bestScoreBeforeRef.current = getRecord(activeLevel.id)?.bestScore ?? 0;
      startGame(activeLevel);
    }
  }, [activeLevel, getRecord, session?.levelId, startGame]);

  useEffect(() => {
    if (!activeLevel || !feedback) {
      return;
    }
    const timer = setTimeout(() => dismissFeedback(), 2200);
    return () => clearTimeout(timer);
  }, [activeLevel, dismissFeedback, feedback]);

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  const handleHint = useCallback(() => {
    const result = requestHint('reveal_letter');
    if (result.status === 'blocked') {
      if (result.reason === 'not_enough_coins') {
        setNoCoinsVisible(true);
        return;
      }
      setHintMessage({ text: strings.game.hintAlreadyApplied, tone: 'info', id: Date.now() });
      return;
    }
    setHintMessage({ text: strings.game.hintApplied, tone: 'success', id: Date.now() });
  }, [requestHint]);

  const confirmLeave = useCallback(() => {
    setLeaveVisible(false);
    abandonGame();
    navigation.goBack();
  }, [abandonGame, navigation]);

  // دکمه بازگشت اندروید همان گفت‌وگوی خروج را باز می‌کند تا پیشرفت ناخواسته از دست نرود.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaveVisible(true);
      return true;
    });
    return () => subscription.remove();
  }, []);

  // تکمیل مرحله: پاداش‌ها یک‌بار ثبت و نتیجه نمایش داده می‌شود.
  useEffect(() => {
    if (!activeLevel || !session || session.status !== 'completed' || completedRef.current) {
      return;
    }
    completedRef.current = true;

    const rewards = calculateLevelRewards(session, activeLevel);
    const dailyBonusCoins = isDaily ? GAME_CONFIG.daily.challengeCoinReward : 0;
    const dailyBonusScore = isDaily ? GAME_CONFIG.daily.challengeScoreReward : 0;
    const words: ResultWordSummary[] = session.foundWords.map(entry => ({
      word: entry.word,
      kind: entry.kind,
      score: entry.score,
      coins: entry.coins,
    }));

    recordLevelCompletion({
      score: rewards.score + dailyBonusScore,
      coins: rewards.coins + dailyBonusCoins,
      wordsFound: session.foundWords.length,
      bonusWords: rewards.bonusWordsFound,
      maxCombo: session.maxCombo,
      hintsUsed: session.hints.length,
    });

    const nextLevelId = getNextLevelId(activeLevel.id);
    if (!isDaily) {
      completeLevel({ levelId: activeLevel.id, score: session.score });
    } else {
      completeChallenge();
    }
    syncAchievements();

    const params: ResultParams = {
      levelId: activeLevel.id,
      levelTitle: activeLevel.title,
      difficulty: activeLevel.difficulty,
      mode,
      score: rewards.score + dailyBonusScore,
      coins: rewards.coins + dailyBonusCoins,
      maxCombo: session.maxCombo,
      targetFound: rewards.targetWordsFound,
      targetTotal: activeLevel.targetWords.length,
      bonusFound: rewards.bonusWordsFound,
      bonusTotal: activeLevel.bonusWords.length,
      words,
      isNewBestScore: session.score > bestScoreBeforeRef.current,
      unlockedLevelId: nextLevelId,
      nextLevelId,
      dailyBonusCoins,
      dailyBonusScore,
    };

    leaveGame();
    navigation.replace('Result', params);
  }, [
    activeLevel,
    completeChallenge,
    completeLevel,
    isDaily,
    leaveGame,
    mode,
    navigation,
    recordLevelCompletion,
    session,
    syncAchievements,
  ]);

  const tutorialStep = useMemo(() => {
    if (!activeLevel?.metadata.isTutorial) {
      return null;
    }
    if (session && session.foundWords.length >= Math.min(2, activeLevel.targetWords.length)) {
      return strings.game.tutorialStepNext;
    }
    if (word.length >= activeLevel.minWordLength) {
      return strings.game.tutorialStepSubmit;
    }
    return strings.game.tutorialStepLetters;
  }, [activeLevel, session, word.length]);

  if (!activeLevel) {
    return (
      <ScreenContainer>
        <View style={styles.missing}>
          <AppText variant="heading" align="center">
            {strings.errors.genericTitle}
          </AppText>
          <Button label={strings.common.home} onPress={() => navigation.navigate('Home')} />
        </View>
      </ScreenContainer>
    );
  }

  const slotsWidth = Math.min(width - spacing.lg * 2, 420);
  // چرخ حروف: روی صفحه‌های کوچک کمی جمع‌وجورتر و روی صفحه‌های بزرگ‌تر تا ۳۳۰ پیکسل.
  const wheelSize = Math.min(Math.max(width - spacing.xl * 2, 240), 330);
  // با حروف کمتر جای بیشتری برای هر کاشی هست؛ با ۹ حرف هم از چرخ بیرون نمی‌زند.
  const letterCount = session?.tiles.length ?? 6;
  const tileSize = Math.round(Math.min(66, Math.max(46, wheelSize * (letterCount <= 5 ? 0.2 : letterCount <= 7 ? 0.18 : 0.155))));

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <GameHeader
        title={isDaily ? strings.daily.title : format(strings.common.levelNumber, { number: activeLevel.id })}
        difficulty={activeLevel.difficulty}
        score={session?.score ?? 0}
        coins={profile.coins}
        foundTargets={progress.foundTargets}
        totalTargets={progress.totalTargets}
        hearts={hearts.hearts}
        maxHearts={hearts.maxHearts}
        nextRefillAt={hearts.nextRefillAt}
        onBack={() => setLeaveVisible(true)}
        backLabel={strings.common.back}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerArea}>
          {feedback ? (
            <FeedbackBanner
              message={feedbackText(feedback, activeLevel)}
              tone={feedback.status === 'accepted' ? 'success' : 'error'}
              messageId={feedback.id}
              detail={
                feedback.status === 'accepted'
                  ? `${toPersianDigits(feedback.score ?? 0)} ${strings.result.scoreLabel}`
                  : undefined
              }
            />
          ) : hintMessage ? (
            <FeedbackBanner
              message={hintMessage.text}
              tone={hintMessage.tone}
              messageId={hintMessage.id}
            />
          ) : null}
        </View>

        {tutorialStep ? (
          <View style={styles.tutorialRow}>
            <AppText variant="caption" color={colors.primaryDark}>
              {tutorialStep}
            </AppText>
          </View>
        ) : null}

        <WordSlots
          selected={selectedTiles}
          maxLength={activeLevel.maxWordLength}
          availableWidth={slotsWidth}
          onRemove={removeTile}
        />

        <LetterWheel
          tiles={session?.tiles ?? []}
          selectedIds={session?.selection ?? []}
          onTilePress={selectTile}
          onTileRemove={removeTile}
          onAutoSubmit={submit}
          disabled={session?.status !== 'playing'}
          diameter={wheelSize}
          tileSize={tileSize}
          foundCount={progress.foundTargets}
          totalCount={progress.totalTargets}
          accessibilityLabel={strings.game.lettersHint}
        />

        <View style={styles.controls}>
          <Button
            label={strings.game.clearButton}
            variant="secondary"
            size="medium"
            icon="close"
            fullWidth={false}
            disabled={!session || session.selection.length === 0}
            onPress={clearWord}
            style={styles.controlButton}
          />
          <Button
            label={strings.game.hintButton}
            variant="secondary"
            size="medium"
            icon="bulb"
            fullWidth={false}
            disabled={!canUseHint}
            onPress={handleHint}
            accessibilityLabel={format(strings.accessibility.hintButton, { cost: hintCost('reveal_letter') })}
            style={styles.controlButton}
          />
          <Button
            label={strings.game.submitButton}
            variant="primary"
            size="medium"
            icon="check"
            fullWidth={false}
            disabled={!session || session.selection.length === 0}
            onPress={handleSubmit}
            accessibilityLabel={strings.accessibility.submitButton}
            style={styles.controlButton}
          />
        </View>

        <View style={styles.wordsSection}>
          <FoundWordsList
            targetWords={activeLevel.targetWords}
            bonusWords={activeLevel.bonusWords}
            foundWords={session?.foundWords ?? []}
            hintedWords={revealedLetters}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={leaveVisible}
        title={strings.game.leaveTitle}
        body={strings.game.leaveBody}
        confirmLabel={strings.common.confirm}
        cancelLabel={strings.common.cancel}
        onConfirm={confirmLeave}
        onCancel={() => setLeaveVisible(false)}
      />

      <ConfirmDialog
        visible={noCoinsVisible}
        title={strings.game.noCoinsForHint}
        body={format(strings.game.useHintBody, { cost: nextHintCost })}
        confirmLabel={strings.common.gotIt}
        cancelLabel={strings.common.later}
        onConfirm={() => setNoCoinsVisible(false)}
        onCancel={() => setNoCoinsVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  bannerArea: {
    alignSelf: 'stretch',
    minHeight: 0,
  },
  tutorialRow: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    alignSelf: 'stretch',
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  controlButton: {
    minWidth: 104,
  },
  wordsSection: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
});
