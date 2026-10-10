import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, typography } from '../../theme';
import { AppText } from '../ui/AppText';

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

/**
 * Letter tile — pure visual, no RN Pressable.
 * All touch handling is done by the parent wheel gesture surface (single
 * source of truth). This avoids the Android conflict between RN's responder
 * system (Pressable) and RNGH's Pan gesture, which was a root cause of
 * missed letters and perceived hang.
 * Accessibility is preserved via accessibilityActions.
 */
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
  const handleAccessibilityAction = useCallback(() => {
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

  /**
   * یک نمای کمتر برای هر کاشی.
   *
   * پیش‌تر کاشی داخل یک `View` هم‌اندازهٔ خودش پیچیده شده بود که هیچ کاری
   * جز مرکزکردن همان نمای هم‌اندازه انجام نمی‌داد. روی اندروید هر `View` یک
   * نمای بومی و یک RenderNode است؛ با ۹ کاشی، حذف این لایهٔ تکراری ۹ نمای بومی
   * از درخت صفحهٔ بازی کم می‌کند و هزینهٔ ساخت صفحه (همان لحظه‌ای که بازیکن
   * دکمهٔ شروع را می‌زند) را پایین می‌آورد.
   */
  return (
    <View
      testID={`wheel-tile-${tileId}`}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      accessibilityActions={[{ name: 'activate', label: accessibilityLabel }]}
      onAccessibilityAction={handleAccessibilityAction}
      // Important: no touch handling here — parent wheel gesture owns touches.
      pointerEvents="none"
      style={[
        styles.tile,
        selected ? styles.selectedScale : null,
        disabled ? styles.disabled : null,
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
    </View>
  );
});

const styles = StyleSheet.create({
  tile: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderBottomWidth: 4,
    overflow: 'hidden',
    ...shadows.tile,
  },
  selectedScale: {
    transform: [{ scale: 1.055 }],
  },
  disabled: {
    opacity: 0.42,
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
