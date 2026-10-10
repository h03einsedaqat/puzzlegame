import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAME_CONFIG, strings } from '../constants';
import { computeStars } from '../services';
import { useAchievements, useDaily, useGame, useProfile, useProgress } from '../context';
import { getLevelById, getNextLevelId } from '../data/levels/levels';
import { calculateLevelRewards } from '../services/game/gameEngine';
import { colors, computeGameLayout, motion, radius, spacing } from '../theme';
import { format, toPersianDigits } from '../utils/format';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { IconButton } from '../components/ui/IconButton';
import { Icon } from '../components/ui/Icon';
import { HintSheet } from '../components/ui/HintSheet';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { FoundWordsList } from '../components/game/FoundWordsList';
import { GameFeedbackToast } from '../components/game/GameFeedbackToast';
import { GameHeader } from '../components/game/GameHeader';
import { HintGuide } from '../components/game/HintGuide';
import { LetterWheel } from '../components/game/LetterWheel';
import { WordSlots } from '../components/game/WordSlots';
import type { GameFeedback } from '../context';
import type { HintType, Level, WordRejectionReason } from '../types';
import type { LetterTileData } from '../types';
import type { ResultParams, ResultWordSummary, RootScreenProps } from '../navigation/types';

const EMPTY_TILES: readonly LetterTileData[] = [];
const EMPTY_SELECTION: readonly string[] = [];

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

