import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { Difficulty, WordKind } from '../types';

export interface ResultWordSummary {
  word: string;
  kind: WordKind;
  score: number;
  coins: number;
}

export interface ResultParams {
  levelId: number;
  levelTitle: string;
  difficulty: Difficulty;
  mode: 'level' | 'daily';
  score: number;
  coins: number;
  maxCombo: number;
  targetFound: number;
  targetTotal: number;
  bonusFound: number;
  bonusTotal: number;
  words: ResultWordSummary[];
  isNewBestScore: boolean;
  unlockedLevelId: number | null;
  nextLevelId: number | null;
  /** پاداش ویژه چالش روزانه که جدا از پاداش مرحله نمایش داده می‌شود */
  dailyBonusCoins: number;
  dailyBonusScore: number;
}

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Home: undefined;
  LevelMap: { focusLevelId?: number } | undefined;
  Game: { levelId: number; mode: 'level' | 'daily' };
  DailyChallengeIntro: undefined;
  Result: ResultParams;
  Settings: undefined;
  About: undefined;
  Privacy: undefined;
  Achievements: undefined;
};

export type RootScreenProps<RouteName extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  RouteName
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
