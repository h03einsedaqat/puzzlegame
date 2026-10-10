import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radius, shadows, spacing } from '../../theme';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';

type FeedbackTone = 'success' | 'error' | 'bonus';

export interface GameFeedbackToastProps {
  visible: boolean;
  id: number;
  tone: FeedbackTone;
  title: string;
  detail?: string;
  word?: string;
}

const palette = {
  success: { background: '#142824', border: '#2D8F78', accent: colors.success, icon: 'success' as const },
  bonus: { background: '#2A251A', border: '#8A7139', accent: colors.accent, icon: 'sparkle' as const },
  // Use close (X) for error to make rejection visually distinct and match user's expectation of clear failure.
  error: { background: '#2B1A27', border: '#8A3A55', accent: colors.danger, icon: 'close' as const },
};

/** Compact overlay feedback; it never participates in the game layout. */
export function GameFeedbackToast({ visible, id, tone, title, detail, word }: GameFeedbackToastProps) {
  const [mounted, setMounted] = useState(visible);
  const [display, setDisplay] = useState(() => ({ tone, title, detail, word }));
  const progress = useSharedValue(visible ? 1 : 0);
  const colorsForTone = palette[display.tone];
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 8 },
      { scale: 0.97 + progress.value * 0.03 },
    ],
  }));

  /**
   * همگام‌سازی متن.
   *
   * پیش‌تر `setDisplay` در هر اجرای اثر با یک آبجکت تازه صدا زده می‌شد؛ چون
   * `Object.is` روی آبجکت تازه همیشه نادرست است، ری‌اکت یک رندر اضافه روی
   * هر بازخورد تحمیل می‌کرد (و چون `mounted` هم در وابستگی‌ها بود، همان اثر
   * دوباره اجرا می‌شد). حالا فقط وقتی محتوا واقعاً عوض شده باشد state تغییر
   * می‌کند.
   */
  useEffect(() => {
    if (!visible) {
      return;
    }
    setDisplay(previous =>
      previous.tone === tone && previous.title === title && previous.detail === detail && previous.word === word
        ? previous
        : { tone, title, detail, word },
    );
  }, [detail, title, tone, visible, word]);

  /** انیمیشن ورود/خروج؛ فقط با تغییر شناسهٔ بازخورد یا پنهان‌شدن اجرا می‌شود. */
  useEffect(() => {
    cancelAnimation(progress);
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: motion.feedbackEnter });
      return;
    }
    progress.value = withTiming(0, { duration: motion.feedbackExit }, finished => {
      'worklet';
      if (finished) {
        runOnJS(setMounted)(false);
      }
    });
  }, [id, progress, visible]);

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        animatedStyle,
        { backgroundColor: colorsForTone.background, borderColor: colorsForTone.border },
      ]}
    >
      <View style={[styles.iconWell, { backgroundColor: `${colorsForTone.accent}20` }]}>
        <Icon name={colorsForTone.icon} size={19} color={colorsForTone.accent} />
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong" color={colors.textPrimary} numberOfLines={2}>
          {display.title}
        </AppText>
        <View style={styles.meta}>
          {display.word ? (
            <AppText variant="caption" color={colorsForTone.accent} numberOfLines={1}>
              «{display.word}»
            </AppText>
          ) : null}
          {display.word && display.detail ? <View style={styles.separator} /> : null}
          {display.detail ? (
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {display.detail}</AppText>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    maxWidth: 460,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    ...shadows.raised,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  meta: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  separator: {
    width: 3,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
  },
});