function feedbackTitle(feedback: GameFeedback, level: Level): string {
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

function feedbackDetail(feedback: GameFeedback): string | undefined {
  if (feedback.status !== 'accepted') {
    return undefined;
  }
  return `${toPersianDigits(feedback.score ?? 0)} ${strings.result.scoreLabel} · ${toPersianDigits(feedback.coins ?? 0)} ${strings.result.coinsLabel}`;
}

/**
 * صفحه بازی.
 *
 * منطق بازی در سرویس موتور و وضعیت در GameProvider است؛ این صفحه فقط چیدمان و
 * واکنش به رویدادها را انجام می‌دهد.
 *
 * چیدمان این صفحه «تطبیقی» است: ارتفاع واقعی صفحه (پس از کسر ناحیه امن) به
 * `computeGameLayout` داده می‌شود و اندازه سرصفحه، جایگاه بازخورد، جای خالی
 * واژه، چرخ، دکمه‌ها و فهرست واژه‌ها از همان محاسبه می‌آید. پس نه دکمه‌ای بیرون
 * صفحه می‌ماند، نه چیزی روی هم می‌افتد و نه چرخ برای جا شدن، کوچک‌تر از حد لمس
 * می‌شود. جایگاه بازخورد همیشه رزرو است؛ بنابراین پیام درست/غلط یا راهنما
 * هیچ‌وقت چرخ را جابه‌جا نمی‌کند.
 */
export function GameScreen({ navigation, route }: RootScreenProps<'Game'>) {
  const { levelId, mode } = route.params;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
    replaceSelection,
    submit,
    requestHint,
    dismissFeedback,
    activeHint,
    hintOptions,
    dismissHint,
    autoSubmitReady,
  } = useGame();

  const [leaveVisible, setLeaveVisible] = useState(false);
  /** هنگام کشیدن حروف true می‌شود؛ تا انگشت برداشته نشود، ثبت خودکار انجام نمی‌شود */
  const [isDraggingLetters, setIsDraggingLetters] = useState(false);
  const [hintSheetVisible, setHintSheetVisible] = useState(false);
  const [hintSheetMessage, setHintSheetMessage] = useState<string | null>(null);
  const completedRef = useRef(false);
  const bestScoreBeforeRef = useRef<number>(0);

  const activeLevel = level;
  const isDaily = mode === 'daily';

  const layout = useMemo(
    () => computeGameLayout({ width, height, insets: { top: insets.top, bottom: insets.bottom } }),
    [height, insets.bottom, insets.top, width],
  );

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
    const timer = setTimeout(() => dismissFeedback(), motion.feedbackVisible);
    return () => clearTimeout(timer);
  }, [activeLevel, dismissFeedback, feedback]);

  // When drag starts, any previous feedback should disappear immediately
  // so the user sees only the live selection path, not a stale toast.
  useEffect(() => {
    if (isDraggingLetters && feedback) {
      dismissFeedback();
    }
  }, [isDraggingLetters, feedback, dismissFeedback]);

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  /**
   * برداشتن انگشت پس از یک کشیدن واقعی.
   *
   * ثبت از همین‌جا انجام می‌شود و چون ثبت، انتخاب را پاک می‌کند، اثر «ثبت خودکار»
   * دیگر شرط فعال‌شدن ندارد و هیچ واژه‌ای دو بار پردازش نمی‌شود. واژه کوتاه‌تر از
   * حد مرحله هم بی‌سروصدا رها می‌شود (نه پیام خطا، نه بازنشانی کمبو).
   */
  const handleRelease = useCallback((releasedSelection: readonly string[]) => {
    submit({ fromRelease: true, selection: releasedSelection });
  }, [submit]);

  /**
   * ثبت خودکار (خواسته بازیکن: «بررسی خودکار انجام شود»).
   *
   * وقتی حروفِ روی صفحه خودشان یک واژه پذیرفتنی می‌سازند، اگر بازیکن مدت کوتاهی
   * کاری نکند واژه خودش ثبت می‌شود؛ کوتاه‌بودن این مکث باعث می‌شود اگر بازیکن
   * بخواهد واژه بلندتری بسازد، فرصت داشته باشد. در طول کشیدن، این تایمر معلق
   * می‌شود تا وسط کشیدن واژه ثبت نشود.
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
      // برگه بسته می‌شود و راهنمای گام‌به‌گام همان لحظه در جایگاه رزروشده
      // ظاهر می‌شود؛ پس نه چرخ جابه‌جا می‌شود و نه پیام میانی لازم است.
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
    const selection = session?.selection ?? EMPTY_SELECTION;
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

  const tiles = session?.tiles ?? EMPTY_TILES;
  const selection = session?.selection ?? EMPTY_SELECTION;
  const slotSize = layout.slotSize;
  const feedbackTiles: readonly LetterTileData[] = feedback
    ? Array.from(feedback.word).map((char, index) => ({ id: `feedback-${feedback.id}-${index}`, char }))
    : EMPTY_TILES;
  const showFeedbackOnBoard = selection.length === 0 && feedback !== null;
  const boardTiles = selection.length > 0 ? selectedTiles : feedbackTiles;
  const boardFeedbackState = !showFeedbackOnBoard
    ? 'idle'
    : feedback?.status === 'accepted'
      ? 'confirmed'
      : 'error';
  const toastTone = feedback?.status === 'rejected'
    ? 'error'
    : feedback?.kind === 'bonus'
      ? 'bonus'
      : 'success';

  /** جایگاه ثابت فقط برای راهنمای فعال/آموزش است؛ toast بازخورد روی لایه‌ای جدا می‌آید. */
  const statusMessage = activeHint ? (
    <HintGuide
      hint={activeHint}
      matchedCount={hintMatchedCount}
      onDismiss={dismissHint}
      height={layout.statusSlotHeight - 2}
    />
  ) : tutorialStep ? (
    <View style={[styles.tutorialRow, { height: layout.statusSlotHeight - 2 }]}>
      <AppText variant="caption" color={colors.textPrimary} numberOfLines={2} maxFontSizeMultiplier={1.2}>
        {tutorialStep}
      </AppText>
    </View>
  ) : null;

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
        height={layout.headerHeight}
        compact={layout.compact}
      />

      <View
        style={[
          styles.playArea,
          {
            gap: layout.gap,
            paddingHorizontal: layout.paddingHorizontal,
            paddingBottom: layout.paddingBottom,
          },
        ]}
      >
        {/* جایگاه ثابت راهنما؛ بازخورد کوتاه به‌صورت overlay می‌آید و layout را جابه‌جا نمی‌کند. */}
        <View style={{ height: layout.statusSlotHeight }}>{statusMessage}</View>
        <View
          pointerEvents="box-none"
          style={[styles.feedbackOverlay, { top: Math.max(0, layout.statusSlotHeight - layout.gap) }]}
        >
          <GameFeedbackToast
            visible={feedback !== null}
            id={feedback?.id ?? 0}
            tone={toastTone}
            title={feedback ? feedbackTitle(feedback, activeLevel) : ''}
            detail={feedback ? feedbackDetail(feedback) : undefined}
            word={feedback?.word}
          />
        </View>

        <WordSlots
          selected={boardTiles}
          maxLength={activeLevel.maxWordLength}
          availableWidth={layout.contentWidth}
          size={slotSize}
          onRemove={removeTile}
          feedbackState={boardFeedbackState}
          feedbackId={feedback?.id}
          readOnly={boardFeedbackState !== 'idle' || isDraggingLetters}
        />

        <View style={styles.wheelArea}>
          <LetterWheel
            tiles={tiles}
            selectedIds={selection}
            onTilePress={selectTile}
            onSelectionChange={replaceSelection}
            onRelease={handleRelease}
            disabled={session?.status !== 'playing'}
            diameter={layout.wheelDiameter}
            foundCount={progress.foundTargets}
            totalCount={progress.totalTargets}
            guideTileIds={activeHint?.tileIds}
            onDragStateChange={setIsDraggingLetters}
            accessibilityLabel={strings.game.lettersHint}
          />
        </View>

        <View style={[styles.controls, { height: layout.controlsHeight }]}>
          <Button
            label={strings.game.submitButton}
            variant="primary"
            size={layout.compact ? 'small' : 'medium'}
            icon="check"
            fullWidth={false}
            disabled={selection.length === 0}
            onPress={handleSubmit}
            accessibilityLabel={strings.accessibility.submitButton}
            style={styles.submitButton}
          />
          <View style={styles.hintControl}>
            <IconButton
              icon="bulb"
              onPress={handleHint}
              accessibilityLabel={format(strings.accessibility.hintButton, { cost: toPersianDigits(cheapestHintCost) })}
              disabled={!session || session.status !== 'playing'}
              background={colors.surfaceElevated}
              style={styles.iconControl}
            />
            <View pointerEvents="none" style={styles.hintCost}>
              <Icon name="coin" size={10} color={colors.accent} />
              <AppText variant="caption" color={colors.accent} allowFontScaling={false}>
                {toPersianDigits(cheapestHintCost)}
              </AppText>
            </View>
          </View>
          <IconButton
            icon="close"
            onPress={clearWord}
            accessibilityLabel={strings.accessibility.clearButton}
            disabled={selection.length === 0}
            background={colors.surfaceElevated}
            style={styles.iconControl}
          />
        </View>

        {/* فهرست واژه‌ها: ارتفاعش سقف دارد و خودش داخل همان کادر اسکرول می‌شود؛
            پس صفحه اصلی هرگز اسکرول نمی‌خواهد و کشیدن حروف با اسکرول قاطی نمی‌شود. */}
        <ScrollView
          style={[styles.wordsSection, { maxHeight: layout.foundWordsMaxHeight }]}
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
    alignItems: 'center',
  },
  wheelArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  tutorialRow: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  feedbackOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  submitButton: {
    flex: 1,
    minWidth: 0,
    maxWidth: 260,
  },
  hintControl: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  iconControl: {
    width: 48,
    height: 48,
  },
  hintCost: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    minWidth: 28,
    height: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  wordsSection: {
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 1,
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
