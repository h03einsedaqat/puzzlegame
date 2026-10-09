import { strings } from '../constants';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Polygon } from 'react-native-svg';

import { useProfile, useProgress, useServices, useSettings } from '../context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, radius, shadows, spacing } from '../theme';
import { AppText } from '../components/ui/AppText';
import type { RootScreenProps } from '../navigation/types';

const MIN_SPLASH_MS = 900;

/**
 * صفحه آغازین.
 *
 * تا زمانی که پیشرفت و تنظیمات از حافظه خوانده نشوند، مسیر بعدی مشخص نیست؛
 * بنابراین این صفحه کوتاه نمایش داده می‌شود و پس از آماده‌شدن داده‌ها به
 * آموزش آغازین یا خانه می‌رود. ظاهرش همان آیکون برنامه است: کاشی قهوه‌ای براق
 * با حرف طلایی «ک» روی آسمانِ شاد و پرتوهای آفتاب.
 */
export function SplashScreen({ navigation }: RootScreenProps<'Splash'>) {
  const { ready: settingsReady, settings } = useSettings();
  const { ready: profileReady, refreshHearts } = useProfile();
  const { ready: progressReady } = useProgress();
  const { analytics } = useServices();
  const reducedMotion = useReducedMotion();
  const logoScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.82)).current;
  const startedAt = useRef(Date.now());

  useEffect(() => {
    analytics.track('app_open');
  }, [analytics]);

  useEffect(() => {
    if (!reducedMotion) {
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    }
  }, [logoScale, reducedMotion]);

  useEffect(() => {
    if (!settingsReady || !profileReady || !progressReady) {
      return;
    }
    refreshHearts();
    const elapsed = Date.now() - startedAt.current;
    const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
    const timer = setTimeout(() => {
      navigation.replace(settings.onboardingCompleted ? 'Home' : 'Onboarding');
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsReady, profileReady, progressReady, settings.onboardingCompleted]);

  return (
    <View style={styles.container}>
      <Svg width={360} height={360} style={styles.rays} pointerEvents="none">
        <G opacity={0.5}>
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index * Math.PI) / 6;
            const spread = 0.1;
            const long = 260;
            const cx = 180;
            const cy = 180;
            const x1 = cx + Math.cos(angle - spread) * long;
            const y1 = cy + Math.sin(angle - spread) * long;
            const x2 = cx + Math.cos(angle + spread) * long;
            const y2 = cy + Math.sin(angle + spread) * long;
            return (
              <Polygon
                key={`ray-${index}`}
                points={`${cx},${cy} ${x1},${y1} ${x2},${y2}`}
                fill={colors.sunbeam}
              />
            );
          })}
          <Circle cx={180} cy={180} r={150} fill={colors.brandSky} opacity={0.18} />
        </G>
      </Svg>

      <Animated.View style={[styles.logo, { transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoGloss} pointerEvents="none" />
        <AppText variant="display" color={colors.letterGold} style={styles.logoLetter} allowFontScaling={false}>
          ک
        </AppText>
      </Animated.View>

      <AppText variant="display" color={colors.primary} style={styles.title}>
        {strings.app.name}
      </AppText>
      <AppText variant="subheading" color={colors.textSecondary}>
        {strings.app.tagline}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  rays: {
    position: 'absolute',
    top: '50%',
    marginTop: -180,
  },
  logo: {
    width: 132,
    height: 132,
    borderRadius: 40,
    backgroundColor: colors.tileDeep,
    borderWidth: 3,
    borderColor: colors.tileDeepBorder,
    borderBottomWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.raised,
  },
  logoGloss: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    height: 46,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  logoLetter: {
    fontSize: 76,
    lineHeight: 96,
  },
  title: {
    marginTop: spacing.xs,
  },
});
