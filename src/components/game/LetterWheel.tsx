import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { strings } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { applyWheelTouch, nearestTileId, resolveWheelTouch } from '../../services/game/wheelGesture';
import { colors, radius } from '../../theme';
import { format, toPersianDigits } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { LetterTile } from './LetterTile';
import type { LetterTileData } from '../../types';

export interface LetterWheelProps {
  tiles: readonly LetterTileData[];
  selectedIds: readonly string[];
  onTilePress: (tileId: string) => void;
  /** برداشتن کاشی از انتخاب (برای برگشتن روی حرف قبلی هنگام کشیدن) */
  onTileRemove: (tileId: string) => void;
  /** با برداشتن انگشت پس از یک «کشیدن»، خودش کلمه را ثبت می‌کند (مثل بازی‌های کلمه‌ای) */
  onAutoSubmit: () => void;
  disabled?: boolean;
  /** قطر چرخ؛ معمولاً از عرض و ارتفاع صفحه می‌آید */
  diameter?: number;
  tileSize?: number;
  accessibilityLabel?: string;
  /** پیشرفت کلمه‌های اصلی مرحله؛ حلقه وسط چرخ را پر می‌کند */
  foundCount?: number;
  totalCount?: number;
  /**
   * راهنمای گام‌به‌گام: ترتیب کاشی‌هایی که باید زده شوند. کاشی «بعدی» با حلقه
   * چشمک‌زن طلایی روشن می‌شود و کاشی‌های پشت‌سرهم‌زده‌شده شماره می‌گیرند.
   */
  guideTileIds?: readonly string[];
}

const DEFAULT_TILE = 58;
/** فاصله کمینه بین دو به‌روزرسانی ردیاب انگشت (میلی‌ثانیه)؛ روی گوشی ضعیف روان می‌ماند */
const FINGER_THROTTLE_MS = 50;
/** آستانه شروع کشیدن: کمتر از این، لمس ساده است و به کاشی می‌رسد */
const DRAG_THRESHOLD = 6;

interface Point {
  x: number;
  y: number;
}

/** تنها چیزی که از View لازم داریم: اندازه‌گیری جای دقیق چرخ روی صفحه */
interface Measurable {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
  measure?: (
    callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void,
  ) => void;
}

/**
 * چرخ حروف — حروف دور یک دایره می‌نشینند و با **کشیدن انگشت** روی آن‌ها کلمه
 * ساخته می‌شود؛ با برداشتن انگشت کلمه خودش ثبت می‌شود. لمس تک‌تک حروف هم کار
 * می‌کند (برای دسترس‌پذیری و صفحه‌های بزرگ‌متن).
 *
 * نکته‌های مهمی که این نسخه رعایت می‌کند تا روی گوشی واقعی هیچ‌وقت «گیر» نکند:
 *   ۱) جای چرخ روی صفحه در **شروع هر کشیدن** دوباره اندازه‌گیری می‌شود
 *      (`measureInWindow`)؛ پس اگر چیدمان صفحه جابه‌جا شود — مثلاً نوار راهنما
 *      بالای چرخ ظاهر شود یا سرصفحه ارتفاعش عوض شود — محدوده لمس همچنان دقیق است.
 *   ۲) انتخاب در همان لحظه در یک `ref` نگه داشته می‌شود، نه در وضعیت React؛ پس
 *      کشیدن سریع هیچ حرفی را جا نمی‌گذارد.
 *   ۳) `onPanResponderTerminationRequest` هرگز اجازه نمی‌دهد والد (اسکرول یا
 *      هر جزء دیگر) وسط کشیدن، گرفتن انگشت را از چرخ بگیرد.
 */
