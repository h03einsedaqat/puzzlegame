import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  /** دکمه‌های سمت دیگر سرصفحه */
  action?: React.ReactNode;
}

/**
 * سرصفحه سفارشی صفحه‌ها.
 *
 * چیدمان راست‌به‌راست است: دکمه بازگشت در سمت راست و عنوان پس از آن قرار
 * می‌گیرد. از ویژگی‌های منطقی (row در محیط RTL) استفاده می‌شود تا در محیط
 * چپ‌به‌راست هم چیدمان درست بماند.
 */
export function ScreenHeader({ title, subtitle, onBack, backLabel, action }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {onBack ? <IconButton icon="back" onPress={onBack} accessibilityLabel={backLabel ?? 'بازگشت'} /> : null}
      <View style={styles.titles}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  titles: {
    flex: 1,
    alignItems: 'flex-start',
  },
});
