import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
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
  );
}

export default App;
