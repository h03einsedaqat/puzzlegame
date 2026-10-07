import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { strings } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWheelGestures, type WheelPointerStore } from '../../hooks/useWheelGestures';
import {
  computeWheelGeometry,
  positionOf,
  preferredTileSizeFor,
  type WheelGeometry,
} from '../../services/game/wheelGesture';
import { colors, radius } from '../../theme';
import { format, toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { LetterTile } from './LetterTile';
import type { LetterTileData } from '../../types';

export interface LetterWheelProps {
  tiles: readonly LetterTileData[];
  /** انتخاب فعلی بازی؛ منبع حقیقت رندر */
  selectedIds: readonly string[];
  /** لمس ساده یک حرف (دکمه کاشی؛ برای دسترس‌پذیری و صفحه‌های بزرگ‌متن) */
  onTilePress: (tileId: string) => void;
  /** دنباله انتخاب در طول کشیدن؛ یک‌جا و قطعی نوشته می‌شود */
  onSelectionChange: (tileIds: readonly string[]) => void;
  /** برداشتن انگشت پس از یک کشیدن واقعی؛ واژه باید ثبت شود */
  onRelease: (tileIds: readonly string[]) => void;
  disabled?: boolean;
  /** قطر چرخ؛ از چیدمان صفحه می‌آید */
  diameter?: number;
  /** اندازه کاشی پیشنهادی؛ هندسه در صورت نیاز آن را کوچک‌تر می‌کند */
  preferredTileSize?: number;
  accessibilityLabel?: string;
  foundCount?: number;
  totalCount?: number;
  /** ترتیب کاشی‌هایی که باید زده شوند (راهنمای گام‌به‌گام) */
  guideTileIds?: readonly string[];
  /** هنگام شروع/پایان کشیدن خبر می‌دهد تا ثبت خودکار معلق شود */
  onDragStateChange?: (dragging: boolean) => void;
}

const DEFAULT_DIAMETER = 300;

/**
 * چرخ حروف.
 *
 * حروف دور یک دایره می‌نشینند؛ با لمس یک حرف انتخاب می‌شود و با کشیدن انگشت
 * روی چند حرف، واژه ساخته می‌شود. با برداشتن انگشت پس از کشیدن، خودِ چرخ خبر
 * می‌دهد که واژه باید ثبت شود.
 *
 * سه تصمیم معماری که پایداری این بخش را می‌سازند:
 *
 *   ۱) **یک سطح تعاملی، نه چند تا.** کل چرخ یک `GestureDetector` است و کشیدن
 *      فقط از همین یک مسیر می‌آید. کاشی‌ها دیگر با کشیدن رقابت نمی‌کنند؛
 *      دکمه‌های کاشی فقط برای لمس ساده و صفحه‌خوان‌ها هستند و به‌محض فعال‌شدن
 *      ژست کشیدن، سیستم به‌صورت بومی لمس آن‌ها را لغو می‌کند.
 *   ۲) **یک دستگاه مختصات.** هندسه کاشی‌ها و نقطه انگشت هر دو در مختصات خودِ
 *      چرخ‌اند (`event.x/y` دستگیره ژست نسبت به همین نما گزارش می‌شود)؛ پس نه
 *      `measureInWindow` غیرهمگام لازم است و نه `pageX - origin`.
 *   ۳) **انتخاب در لایه لمس، رندر در React.** دنباله انتخاب در ماشین حالت خالص
 *      نگه داشته می‌شود و نقطه انگشت با حداکثر یک بار در هر فریم منتشر می‌شود؛
 *      پس کشیدن سریع نه حرفی را جا می‌گذارد و نه کاشی‌ها را دوباره رندر می‌کند.
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

  const { gesture, pointer } = useWheelGestures({
    enabled: !disabled,
    geometry,
    selection: selectedIds,
    onSelectionChange,
    onRelease,
    onDragStateChange,
  });

  const progressRatio =
    totalCount > 0 ? Math.max(0, Math.min(1, foundCount / totalCount)) : 0;

  // راهنمای فعال: کاشی بعدی که باید زده شود و کاشی‌هایی که بازیکن طبق نقشه زده است.
  const guide = useMemo(() => {
    if (!guideTileIds || guideTileIds.length === 0) {
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
  const guidePulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion || !guide.nextTileId) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulse, { toValue: 1, duration: 620, useNativeDriver: true }),
        Animated.timing(guidePulse, { toValue: 0, duration: 620, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [guide.nextTileId, guidePulse, reducedMotion]);

  if (tiles.length === 0) {
    return <View style={{ height: diameter }} />;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.wheel, { width: diameter, height: diameter }]}
        accessibilityLabel={accessibilityLabel}
      >
        <WheelBackdrop
          geometry={geometry}
          progressRatio={progressRatio}
          foundCount={foundCount}
          totalCount={totalCount}
        />
        <WheelSelectionBeads geometry={geometry} selectedIds={selectedIds} />
        <WheelSelectionPath geometry={geometry} selectedIds={selectedIds} pointer={pointer} />
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

const CENTER_RING = 50;

/**
 * لایه ثابت چرخ: سینی، حلقه‌ها، حلقه پیشرفت و نشان وسط.
 * با `memo` جدا شده تا کشیدن انگشت (که فقط مسیر انتخاب را عوض می‌کند) این لایه
 * را دوباره نسازد.
 */
const WheelBackdrop = React.memo(function WheelBackdrop({
  geometry,
  progressRatio,
  foundCount,
  totalCount,
}: WheelBackdropProps) {
  const { diameter, center, tileSize } = geometry;
  const trayRadius = Math.max(tileSize, diameter / 2 - tileSize / 2);
  const badgeSize = Math.round(Math.min(Math.max(diameter * 0.27, 62), 92));

  return (
    <>
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={center.x} cy={center.y} r={trayRadius} fill={colors.surface} opacity={0.72} />
        <Circle
          cx={center.x}
          cy={center.y}
          r={trayRadius}
          stroke={colors.accent}
          strokeWidth={3}
          fill="none"
          opacity={0.5}
        />
        <Circle
          cx={center.x}
          cy={center.y}
          r={Math.max(tileSize * 0.6, diameter / 2 - tileSize * 1.1)}
          stroke={colors.borderStrong}
          strokeWidth={1.5}
          fill="none"
          strokeDasharray="8 8"
          opacity={0.7}
        />
        <Circle
          cx={center.x}
          cy={center.y}
          r={CENTER_RING}
          stroke={colors.border}
          strokeWidth={6}
          fill="none"
          opacity={0.8}
        />
        <Circle
          cx={center.x}
          cy={center.y}
          r={CENTER_RING}
          stroke={colors.success}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * CENTER_RING}`}
          strokeDashoffset={2 * Math.PI * CENTER_RING * (1 - progressRatio)}
          transform={`rotate(-90 ${center.x} ${center.y})`}
        />
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
        <AppText
          variant={badgeSize >= 80 ? 'numericLarge' : 'numeric'}
          color={colors.primaryDark}
          allowFontScaling={false}
        >
          {toPersianDigits(foundCount)}/{toPersianDigits(totalCount)}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1} allowFontScaling={false}>
          {strings.game.wheelHint}
        </AppText>
      </View>
    </>
  );
});

interface WheelSelectionProps {
  geometry: WheelGeometry;
  selectedIds: readonly string[];
}

/** مهره‌های انتخاب: یک نقطه در مرکز هر حرف انتخاب‌شده (و نه بیشتر). */
const WheelSelectionBeads = React.memo(function WheelSelectionBeads({
  geometry,
  selectedIds,
}: WheelSelectionProps) {
  const centers = useMemo(
    () =>
      selectedIds
        .map(id => positionOf(geometry, id))
        .filter((position): position is NonNullable<typeof position> => position !== undefined),
    [geometry, selectedIds],
  );

  if (centers.length === 0) {
    return null;
  }

  return (
    <Svg
      width={geometry.diameter}
      height={geometry.diameter}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {centers.map(center => (
        <Circle key={center.id} cx={center.x} cy={center.y} r={4.5} fill={colors.brandTeal} />
      ))}
    </Svg>
  );
});

interface WheelSelectionPathProps extends WheelSelectionProps {
  pointer: WheelPointerStore;
}

/**
 * خط زنجیره انتخاب.
 *
 * `Polyline` (نه `Polygon`) رسم می‌شود تا مسیر هیچ‌وقت بسته نشود؛ مسیر از مرکز
 * کاشی اول می‌گذرد، تا مرکز آخرین کاشی می‌آید و اگر انگشت جلوتر باشد تا خود
 * انگشت ادامه پیدا می‌کند. نقطه انگشت با حداکثر یک بار در هر فریم می‌رسد، پس
 * این جزء تنها بخشی است که هنگام حرکت انگشت رندر می‌شود.
 */
function WheelSelectionPath({ geometry, selectedIds, pointer }: WheelSelectionPathProps) {
  const finger = useSyncExternalStore(pointer.subscribe, pointer.getSnapshot);

  const points = useMemo(() => {
    const centers = selectedIds
      .map(id => positionOf(geometry, id))
      .filter((position): position is NonNullable<typeof position> => position !== undefined)
      .map(position => ({ x: position.x, y: position.y }));

    if (finger) {
      const last = centers[centers.length - 1];
      // فقط وقتی انگشت «روی خودِ کاشی» آخر است نقطه‌اش اضافه نمی‌شود؛ در بقیه
      // حالت‌ها مسیر تا انگشت کشیده می‌شود. ملاک، شعاع دیداری کاشی است (نه ناحیه
      // لمس که عمداً بزرگ‌تر است) تا خط دقیقاً انگشت را دنبال کند.
      const visualRadius = geometry.tileSize / 2;
      const fingerOnLastTile =
        last !== undefined && Math.hypot(last.x - finger.x, last.y - finger.y) <= visualRadius;
      if (!fingerOnLastTile) {
        centers.push(finger);
      }
    }

    return centers;
  }, [finger, geometry, selectedIds]);

  if (points.length < 2) {
    return null;
  }

  return (
    <Svg
      width={geometry.diameter}
      height={geometry.diameter}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Polyline
        points={points.map(point => `${point.x},${point.y}`).join(' ')}
        fill="none"
        stroke={colors.brandTeal}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface WheelTilesProps {
  geometry: WheelGeometry;
  selectedIds: readonly string[];
  disabled: boolean;
  onTilePress: (tileId: string) => void;
  guide: { nextTileId: string | null; matched: number; planned: readonly string[] };
  pulse: Animated.Value;
}

/**
 * لایه کاشی‌ها.
 *
 * از بدنه چرخ جدا و `memo` است تا هنگام کشیدن انگشت — که مسیر انتخاب هر فریم
 * به‌روز می‌شود — کاشی‌ها دوباره ساخته نشوند.
 */
const WheelTiles = React.memo(function WheelTiles({
  geometry,
  selectedIds,
  disabled,
  onTilePress,
  guide,
  pulse,
}: WheelTilesProps) {
  const { tileSize } = geometry;
  const guideScale = useMemo(
    () => pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }),
    [pulse],
  );

  return (
    <>
      {geometry.positions.map(position => {
        const stepIndex = guide.planned.indexOf(position.id);
        return (
          <View
            key={position.id}
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
            <Animated.View
              style={position.id === guide.nextTileId ? { transform: [{ scale: guideScale }] } : undefined}
            >
              <LetterTile
                tileId={position.id}
                char={position.char}
                size={tileSize}
                selected={selectedIds.includes(position.id)}
                disabled={disabled}
                onPress={onTilePress}
                accessibilityLabel={format(strings.accessibility.letterTile, { letter: position.char })}
              />
            </Animated.View>
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
                style={[styles.guideRing, { width: tileSize + 14, height: tileSize + 14 }]}
              />
            ) : null}
          </View>
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  wheel: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBadge: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  tileSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideRing: {
    position: 'absolute',
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: colors.accent,
    opacity: 0.9,
  },
  stepBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
