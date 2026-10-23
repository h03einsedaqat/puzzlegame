import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, shadows, spacing } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'surface' | 'muted' | 'accent' | 'outlined';
  padding?: keyof typeof spacing;
  /** برچسب دسترس‌پذیری؛ کارت‌های آماری با یک جمله معنادار خوانده می‌شوند */
  accessibilityLabel?: string;
}

/** سطح پایه برای گروه‌بندی محتوا با گوشه‌های نرم و سایه سبک. */
export function Card({
  children,
  style,
  variant = 'surface',
  padding = 'lg',
  accessibilityLabel,
}: CardProps) {
  const { colors } = useTheme();
  const variantStyle: ViewStyle =
    variant === 'surface'
      ? { backgroundColor: colors.surface, borderColor: colors.border }
      : variant === 'muted'
      ? { backgroundColor: colors.surfaceMuted, borderColor: colors.border }
      : variant === 'accent'
      ? { backgroundColor: colors.accentLight, borderColor: colors.accent }
      : { backgroundColor: 'transparent', borderColor: colors.borderStrong };
  return (
    <View
      style={[styles.base, variantStyle, { padding: spacing[padding] }, style]}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.soft,
  },
});
