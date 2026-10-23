import React from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { createTypography, type TypographyVariant } from '../../theme/typography';
import { palettes } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors } = useTheme();
  const typography = createTypography(colors);
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export const textColors = {
  primary: palettes.light.textPrimary,
  secondary: palettes.light.textSecondary,
  muted: palettes.light.textMuted,
  inverse: palettes.light.textInverse,
} as const;
