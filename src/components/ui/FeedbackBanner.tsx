import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, radius, spacing, STATUS_SLOT_TWO_LINE_MIN } from '../../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface FeedbackBannerProps {
  message: string;
  tone: 'success' | 'error' | 'info';
  /** کلید تغییر پیام؛ با تغییر آن انیمیشن دوباره اجرا می‌شود */
  messageId?: number;
  detail?: string;
  /** ارتفاع ثابت جایگاه بازخورد؛ از چیدمان صفحه می‌آید */
  height?: number;
}

const tonePalette = {
  success: { background: colors.successLight, border: colors.success, text: colors.success, icon: 'success' },
  error: { background: colors.dangerLight, border: colors.danger, text: colors.danger, icon: 'info' },
  info: { background: colors.primaryLight, border: colors.primary, text: colors.primary, icon: 'info' },
} as const;

/**
 * نوار بازخورد کوتاه.
 *
 * پیام‌ها با محو شدن نرم وارد می‌شوند تا تغییر وضعیت ناگهانی نباشد. متن پیام
 * از بیرون تعیین می‌شود تا این جزء هیچ منطق بازی نداشته باشد.
 *
 * ارتفاعش را از بیرون می‌گیرد؛ چون در جایگاه ثابتی می‌نشیند، ظاهر شدن بازخورد
 * هیچ‌وقت چرخ حروف را جابه‌جا نمی‌کند. اگر جایگاه دو خط جا نداشته باشد، توضیح
 * به‌جای خط دوم در همان خط پیام می‌آید تا هیچ متنی بریده نشود.
 */
export function FeedbackBanner({ message, tone, messageId, detail, height }: FeedbackBannerProps) {
  const palette = tonePalette[tone];
  const roomForTwoLines = height === undefined || height >= STATUS_SLOT_TWO_LINE_MIN;
  const firstLine = detail && !roomForTwoLines ? `${message} · ${detail}` : message;
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
        height !== undefined ? { height } : null,
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
        <AppText variant="bodyStrong" color={palette.text} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {firstLine}
        </AppText>
        {detail && roomForTwoLines ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1} maxFontSizeMultiplier={1.2}>
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
});
