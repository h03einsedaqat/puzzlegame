import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useServices } from '../../context';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '../../theme';
import { Icon } from './Icon';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import type { IconName } from '../../types';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'sunny';
export type ButtonSize = 'large' | 'medium' | 'small';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** آیکون در کنار متن؛ در چیدمان راست‌به‌چپ ترتیب به‌صورت خودکار درست می‌شود */
  iconPosition?: 'start' | 'end';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** برچسب دسترس‌پذیری؛ اگر داده نشود، متن دکمه استفاده می‌شود */
  accessibilityLabel?: string;
}

/**
 * ظاهر دکمه‌ها «آب‌نباتی» است: لبه پایین تیره‌تر (حس سه‌بعدی)، برقِ ملایم در
 * بالای دکمه و متن ضخیم با سایه کوتاه. با فشردن، دکمه کمی پایین می‌رود؛ همین
 * حرکت ساده باعث می‌شود لمس‌کردن دکمه‌ها حسِ بازی بدهد، نه فرم.
 */
const variantStyles: Record<
  ButtonVariant,
  { background: string; edge: string; border: string; text: string; textShadow: string }
> = {
  primary: {
    background: colors.primary,
    edge: colors.primaryDark,
    border: colors.primaryDark,
    text: colors.onPrimary,
    textShadow: 'rgba(0, 0, 0, 0.25)',
  },
  sunny: {
    background: colors.accent,
    edge: colors.accentDark,
    border: colors.accentDark,
    text: '#5A3A00',
    textShadow: 'rgba(255, 255, 255, 0.35)',
  },
  success: {
    background: colors.success,
    edge: '#1E9556',
    border: '#1E9556',
    text: colors.onPrimary,
    textShadow: 'rgba(0, 0, 0, 0.22)',
  },
  secondary: {
    background: colors.surface,
    edge: colors.borderStrong,
    border: colors.borderStrong,
    text: colors.primaryDark,
    textShadow: 'rgba(255, 255, 255, 0)',
  },
  ghost: {
    background: 'transparent',
    edge: 'transparent',
    border: 'transparent',
    text: colors.textSecondary,
    textShadow: 'rgba(0, 0, 0, 0)',
  },
};

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; icon: number; edge: number }> = {
  large: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, icon: 24, edge: 6 },
  medium: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, icon: 20, edge: 5 },
  small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, icon: 18, edge: 4 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  icon,
  iconPosition = 'start',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { sound, vibration } = useServices();
  const palette = variantStyles[variant];
  const metrics = sizeStyles[size];
  const isInactive = disabled || loading;
  const isFlat = variant === 'ghost';

  const handlePress = useCallback(() => {
    if (isInactive) {
      return;
    }
    sound.play('button_press');
    vibration.trigger('button');
    onPress();
  }, [isInactive, onPress, sound, vibration]);

  const iconNode = icon ? (
    <Icon name={icon} size={metrics.icon} color={isInactive ? colors.textMuted : palette.text} />
  ) : null;

  return (
    <PressableScale
      onPress={handlePress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[fullWidth ? styles.fullWidth : null, style]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
            borderBottomColor: palette.edge,
            borderBottomWidth: isFlat ? 0 : metrics.edge,
            paddingVertical: metrics.paddingVertical,
            paddingHorizontal: metrics.paddingHorizontal,
            minHeight: Math.max(MIN_TOUCH_TARGET, metrics.paddingVertical * 2 + 26),
          },
          isInactive ? styles.inactive : null,
        ]}
      >
        {isFlat || isInactive ? null : (
          <View pointerEvents="none" style={[styles.gloss, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]} />
        )}
        {loading ? (
          <ActivityIndicator color={palette.text} size="small" />
        ) : (
          <View style={styles.content}>
            {iconPosition === 'start' ? iconNode : null}
            <AppText
              variant="button"
              color={isInactive ? colors.textMuted : palette.text}
              style={[styles.label, isFlat ? null : { textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1.5 }]}
              numberOfLines={1}
            >
              {label}
            </AppText>
            {iconPosition === 'end' ? iconNode : null}
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  container: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    textAlign: 'center',
  },
  inactive: {
    opacity: 0.55,
  },
});
