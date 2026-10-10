import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { colors } from '../../theme';
import type { IconName } from '../../types';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** ضخامت خط برای آیکون‌های خطی */
  strokeWidth?: number;
}

/** ستاره nپر با شعاع بیرونی/درونی مشخص؛ نقاط با فرمول مثلثاتی محاسبه می‌شوند. */
function starPoints(outer: number, inner: number, points = 5, rotation = -Math.PI / 2): string {
  const list: string[] = [];
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = rotation + (index * Math.PI) / points;
    list.push(`${12 + radius * Math.cos(angle)},${12 + radius * Math.sin(angle)}`);
  }
  return list.join(' ');
}

/**
 * نقطه‌های چندضلعی یک‌بار در زمان بارگذاری ماژول ساخته می‌شوند.
 *
 * پیش‌تر در هر رندر آیکون، حلقهٔ مثلثاتی ستاره دوباره اجرا و رشته‌اش دوباره
 * ساخته می‌شد؛ آیکون‌ها در صفحهٔ بازی زیادند و همین کار بیهوده در هر لمس
 * تکرار می‌شد.
 */
const STAR_POINTS = starPoints(9.4, 4.1);
const SPARKLE_POINTS = '12,2 14.2,9.8 22,12 14.2,14.2 12,22 9.8,14.2 2,12 9.8,9.8';

/**
 * مسیر قلب در دستگاه مختصات ۲۴×۲۴ آیکون‌ها.
 *
 * بیرون برده شده تا `HeartCounter` بتواند همهٔ قلب‌ها را در **یک** نمای
 * react-native-svg رسم کند؛ پنج نمای SVG جدا روی اندروید پنج بوم مجزا یعنی
 * هزینهٔ ساخت و رسم پنج‌برابر در سرصفحهٔ بازی.
 */
export const HEART_PATH_D =
  'M12 20.5c-5-3.9-8-6.8-8-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8 2.9c0 3.4-3 6.3-8 10.2z';

interface IconShapeProps {
  color: string;
  strokeWidth: number;
}

/**
 * هر آیکون با شکل‌های ساده هندسی رسم می‌شود تا در اندازه‌های کوچک هم خوانا
 * بماند. ضخامت خطوط نسبی است و با اندازه آیکون مقیاس می‌شود.
 */
