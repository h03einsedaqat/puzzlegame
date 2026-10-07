import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { strings } from '../../constants';
import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  showDetails: boolean;
}

/**
 * مرز خطا.
 *
 * اگر جایی از درخت نمایش خطا بدهد، به‌جای بسته‌شدن برنامه یک صفحه آرام با دکمه
 * «تلاش دوباره» نشان داده می‌شود. پیشرفت بازیکن در حافظه دستگاه ذخیره شده است و
 * با تلاش دوباره از دست نمی‌رود؛ همین پیام هم به بازیکن گفته می‌شود تا استرس
 * نداشته باشد. جزئیات فنی فقط با درخواست خودش باز می‌شود (برای پشتیبانی).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    if (__DEV__) {
      // در نسخه توسعه، خطا در کنسول می‌ماند تا رفع اشکال ساده باشد.
      console.error('[kalamesaz] render error', error);
    }
  }

  private handleRetry = () => {
    this.setState({ error: null, showDetails: false });
  };

  private toggleDetails = () => {
    this.setState(state => ({ showDetails: !state.showDetails }));
  };

  override render() {
    const { error, showDetails } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.badge}>
            <Icon name="info" size={30} color={colors.warning} />
          </View>
          <AppText variant="title" align="center">
            {strings.errors.crashTitle}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} align="center">
            {strings.errors.crashBody}
          </AppText>

          <Button label={strings.errors.crashRetry} icon="refresh" onPress={this.handleRetry} />
          <Button
            label={strings.errors.crashDetails}
            variant="ghost"
            size="small"
            onPress={this.toggleDetails}
          />

          {showDetails ? (
            <View style={styles.details}>
              <AppText variant="caption" color={colors.textMuted} selectable>
                {error.message}
              </AppText>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
