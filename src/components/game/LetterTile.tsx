import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useServices } from '../../context';
import { colors, radius, shadows, typography } from '../../theme';
import { AppText } from '../ui/AppText';
import { PressableScale } from '../ui/PressableScale';

export interface LetterTileProps {
  char: string;
  size: number;
  selected?: boolean;
  /** حرفی که با راهنما آشکار شده است */
  hinted?: boolean;
  disabled?: boolean;
  onPress: (tileId: string) => void;
  tileId: string;
  /** برچسب دسترس‌پذیری؛ از بیرون ساخته می‌شود تا متن‌ها متمرکز بمانند */
  accessibilityLabel: string;
}

/**
 * کاشی حرف.
 *
 * حروف تکراری هرکدام کاشی مستقل دارند و انتخاب هر کاشی مستقل از دیگری است؛
 * بنابراین رنگ کاشی انتخاب‌شده تغییر می‌کند و حرف همچنان روی صفحه می‌ماند.
 * اندازه فونت و کاشی با هم مقیاس می‌شوند تا در صفحه‌های کوچک هم خوانا بماند.
 */
export function LetterTile({
  char,
  size,
  selected = false,
  hinted = false,
  disabled = false,
  onPress,
  tileId,
  accessibilityLabel,
}: LetterTileProps) {
  const { sound, vibration } = useServices();

  const handlePress = useCallback(() => {
    if (disabled) {
      return;
    }
    sound.play('letter_select');
    vibration.trigger('letter_select');
    onPress(tileId);
  }, [disabled, onPress, sound, tileId, vibration]);

  const background = selected
    ? colors.tileSelectedBackground
    : hinted
      ? colors.tileHintBackground
      : colors.tileBackground;

  const textColor = selected ? colors.tileSelectedText : colors.tileText;

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
    >
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            backgroundColor: background,
            borderColor: selected || hinted ? undefined : colors.tileBorder,
            borderWidth: selected || hinted ? 0 : 1.5,
          },
        ]}
      >
        <AppText
          style={[
            typography.letter,
            { fontSize: Math.round(size * 0.44), lineHeight: Math.round(size * 0.6), color: textColor },
          ]}
          allowFontScaling={false}
        >
          {char}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.tile,
  },
});
