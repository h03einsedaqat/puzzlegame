import React, { useCallback, useMemo, useRef } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** میزان کوچک‌شدن هنگام فشار */
  scaleTo?: number;
  disabled?: boolean;
}

/**
 * لمس‌پذیر با انیمیشن نرم.
 *
 * همه دکمه‌ها و کارت‌های بازی از همین جزء استفاده می‌کنند تا حس فشار یکسان
 * باشد. اگر کاربر «کاهش انیمیشن» را روشن کرده باشد، هیچ انیمیشنی اجرا نمی‌شود.
 * از درایور بومی useNativeDriver استفاده می‌شود تا روی دستگاه‌های ضعیف هم
 * انیمیشن بدون افت فریم بماند.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  disabled = false,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animate = useCallback(
    (toValue: number, duration: number) => {
      if (reducedMotion) {
        return;
      }
      Animated.timing(scale, {
        toValue,
        duration,
        useNativeDriver: true,
      }).start();
    },
    [reducedMotion, scale],
  );

  const animatedStyle = useMemo(() => ({ transform: [{ scale }] }), [scale]);

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={event => {
        animate(disabled ? 1 : scaleTo, 90);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        animate(1, 120);
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
