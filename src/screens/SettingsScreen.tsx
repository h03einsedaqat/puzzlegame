import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { APP_INFO } from '../constants/appInfo';
import { strings } from '../constants';
import { useAchievements, useDaily, useProfile, useProgress, useServices, useSettings } from '../context';
import { colors, radius, spacing } from '../theme';
import { format } from '../utils/format';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ToggleRow } from '../components/ui/Toggle';
import type { RootScreenProps } from '../navigation/types';

/**
 * تنظیمات.
 *
 * همه تغییرها بی‌درنگ روی سرویس‌ها (صدا، لرزش) اعمال و ذخیره می‌شوند. گزینه
 * اعلان‌ها در MVP غیرفعال است و صریحاً به نسخه‌های بعدی ارجاع داده می‌شود تا
 * انتظار نادرست ایجاد نکند.
 */
export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const { settings, setSoundEnabled, setVibrationEnabled, setReducedMotion, setNotificationsEnabled } = useSettings();
  const { reset: resetProfile } = useProfile();
  const { reset: resetProgress } = useProgress();
  const daily = useDaily();
  const { reset: resetAchievements } = useAchievements();
  const { analytics, sound } = useServices();
  const [resetVisible, setResetVisible] = useState(false);

  const resetAll = useCallback(async () => {
    setResetVisible(false);
    analytics.track('progress_reset');
    await Promise.all([resetProfile(), resetProgress(), daily.reset(), resetAchievements()]);
    sound.play('button_press');
    navigation.navigate('Home');
  }, [analytics, daily, navigation, resetAchievements, resetProfile, resetProgress, sound]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={strings.settings.title}
        onBack={() => navigation.goBack()}
        backLabel={strings.common.back}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ToggleRow
            icon="sound"
            title={strings.settings.soundLabel}
            description={strings.settings.soundDescription}
            value={settings.soundEnabled}
            onValueChange={setSoundEnabled}
            note={!sound.isAvailable() ? strings.errors.soundUnavailable : undefined}
          />
          <ToggleRow
            icon="vibrate"
            title={strings.settings.vibrationLabel}
            description={strings.settings.vibrationDescription}
            value={settings.vibrationEnabled}
            onValueChange={setVibrationEnabled}
          />
          <ToggleRow
            icon="eye"
            title={strings.settings.reducedMotionLabel}
            description={strings.settings.reducedMotionDescription}
            value={settings.reducedMotion}
            onValueChange={setReducedMotion}
          />
          <ToggleRow
            icon="calendar"
            title={strings.settings.notificationsLabel}
            description={strings.settings.notificationsDescription}
            value={settings.notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            disabled
            note={strings.settings.unavailableInMvp}
          />
        </View>

        <View style={styles.section}>
          <LinkRow
            icon="info"
            label={strings.settings.aboutLabel}
            onPress={() => navigation.navigate('About')}
          />
          <LinkRow
            icon="shield"
            label={strings.settings.privacyLabel}
            onPress={() => navigation.navigate('Privacy')}
          />
          <LinkRow
            icon="medal"
            label={strings.achievements.title}
            onPress={() => navigation.navigate('Achievements')}
          />
        </View>

        <Card variant="surface" padding="lg" style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <Icon name="refresh" size={20} color={colors.danger} />
            <View style={styles.dangerTexts}>
              <AppText variant="bodyStrong">{strings.settings.resetLabel}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {strings.settings.resetDescription}
              </AppText>
            </View>
          </View>
          <PressableScale
            onPress={() => setResetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={strings.settings.resetLabel}
          >
            <View style={styles.dangerButton}>
              <AppText variant="bodyStrong" color={colors.danger}>
                {strings.settings.resetLabel}
              </AppText>
            </View>
          </PressableScale>
        </Card>

        <EmptyState
          icon="word"
          title={format(strings.settings.versionLabel, { version: APP_INFO.version })}
          body={APP_INFO.fontCredit}
        />
      </ScrollView>

      <ConfirmDialog
        visible={resetVisible}
        title={strings.settings.resetConfirmTitle}
        body={strings.settings.resetConfirmBody}
        confirmLabel={strings.settings.resetConfirmButton}
        cancelLabel={strings.common.cancel}
        destructive
        onConfirm={resetAll}
        onCancel={() => setResetVisible(false)}
      />
    </ScreenContainer>
  );
}

interface LinkRowProps {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
}

function LinkRow({ icon, label, onPress }: LinkRowProps) {
  const { sound, vibration } = useServices();
  return (
    <PressableScale
      onPress={() => {
        sound.play('button_press');
        vibration.trigger('button');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.linkRow}>
        <Icon name={icon} size={20} color={colors.primary} />
        <AppText variant="bodyStrong" style={styles.linkLabel}>
          {label}
        </AppText>
        <Icon name="chevron" size={18} color={colors.textMuted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  linkLabel: {
    flex: 1,
    textAlign: 'left',
  },
  dangerCard: {
    gap: spacing.md,
    borderColor: colors.dangerLight,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dangerTexts: {
    flex: 1,
    alignItems: 'flex-start',
  },
  dangerButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
});