function renderIcon(name: IconName, { color, strokeWidth }: IconShapeProps): React.ReactNode {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const filled = { fill: color };
  const strokeOnly = { fill: 'none', ...stroke };

  switch (name) {
    case 'heart':
    case 'heartFilled':
      return (
        <Path d={HEART_PATH_D} {...(name === 'heartFilled' ? filled : strokeOnly)} />
      );
    case 'coin':
      return (
        <G>
          <Circle cx={12} cy={12} r={9} {...filled} />
          <Circle cx={12} cy={12} r={5.4} fill="none" stroke={colors.surface} strokeWidth={strokeWidth} />
          <Line x1={12} y1={8.6} x2={12} y2={15.4} stroke={colors.surface} strokeWidth={strokeWidth} />
        </G>
      );
    case 'star':
      return <Polygon points={STAR_POINTS} {...filled} />;
    case 'sparkle':
      return <Polygon points={SPARKLE_POINTS} {...filled} />;
    case 'bulb':
      return (
        <G>
          <Path d="M12 3.2a5.6 5.6 0 0 0-3.2 10.2v1.7h6.4v-1.7A5.6 5.6 0 0 0 12 3.2z" {...strokeOnly} />
          <Line x1={9.6} y1={18.4} x2={14.4} y2={18.4} {...stroke} />
          <Line x1={10.6} y1={21} x2={13.4} y2={21} {...stroke} />
        </G>
      );
    case 'settings':
      return (
        <G>
          <Line x1={3.5} y1={7} x2={20.5} y2={7} {...stroke} />
          <Line x1={3.5} y1={12} x2={20.5} y2={12} {...stroke} />
          <Line x1={3.5} y1={17} x2={20.5} y2={17} {...stroke} />
          <Circle cx={9} cy={7} r={2.4} fill={color} />
          <Circle cx={15.5} cy={12} r={2.4} fill={color} />
          <Circle cx={7.5} cy={17} r={2.4} fill={color} />
        </G>
      );
    case 'back':
      return (
        <G>
          <Line x1={19} y1={12} x2={6} y2={12} {...stroke} />
          <Path d="M12 6l-6 6 6 6" {...strokeOnly} />
        </G>
      );
    case 'chevron':
      return <Path d="M10 5l7 7-7 7" {...strokeOnly} />;
    case 'sound':
      return (
        <G>
          <Path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3z" {...filled} />
          <Path d="M15.5 9.2a4 4 0 0 1 0 5.6" {...strokeOnly} />
          <Path d="M18.2 6.9a7.5 7.5 0 0 1 0 10.2" {...strokeOnly} />
        </G>
      );
    case 'soundOff':
      return (
        <G>
          <Path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3z" {...filled} />
          <Line x1={15.2} y1={9.8} x2={20.2} y2={14.8} {...stroke} />
          <Line x1={20.2} y1={9.8} x2={15.2} y2={14.8} {...stroke} />
        </G>
      );
    case 'vibrate':
      return (
        <G>
          <Rect x={8} y={4.5} width={8} height={15} rx={2} {...strokeOnly} />
          <Line x1={4.4} y1={9} x2={4.4} y2={15} {...stroke} />
          <Line x1={19.6} y1={9} x2={19.6} y2={15} {...stroke} />
        </G>
      );
    case 'lock':
      return (
        <G>
          <Rect x={5.5} y={10.5} width={13} height={9.5} rx={2.4} {...filled} />
          <Path d="M8.6 10.5V8.4a3.4 3.4 0 0 1 6.8 0v2.1" {...strokeOnly} />
        </G>
      );
    case 'check':
      return <Path d="M5 12.8l4.6 4.4L19 7.4" {...strokeOnly} />;
    case 'success':
      return (
        <G>
          <Circle cx={12} cy={12} r={9} {...filled} />
          <Path d="M7.8 12.4l2.9 2.8 5.5-6" fill="none" stroke={colors.surface} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      );
    case 'play':
      return <Polygon points="8,5 19,12 8,19" {...filled} />;
    case 'calendar':
      return (
        <G>
          <Rect x={4} y={5.8} width={16} height={14} rx={2.6} {...strokeOnly} />
          <Line x1={4} y1={10.2} x2={20} y2={10.2} {...stroke} />
          <Line x1={8.6} y1={3.6} x2={8.6} y2={7} {...stroke} />
          <Line x1={15.4} y1={3.6} x2={15.4} y2={7} {...stroke} />
        </G>
      );
    case 'gift':
      return (
        <G>
          <Rect x={4.2} y={10} width={15.6} height={9.6} rx={2} {...strokeOnly} />
          <Line x1={12} y1={10} x2={12} y2={19.6} {...stroke} />
          <Path d="M12 10a3 3 0 1 0-2.6-4.5C8.4 6.4 9.5 8 12 10z" {...strokeOnly} />
          <Path d="M12 10a3 3 0 1 1 2.6-4.5C15.6 6.4 14.5 8 12 10z" {...strokeOnly} />
        </G>
      );
    case 'trophy':
      return (
        <G>
          <Path d="M7 4.5h10v4.2a5 5 0 0 1-10 0z" {...filled} />
          <Path d="M7 5.6H4.6v1.2A3.2 3.2 0 0 0 7.6 10" {...strokeOnly} />
          <Path d="M17 5.6h2.4v1.2A3.2 3.2 0 0 1 16.4 10" {...strokeOnly} />
          <Rect x={10.6} y={13.4} width={2.8} height={4} {...filled} />
          <Rect x={7.8} y={17.4} width={8.4} height={2.6} rx={1.1} {...filled} />
        </G>
      );
    case 'medal':
      return (
        <G>
          <Path d="M8.4 3.5l3.6 6.2-3 1.6-3.4-6z" {...filled} />
          <Path d="M15.6 3.5l-3.6 6.2 3 1.6 3.4-6z" {...filled} />
          <Circle cx={12} cy={16} r={4.6} {...strokeOnly} />
          <Circle cx={12} cy={16} r={1.7} {...filled} />
        </G>
      );
    case 'info':
      return (
        <G>
          <Circle cx={12} cy={12} r={9} {...strokeOnly} />
          <Circle cx={12} cy={7.8} r={1.2} {...filled} />
          <Line x1={12} y1={11} x2={12} y2={16.4} {...stroke} />
        </G>
      );
    case 'shield':
      return (
        <G>
          <Path d="M12 3l7.5 2.8v5.4c0 4.6-3.1 8.7-7.5 10.4-4.4-1.7-7.5-5.8-7.5-10.4V5.8z" {...strokeOnly} />
          <Path d="M8.8 12.2l2.6 2.5 4.2-4.9" {...stroke} />
        </G>
      );
    case 'close':
      return (
        <G>
          <Line x1={6.4} y1={6.4} x2={17.6} y2={17.6} {...stroke} />
          <Line x1={17.6} y1={6.4} x2={6.4} y2={17.6} {...stroke} />
        </G>
      );
    case 'refresh':
      return (
        <G>
          <Path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.3" {...strokeOnly} />
          <Path d="M19.6 4.6v4.2h-4.2" {...strokeOnly} />
        </G>
      );
    case 'home':
      return (
        <G>
          <Path d="M4 10.6L12 4l8 6.6" {...strokeOnly} />
          <Path d="M6 10.2v9.3h12v-9.3" {...strokeOnly} />
          <Rect x={10.4} y={14.2} width={3.2} height={5.3} rx={1} {...filled} />
        </G>
      );
    case 'grid':
      return (
        <G>
          <Rect x={4} y={4} width={7} height={7} rx={2} {...filled} />
          <Rect x={13} y={4} width={7} height={7} rx={2} {...filled} />
          <Rect x={4} y={13} width={7} height={7} rx={2} {...filled} />
          <Rect x={13} y={13} width={7} height={7} rx={2} {...filled} />
        </G>
      );
    case 'flame':
      return (
        <Path
          d="M13.4 2.6c.5 3.3-1.8 4.6-3 6.4-1.4 2-1.6 4.6.4 6.2 1.9 1.5 4.9.8 5.9-1.3 1.3 2.7.4 6-2.9 7.5-3.4 1.5-7.6-.2-8.6-3.9-1-3.6 1-7.4 4.1-10.4.3 1.2 1 2.1 1.9 2.7.4-2.7-.3-5.3 2.2-7.2z"
          {...filled}
        />
      );
    case 'word':
      return (
        <G>
          <Rect x={3.6} y={5} width={16.8} height={14} rx={3} {...strokeOnly} />
          <Line x1={7.4} y1={9.6} x2={16.6} y2={9.6} {...stroke} />
          <Line x1={7.4} y1={13} x2={14.2} y2={13} {...stroke} />
        </G>
      );
    case 'clock':
      return (
        <G>
          <Circle cx={12} cy={12} r={8.8} {...strokeOnly} />
          <Path d="M12 7.2V12l3.4 2.2" {...strokeOnly} />
        </G>
      );
    case 'eye':
      return (
        <G>
          <Ellipse cx={12} cy={12} rx={8.8} ry={5.6} {...strokeOnly} />
          <Circle cx={12} cy={12} r={2.6} {...filled} />
        </G>
      );
    default:
      return <Circle cx={12} cy={12} r={8.6} {...strokeOnly} />;
  }
}

/**
 * آیکون.
 *
 * هر آیکون یک نمای مستقل react-native-svg می‌سازد و روی اندروید هر نمای SVG
 * بوم و Picture خودش را دارد؛ پس هم ساختنش هزینه دارد و هم بازسازی props‌اش.
 * همهٔ ورودی‌ها عدد/رشته‌اند، بنابراین `React.memo` باعث می‌شود آیکون‌ها در
 * رندرهای پرتکرار صفحه (هر تغییر انتخاب حرف، هر تیک شمارش معکوس) اصلاً دوباره
 * ساخته نشوند.
 */
export const Icon = React.memo(function Icon({
  name,
  size = 24,
  color = colors.textPrimary,
  strokeWidth,
}: IconProps) {
  const scaledStroke = strokeWidth ?? Math.max(1.4, size / 14);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderIcon(name, { color, strokeWidth: scaledStroke })}
    </Svg>
  );
});
