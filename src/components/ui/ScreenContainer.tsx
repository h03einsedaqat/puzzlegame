import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, G, Text as SvgText } from 'react-native-svg';

import { colors, fontFamily, useLayout } from '../../theme';

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
  /** خاموش‌کردن آسمان تزئینی (برای صفحه‌هایی که خودشان پس‌زمینه کامل دارند) */
  plain?: boolean;
}

/**
 * پوسته صفحه‌ها.
 *
 * پس‌زمینه یک آسمان شاد است: گرادیان آبیِ روشن با ابرهای نرم و چند حرف فارسیِ
 * شناور کم‌رنگ. همه‌چیز با SVG رسم می‌شود (هیچ تصویر بیت‌مپی و هیچ درخواست
 * شبکه‌ای وجود ندارد) و دقیقاً پشت محتوا می‌نشیند، پس روی گوشی ضعیف هم هزینه‌اش
 * ناچیز است. روی تبلت عرض محتوا محدود می‌شود تا خطوط متن زیادی کشیده نشوند.
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
      {plain ? null : <SkyBackdrop />}
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

/** حروف شناورِ کم‌رنگ پس‌زمینه؛ فقط تزئینی و بدون اثر روی دسترس‌پذیری */
const FLOATING_LETTERS: readonly { char: string; x: number; y: number; size: number; rotate: number; opacity: number }[] = [
  { char: 'ک', x: 0.1, y: 0.16, size: 54, rotate: -14, opacity: 0.16 },
  { char: 'ل', x: 0.84, y: 0.1, size: 44, rotate: 12, opacity: 0.14 },
  { char: 'م', x: 0.78, y: 0.42, size: 62, rotate: 8, opacity: 0.12 },
  { char: 'ه', x: 0.14, y: 0.52, size: 40, rotate: -8, opacity: 0.13 },
  { char: 'ب', x: 0.5, y: 0.82, size: 48, rotate: 6, opacity: 0.1 },
];

function SkyBackdrop() {
  const { width, height } = useLayout();

  // ابرها با نسبت اندازه صفحه جای می‌گیرند تا روی هر گوشی‌ای طبیعی بمانند.
  const clouds = useMemo(
    () => [
      { x: width * 0.12, y: height * 0.08, scale: 1 },
      { x: width * 0.78, y: height * 0.2, scale: 0.78 },
      { x: width * 0.32, y: height * 0.62, scale: 0.62 },
      { x: width * 0.88, y: height * 0.75, scale: 0.86 },
    ],
    [height, width],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.skyTop} stopOpacity="0.85" />
            <Stop offset="0.42" stopColor={colors.skyMiddle} stopOpacity="0.9" />
            <Stop offset="1" stopColor={colors.skyBottom} stopOpacity="0.95" />
          </LinearGradient>
        </Defs>

        <Path d={`M0 0 H${width} V${height} H0 Z`} fill="url(#sky)" />

        {/* خورشید گوشه صفحه */}
        <Circle cx={width * 0.9} cy={height * 0.06} r={width * 0.22} fill={colors.sunbeam} />
        <Circle cx={width * 0.9} cy={height * 0.06} r={width * 0.13} fill={colors.confettiYellow} opacity={0.5} />

        {/* ابرهای نرم */}
        {clouds.map((cloud, index) => (
          <G key={`cloud-${index}`} opacity={0.75} transform={`translate(${cloud.x} ${cloud.y}) scale(${cloud.scale})`}>
            <Circle cx={0} cy={0} r={26} fill={colors.cloud} />
            <Circle cx={26} cy={6} r={19} fill={colors.cloud} />
            <Circle cx={-24} cy={7} r={16} fill={colors.cloud} />
            <Circle cx={6} cy={-14} r={17} fill={colors.cloud} />
          </G>
        ))}

        {/* حروف شناور: همان حسِ «کلمه‌بازی» در پس‌زمینه، خیلی کم‌رنگ */}
        {FLOATING_LETTERS.map((letter, index) => (
          <G
            key={`letter-${index}`}
            opacity={letter.opacity}
            transform={`translate(${letter.x * width} ${letter.y * height}) rotate(${letter.rotate})`}
          >
            <Circle cx={0} cy={0} r={letter.size * 0.62} fill={colors.surface} />
            <SvgText
              x={0}
              y={letter.size * 0.28}
              fontSize={letter.size}
              fontFamily={fontFamily.bold}
              fill={colors.primary}
              textAnchor="middle"
            >
              {letter.char}
            </SvgText>
          </G>
        ))}
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
