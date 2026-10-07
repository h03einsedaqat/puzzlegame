import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, radius } from '../../theme';

export interface ProgressBarProps {
  /** نسبت پیشرفت میان ۰ و ۱ */
  ratio: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * نوار پیشرفت با پر شدن نرم.
 *
 * از عرض به‌جای transform استفاده می‌کند تا گوشه‌های گرد در همه اندازه‌ها
 * درست بمانند؛ انیمیشن روی رشته‌ای از کلیدفریم‌های عرضی اجرا می‌شود.
 */
export function ProgressBar({
  ratio,
  height = 14,
  color = colors.primary,
  trackColor = colors.surfaceMuted,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const reducedMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const width = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (reducedMotion) {
      width.setValue(clamped);
      return;
    }
    Animated.timing(width, {
      toValue: clamped,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [clamped, reducedMotion, width]);

  return (
    <View
      style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            borderRadius: height / 2,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      >
        {/* برقِ روی نوار، حس «آب‌نباتی» می‌دهد */}
        <View pointerEvents="none" style={[styles.gloss, { borderRadius: height / 2, height: Math.max(3, height * 0.34) }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: {
    height: '100%',
  },
  gloss: {
    position: 'absolute',
    top: 2,
    left: 3,
    right: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
