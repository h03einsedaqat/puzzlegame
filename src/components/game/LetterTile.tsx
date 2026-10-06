import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useServices } from '../../context';
import { colors, radius, typography } from '../../theme';
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
 * ظاهر «آب‌نباتی»: کاشی قهوه‌ایِ گرم با لبه پایینیِ تیره‌تر (حس سه‌بعدی)، برقِ
 * ملایم در بالای کاشی و حرفِ طلاییِ درشت. با انتخاب‌شدن، کاشی فیروزه‌ای می‌شود و
 * کمی بزرگ‌تر می‌نشیند تا معلوم باشد چه حرفی در حال استفاده است.
 *
 * حروف تکراری هرکدام کاشی مستقل دارند، پس انتخاب هر کاشی مستقل از دیگری است.
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
      : colors.tileDeep;
  const edge = selected ? colors.tileSelectedBorder : hinted ? colors.tileHintBorder : colors.tileDeepShadow;
  const textColor = selected ? colors.tileSelectedText : colors.tileText;

  const edgeWidth = Math.max(3, Math.round(size * 0.09));

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
            borderColor: edge,
            borderBottomWidth: edgeWidth,
            borderRadius: Math.round(size * 0.3),
            transform: [{ scale: selected ? 1.08 : 1 }],
          },
        ]}
      >
        {/* برقِ بالای کاشی */}
        <View
          pointerEvents="none"
          style={[
            styles.gloss,
            {
              borderTopLeftRadius: Math.round(size * 0.3),
              borderTopRightRadius: Math.round(size * 0.3),
              height: Math.round(size * 0.42),
            },
          ]}
        />
        <AppText
          style={[
            typography.letter,
            {
              fontSize: Math.round(size * 0.5),
              lineHeight: Math.round(size * 0.68),
              color: textColor,
              textShadowColor: selected ? 'rgba(0, 0, 0, 0.28)' : 'rgba(78, 44, 18, 0.55)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 1,
            },
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  gloss: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
});
