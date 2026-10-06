import React from 'react';
import { StyleSheet, View } from 'react-native';

import { strings } from '../../constants';
import { useCountdown } from '../../hooks/useCountdown';
import { colors, spacing } from '../../theme';
import { format, toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';

export interface HeartCounterProps {
  hearts: number;
  maxHearts: number;
  /** زمان پر شدن قلب بعدی؛ اگر قلب‌ها پر باشند null است */
  nextRefillAt: number | null;
  /** نمایش متن شمارش معکوس زیر قلب‌ها */
  showCountdown?: boolean;
}

/**
 * نمایشگر قلب‌ها با شمارش معکوس.
 *
 * بازی قلب را به مانع تبدیل نمی‌کند: تعداد قلب‌ها، سقف آن‌ها و زمان دقیق
 * پر شدن قلب بعدی همیشه دیده می‌شود تا کاربر بداند چه انتظاری داشته باشد.
 */
export function HeartCounter({ hearts, maxHearts, nextRefillAt, showCountdown = true }: HeartCounterProps) {
  const countdown = useCountdown(nextRefillAt);

  const label = format(strings.accessibility.heartCounter, { count: hearts, max: maxHearts });

  return (
    <View
      style={styles.container}
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Icon name="heartFilled" size={18} color={colors.heart} />
        <AppText variant="numeric">{toPersianDigits(`${hearts}/${maxHearts}`)}</AppText>
      </View>
      {showCountdown && nextRefillAt !== null ? (
        <AppText variant="caption" color={colors.textMuted}>
          {format(strings.hearts.nextHeartIn, { time: countdown.text })}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
