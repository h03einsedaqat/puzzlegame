import React from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type TypographyVariant } from '../../theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}

/**
 * تنها راه نمایش متن در برنامه.
 *
 * همه متن‌ها از یک مقیاس تایپوگرافی می‌آیند تا سلسله‌مراتب بصری یکدست بماند و
 * اندازه فونت‌ها به‌صورت پراکنده در صفحه‌ها تعیین نشود.
 */
export function AppText({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[typography[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    >
      {children}
    </Text>
  );
}

export const textColors = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  inverse: colors.textInverse,
} as const;
