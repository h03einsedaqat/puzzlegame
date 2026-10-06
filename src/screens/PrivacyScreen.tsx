import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { strings } from '../constants';
import { colors, spacing } from '../theme';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import type { RootScreenProps } from '../navigation/types';

const SECTIONS: readonly { title: string; body: string }[] = [
  { title: strings.privacy.section1Title, body: strings.privacy.section1Body },
  { title: strings.privacy.section2Title, body: strings.privacy.section2Body },
  { title: strings.privacy.section3Title, body: strings.privacy.section3Body },
  { title: strings.privacy.section4Title, body: strings.privacy.section4Body },
  { title: strings.privacy.section5Title, body: strings.privacy.section5Body },
];

/**
 * حریم خصوصی.
 *
 * متن‌ها در فایل متن‌های برنامه متمرکزند و باید پیش از هر انتشار، هم‌راستا با
 * رفتار واقعی برنامه (مجوزها، تبلیغات، خرید) بازبینی شوند.
 */
export function PrivacyScreen({ navigation }: RootScreenProps<'Privacy'>) {
  return (
    <ScreenContainer>
      <ScreenHeader
        title={strings.privacy.title}
        subtitle={strings.privacy.updatedAt}
        onBack={() => navigation.goBack()}
        backLabel={strings.common.back}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(section => (
          <Card key={section.title} variant="surface" padding="lg" style={styles.card}>
            <AppText variant="subheading">{section.title}</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {section.body}
            </AppText>
          </Card>
        ))}
        <View style={styles.footer}>
          <AppText variant="caption" color={colors.textMuted} align="center">
            {strings.about.contactBody}
          </AppText>
        </View>
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
    gap: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
});
