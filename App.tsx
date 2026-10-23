import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { warmUpDictionary } from './src/data/words/dictionary';
import { RootNavigator } from './src/navigation/RootNavigator';
import {
  AchievementsProvider,
  DailyProvider,
  GameProvider,
  ProfileProvider,
  ProgressProvider,
  ServicesProvider,
  SettingsProvider,
  ThemeProvider,
  useTheme,
} from './src/context';

/**
 * پوسته برنامه.
 *
 * ترتیب تأمین‌کننده‌ها مهم است: سرویس‌ها نخست ساخته می‌شوند، سپس تنظیمات
 * (چون صدا و لرزش را کنترل می‌کند)، بعد پروفایل و پیشرفت، سپس چالش روزانه،
 * دستاوردها (وابسته به استریک) و در پایان وضعیت بازی.
 */
function App() {
  useEffect(() => {
    // واژه‌نامه را هنگام شروع برنامه می‌سازیم تا اولین ثبت واژه چنین کاری نکند.
    warmUpDictionary();
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <ServicesProvider>
            <SettingsProvider>
              <ThemeProvider>
                <AppStatusBar />
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
              </ThemeProvider>
            </SettingsProvider>
          </ServicesProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function AppStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />;
}

const styles = StyleSheet.create({
  /** ریشه ژست باید کل صفحه را بپوشاند و شفاف باشد */
  root: {
    flex: 1,
  },
});

export default App;
