import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, useLayout } from '../../theme';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  /** لبه‌هایی که باید از ناحیه امن فاصله بگیرند */
  edges?: readonly Edge[];
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** فاصله پایین برای اینکه دکمه‌های ثابت روی محتوا نیفتند */
  bottomInset?: number;
  testID?: string;
}

/**
 * پوسته صفحه‌ها.
 *
 * روی تبلت، عرض محتوا محدود می‌شود تا خطوط متن بیش از اندازه کشیده نشوند و
 * چیدمان در وسط صفحه بماند. سایه‌های کناری این محدودیت را برای کاربر روشن
 * می‌کند.
 */
export function ScreenContainer({
  children,
  scrollable = false,
  edges = ['top', 'bottom'],
  background = colors.background,
  contentStyle,
  bottomInset = 0,
  testID,
}: ScreenContainerProps) {
  const { contentMaxWidth, isTablet } = useLayout();

  const content = (
    <View
      style={[
        styles.content,
        { maxWidth: contentMaxWidth, paddingBottom: bottomInset },
        isTablet ? styles.tabletContent : null,
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={edges} testID={testID}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  tabletContent: {
    paddingHorizontal: 8,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
});
