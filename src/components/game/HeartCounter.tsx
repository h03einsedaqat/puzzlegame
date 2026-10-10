import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { strings } from '../../constants';
import { useCountdown } from '../../hooks/useCountdown';
import { colors, spacing } from '../../theme';
import { format, toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { HEART_PATH_D } from '../ui/Icon';

export interface HeartCounterProps {
  hearts: number;
  maxHearts: number;
  nextRefillAt: number | null;
  showCountdown?: boolean;
}

const HEART_SIZE = 15;
/** فاصلهٔ بین قلب‌ها در دستگاه ۲۴ واحدیِ آیکون (معادل ۱ پیکسل چیدمان قبلی). */
const HEART_STEP = 24 + 1.6;
const HEART_STROKE = Math.max(1.4, HEART_SIZE / 14);

/**
 * ردیف قلب‌ها در **یک** نمای react-native-svg.
 *
 * پیش‌تر هر قلب یک `Icon` و در نتیجه یک ریشهٔ SVG جدا بود. روی اندروید هر ریشهٔ
 * SVG بوم و Picture مستقل خودش را دارد؛ در سرصفحهٔ بازی پنج قلب یعنی پنج نمای
 * برداری اضافه که هم ساخت صفحه را کند می‌کرد و هم با هر تیکِ ثانیه‌شمار دوباره
 * ساخته می‌شد. حالا یک نما با چند مسیر است و با `memo` فقط وقتی قلب‌ها واقعاً
 * عوض شوند دوباره رسم می‌شود.
 */
const HeartSegments = React.memo(function HeartSegments({
  hearts,
  maxHearts,
}: {
  hearts: number;
  maxHearts: number;
}) {
  const segmentCount = Math.max(1, Math.min(maxHearts, 5));
  // همهٔ اندازه‌ها داخل SVG در دستگاه ۲۴ واحدی آیکون‌اند؛ خودِ viewBox آن‌ها را
  // به اندازهٔ ۱۵ پیکسلی روی صفحه مقیاس می‌کند، پس در `G` مقیاس دوباره لازم نیست.
  const viewBoxWidth = (segmentCount - 1) * HEART_STEP + 24;
  const width = (viewBoxWidth * HEART_SIZE) / 24;

  return (
    <Svg width={width} height={HEART_SIZE} viewBox={`0 0 ${viewBoxWidth} 24`}>
      {Array.from({ length: segmentCount }, (_, index) => {
        const filled = index < hearts;
        return (
          <G key={`heart-${index}`} transform={`translate(${index * HEART_STEP} 0)`}>
            <Path
              d={HEART_PATH_D}
              fill={filled ? colors.heart : 'none'}
              stroke={filled ? colors.heart : colors.textMuted}
              strokeWidth={filled ? 0 : HEART_STROKE}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        );
      })}
    </Svg>
  );
});

/**
 * شمارش معکوس پرشدن قلب بعدی.
 *
 * تایمر یک‌ثانیه‌ای عمداً در همین برگ کوچک نگه داشته شده است تا تیکِ هر ثانیه
 * فقط یک `Text` را دوباره رندر کند، نه کل شمارندهٔ قلب، نه سرصفحهٔ بازی و نه
 * چرخ حروف را.
 */
const RefillCountdown = React.memo(function RefillCountdown({
  nextRefillAt,
}: {
  nextRefillAt: number;
}) {
  const countdown = useCountdown(nextRefillAt);
  return (
    <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
      {format(strings.hearts.nextHeartIn, { time: countdown.text })}
    </AppText>
  );
});

/** Five compact heart segments, count, and an unobtrusive refill timer. */
export const HeartCounter = React.memo(function HeartCounter({
  hearts,
  maxHearts,
  nextRefillAt,
  showCountdown = true,
}: HeartCounterProps) {
  const label = format(strings.accessibility.heartCounter, { count: hearts, max: maxHearts });

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
          <HeartSegments hearts={hearts} maxHearts={maxHearts} />
        </View>
        <AppText variant="caption" color={colors.textSecondary} allowFontScaling={false}>
          {toPersianDigits(`${hearts}/${maxHearts}`)}
        </AppText>
      </View>
      {showCountdown && nextRefillAt !== null ? <RefillCountdown nextRefillAt={nextRefillAt} /> : null}
    </View>
  );
});

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
