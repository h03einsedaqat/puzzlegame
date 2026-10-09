import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop, Path } from 'react-native-svg';

import { colors, useLayout } from '../../theme';

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
  background = colors.background,
  contentStyle,
  bottomInset = 0,
  testID,
  plain = false,
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
      {plain ? null : <AmbientBackdrop />}
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

function AmbientBackdrop() {
  const { width, height } = useLayout();
  const glowRadius = Math.max(width * 0.72, height * 0.34);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="night-surface" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.skyTop} />
            <Stop offset="0.48" stopColor={colors.skyMiddle} />
            <Stop offset="1" stopColor={colors.skyBottom} />
          </LinearGradient>
          <RadialGradient
            id="violet-ambient"
            cx={width * 0.8}
            cy={height * 0.08}
            r={glowRadius}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.backgroundGlow} stopOpacity="0.2" />
            <Stop offset="1" stopColor={colors.backgroundGlow} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id="teal-ambient"
            cx={width * 0.05}
            cy={height * 0.82}
            r={glowRadius * 0.78}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.brandTeal} stopOpacity="0.1" />
            <Stop offset="1" stopColor={colors.brandTeal} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={`M0 0 H${width} V${height} H0 Z`} fill="url(#night-surface)" />
        <Circle cx={width * 0.8} cy={height * 0.08} r={glowRadius} fill="url(#violet-ambient)" />
        <Circle cx={width * 0.05} cy={height * 0.82} r={glowRadius * 0.78} fill="url(#teal-ambient)" />
        <Circle cx={width * 0.96} cy={height * 0.54} r={width * 0.16} fill={colors.brandSky} opacity={0.025} />
      </Svg>
    </View>
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
