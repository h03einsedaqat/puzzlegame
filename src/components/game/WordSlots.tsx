import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, radius, spacing, typography } from '../../theme';
import { AppText } from '../ui/AppText';
import { PressableScale } from '../ui/PressableScale';
import type { LetterTileData } from '../../types';

export type WordBoardFeedbackState = 'idle' | 'confirmed' | 'error';

export interface WordSlotsProps {
  selected: readonly LetterTileData[];
  maxLength: number;
  availableWidth: number;
  onRemove: (tileId: string) => void;
  revealedLetters?: readonly string[];
  size?: number;
  feedbackState?: WordBoardFeedbackState;
  feedbackId?: number;
  readOnly?: boolean;
}

const MIN_SLOTS = 3;
const MAX_SLOTS = 9;
const GAP = spacing.sm;
const MIN_SLOT_SIZE = 30;
const MAX_SLOT_SIZE = 50;

/** Word-construction board with explicit empty, filled, confirmed and error states. */
export const WordSlots = React.memo(function WordSlots({
  selected,
  maxLength,
  availableWidth,
  onRemove,
  revealedLetters = [],
  size,
  feedbackState = 'idle',
  feedbackId,
  readOnly = false,
}: WordSlotsProps) {
  const reducedMotion = useReducedMotion();
  const slotCount = Math.max(
    MIN_SLOTS,
    Math.min(MAX_SLOTS, Math.max(maxLength, MIN_SLOTS), Math.max(selected.length, MIN_SLOTS)),
  );
  const slotSize = useMemo(() => {
    const usable = Math.max(0, availableWidth - GAP * (slotCount - 1));
    const byWidth = Math.max(MIN_SLOT_SIZE, Math.floor(usable / slotCount));
    return Math.max(MIN_SLOT_SIZE, Math.min(MAX_SLOT_SIZE, size ?? MAX_SLOT_SIZE, byWidth));
  }, [availableWidth, size, slotCount]);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  useEffect(() => {
    if (feedbackState !== 'error' || reducedMotion) {
      shakeX.value = 0;
      return;
    }
    shakeX.value = withSequence(
      withTiming(-2.5, { duration: 38 }),
      withTiming(2.5, { duration: 38 }),
      withTiming(-1.5, { duration: 34 }),
      withTiming(0, { duration: 38 }),
    );
  }, [feedbackId, feedbackState, reducedMotion, shakeX]);

  return (
    <Animated.View style={[styles.container, { gap: GAP }, shakeStyle]}>
      {Array.from({ length: slotCount }, (_, index) => {
        const tile = selected[index];
        const isNext = !tile && index === selected.length;
        const revealed = revealedLetters[index];
        return (
          <WordSlot
            key={tile?.id ?? `empty-${index}`}
            tile={tile}
            size={slotSize}
            isNext={isNext}
            revealed={revealed}
            feedbackState={feedbackState}
            readOnly={readOnly}
            reducedMotion={reducedMotion}
            onRemove={onRemove}
          />
        );
      })}
    </Animated.View>
  );
});

const WordSlot = React.memo(function WordSlot({
  tile,
  size,
  isNext,
  revealed,
  feedbackState,
  readOnly,
  reducedMotion,
  onRemove,
}: {
  tile?: LetterTileData;
  size: number;
  isNext: boolean;
  revealed?: string;
  feedbackState: WordBoardFeedbackState;
  readOnly: boolean;
  reducedMotion: boolean;
  onRemove: (tileId: string) => void;
}) {
  const filled = tile !== undefined;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (reducedMotion || !filled || readOnly || feedbackState !== 'idle') {
      scale.value = 1;
      return;
    }
    scale.value = withSequence(
      withTiming(1.08, { duration: 82 }),
      withSpring(1, { damping: 15, stiffness: 250, mass: 0.7 }),
    );
  }, [feedbackState, filled, readOnly, reducedMotion, scale, tile?.id]);

  const stateStyle =
    feedbackState === 'confirmed'
      ? styles.confirmed
      : feedbackState === 'error'
        ? styles.error
        : filled
          ? styles.filled
          : null;
  const textColor = feedbackState === 'error'
    ? colors.danger
    : feedbackState === 'confirmed'
      ? colors.success
      : colors.slotText;
  const slotRadius = Math.round(size * 0.3);

  const content = (
    <Animated.View
      style={[
        styles.slot,
        stateStyle,
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: slotRadius,
          borderStyle: filled || feedbackState !== 'idle' ? 'solid' : 'dashed',
          borderColor: isNext && feedbackState === 'idle' ? colors.slotActiveBorder : undefined,
        },
      ]}
    >
      {tile ? (
        <AppText
          style={[
            typography.wordSlot,
            {
              fontSize: Math.round(size * 0.52),
              lineHeight: Math.round(size * 0.72),
              color: textColor,
            },
          ]}
          allowFontScaling={false}
        >
          {tile.char}
        </AppText>
      ) : revealed ? (
        <AppText
          style={[
            typography.wordSlot,
            {
              fontSize: Math.round(size * 0.46),
              lineHeight: Math.round(size * 0.65),
              color: colors.textMuted,
            },
          ]}
          allowFontScaling={false}
        >
          {revealed}
        </AppText>
      ) : isNext && feedbackState === 'idle' ? (
        <View style={styles.activeMark} />
      ) : null}
    </Animated.View>
  );

  if (!tile || readOnly) {
    return content;
  }
  return (
    <PressableScale
      onPress={() => onRemove(tile.id)}
      accessibilityRole="button"
      accessibilityLabel={`برداشتن حرف ${tile.char}`}
      style={{ width: size, height: size }}
    >
      {content}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slotBorder,
    backgroundColor: colors.slotBackground,
  },
  filled: {
    backgroundColor: colors.slotFilledBackground,
    borderColor: colors.primaryDark,
  },
  confirmed: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  error: {
    backgroundColor: colors.errorLight,
    borderColor: colors.danger,
  },
  activeMark: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
