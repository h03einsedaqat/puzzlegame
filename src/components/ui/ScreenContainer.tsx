import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop, Path } from 'react-native-svg';

import { useLayout } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  edges?: readonly Edge[];
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
  testID?: string;
  plain?: boolean;
}

/**
 * Premium dark application shell. Ambient SVG glows are static and decorative;
 * content stays capped on tablets and keeps its normal touch/render behavior.
 */
export function ScreenContainer({
  children,
  scrollable = false,
  edges = ['top', 'bottom'],
  background,
  contentStyle,
  bottomInset = 0,
  testID,
  plain = false,
}: ScreenContainerProps) {
  const { contentMaxWidth, isTablet } = useLayout();
  const { colors } = useTheme();
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
    <SafeAreaView
      style={[styles.safe, { backgroundColor: background ?? colors.background }]}
      edges={edges}
      testID={testID}
    >
      {plain ? null : AMBIENT_BACKDROP}
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

/**
 * پس‌زمینهٔ تزئینی.
 *
 * این لایه دو گرادیان شعاعی تمام‌صفحه دارد؛ روی اندروید، بازسازی آن در هر رندر
 * یعنی استخراج دوبارهٔ همهٔ propsهای react-native-svg (براش‌ها، ماتریس‌ها،
 * viewBox) و رسم دوبارهٔ یک بوم به اندازهٔ کل صفحه. به همین دلیل با
 * `React.memo` بدون هیچ prop قفل شده است: یک‌بار در هر صفحه ساخته می‌شود و بعد
 * از آن هرگز دوباره رندر نمی‌شود (مگر اینکه اندازهٔ پنجره عوض شود).
 */
const AmbientBackdrop = React.memo(function AmbientBackdrop() {
  const { width, height } = useLayout();
  const { colors } = useTheme();
  const glowRadius = Math.max(width * 0.72, height * 0.34);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="cafe-paper" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.skyTop} />
            <Stop offset="0.52" stopColor={colors.skyMiddle} />
            <Stop offset="1" stopColor={colors.skyBottom} />
          </LinearGradient>
          <RadialGradient
            id="cafe-lantern"
            cx={width * 0.82}
            cy={height * 0.04}
            r={glowRadius}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.accent} stopOpacity="0.14" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id="cafe-tile"
            cx={width * 0.04}
            cy={height * 0.82}
            r={glowRadius * 0.82}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.brandTeal} stopOpacity="0.09" />
            <Stop offset="1" stopColor={colors.brandTeal} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={`M0 0 H${width} V${height} H0 Z`} fill="url(#cafe-paper)" />
        <Circle cx={width * 0.82} cy={height * 0.04} r={glowRadius} fill="url(#cafe-lantern)" />
        <Circle cx={width * 0.04} cy={height * 0.82} r={glowRadius * 0.82} fill="url(#cafe-tile)" />
        {/* ردّی بسیار کم‌رنگ از ترنج و کاشی؛ حاشیه‌ها خلوت می‌مانند تا متن و بازی واضح باشند. */}
        <Path
          d={`M-24 ${height * 0.18} C${width * 0.12} ${height * 0.11} ${width * 0.2} ${
            height * 0.25
          } ${width * 0.03} ${height * 0.3} C${width * 0.18} ${height * 0.37} ${width * 0.2} ${
            height * 0.47
          } -18 ${height * 0.45} M${width + 22} ${height * 0.58} C${width * 0.86} ${
            height * 0.52
          } ${width * 0.8} ${height * 0.67} ${width * 0.98} ${height * 0.73}`}
          fill="none"
          stroke={colors.ornament}
          strokeWidth={1.2}
          opacity={0.12}
        />
        <Circle
          cx={width * 0.94}
          cy={height * 0.14}
          r={18}
          fill="none"
          stroke={colors.ornament}
          strokeWidth={1}
          opacity={0.1}
        />
        <Circle
          cx={width * 0.94}
          cy={height * 0.14}
          r={10}
          fill="none"
          stroke={colors.ornament}
          strokeWidth={1}
          opacity={0.1}
        />
      </Svg>
    </View>
  );
});

/**
 * یک عنصر ثابت و مشترک برای همهٔ پوسته‌های صفحه.
 *
 * چون همیشه همان عنصر (با همان هویت) به درخت داده می‌شود، ری‌اکت حتی مقایسهٔ
 * props هم انجام نمی‌دهد و لایهٔ پس‌زمینه در رندرهای پرتکرار صفحهٔ بازی (هر
 * تغییر انتخاب حرف) دست‌نخورده می‌ماند.
 */
const AMBIENT_BACKDROP = <AmbientBackdrop />;

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
