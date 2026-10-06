import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { APP_INFO } from '../constants/appInfo';
import { strings } from '../constants';
import { colors, radius, spacing } from '../theme';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import type { IconName } from '../types';
import type { RootScreenProps } from '../navigation/types';

const FEATURES: readonly { icon: IconName; text: string }[] = [
  { icon: 'grid', text: strings.about.feature1 },
  { icon: 'calendar', text: strings.about.feature2 },
  { icon: 'bulb', text: strings.about.feature3 },
  { icon: 'shield', text: strings.about.feature4 },
];

/** درباره بازی: معرفی کوتاه، امکانات، منبع واژه‌ها و راه ارتباط. */
export function AboutScreen({ navigation }: RootScreenProps<'About'>) {
  return (
    <ScreenContainer>
      <ScreenHeader
        title={strings.about.title}
        onBack={() => navigation.goBack()}
        backLabel={strings.common.back}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card variant="surface" padding="lg" style={styles.card}>
          <AppText variant="body" color={colors.textSecondary}>
            {strings.about.intro}
          </AppText>
        </Card>

        <Card variant="surface" padding="lg" style={styles.card}>
          <AppText variant="subheading">{strings.about.featuresTitle}</AppText>
          <View style={styles.features}>
            {FEATURES.map(feature => (
              <View key={feature.text} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Icon name={feature.icon} size={18} color={colors.primary} />
                </View>
                <AppText variant="body" style={styles.featureText}>
                  {feature.text}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="muted" padding="lg" style={styles.card}>
          <AppText variant="subheading">{strings.about.creditsTitle}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {strings.about.creditsBody}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {APP_INFO.fontCredit}
          </AppText>
        </Card>

        <Card variant="surface" padding="lg" style={styles.card}>
          <AppText variant="subheading">{strings.about.contactTitle}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {strings.about.contactBody}
          </AppText>
          <View style={styles.contactRow}>
            <Icon name="info" size={16} color={colors.primary} />
            <AppText variant="bodyStrong">{APP_INFO.contactEmail}</AppText>
          </View>
          <AppText variant="caption" color={colors.textMuted}>
            {strings.about.developerLabel}: {APP_INFO.name} · {APP_INFO.version}
          </AppText>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    gap: spacing.sm,
  },
  features: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    textAlign: 'left',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