export function LetterWheel({
  tiles,
  selectedIds,
  onTilePress,
  onTileRemove,
  onAutoSubmit,
  disabled = false,
  diameter = 300,
  tileSize = DEFAULT_TILE,
  accessibilityLabel,
  foundCount = 0,
  totalCount = 0,
  guideTileIds,
}: LetterWheelProps) {
  const [finger, setFinger] = useState<Point | null>(null);
  const containerRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const draggingRef = useRef(false);
  const lastFingerAtRef = useRef(0);

  const center = { x: diameter / 2, y: diameter / 2 };
  const progressRatio = totalCount > 0 ? Math.max(0, Math.min(1, foundCount / totalCount)) : 0;

  /** ترتیب کاشی‌ها روی دایره با زاویه؛ از بالا و ساعتگرد */
  const positions = useMemo(() => {
    const count = Math.max(tiles.length, 1);
    const orbit = Math.max(tileSize * 1.55, diameter / 2 - tileSize / 2 - 6);
    return tiles.map((tile, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
      return {
        id: tile.id,
        char: tile.char,
        x: center.x + orbit * Math.cos(angle),
        y: center.y + orbit * Math.sin(angle),
      };
    });
  }, [center.x, center.y, diameter, tileSize, tiles]);

  const positionById = useMemo(() => {
    const map = new Map<string, Point>();
    for (const position of positions) {
      map.set(position.id, { x: position.x, y: position.y });
    }
    return map;
  }, [positions]);

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
  const guideScale = guidePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  /**
   * آینه‌ی انتخاب در یک ref.
   * کشیدن سریع‌تر از چرخه رندر است؛ اگر هر لمس منتظر به‌روزشدن وضعیت React
   * بماند، حرف‌ها جا می‌افتند و اصلاح اشتباه کار نمی‌کند.
   */
  const selectionRef = useRef<readonly string[]>(selectedIds);
  useEffect(() => {
    selectionRef.current = selectedIds;
  }, [selectedIds]);

  const stateRef = useRef({
    disabled,
    positions,
    tileSize,
    onTilePress,
    onTileRemove,
    onAutoSubmit,
  });
  useEffect(() => {
    stateRef.current = { disabled, positions, tileSize, onTilePress, onTileRemove, onAutoSubmit };
  }, [disabled, onAutoSubmit, onTilePress, onTileRemove, positions, tileSize]);

  /** اگر مرحله تمام شد یا صفحه عوض شد، کشیدن نیمه‌کاره رها می‌شود */
  useEffect(() => {
    if (disabled) {
      draggingRef.current = false;
      setFinger(null);
    }
  }, [disabled]);

  const handlePoint = useCallback((point: Point) => {
    const { positions: current, tileSize: size, onTilePress: select, onTileRemove: remove } =
      stateRef.current;
    const tileId = nearestTileId(current, size, point);
    const action = resolveWheelTouch(selectionRef.current, tileId);
    if (action.type === 'none') {
      return;
    }
    selectionRef.current = applyWheelTouch(selectionRef.current, action);
    if (action.type === 'add') {
      select(action.tileId);
    } else {
      remove(action.tileId);
    }
  }, []);

  /**
   * جای چرخ روی صفحه.
   * `locationX/locationY` روی اندروید نسبت به «عنصری که لمس رویش شروع شده» گزارش
   * می‌شود (کاشی یا خود چرخ)، پس قابل اتکا نیست؛ از مختصات صفحه منهای جای چرخ
   * استفاده می‌کنیم و این اندازه‌گیری در شروع هر کشیدن تازه می‌شود.
   */
  const originRef = useRef<Point>({ x: 0, y: 0 });
  const refreshOrigin = useCallback(() => {
    const node = containerRef.current as unknown as Measurable | null;
    if (node?.measureInWindow) {
      node.measureInWindow((x, y) => {
        originRef.current = { x, y };
      });
      return;
    }
    node?.measure?.((_x, _y, _width, _height, pageX, pageY) => {
      originRef.current = { x: pageX, y: pageY };
    });
  }, []);

  /** نقطه لمس نسبت به چرخ */
  const pointFrom = useCallback((event: GestureResponderEvent): Point => {
    return {
      x: event.nativeEvent.pageX - originRef.current.x,
      y: event.nativeEvent.pageY - originRef.current.y,
    };
  }, []);

  const refreshOriginRef = useRef(refreshOrigin);
  useEffect(() => {
    refreshOriginRef.current = refreshOrigin;
  }, [refreshOrigin]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        !stateRef.current.disabled && Math.hypot(gesture.dx, gesture.dy) > DRAG_THRESHOLD,
      onMoveShouldSetPanResponderCapture: () => false,
      // وسط کشیدن، گرفتن انگشت هرگز به والد داده نمی‌شود؛ همین یک خط جلوی
      // «گیرکردن» چرخ روی گوشی را می‌گیرد.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: event => {
        draggingRef.current = true;
        // اندازه‌گیری تازه در شروع کشیدن؛ بعد از این، نقطه‌ها درست حساب می‌شوند.
        refreshOriginRef.current();
        const point = pointFrom(event);
        lastFingerAtRef.current = Date.now();
        setFinger(point);
        handlePoint(point);
      },
      onPanResponderMove: event => {
        const point = pointFrom(event);
        // ردیاب انگشت با نرخ محدود به‌روز می‌شود تا کشیدن روی گوشی ضعیف کند نشود؛
        // انتخاب حروف اما بی‌درنگ و بدون محدودیت انجام می‌شود.
        const now = Date.now();
        if (now - lastFingerAtRef.current >= FINGER_THROTTLE_MS) {
          lastFingerAtRef.current = now;
          setFinger(point);
        }
        handlePoint(point);
      },
      onPanResponderRelease: () => {
        const wasDragging = draggingRef.current;
        draggingRef.current = false;
        setFinger(null);
        if (wasDragging && selectionRef.current.length >= 2) {
          stateRef.current.onAutoSubmit();
        }
      },
      onPanResponderTerminate: () => {
        draggingRef.current = false;
        setFinger(null);
      },
    }),
  ).current;

  /** خط زنجیره‌ای انتخاب: از کاشی اول تا انگشت، به ترتیب انتخاب */
  const chain = useMemo(() => {
    const points = selectedIds
      .map(id => positionById.get(id))
      .filter((point): point is Point => point !== undefined);
    if (finger) {
      points.push(finger);
    }
    return points;
  }, [finger, positionById, selectedIds]);

  if (tiles.length === 0) {
    return <View style={{ height: diameter }} />;
  }

  return (
    <View
      ref={containerRef}
      onLayout={refreshOrigin}
      style={[styles.container, { width: diameter, height: diameter }]}
      accessibilityLabel={accessibilityLabel}
      {...panResponder.panHandlers}
    >
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* صفحه‌ی زیر حروف: دایره روشن با حلقه طلایی، شبیه سینیِ بازی */}
        <Circle cx={center.x} cy={center.y} r={Math.max(tileSize, diameter / 2 - tileSize / 2)} fill={colors.surface} opacity={0.72} />
        <Circle
          cx={center.x}
          cy={center.y}
          r={Math.max(tileSize, diameter / 2 - tileSize / 2)}
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

        {/* زنجیره انتخاب */}
        {chain.length >= 2 ? (
          <Polygon
            points={chain.map(point => `${point.x},${point.y}`).join(' ')}
            fill={colors.primary}
            fillOpacity={0.16}
            stroke={colors.brandTeal}
            strokeWidth={5}
            strokeLinejoin="round"
          />
        ) : null}
        {chain.length === 1 ? (
          <Circle cx={chain[0]!.x} cy={chain[0]!.y} r={7} fill={colors.brandTeal} />
        ) : null}

        {/* حلقه پیشرفت کلمه‌های مرحله دور نشان وسط */}
        <Circle cx={center.x} cy={center.y} r={CENTER_RING} stroke={colors.border} strokeWidth={6} fill="none" opacity={0.8} />
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

      {/* نشان وسط چرخ: پیشرفت کلمه‌های مرحله */}
      <View pointerEvents="none" style={[styles.centerBadge, { left: center.x - 42, top: center.y - 42 }]}>
        <AppText variant="numericLarge" color={colors.primaryDark}>
          {toPersianDigits(foundCount)}/{toPersianDigits(totalCount)}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {strings.game.wheelHint}
        </AppText>
      </View>

      <WheelTiles
        positions={positions}
        tileSize={tileSize}
        selectedIds={selectedIds}
        disabled={disabled}
        onTilePress={onTilePress}
        guide={guide}
        guideScale={guideScale}
      />
    </View>
  );
}


interface WheelTilesProps {
  positions: readonly { id: string; char: string; x: number; y: number }[];
  tileSize: number;
  selectedIds: readonly string[];
  disabled: boolean;
  onTilePress: (tileId: string) => void;
  guide: { nextTileId: string | null; matched: number; planned: readonly string[] };
  guideScale: Animated.AnimatedInterpolation<number>;
}

/**
 * لایه کاشی‌ها.
 *
 * از بدنه چرخ جدا شده و `memo` است تا هنگام کشیدن انگشت — که ردیاب انگشت چند
 * بار در ثانیه به‌روز می‌شود — کاشی‌ها دوباره ساخته نشوند. این کار، روانی کشیدن
 * را روی گوشی‌های ضعیف به‌طور محسوس بهتر می‌کند.
 */
const WheelTiles = React.memo(function WheelTiles({
  positions,
  tileSize,
  selectedIds,
  disabled,
  onTilePress,
  guide,
  guideScale,
}: WheelTilesProps) {
  return (
    <>
      {positions.map(position => {
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
              <View pointerEvents="none" style={[styles.stepBadge, { top: -6, right: -6 }]}>
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

const CENTER_RING = 50;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBadge: {
    position: 'absolute',
    width: 84,
    height: 84,
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
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
