import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type AppColors } from '../theme/colors';
import { useSettings } from './SettingsContext';

type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  colors: AppColors;
  mode: ResolvedTheme;
  selection: 'system' | ResolvedTheme;
  isDark: boolean;
}

const DEFAULT_THEME: ThemeContextValue = {
  colors: palettes.light,
  mode: 'light',
  selection: 'system',
  isDark: false,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME);

/**
 * تم زندهٔ برنامه. انتخاب «دستگاه» همیشه به Appearance سیستم گوش می‌دهد؛
 * انتخاب روشن/تاریک کاربر تا وقتی خودش تغییرش ندهد پایدار می‌ماند.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const deviceScheme = useColorScheme();
  const selection = settings.themeMode ?? 'system';
  const mode: ResolvedTheme =
    selection === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : selection;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: palettes[mode],
      mode,
      selection,
      isDark: mode === 'dark',
    }),
    [mode, selection],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useThemeColors(): AppColors {
  return useTheme().colors;
}
