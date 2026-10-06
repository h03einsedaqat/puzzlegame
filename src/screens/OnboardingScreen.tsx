import { strings } from '../constants';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useServices, useSettings } from '../context';
import { colors, radius, spacing } from '../theme';
import { format } from '../utils/format';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import type { IconName } from '../types';
import type { RootScreenProps } from '../navigation/types';

interface OnboardingPage {
  key: string;
  icon: IconName;
  title: string;
  body: string;
  /** حروف نمونه‌ای که صفحه اول برای نشان دادن انتخاب کاشی استفاده می‌کند */
  sampleLetters?: readonly string[];
}

const PAGES: readonly OnboardingPage[] = [
  {
    key: 'select',
    icon: 'grid',
    title: strings.onboarding.slide1Title,
    body: strings.onboarding.slide1Body,
    sampleLetters: ['ک', 'ت', 'ا', 'ب'],
  },
  { key: 'build', icon: 'word', title: strings.onboarding.slide2Title, body: strings.onboarding.slide2Body },
  { key: 'reward', icon: 'gift', title: strings.onboarding.slide3Title, body: strings.onboarding.slide3Body },
];

/**
 * آموزش آغازین.
 *
 * سه صفحه کوتاه و قابل رد‌کردن؛ بازیکن بعد از آن مستقیم وارد بازی می‌شود.
 * مرحله یک بازی هم به‌عنوان آموزش تعاملی کار می‌کند.
 */
export function OnboardingScreen({ navigation }: RootScreenProps<'Onboarding'>) {
  const { width } = useWindowDimensions();
  const { completeOnboarding } = useSettings();
  const { analytics } = useServices();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<OnboardingPage>>(null);

  const finish = useCallback(() => {
    completeOnboarding();
    analytics.track('onboarding_complete');
    navigation.replace('Home');
  }, [analytics, completeOnboarding, navigation]);

  const goNext = useCallback(() => {
    if (index >= PAGES.length - 1) {
      finish();
      return;
    }
    const next = index + 1;
    setIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }, [finish, index]);

  const onScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, event.nativeEvent.layoutMeasurement.width));
    setIndex(Math.max(0, Math.min(PAGES.length - 1, page)));
  }, []);

  const pageWidth = useMemo(() => Math.max(240, width), [width]);

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <PressableScale
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel={strings.onboarding.skip}
        >
          <AppText variant="bodyStrong" color={colors.textSecondary}>
            {strings.onboarding.skip}
          </AppText>
        </PressableScale>
      </View>

      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={page => page.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, itemIndex) => ({ length: pageWidth, offset: pageWidth * itemIndex, index: itemIndex })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: pageWidth }]}>
            <View style={styles.illustration}>
              <View style={styles.illustrationIcon}>
                <Icon name={item.icon} size={40} color={colors.primary} />
              </View>
              {item.sampleLetters ? (
                <View style={styles.sampleRow}>
                  {item.sampleLetters.map((letter, letterIndex) => (
                    <View
                      key={`${item.key}-${letter}-${letterIndex}`}
                      style={[styles.sampleTile, letterIndex < 2 ? styles.sampleTileSelected : null]}
                    >
                      <AppText variant="heading" color={letterIndex < 2 ? colors.textInverse : colors.textPrimary}>
                        {letter}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <AppText variant="title" align="center">
              {item.title}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} align="center" style={styles.body}>
              {item.body}
            </AppText>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((page, dotIndex) => (
            <View
              key={`dot-${page.key}`}
              style={[styles.dot, dotIndex === index ? styles.dotActive : null]}
            />
          ))}
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          {format(strings.onboarding.pageIndicator, { current: index + 1, total: PAGES.length })}
        </AppText>
        <Button
          label={index === PAGES.length - 1 ? strings.onboarding.startGame : strings.common.continue}
          icon="play"
          onPress={goNext}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  page: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  illustration: {
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  illustrationIcon: {
    width: 110,
    height: 110,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sampleTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleTileSelected: {
    backgroundColor: colors.tileSelectedBackground,
    borderColor: colors.tileSelectedBackground,
  },
  body: {
    maxWidth: 420,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
});
