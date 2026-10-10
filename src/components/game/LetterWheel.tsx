import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { strings } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWheelGestures } from '../../hooks/useWheelGestures';
import {
  buildSelectionSegments,
  buildTailSpec,
  computeWheelGeometry,
  positionOf,
  preferredTileSizeFor,
  type WheelGeometry,
  type WheelSelectionSegment,
} from '../../services/game/wheelGesture';
import { colors, radius } from '../../theme';
import { format, toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { LetterTile } from './LetterTile';
import type { LetterTileData } from '../../types';

export interface LetterWheelProps {
  tiles: readonly LetterTileData[];
  selectedIds: readonly string[];
  onTilePress: (tileId: string) => void;
  onSelectionChange: (tileIds: readonly string[]) => void;
  onRelease: (tileIds: readonly string[]) => void;
  disabled?: boolean;
  diameter?: number;
  preferredTileSize?: number;
  accessibilityLabel?: string;
  foundCount?: number;
  totalCount?: number;
  guideTileIds?: readonly string[];
  onDragStateChange?: (dragging: boolean) => void;
}

const DEFAULT_DIAMETER = 300;

/** ضخامت خط اتصال و هالهٔ آن؛ همان اعدادی که پیش‌تر در SVG استفاده می‌شد. */
const PATH_STROKE = 5;
const PATH_GLOW = 12;
const PATH_GLOW_OPACITY = 0.16;
const BEAD_SIZE = 7;

/** شناسهٔ آزمون لایهٔ مسیر انتخاب؛ آزمون نگهبانِ «بدون SVG» از این‌ها استفاده می‌کند. */
export const WHEEL_SELECTION_TEST_IDS = {
  bead: 'wheel-selection-bead',
  segmentGlow: 'wheel-selection-segment-glow',
  segmentLine: 'wheel-selection-segment-line',
  tailGlow: 'wheel-selection-tail-glow',
  tailLine: 'wheel-selection-tail-line',
} as const;

/** وضعیت «خطی کشیده نمی‌شود»؛ شکلش با خروجی واقعی یکسان است تا کلیدهای transform ثابت بمانند. */
const HIDDEN_TAIL = {
  visible: false,
  length: 0,
  angle: 0,
  scaleX: 0,
  translateX: 0,
  translateY: 0,
};

interface TileCenter {
  id: string;
  x: number;
  y: number;
}

/**
 * چرخ حروف لایه‌لایه.
 *
 * تفکیک لایه‌ها عمدی است: پوستهٔ ثابت (SVG) و کاشی‌ها فقط وقتی دوباره ساخته
 * می‌شوند که واقعاً چیزی عوض شده باشد، و لایهٔ مسیر انتخاب هیچ SVG‌ای ندارد تا
 * در هر فریمِ کشیدن، کار سنگین رسم برداری روی اندروید انجام نشود.
 */
export const LetterWheel = React.memo(function LetterWheel({
  tiles,
  selectedIds,
  onTilePress,
  onSelectionChange,
  onRelease,
  disabled = false,
  diameter = DEFAULT_DIAMETER,
  preferredTileSize,
  accessibilityLabel,
  foundCount = 0,
  totalCount = 0,
  guideTileIds,
  onDragStateChange,
}: LetterWheelProps) {
  const preferred = useMemo(
    () => preferredTileSize ?? preferredTileSizeFor(diameter, Math.max(tiles.length, 1)),
    [diameter, preferredTileSize, tiles.length],
  );
  const geometry = useMemo(
    () => computeWheelGeometry({ tiles, diameter, preferredTileSize: preferred }),
    [diameter, preferred, tiles],
  );
  const { gesture, pointerX, pointerY, pathOpacity } = useWheelGestures({
    enabled: !disabled,
    geometry,
    selection: selectedIds,
    onSelectionChange,
    onRelease,
    onDragStateChange,
  });
  const progressRatio = totalCount > 0 ? Math.max(0, Math.min(1, foundCount / totalCount)) : 0;

  const guide = useMemo(() => {
    if (!guideTileIds?.length) {
      return { nextTileId: null as string | null, matched: 0, planned: [] as readonly string[] };
    }
    let matched = 0;
    while (matched < guideTileIds.length && selectedIds.includes(guideTileIds[matched] as string)) {
      matched += 1;
    }
    return {
      nextTileId: (guideTileIds[matched] ?? null) as string | null,
      matched,
      planned: guideTileIds,
    };
  }, [guideTileIds, selectedIds]);

  const reducedMotion = useReducedMotion();
  const guidePulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(guidePulse);
    if (reducedMotion || !guide.nextTileId) {
      guidePulse.value = 0;
      return;
    }
    guidePulse.value = withRepeat(withTiming(1, { duration: 640 }), -1, true);
    return () => cancelAnimation(guidePulse);
  }, [guide.nextTileId, guidePulse, reducedMotion]);

  if (tiles.length === 0) {
    return <View style={{ height: diameter }} />;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View
        testID="letter-wheel-surface"
        style={[styles.wheel, { width: diameter, height: diameter }]}
        accessibilityLabel={accessibilityLabel}
      >
        <WheelBackdrop
          geometry={geometry}
          progressRatio={progressRatio}
          foundCount={foundCount}
          totalCount={totalCount}
        />
        <WheelSelectionLayer
          geometry={geometry}
          selectedIds={selectedIds}
          pointerX={pointerX}
          pointerY={pointerY}
          pathOpacity={pathOpacity}
        />
        <WheelTiles
          geometry={geometry}
          selectedIds={selectedIds}
          disabled={disabled}
          onTilePress={onTilePress}
          guide={guide}
          pulse={guidePulse}
        />
      </View>
    </GestureDetector>
  );
});

