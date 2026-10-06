import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useServices } from '../../context';
import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import type { IconName } from '../../types';

export interface ToggleRowProps {
  icon: IconName;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** توضیح کوچکی که زیر عنوان نمایش داده می‌شود (مثل «در نسخه‌های بعدی») */
  note?: string;
}

/** ردیف تنظیمات با کلید روشن/خاموش. */
export function ToggleRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  note,
}: ToggleRowProps) {
  const { sound, vibration } = useServices();

  const handlePress = useCallback(() => {
    if (disabled) {
      return;
    }
    sound.play('button_press');
    vibration.trigger('button');
    onValueChange(!value);
  }, [disabled, onValueChange, sound, value, vibration]);

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={title}
      style={styles.pressable}
    >
      <View style={[styles.container, disabled ? styles.disabled : null]}>
        <View style={styles.iconWrapper}>
          <Icon name={icon} size={20} color={disabled ? colors.textMuted : colors.primary} />
        </View>
        <View style={styles.texts}>
          <AppText variant="bodyStrong">{title}</AppText>
          {description ? (
            <AppText variant="caption" color={colors.textMuted}>
              {description}
            </AppText>
          ) : null}
          {note ? (
            <AppText variant="caption" color={colors.warning}>
              {note}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.switchTrack, value ? styles.switchTrackOn : null]}>
          <View style={[styles.switchThumb, value ? styles.switchThumbOn : null]} />
        </View>
      </View>
    </PressableScale>
  );
}

const THUMB_SIZE = 22;

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  texts: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackOn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  switchThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignSelf: 'flex-start',
  },
  switchThumbOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    alignSelf: 'flex-end',
  },
});
