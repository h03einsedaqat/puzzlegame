import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { Icon } from './Icon';
import { AppText } from './AppText';
import { AnimatedCounter } from './AnimatedCounter';
import type { IconName } from '../../types';

export interface StatChipProps {
  icon: IconName;
  value: string;
  /** متن کوچک کنار مقدار؛ مثل زمان پر شدن قلب بعدی */
  hint?: string;
  iconColor?: string;
  background?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** نمایشگر فشرده یک شاخص بازی (سکه، قلب، امتیاز) در سرصفحه‌ها. */
export function StatChip({
  icon,
  value,
  hint,
  iconColor = colors.coin,
  background = colors.surface,
  label,
  style,
}: StatChipProps) {
  return (
    <View style={[styles.container, { backgroundColor: background }, style]} accessibilityLabel={label}>
      <Icon name={icon} size={18} color={iconColor} />
      <View style={styles.values}>
        <AnimatedCounter value={value} textStyle={styles.value} />
        {hint ? (
          <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
            {hint}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  values: {
    alignItems: 'flex-start',
  },
  value: {
    lineHeight: 22,
  },
  hint: {
    lineHeight: 14,
  },
});
