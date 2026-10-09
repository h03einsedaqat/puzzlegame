import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, radius, shadows, typography } from '../../theme';
import { AppText } from '../ui/AppText';
import { PressableScale } from '../ui/PressableScale';

export interface LetterTileProps {
  char: string;
  size: number;
  selected?: boolean;
  hinted?: boolean;
  disabled?: boolean;
  onPress: (tileId: string) => void;
  tileId: string;
  accessibilityLabel: string;
}

/** Letter tile with independent visual state and a large, non-overlapping hit area. */
export const LetterTile = React.memo(function LetterTile({
  char,
  size,
  selected = false,
  hinted = false,
  disabled = false,
  onPress,
  tileId,
  accessibilityLabel,
}: LetterTileProps) {
  const reducedMotion = useReducedMotion();
  const selectionScale = useSharedValue(selected ? 1.055 : 1);

  useEffect(() => {
    const target = selected ? 1.055 : 1;
    if (reducedMotion) {
      selectionScale.value = target;
      return;
    }
    selectionScale.value = withSpring(target, { damping: 15, stiffness: 250, mass: 0.72 });
  }, [reducedMotion, selected, selectionScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selectionScale.value }],
    opacity: disabled ? 0.42 : 1,
  }));

  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress(tileId);
    }
  }, [disabled, onPress, tileId]);

  const background = selected
    ? colors.tileSelectedBackground
    : hinted
      ? colors.tileHintBackground
      : colors.tileDeep;
  const border = selected
    ? colors.tileSelectedBorder
    : hinted
      ? colors.tileHintBorder
      : colors.tileDeepBorder;
  const textColor = selected ? colors.tileSelectedText : hinted ? colors.accent : colors.tileText;
  const edge = Math.max(3, Math.round(size * 0.075));

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      style={[styles.pressable, { width: size, height: size }]}
    >
      <Animated.View
        style={[
          styles.tile,
          animatedStyle,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.32),
            borderColor: border,
            borderBottomWidth: edge,
            backgroundColor: background,
          },
          selected ? styles.selectedDepth : null,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.topSheen,
            {
              borderTopLeftRadius: Math.round(size * 0.32),
              borderTopRightRadius: Math.round(size * 0.32),
              height: Math.max(8, Math.round(size * 0.32)),
            },
          ]}
        />
        {hinted && !selected ? <View pointerEvents="none" style={styles.hintDot} /> : null}
        <AppText
          style={[
            typography.letter,
            {
              fontSize: Math.round(size * 0.48),
              lineHeight: Math.round(size * 0.7),
              color: textColor,
              textShadowColor: 'rgba(0, 0, 0, 0.28)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 2,
            },
          ]}
          allowFontScaling={false}
        >
          {char}
        </AppText>
      </Animated.View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderBottomWidth: 4,
    overflow: 'hidden',
    ...shadows.tile,
  },
  selectedDepth: {
    shadowColor: colors.brandTeal,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  topSheen: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
  },
  hintDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
