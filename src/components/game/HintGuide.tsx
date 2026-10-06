import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { strings } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, radius, spacing } from '../../theme';
import { toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import type { ActiveHint } from '../../context';

export interface HintGuideProps {
  hint: ActiveHint | null;
  /** تعداد کاشی‌هایی که بازیکن تا الان از نقشه راهنما زده است */
  matchedCount: number;
  /** ترتیب کاشی‌ها برای نمایش شماره‌دار */
  onDismiss: () => void;
}

/**
 * نوار راهنمای گام‌به‌گام.
 *
 * پس از خرید راهنما، الگوی واژه («ب•ا••»)، شمار حروف و ترتیب کاشی‌ها را نشان
 * می‌دهد؛ روی خود چرخ هم کاشی بعدی روشن و چشمک‌زن می‌شود (LetterWheel). با این
 * کار راهنما فقط «یک حرف آشکار» نیست، بلکه بازیکن را تا ساختن واژه همراهی می‌کند.
 */
export function HintGuide({ hint, matchedCount, onDismiss }: HintGuideProps) {
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
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <View style={styles.iconBadge}>
        <Icon name="bulb" size={20} color={colors.primaryDark} />
      </View>

      <View style={styles.texts}>
        <AppText variant="caption" color={colors.textSecondary}>
          {strings.game.hintGuideTitle}
        </AppText>
        <View style={styles.patternRow}>
          <AppText variant="bodyStrong" color={colors.primaryDark} allowFontScaling={false}>
            {hint.pattern}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {strings.game.hintGuideMeta.replace('{length}', toPersianDigits(hint.word.length)).replace('{left}', toPersianDigits(remaining))}
          </AppText>
        </View>
      </View>

      <IconButton
        icon="close"
        size={18}
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'stretch',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 1,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
