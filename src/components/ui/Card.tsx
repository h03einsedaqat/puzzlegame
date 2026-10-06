import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'surface' | 'muted' | 'accent' | 'outlined';
  padding?: keyof typeof spacing;
}

const variants: Record<NonNullable<CardProps['variant']>, ViewStyle> = {
  surface: { backgroundColor: colors.surface, borderColor: colors.border },
  muted: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  accent: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  outlined: { backgroundColor: 'transparent', borderColor: colors.borderStrong },
};

/** سطح پایه برای گروه‌بندی محتوا با گوشه‌های نرم و سایه سبک. */
export function Card({ children, style, variant = 'surface', padding = 'lg' }: CardProps) {
  return (
    <View style={[styles.base, variants[variant], { padding: spacing[padding] }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.soft,
  },
});
