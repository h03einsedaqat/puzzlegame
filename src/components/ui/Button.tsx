import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useServices } from '../../context';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '../../theme';
import { Icon } from './Icon';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import type { IconName } from '../../types';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success';
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

const variantStyles: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: colors.primary, border: colors.primary, text: colors.onPrimary },
  secondary: { background: colors.surface, border: colors.borderStrong, text: colors.primary },
  ghost: { background: 'transparent', border: 'transparent', text: colors.textSecondary },
  success: { background: colors.success, border: colors.success, text: colors.onPrimary },
};

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; icon: number }> = {
  large: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, icon: 22 },
  medium: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, icon: 20 },
  small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, icon: 18 },
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

  const handlePress = useCallback(() => {
    if (isInactive) {
      return;
    }
    sound.play('button_press');
    vibration.trigger('button');
    onPress();
  }, [isInactive, onPress, sound, vibration]);

  const iconNode = icon ? (
    <Icon
      name={icon}
      size={metrics.icon}
      color={isInactive ? colors.textMuted : palette.text}
    />
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
            paddingVertical: metrics.paddingVertical,
            paddingHorizontal: metrics.paddingHorizontal,
            minHeight: Math.max(MIN_TOUCH_TARGET, metrics.paddingVertical * 2 + 24),
          },
          isInactive ? styles.inactive : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.text} size="small" />
        ) : (
          <View style={styles.content}>
            {iconPosition === 'start' ? iconNode : null}
            <AppText
              variant="button"
              color={isInactive ? colors.textMuted : palette.text}
              style={styles.label}
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
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
