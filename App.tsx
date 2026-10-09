import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';
import {
  AchievementsProvider,
  DailyProvider,
  GameProvider,
  ProfileProvider,
  ProgressProvider,
  ServicesProvider,
  SettingsProvider,
} from './src/context';

/**
 * پوسته برنامه.
 *
 * ترتیب تأمین‌کننده‌ها مهم است: سرویس‌ها نخست ساخته می‌شوند، سپس تنظیمات
 * (چون صدا و لرزش را کنترل می‌کند)، بعد پروفایل و پیشرفت، سپس چالش روزانه،
 * دستاوردها (وابسته به استریک) و در پایان وضعیت بازی.
 */
function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" />
          <ServicesProvider>
            <SettingsProvider>
              <ProfileProvider>
                <ProgressProvider>
                  <DailyProvider>
                    <AchievementsProvider>
                      <GameProvider>
                        <RootNavigator />
                      </GameProvider>
                    </AchievementsProvider>
                  </DailyProvider>
                </ProgressProvider>
              </ProfileProvider>
            </SettingsProvider>
          </ServicesProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  /** ریشه ژست باید کل صفحه را بپوشاند و شفاف باشد */
  root: {
    flex: 1,
  },
});

export default App;
