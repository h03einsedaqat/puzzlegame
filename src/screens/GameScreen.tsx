import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { GAME_CONFIG, strings } from '../constants';
import { computeStars } from '../services';
import { useAchievements, useDaily, useGame, useProfile, useProgress } from '../context';
import { getLevelById, getNextLevelId } from '../data/levels/levels';
import { calculateLevelRewards } from '../services/game/gameEngine';
import { colors, radius, spacing } from '../theme';
import { format, toPersianDigits } from '../utils/format';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { HintSheet } from '../components/ui/HintSheet';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { FoundWordsList } from '../components/game/FoundWordsList';
import { GameHeader } from '../components/game/GameHeader';
import { HintGuide } from '../components/game/HintGuide';
import { LetterWheel } from '../components/game/LetterWheel';
import { WordSlots } from '../components/game/WordSlots';
import type { GameFeedback } from '../context';
import type { HintType, Level, WordRejectionReason } from '../types';
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
    activeHint,
    hintOptions,
    dismissHint,
    autoSubmitReady,
  } = useGame();

  const [hintMessage, setHintMessage] = useState<{ text: string; tone: 'success' | 'error' | 'info'; id: number } | null>(null);
  const [leaveVisible, setLeaveVisible] = useState(false);
  /** هنگام کشیدن حروف true می‌شود؛ تا انگشت برداشته نشود، ثبت خودکار انجام نمی‌شود */
  const [isDraggingLetters, setIsDraggingLetters] = useState(false);
  /** ارتفاع ناحیه چرخ؛ چرخ خودش را با فضای موجود اندازه می‌کند تا هیچ‌وقت اسکرول لازم نشود */
  const [wheelArea, setWheelArea] = useState({ width: 0, height: 0 });
  const [hintSheetVisible, setHintSheetVisible] = useState(false);
  const [hintSheetMessage, setHintSheetMessage] = useState<string | null>(null);
  const completedRef = useRef(false);
  const bestScoreBeforeRef = useRef<number>(0);

  const activeLevel = level;
  const isDaily = mode === 'daily';

  /**
   * نشست این مرحله «قابل استفاده» است یا نه.
   *
   * ورود دوباره به همان مرحله پس از تکمیل یا خروج، باید همیشه بازی تازه بدهد؛
   * اگر نشستِ تمام‌شده/رهاشده دوباره استفاده شود، همه دکمه‌ها غیرفعال می‌مانند و
   * بازیکن فکر می‌کند بازی هنگ کرده است. (نشستِ «در حال بازی» و نشستِ همین
   * لحظه تمام‌شده معتبرند تا انتقال به صفحه نتیجه درست انجام شود.)
   */
  const sessionPlayable =
    session !== null &&
    activeLevel !== undefined &&
    session.levelId === activeLevel.id &&
    (session.status === 'playing' || session.status === 'completed');

  useEffect(() => {
    if (!activeLevel || completedRef.current || sessionPlayable) {
      return;
    }
    completedRef.current = false;
    bestScoreBeforeRef.current = getRecord(activeLevel.id)?.bestScore ?? 0;
    startGame(activeLevel);
  }, [activeLevel, getRecord, sessionPlayable, startGame]);

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

  /**
   * ثبت خودکار (خواسته بازیکن: «بررسی خودکار انجام شود»).
   *
   * وقتی حروفِ روی صفحه خودشان یک واژه پذیرفتنی می‌سازند، اگر بازیکن مدت کوتاهی
   * کاری نکند واژه خودش ثبت می‌شود؛ کوتاه‌بودن این مکث باعث می‌شود اگر بازیکن
   * بخواهد واژه بلندتری بسازد، فرصت داشته باشد.
   */
  useEffect(() => {
    if (!autoSubmitReady || session?.status !== 'playing' || isDraggingLetters) {
      return;
    }
    const timer = setTimeout(() => {
      submit();
    }, GAME_CONFIG.gameplay.autoSubmitPauseMs);
    return () => clearTimeout(timer);
  }, [autoSubmitReady, isDraggingLetters, session?.status, submit]);

  const handleHint = useCallback(() => {
    setHintSheetMessage(null);
    setHintSheetVisible(true);
  }, []);

  /** خرید راهنما از برگه: سکه همان‌جا کم می‌شود و نتیجه به بازیکن گفته می‌شود */
  const handleHintSelect = useCallback(
    (type: HintType) => {
      const result = requestHint(type);
      if (result.status === 'blocked') {
        if (result.reason === 'not_enough_coins') {
          setHintSheetMessage(strings.game.hintEarnCoinsTip);
          return;
        }
        setHintSheetMessage(strings.game.hintAlreadyApplied);
        return;
      }
      setHintSheetMessage(format(strings.game.hintSpent, { cost: result.cost }));
      setHintMessage({ text: strings.game.hintApplied, tone: 'success', id: Date.now() });
      // برگه بسته می‌شود تا بازیکن بی‌درنگ راهنمای گام‌به‌گام و کاشی روشن‌شده را ببیند.
      setHintSheetVisible(false);
    },
    [requestHint],
  );

  const confirmLeave = useCallback(() => {
    setLeaveVisible(false);
    abandonGame();
    navigation.goBack();
  }, [abandonGame, navigation]);

  // دکمه بازگشت اندروید همان گفت‌وگوی خروج را باز می‌کند تا پیشرفت ناخواسته از دست نرود.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // اگر برگه راهنما باز است، اول همان بسته می‌شود تا بازیکن گیر نکند.
      if (hintSheetVisible) {
        setHintSheetVisible(false);
        return true;
      }
      if (leaveVisible) {
        setLeaveVisible(false);
        return true;
      }
      setLeaveVisible(true);
      return true;
    });
    return () => subscription.remove();
  }, [hintSheetVisible, leaveVisible]);

  // تکمیل مرحله: پاداش‌ها یک‌بار ثبت و نتیجه نمایش داده می‌شود.
  useEffect(() => {
    if (!activeLevel || !session || session.status !== 'completed' || completedRef.current) {
      return;
    }
    completedRef.current = true;
    // هیچ گفت‌وگویی روی صفحه نتیجه باز نمی‌ماند.
    setLeaveVisible(false);
    setHintSheetVisible(false);

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

    const hintsUsed = session.hints.length;
    const stars = computeStars({
      targetFound: rewards.targetWordsFound,
      targetTotal: activeLevel.targetWords.length,
      bonusFound: rewards.bonusWordsFound,
      bonusTotal: activeLevel.bonusWords.length,
      hintsUsed,
    });

    const nextLevelId = getNextLevelId(activeLevel.id);
    if (!isDaily) {
      completeLevel({ levelId: activeLevel.id, score: session.score, stars });
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
      hintsUsed,
      stars,
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

  const cheapestHintCost = useMemo(() => {
    if (hintOptions.length > 0) {
      return Math.min(...hintOptions.map(option => option.cost));
    }
    // پیش از شروع نشست هم دکمه قیمت درست نشان می‌دهد (ارزان‌ترین راهنمای فعال).
    const costs = GAME_CONFIG.hints.order.map(type => GAME_CONFIG.hints.costs[type]);
    return costs.length > 0 ? Math.min(...costs) : 0;
  }, [hintOptions]);

  const hintDescriptions = useMemo<Record<HintType, string>>(
    () => ({
      reveal_letter: strings.game.hintRevealLetterDesc,
      smart_help: strings.game.hintSmartHelpDesc,
      reveal_word: strings.game.hintRevealWordDesc,
    }),
    [],
  );

  /** چند کاشی از نقشه راهنما را بازیکن تا الان زده است (برای نمایش «حرف مانده») */
  const hintMatchedCount = useMemo(() => {
    if (!activeHint) {
      return 0;
    }
    const selection = session?.selection ?? [];
    let matched = 0;
    while (matched < activeHint.tileIds.length && selection.includes(activeHint.tileIds[matched] as string)) {
      matched += 1;
    }
    return matched;
  }, [activeHint, session?.selection]);

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
  /**
   * قطر چرخ از فضای واقعی ناحیه چرخ حساب می‌شود (عرض و ارتفاع)، پس روی گوشی
   * کوچک هم همه‌چیز در یک صفحه جا می‌شود و هیچ اسکرولی لازم نیست. اسکرول صفحه
   * حذف شده است تا کشیدن حروف با اسکرول قاطی نشود — همان چیزی که باعث می‌شد
   * کشیدن کار نکند و دکمه‌ها بی‌واکنش شوند.
   */
  const letterCount = session?.tiles.length ?? 6;
  const wheelSize = Math.round(
    Math.max(
      190,
      Math.min(
        340,
        (wheelArea.width || width) - spacing.sm * 2,
        (wheelArea.height || width) - spacing.sm,
      ),
    ),
  );
  const tileSize = Math.round(
    Math.min(64, Math.max(44, wheelSize * (letterCount <= 5 ? 0.2 : letterCount <= 7 ? 0.175 : 0.15))),
  );

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

      <View style={styles.playArea}>
        {/* نوار بازخورد/آموزش: فقط وقتی هست که پیامی برای گفتن باشد */}
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
        ) : tutorialStep ? (
          <View style={styles.tutorialRow}>
            <AppText variant="caption" color={colors.primaryDark}>
              {tutorialStep}
            </AppText>
          </View>
        ) : null}

        <HintGuide hint={activeHint} matchedCount={hintMatchedCount} onDismiss={dismissHint} />

        <WordSlots
          selected={selectedTiles}
          maxLength={activeLevel.maxWordLength}
          availableWidth={slotsWidth}
          onRemove={removeTile}
        />

        <View
          style={styles.wheelArea}
          onLayout={event =>
            setWheelArea({
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height,
            })
          }
        >
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
            guideTileIds={activeHint?.tileIds}
            onDragStateChange={setIsDraggingLetters}
            accessibilityLabel={strings.game.lettersHint}
          />
        </View>

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
            label={format(strings.game.hintButtonWithCost, { cost: toPersianDigits(cheapestHintCost) })}
            variant="secondary"
            size="medium"
            icon="bulb"
            fullWidth={false}
            disabled={!session || session.status !== 'playing'}
            onPress={handleHint}
            accessibilityLabel={format(strings.accessibility.hintButton, { cost: toPersianDigits(cheapestHintCost) })}
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

        {/* فهرست واژه‌ها: خودش داخل کادر کوچک اسکرول می‌شود تا صفحه اصلی هرگز
            اسکرول نخواهد و کشیدن حروف با اسکرول صفحه قاطی نشود. */}
        <ScrollView
          style={styles.wordsSection}
          contentContainerStyle={styles.wordsContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <FoundWordsList
            targetWords={activeLevel.targetWords}
            bonusWords={activeLevel.bonusWords}
            foundWords={session?.foundWords ?? []}
            hintedWords={revealedLetters}
          />
        </ScrollView>
      </View>

      <HintSheet
        visible={hintSheetVisible}
        options={hintOptions}
        coins={profile.coins}
        descriptions={hintDescriptions}
        lastMessage={hintSheetMessage}
        onSelect={handleHintSelect}
        onClose={() => setHintSheetVisible(false)}
      />

      <ConfirmDialog
        visible={leaveVisible}
        title={strings.game.leaveTitle}
        body={strings.game.leaveBody}
        confirmLabel={strings.common.confirm}
        cancelLabel={strings.common.cancel}
        onConfirm={confirmLeave}
        onCancel={() => setLeaveVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  playArea: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  wheelArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 190,
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
  },
  controlButton: {
    flex: 1,
    maxWidth: 220,
  },
  wordsSection: {
    alignSelf: 'stretch',
    maxHeight: 132,
    flexGrow: 0,
  },
  wordsContent: {
    paddingBottom: spacing.xs,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
});
