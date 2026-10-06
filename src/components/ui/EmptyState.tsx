import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Button } from './Button';
import type { IconName } from '../../types';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** حالت خالی با آیکون، توضیح و در صورت نیاز یک اقدام پیشنهادی. */
export function EmptyState({ icon, title, body, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrapper}>
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="caption" color={colors.textMuted} align="center">
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="medium" fullWidth={false} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  action: {
    marginTop: spacing.sm,
    minWidth: 180,
  },
});
