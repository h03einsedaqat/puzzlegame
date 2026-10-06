import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { usePersistentReducer, type HydrateAction } from '../hooks/usePersistentReducer';
import { useServices } from './ServicesContext';
import { settingsRepository } from '../services/storage/repositories';
import type { AppSettings } from '../types';

type SettingsAction =
  | HydrateAction<AppSettings>
  | { type: 'setSound'; enabled: boolean }
  | { type: 'setVibration'; enabled: boolean }
  | { type: 'setReducedMotion'; enabled: boolean }
  | { type: 'setNotifications'; enabled: boolean }
  | { type: 'completeOnboarding' };

function settingsReducer(state: AppSettings, action: SettingsAction): AppSettings {
  switch (action.type) {
    case '__hydrate':
      return action.state;
    case 'setSound':
      return { ...state, soundEnabled: action.enabled };
    case 'setVibration':
      return { ...state, vibrationEnabled: action.enabled };
    case 'setReducedMotion':
      return { ...state, reducedMotion: action.enabled };
    case 'setNotifications':
      return { ...state, notificationsEnabled: action.enabled };
    case 'completeOnboarding':
      return { ...state, onboardingCompleted: true };
    default:
      return state;
  }
}

export interface SettingsContextValue {
  settings: AppSettings;
  ready: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  completeOnboarding: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { state, dispatch, ready } = usePersistentReducer(settingsRepository, settingsReducer);
  const services = useServices();
  const { sound, vibration } = services;
  const { analytics } = services;
  const soundEnabled = state.soundEnabled;
  const vibrationEnabled = state.vibrationEnabled;

  // تنظیمات در همان لحظه روی سرویس‌ها اعمال می‌شوند تا اثر تغییر بی‌درنگ دیده شود
  useEffect(() => {
    sound.setEnabled(soundEnabled);
  }, [sound, soundEnabled]);

  useEffect(() => {
    vibration.setEnabled(vibrationEnabled);
  }, [vibration, vibrationEnabled]);

  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      dispatch({ type: 'setSound', enabled });
      analytics.track('settings_changed', { setting: 'sound', enabled });
    },
    [analytics, dispatch],
  );

  const setVibrationEnabled = useCallback(
    (enabled: boolean) => {
      dispatch({ type: 'setVibration', enabled });
      analytics.track('settings_changed', { setting: 'vibration', enabled });
    },
    [analytics, dispatch],
  );

  const setReducedMotion = useCallback(
    (enabled: boolean) => {
      dispatch({ type: 'setReducedMotion', enabled });
      analytics.track('settings_changed', { setting: 'reducedMotion', enabled });
    },
    [analytics, dispatch],
  );

  const setNotificationsEnabled = useCallback(
    (enabled: boolean) => dispatch({ type: 'setNotifications', enabled }),
    [dispatch],
  );

  const completeOnboarding = useCallback(() => dispatch({ type: 'completeOnboarding' }), [dispatch]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: state,
      ready,
      setSoundEnabled,
      setVibrationEnabled,
      setReducedMotion,
      setNotificationsEnabled,
      completeOnboarding,
    }),
    [
      state,
      ready,
      setSoundEnabled,
      setVibrationEnabled,
      setReducedMotion,
      setNotificationsEnabled,
      completeOnboarding,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings باید داخل SettingsProvider استفاده شود.');
  }
  return value;
}
