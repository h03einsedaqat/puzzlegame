import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { strings } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, radius, spacing, STATUS_SLOT_TWO_LINE_MIN } from '../../theme';
import { toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import type { ActiveHint } from '../../context';

export interface HintGuideProps {
  hint: ActiveHint | null;
  /** تعداد کاشی‌هایی که بازیکن تا الان از نقشه راهنما زده است */
  matchedCount: number;
  onDismiss: () => void;
  /** ارتفاع ثابت جایگاه راهنما؛ از چیدمان صفحه می‌آید */
  height?: number;
}

/**
 * نوار راهنمای گام‌به‌گام.
 *
 * پس از خرید راهنما، الگوی واژه («ب•ا••»)، شمار حروف باقی‌مانده و عنوان راهنما
 * را نشان می‌دهد؛ روی خود چرخ هم کاشی بعدی روشن و چشمک‌زن می‌شود (LetterWheel).
 *
 * نوار در «جایگاه ثابت» بالای صفحه می‌نشیند و ارتفاعش را از بیرون می‌گیرد، پس
 * آمدن و رفتنش چرخ حروف را جابه‌جا نمی‌کند. اگر جایگاه آن‌قدر بلند نباشد که دو
 * خط جا شود، عنوان حذف می‌شود تا هیچ متنی بریده نشود. انیمیشن ضربان هم با
 * تنظیم «کاهش انیمیشن» خاموش می‌شود، بی‌آنکه کارکرد راهنما عوض شود.
 */
export function HintGuide({ hint, matchedCount, onDismiss, height }: HintGuideProps) {
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion || !hint) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hint, pulse, reducedMotion]);

  if (!hint) {
    return null;
  }

  const total = hint.tileIds.length;
  const remaining = Math.max(0, total - matchedCount);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const showTitle = height === undefined || height >= STATUS_SLOT_TWO_LINE_MIN;

  return (
    <Animated.View
      style={[styles.container, height !== undefined ? { height } : null, { transform: [{ scale }] }]}
    >
      <View style={styles.iconBadge}>
        <Icon name="bulb" size={18} color={colors.primaryDark} />
      </View>

      <View style={styles.texts}>
        {showTitle ? (
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {strings.game.hintGuideTitle}
          </AppText>
        ) : null}
        <View style={styles.patternRow}>
          <AppText variant="bodyStrong" color={colors.primaryDark} numberOfLines={1} allowFontScaling={false}>
            {hint.pattern}
          </AppText>
          <AppText
            variant="caption"
            color={colors.textMuted}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={styles.meta}
          >
            {strings.game.hintGuideMeta
              .replace('{length}', toPersianDigits(hint.word.length))
              .replace('{left}', toPersianDigits(remaining))}
          </AppText>
        </View>
      </View>

      <IconButton
        icon="close"
        size={16}
        onPress={onDismiss}
        accessibilityLabel={strings.game.hintGuideDismiss}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentLight,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
});
