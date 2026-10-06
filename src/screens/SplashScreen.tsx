import { strings } from '../constants';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useProfile, useProgress, useServices, useSettings } from '../context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, radius, shadows, spacing } from '../theme';
import { AppText } from '../components/ui/AppText';
import { Icon } from '../components/ui/Icon';
import type { RootScreenProps } from '../navigation/types';

const MIN_SPLASH_MS = 900;

/**
 * صفحه آغازین.
 *
 * تا زمانی که پیشرفت و تنظیمات از حافظه خوانده نشوند، مسیر بعدی مشخص نیست؛
 * بنابراین این صفحه کوتاه نمایش داده می‌شود و پس از آماده‌شدن داده‌ها به
 * آموزش آغازین یا خانه می‌رود.
 */
export function SplashScreen({ navigation }: RootScreenProps<'Splash'>) {
  const { ready: settingsReady, settings } = useSettings();
  const { ready: profileReady, refreshHearts } = useProfile();
  const { ready: progressReady } = useProgress();
  const { analytics } = useServices();
  const reducedMotion = useReducedMotion();
  const logoScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.85)).current;
  const startedAt = useRef(Date.now());

  useEffect(() => {
    analytics.track('app_open');
  }, [analytics]);

  useEffect(() => {
    if (!reducedMotion) {
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
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
      <Animated.View style={[styles.logo, { transform: [{ scale: logoScale }] }]}>
        <Icon name="word" size={44} color={colors.onPrimary} />
      </Animated.View>
      <AppText variant="display" color={colors.primaryDark}>
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
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.raised,
  },
});
