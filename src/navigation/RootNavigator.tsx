import React, { useMemo } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../theme';
import { AboutScreen } from '../screens/AboutScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { DailyChallengeIntroScreen } from '../screens/DailyChallengeIntroScreen';
import { GameScreen } from '../screens/GameScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LevelMapScreen } from '../screens/LevelMapScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { useSettings } from '../context';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

/**
 * ناوبری برنامه.
 *
 * سرصفحه‌ها سفارشی و فارسی‌اند، بنابراین سرصفحه پیش‌فرض ناوبری خاموش است و
 * عنوان هر صفحه داخل خودش رسم می‌شود. مسیر نخستین اجرا: اگر بازیکن هنوز
 * آموزش آغازین را ندیده باشد، مستقیم به آن هدایت می‌شود.
 */
export function RootNavigator() {
  const { settings, ready } = useSettings();
  const initialRouteName = useMemo<keyof RootStackParamList>(() => {
    if (!ready) {
      return 'Splash';
    }
    return settings.onboardingCompleted ? 'Home' : 'Onboarding';
  }, [ready, settings.onboardingCompleted]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar barStyle="dark-content" />
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          contentStyle: styles.content,
          animation: 'slide_from_left',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="LevelMap" component={LevelMapScreen} />
        <Stack.Screen name="Game" component={GameScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="DailyChallengeIntro" component={DailyChallengeIntroScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
  },
});
