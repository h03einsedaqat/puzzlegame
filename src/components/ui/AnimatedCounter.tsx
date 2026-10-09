import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AppText } from './AppText';
import type { TypographyVariant } from '../../theme';

export interface AnimatedCounterProps {
  value: string | number;
  variant?: TypographyVariant;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  allowFontScaling?: boolean;
}

/** Small value-change pulse for coins, score and progress counters. */
export function AnimatedCounter({
  value,
  variant = 'numeric',
  color,
  style,
  textStyle,
  allowFontScaling = false,
}: AnimatedCounterProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withSequence(
      withTiming(1.08, { duration: 95 }),
      withSpring(1, { damping: 15, stiffness: 250, mass: 0.7 }),
    );
  }, [reducedMotion, scale, value]);

  return (
    <Animated.View style={[styles.value, animatedStyle, style]}>
      <AppText variant={variant} color={color} style={textStyle} allowFontScaling={allowFontScaling}>
        {value}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  value: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
