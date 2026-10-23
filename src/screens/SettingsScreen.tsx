import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { strings } from '../constants';
import {
  useAchievements,
  useDaily,
  useProfile,
  useProgress,
  useServices,
  useSettings,
} from '../context';
import { APP_INFO } from '../constants/appInfo';
import { openStorePage, shareText } from '../services';
import { radius, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../types';
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
  const {
    settings,
    setSoundEnabled,
    setVibrationEnabled,
    setReducedMotion,
    setNotificationsEnabled,
    setThemeMode,
  } = useSettings();
  const { colors } = useTheme();
  const { reset: resetProfile } = useProfile();
  const { reset: resetProgress } = useProgress();
  const daily = useDaily();
  const { reset: resetAchievements } = useAchievements();
  const { analytics, sound } = useServices();
  const [resetVisible, setResetVisible] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const resetAll = useCallback(async () => {
    setResetVisible(false);
    analytics.track('progress_reset');
    await Promise.all([resetProfile(), resetProgress(), daily.reset(), resetAchievements()]);
    sound.play('button_press');
    navigation.navigate('Home');
  }, [analytics, daily, navigation, resetAchievements, resetProfile, resetProgress, sound]);

  const handleShare = useCallback(async () => {
    analytics.track('share_app');
    const done = await shareText({
      title: strings.settings.shareLabel,
      message: format(strings.settings.shareMessage, { link: strings.settings.storeUrl }),
    });
    setActionMessage(done ? null : strings.errors.genericBody);
  }, [analytics]);

  const handleRate = useCallback(async () => {
    analytics.track('rate_app');
    const opened = await openStorePage(
      strings.settings.storeUrl,
      `bazaar://details?id=${APP_INFO.packageName}`,
    );
    setActionMessage(opened ? null : strings.settings.rateUnavailable);
    sound.play('button_press');
  }, [analytics, sound]);

  return (
    <ScreenContainer>
      <ScreenHeader
        title={strings.settings.title}
        onBack={() => navigation.goBack()}
        backLabel={strings.common.back}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card
          variant="muted"
          padding="md"
          style={[styles.settingsHero, { borderColor: colors.borderStrong }]}
        >
          <View style={[styles.settingsHeroIcon, { backgroundColor: colors.primaryLight }]}>
            <Icon name="settings" size={22} color={colors.primary} />
          </View>
          <View style={styles.settingsHeroCopy}>
            <AppText variant="bodyStrong">{strings.settings.heroTitle}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {strings.settings.heroDescription}
            </AppText>
          </View>
        </Card>
        <Card variant="muted" padding="md" style={styles.themeCard}>
          <View style={styles.themeHeading}>
            <Icon name="coffee" size={21} color={colors.brass} />
            <View style={styles.themeHeadingCopy}>
              <AppText variant="bodyStrong">{strings.settings.themeLabel}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {strings.settings.themeDescription}
              </AppText>
            </View>
          </View>
          <ThemePicker
            value={settings.themeMode ?? 'system'}
            onChange={setThemeMode}
            labels={{
              system: strings.settings.themeSystem,
              light: strings.settings.themeLight,
              dark: strings.settings.themeDark,
            }}
          />
          <AppText variant="caption" color={colors.textMuted} align="center">
            {strings.settings.themeCafeNote}
          </AppText>
        </Card>

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
          <LinkRow
            icon="grid"
            label={strings.settings.statsLabel}
            description={strings.settings.statsDescription}
            onPress={() => navigation.navigate('Stats')}
          />
          <LinkRow
            icon="gift"
            label={strings.settings.shareLabel}
            description={strings.settings.shareDescription}
            onPress={handleShare}
          />
          <LinkRow
            icon="star"
            label={strings.settings.rateLabel}
            description={strings.settings.rateDescription}
            onPress={handleRate}
          />
        </View>

        {actionMessage ? (
          <AppText variant="caption" color={colors.textMuted} align="center">
            {actionMessage}
          </AppText>
        ) : null}

        <Card
          variant="surface"
          padding="lg"
          style={[styles.dangerCard, { borderColor: colors.dangerLight }]}
        >
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
            <View
              style={[
                styles.dangerButton,
                { borderColor: colors.danger, backgroundColor: colors.dangerLight },
              ]}
            >
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

function ThemePicker({
  value,
  onChange,
  labels,
}: {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  labels: Record<ThemeMode, string>;
}) {
  const { colors } = useTheme();
  const options: { mode: ThemeMode; icon: 'eye' | 'sun' | 'moon' }[] = [
    { mode: 'system', icon: 'eye' },
    { mode: 'light', icon: 'sun' },
    { mode: 'dark', icon: 'moon' },
  ];
  return (
    <View style={styles.themeOptions} accessibilityRole="radiogroup">
      {options.map(option => {
        const selected = value === option.mode;
        return (
          <PressableScale
            key={option.mode}
            onPress={() => onChange(option.mode)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={labels[option.mode]}
            style={[
              styles.themeOption,
              {
                backgroundColor: selected ? colors.primary : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
          >
            <Icon
              name={option.icon}
              size={16}
              color={selected ? colors.onPrimary : colors.textSecondary}
            />
            <AppText
              variant="caption"
              color={selected ? colors.onPrimary : colors.textSecondary}
              numberOfLines={1}
            >
              {labels[option.mode]}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

interface LinkRowProps {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  /** توضیح یک‌خطی زیر عنوان؛ در ردیف‌های اشتراک‌گذاری و امتیاز پرش می‌کند */
  description?: string;
  onPress: () => void;
}

function LinkRow({ icon, label, description, onPress }: LinkRowProps) {
  const { sound, vibration } = useServices();
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={() => {
        sound.play('button_press');
        vibration.trigger('button');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={description ? `${label}، ${description}` : label}
    >
      <View
        style={[styles.linkRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Icon name={icon} size={20} color={colors.primary} />
        <View style={styles.linkTexts}>
          <AppText variant="bodyStrong">{label}</AppText>
          {description ? (
            <AppText variant="caption" color={colors.textMuted}>
              {description}
            </AppText>
          ) : null}
        </View>
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
  themeCard: {
    gap: spacing.md,
  },
  themeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  themeHeadingCopy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  themeOptions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  themeOption: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
  },
  settingsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsHeroCopy: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  section: {
    gap: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  linkTexts: {
    flex: 1,
    gap: 1,
  },
  linkLabel: {
    flex: 1,
    textAlign: 'left',
  },
  dangerCard: {
    gap: spacing.md,
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
  },
});
