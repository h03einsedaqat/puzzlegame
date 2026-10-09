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
  nextRefillAt: number | null;
  showCountdown?: boolean;
}

/** Five compact heart segments, count, and an unobtrusive refill timer. */
export function HeartCounter({
  hearts,
  maxHearts,
  nextRefillAt,
  showCountdown = true,
}: HeartCounterProps) {
  const countdown = useCountdown(nextRefillAt);
  const label = format(strings.accessibility.heartCounter, { count: hearts, max: maxHearts });
  const segmentCount = Math.max(1, Math.min(maxHearts, 5));

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <View style={styles.segments}>
          {Array.from({ length: segmentCount }, (_, index) => (
            <Icon
              key={`heart-${index}`}
              name={index < hearts ? 'heartFilled' : 'heart'}
              size={15}
              color={index < hearts ? colors.heart : colors.textMuted}
            />
          ))}
        </View>
        <AppText variant="caption" color={colors.textSecondary} allowFontScaling={false}>
          {toPersianDigits(`${hearts}/${maxHearts}`)}
        </AppText>
      </View>
      {showCountdown && nextRefillAt !== null ? (
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {format(strings.hearts.nextHeartIn, { time: countdown.text })}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  segments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