interface WheelBackdropProps {
  geometry: WheelGeometry;
  progressRatio: number;
  foundCount: number;
  totalCount: number;
}

const WheelBackdrop = React.memo(function WheelBackdrop({
  geometry,
  progressRatio,
  foundCount,
  totalCount,
}: WheelBackdropProps) {
  const { diameter, center, tileSize } = geometry;
  const plateRadius = Math.max(tileSize, diameter / 2 - tileSize / 2);
  const progressRadius = Math.min(43, Math.max(34, diameter * 0.145));
  const progressCircumference = 2 * Math.PI * progressRadius;
  const badgeSize = Math.round(Math.min(Math.max(diameter * 0.25, 60), 82));

  return (
    <>
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={center.x} cy={center.y} r={plateRadius} fill={colors.surfaceGlass} />
        <Circle
          cx={center.x}
          cy={center.y}
          r={plateRadius}
          stroke={colors.borderStrong}
          strokeWidth={1.25}
          fill="none"
          opacity={0.58}
        />
        <Circle
          cx={center.x}
          cy={center.y}
          r={Math.max(tileSize * 0.8, diameter / 2 - tileSize * 1.2)}
          stroke={colors.border}
          strokeWidth={1}
          fill="none"
          strokeDasharray="2 8"
          opacity={0.78}
        />
        <Circle
          cx={center.x}
          cy={center.y}
          r={progressRadius}
          stroke={colors.border}
          strokeWidth={4}
          fill="none"
        />
        {progressRatio > 0 ? (
          <Circle
            cx={center.x}
            cy={center.y}
            r={progressRadius}
            stroke={colors.brandTeal}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progressCircumference}`}
            strokeDashoffset={progressCircumference * (1 - progressRatio)}
            transform={`rotate(-90 ${center.x} ${center.y})`}
          />
        ) : null}
      </Svg>
      <View
        pointerEvents="none"
        style={[
          styles.centerBadge,
          {
            width: badgeSize,
            height: badgeSize,
            left: center.x - badgeSize / 2,
            top: center.y - badgeSize / 2,
          },
        ]}
      >
        <AppText variant="numericLarge" color={colors.textPrimary} allowFontScaling={false}>
          {toPersianDigits(foundCount)}/{toPersianDigits(totalCount)}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1} allowFontScaling={false}>
          {strings.game.wheelHint}
        </AppText>
      </View>
    </>
  );
});

interface WheelSelectionLayerProps {
  geometry: WheelGeometry;
  selectedIds: readonly string[];
  pointerX: SharedValue<number>;
  pointerY: SharedValue<number>;
  pathOpacity: SharedValue<number>;
}

/**
 * لایهٔ مسیر انتخاب — بدون SVG.
 *
 * دو بخش دارد:
 * ۱) پاره‌خط‌های بین کاشی‌های انتخاب‌شده: فقط وقتی انتخاب عوض می‌شود ساخته
 *    می‌شوند (چند بار در هر کشیدن) و `View` معمولی‌اند.
 * ۲) «دمِ» زنده از آخرین کاشی تا نوک انگشت: یک `Animated.View` که فقط با
 *    `transform` و `opacity` روی ترد رابط کاربری به‌روز می‌شود.
 *
 * چرا نه SVG؟ چون `Polyline` در react-native-svg یک کامپوننت کلاسیِ واسطه است
 * (خودش `Path` را رندر می‌کند) و Reanimated نمی‌تواند برای آن شناسهٔ نمای Fabric
 * بگیرد؛ در نتیجه `useAnimatedProps` در هر فریم یک به‌روزرسانی props بومی با
 * shadow node نامعتبر می‌فرستاد. روی اندروید همین باعث قفل‌شدن لمس می‌شد.
 * اینجا هیچ کار پرهزینه‌ای در فریم‌های میانی وجود ندارد.
 */
const WheelSelectionLayer = React.memo(function WheelSelectionLayer({
  geometry,
  selectedIds,
  pointerX,
  pointerY,
  pathOpacity,
}: WheelSelectionLayerProps) {
  const centers = useMemo<TileCenter[]>(
    () =>
      selectedIds.reduce<TileCenter[]>((acc, id) => {
        const position = positionOf(geometry, id);
        if (position) {
          acc.push({ id: position.id, x: position.x, y: position.y });
        }
        return acc;
      }, []),
    [geometry, selectedIds],
  );

  /** هندسهٔ خط‌های بین کاشی‌ها؛ تابع خالص مشترک با آزمون‌ها. */
  const segments = useMemo<readonly WheelSelectionSegment[]>(
    () => buildSelectionSegments(geometry, selectedIds),
    [geometry, selectedIds],
  );

  const anchor = centers.length > 0 ? (centers[centers.length - 1] as TileCenter) : null;
  const anchorX = anchor ? anchor.x : 0;
  const anchorY = anchor ? anchor.y : 0;
  const hasAnchor = anchor !== null;
  const barSpan = Math.max(1, geometry.diameter);
  const visualRadius = geometry.visualRadius || geometry.tileSize / 2;

  /**
   * سبک‌های ثابت نوارها.
   *
   * با `useMemo` ساخته می‌شوند تا آرایهٔ style در هر رندرِ این لایه هویت تازه
   * نگیرد؛ در غیر این صورت کامپوننت انیمیشنی ری‌انیمیتد در هر تغییر انتخاب،
   * props غیرانیمیشنی را دوباره غربال و ثبت می‌کرد.
   */
  const glowBarStyle = useMemo(() => barBaseStyle(barSpan, PATH_GLOW), [barSpan]);
  const mainBarStyle = useMemo(() => barBaseStyle(barSpan, PATH_STROKE), [barSpan]);

  /** محو شدن کل لایه در پایان کشیدن؛ فقط همین یک مقدار انیمیت می‌شود. */
  const fadeStyle = useAnimatedStyle(
    () => ({
      opacity: pathOpacity.value,
    }),
    [pathOpacity],
  );

  /**
   * دمِ زنده. همهٔ محاسبه‌ها روی ترد رابط کاربری انجام می‌شود و خروجی فقط
   * `transform` و `opacity` است؛ یعنی هیچ layout دوباره‌ای رخ نمی‌دهد.
   *
   * هاله و خط اصلی هرکدام opacity پایهٔ خودش را دارد، پس دو سبک جدا ساخته
   * می‌شود؛ در غیر این صورت opacity پویا، opacity ثابت هاله را می‌بلعید.
   */
  const glowTailStyle = useTailStyle(
    PATH_GLOW_OPACITY,
    hasAnchor,
    anchorX,
    anchorY,
    barSpan,
    visualRadius,
    pointerX,
    pointerY,
  );
  const mainTailStyle = useTailStyle(
    1,
    hasAnchor,
    anchorX,
    anchorY,
    barSpan,
    visualRadius,
    pointerX,
    pointerY,
  );

  if (centers.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* دانه‌های انتخاب همیشه دیده می‌شوند (مثل نسخهٔ پیشین). */}
      {centers.map(center => (
        <View
          key={`bead-${center.id}`}
          testID={WHEEL_SELECTION_TEST_IDS.bead}
          style={[styles.bead, { left: center.x - BEAD_SIZE / 2, top: center.y - BEAD_SIZE / 2 }]}
        />
      ))}

      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        {segments.map((segment, index) => (
          <View
            key={`glow-${index}-${segment.from}-${segment.to}`}
            testID={WHEEL_SELECTION_TEST_IDS.segmentGlow}
            style={segmentStyle(segment, PATH_GLOW, PATH_GLOW_OPACITY)}
          />
        ))}
        {segments.map((segment, index) => (
          <View
            key={`line-${index}-${segment.from}-${segment.to}`}
            testID={WHEEL_SELECTION_TEST_IDS.segmentLine}
            style={segmentStyle(segment, PATH_STROKE, 1)}
          />
        ))}
        <Animated.View
          testID={WHEEL_SELECTION_TEST_IDS.tailGlow}
          style={[styles.tailBar, glowBarStyle, glowTailStyle]}
        />
        <Animated.View
          testID={WHEEL_SELECTION_TEST_IDS.tailLine}
          style={[styles.tailBar, mainBarStyle, mainTailStyle]}
        />
      </Animated.View>
    </View>
  );
});

/**
 * پاره‌خط ثابت بین دو کاشی.
 *
 * نوار در مبدأ مطلق ساخته می‌شود و با `translate` به میانهٔ دو کاشی و با
 * `rotate` به سمت درست می‌رود؛ مبدأ چرخش پیش‌فرض مرکز نما است، پس میانهٔ
 * نوار دقیقاً روی میانهٔ دو کاشی می‌نشیند.
 */
function segmentStyle(segment: WheelSelectionSegment, thickness: number, opacity: number) {
  return {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: segment.length,
    height: thickness,
    borderRadius: thickness / 2,
    backgroundColor: colors.brandTeal,
    opacity,
    transform: [
      { translateX: segment.midX - segment.length / 2 },
      { translateY: segment.midY - thickness / 2 },
      { rotate: `${segment.angle}rad` },
    ],
  };
}

/**
 * نوار پایهٔ «دمِ» زنده.
 *
 * عرضش ثابت (قطر چرخ) است و طول واقعی با `scaleX` ساخته می‌شود تا تغییر طول
 * هیچ چیدمان دوباره‌ای لازم نشود. `top` منفی است چون مبدأ چرخش پیش‌فرض
 * مرکز نماست: با این کار مرکز نوار روی خط y=0 می‌نشیند و `translateY` در
 * انیمیشن می‌تواند مستقیم همان «میانهٔ دو نقطه» باشد. opacity را سبک
 * انیمیشنی می‌گذارد، نه این سبک ثابت.
 */
function barBaseStyle(span: number, thickness: number) {
  return {
    width: span,
    height: thickness,
    top: -thickness / 2,
    borderRadius: thickness / 2,
    backgroundColor: colors.brandTeal,
  };
}

/**
 * سبک انیمیشنی «دمِ» خط انتخاب.
 *
 * شکل خروجی عمداً در همهٔ حالت‌ها یکسان است (همان چهار مؤلفهٔ `transform` به
 * همراه `opacity`)؛ اگر کلیدهای transform بین فریم‌ها عوض شود، به‌روزرسانِ
 * props ری‌انیمیتد نمی‌تواند روی مسیر سریع بماند و کل props نما را از نو
 * می‌نویسد. وابستگی‌ها همگی عدد/بولی‌اند تا worklet فقط وقتی واقعاً لازم است
 * دوباره ثبت شود.
 */
function useTailStyle(
  baseOpacity: number,
  hasAnchor: boolean,
  anchorX: number,
  anchorY: number,
  barSpan: number,
  visualRadius: number,
  pointerX: SharedValue<number>,
  pointerY: SharedValue<number>,
) {
  return useAnimatedStyle(() => {
    'worklet';
    // تا وقتی انگشت داخل خود کاشی است خطی کشیده نمی‌شود (همان رفتار نسخهٔ وب).
    const spec = hasAnchor
      ? buildTailSpec(visualRadius, barSpan, { x: anchorX, y: anchorY }, { x: pointerX.value, y: pointerY.value })
      : HIDDEN_TAIL;
    return {
      opacity: spec.visible ? baseOpacity : 0,
      transform: [
        { translateX: spec.translateX },
        { translateY: spec.translateY },
        { rotate: `${spec.angle}rad` },
        { scaleX: spec.scaleX },
      ],
    };
  }, [anchorX, anchorY, barSpan, baseOpacity, hasAnchor, pointerX, pointerY, visualRadius]);
}

interface WheelTilesProps {
  geometry: WheelGeometry;
  selectedIds: readonly string[];
  disabled: boolean;
  onTilePress: (tileId: string) => void;
  guide: { nextTileId: string | null; matched: number; planned: readonly string[] };
  pulse: SharedValue<number>;
}

const WheelTiles = React.memo(function WheelTiles({
  geometry,
  selectedIds,
  disabled,
  onTilePress,
  guide,
  pulse,
}: WheelTilesProps) {
  const { tileSize } = geometry;

  return (
    <>
      {geometry.positions.map(position => {
        const stepIndex = guide.planned.indexOf(position.id);
        return (
          <View
            key={position.id}
            pointerEvents="none"
            style={[
              styles.tileSlot,
              {
                width: tileSize,
                height: tileSize,
                left: position.x - tileSize / 2,
                top: position.y - tileSize / 2,
              },
            ]}
          >
            {position.id === guide.nextTileId ? (
              <AnimatedGuideTile pulse={pulse}>
                <LetterTile
                  tileId={position.id}
                  char={position.char}
                  size={tileSize}
                  selected={selectedIds.includes(position.id)}
                  hinted
                  disabled={disabled}
                  onPress={onTilePress}
                  accessibilityLabel={format(strings.accessibility.letterTile, { letter: position.char })}
                />
              </AnimatedGuideTile>
            ) : (
              <LetterTile
                tileId={position.id}
                char={position.char}
                size={tileSize}
                selected={selectedIds.includes(position.id)}
                disabled={disabled}
                onPress={onTilePress}
                accessibilityLabel={format(strings.accessibility.letterTile, { letter: position.char })}
              />
            )}
            {stepIndex >= 0 && stepIndex < guide.matched ? (
              <View pointerEvents="none" style={styles.stepBadge}>
                <AppText variant="caption" color={colors.textInverse} allowFontScaling={false}>
                  {toPersianDigits(stepIndex + 1)}
                </AppText>
              </View>
            ) : null}
            {position.id === guide.nextTileId ? (
              <View
                pointerEvents="none"
                style={[styles.guideRing, { width: tileSize + 12, height: tileSize + 12 }]}
              />
            ) : null}
          </View>
        );
      })}
    </>
  );
});

function AnimatedGuideTile({
  pulse,
  children,
}: {
  pulse: SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.055 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wheel: {
    // Gesture x and SVG coordinates always grow from the physical left.
    // React Native swaps absolute `left` to logical `start` under RTL; without
    // an LTR island the visible side tiles (and connector bars) are mirrored
    // while gesture hit-testing is not. Keep RTL for the rest of the game.
    direction: 'ltr',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  centerBadge: {
    position: 'absolute',
    // متن و شمارنده فارسی بماند؛ فقط مختصات سطح چرخ باید LTR باشد.
    direction: 'rtl',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  bead: {
    position: 'absolute',
    width: BEAD_SIZE,
    height: BEAD_SIZE,
    borderRadius: BEAD_SIZE / 2,
    backgroundColor: colors.brandTeal,
  },
  tailBar: {
    position: 'absolute',
    left: 0,
  },
  tileSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  guideRing: {
    position: 'absolute',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    opacity: 0.72,
  },
  stepBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
});
