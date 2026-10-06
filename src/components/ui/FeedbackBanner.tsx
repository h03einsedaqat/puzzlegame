import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface FeedbackBannerProps {
  message: string;
  tone: 'success' | 'error' | 'info';
  /** کلید تغییر پیام؛ با تغییر آن انیمیشن دوباره اجرا می‌شود */
  messageId?: number;
  detail?: string;
}

const tonePalette = {
  success: { background: colors.successLight, border: colors.success, text: colors.success, icon: 'check' },
  error: { background: colors.dangerLight, border: colors.danger, text: colors.danger, icon: 'close' },
  info: { background: colors.primaryLight, border: colors.primary, text: colors.primaryDark, icon: 'info' },
} as const;

/**
 * نوار بازخورد کوتاه.
 *
 * پیام‌ها با محو شدن نرم وارد می‌شوند تا تغییر وضعیت ناگهانی نباشد. متن پیام
 * از بیرون تعیین می‌شود تا این جزء هیچ منطق بازی نداشته باشد.
 */
export function FeedbackBanner({ message, tone, messageId, detail }: FeedbackBannerProps) {
  const palette = tonePalette[tone];
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }).start();
  }, [message, messageId, progress, reducedMotion]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: progress,
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        },
      ]}
    >
      <Icon name={palette.icon} size={18} color={palette.text} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" color={palette.text} numberOfLines={2}>
          {message}
        </AppText>
        {detail ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  texts: {
    flex: 1,
    alignItems: 'flex-start',
  },
});
