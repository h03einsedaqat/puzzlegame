import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors } from '../../theme';

export interface ConfettiCelebrationProps {
  /** تعداد کاغذرنگی‌ها؛ روی گوشی ضعیف کم‌تر بگذار */
  count?: number;
  /** اگر false باشد هیچ‌چیز رندر نمی‌شود (مثلاً مرحله کامل نشده) */
  active?: boolean;
  /** مدت یک دور کامل بارش (میلی‌ثانیه) */
  duration?: number;
}

const PIECE_COLORS = [
  colors.confettiYellow,
  colors.confettiCoral,
  colors.confettiGreen,
  colors.confettiPurple,
  colors.confettiBlue,
  colors.accent,
];

interface Piece {
  startX: number;
  drift: number;
  size: number;
  rotate: number;
  delay: number;
  duration: number;
  color: string;
  round: boolean;
}

/**
 * بارش کاغذرنگی برای لحظه‌های برد.
 *
 * همه انیمیشن‌ها با درایور بومی اجرا می‌شوند (transform/opacity) و روی لایه‌ای
 * با pointerEvents="none" می‌نشینند، پس نه روی گوشی ضعیف کندی می‌دهند و نه جلوی
 * لمس دکمه‌ها را می‌گیرند. اگر بازیکن «کاهش انیمیشن» را روشن کرده باشد، هیچ‌چیز
 * رندر نمی‌شود.
 */
export function ConfettiCelebration({ count = 26, active = true, duration = 2600 }: ConfettiCelebrationProps) {
  const reducedMotion = useReducedMotion();
  const { width, height } = Dimensions.get('window');
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useMemo<Piece[]>(() => {
    const safeCount = Math.max(6, Math.min(count, 60));
    return Array.from({ length: safeCount }, (_, index) => {
      // توزیع شبه‌تصادفیِ پایدار (بدون Math.random در رندر تا هر بار یکسان بماند)
      const seed = (index * 9301 + 49297) % 233280;
      const random = seed / 233280;
      const random2 = ((index * 4177 + 7919) % 233280) / 233280;
      return {
        startX: random * width,
        drift: (random2 - 0.5) * width * 0.5,
        size: 8 + Math.round(random2 * 8),
        rotate: Math.round(random * 720 - 360),
        delay: Math.round(random2 * 700),
        duration: duration * (0.7 + random * 0.6),
        color: PIECE_COLORS[index % PIECE_COLORS.length] as string,
        round: index % 3 === 0,
      };
    });
  }, [count, duration, width]);

  useEffect(() => {
    if (!active || reducedMotion) {
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: duration + 900,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, duration, progress, reducedMotion]);

  if (!active || reducedMotion) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, index) => {
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, height + 60],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.drift],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${piece.rotate}deg`],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.08, 0.9, 1],
          outputRange: [0, 1, 1, 0],
        });
        return (
          <Animated.View
            key={`confetti-${index}`}
            style={{
              position: 'absolute',
              left: piece.startX,
              width: piece.size,
              height: piece.round ? piece.size : piece.size * 1.6,
              backgroundColor: piece.color,
              borderRadius: piece.round ? piece.size / 2 : 3,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
