import React, { useCallback } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useServices } from '../../context';
import { colors, MIN_TOUCH_TARGET, radius } from '../../theme';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import type { IconName } from '../../types';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  background?: string;
  border?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** دکمه آیکونی با ناحیه لمس استاندارد؛ همه دکمه‌های آیکونی از همین جزء می‌آیند. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 22,
  color = colors.textPrimary,
  background = colors.surface,
  border = true,
  disabled = false,
  style,
}: IconButtonProps) {
  const { sound, vibration } = useServices();

  const handlePress = useCallback(() => {
    if (disabled) {
      return;
    }
    sound.play('button_press');
    vibration.trigger('button');
    onPress();
  }, [disabled, onPress, sound, vibration]);

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={style}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: background,
            borderColor: border ? colors.border : 'transparent',
            borderWidth: border ? 1 : 0,
          },
          disabled ? styles.disabled : null,
        ]}
      >
        <Icon name={icon} size={size} color={disabled ? colors.textMuted : color} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
