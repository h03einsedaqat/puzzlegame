import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { strings } from '../../constants';
import { colors, radius, spacing } from '../../theme';
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
  /** قطر چرخ؛ معمولاً از عرض صفحه می‌آید */
  diameter?: number;
  tileSize?: number;
  accessibilityLabel?: string;
  /** پیشرفت کلمه‌های اصلی مرحله؛ حلقه وسط چرخ را پر می‌کند */
  foundCount?: number;
  totalCount?: number;
  /**
   * هنگام شروع/پایان کشیدن انگشت خبر می‌دهد. صفحه بازی با این سیگنال اسکرول را
   * موقتاً خاموش می‌کند تا کشیدن حروف با اسکرول صفحه قاطی نشود.
   */
  onDragStateChange?: (dragging: boolean) => void;
}

const DEFAULT_TILE = 58;
const HIT_FACTOR = 0.85;

/** تنها چیزی که از View لازم داریم: اندازه‌گیری جای چرخ روی صفحه */
interface Measurable {
  measure?: (
    callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void,
  ) => void;
}

interface Point {
  x: number;
  y: number;
}

/**
 * چرخ حروف — حروف دور یک دایره می‌نشینند و با **کشیدن انگشت** روی آن‌ها کلمه
 * ساخته می‌شود؛ همان کاری که بازیکن بازی‌های کلمه‌ای ایرانی انتظار دارد.
 *
 * دو راه برای ساختن کلمه هست و هر دو درست کار می‌کنند:
 *   ۱) لمس تک‌تک حروف (مثل قبل؛ برای دسترس‌پذیری و صفحه‌های بزرگ‌متن)
 *   ۲) کشیدن انگشت روی حروف پشت‌سرهم و برداشتن انگشت = ثبت خودکار کلمه
 *
 * کشیدن با PanResponder انجام می‌شود و فقط وقتی شروع می‌شود که انگشت جابه‌جا
 * شده باشد؛ بنابراین ضربه‌های ساده همچنان به خود کاشی‌ها می‌رسند و رفتار لمسی
 * صفحه تغییر نمی‌کند.
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
  onDragStateChange,
}: LetterWheelProps) {
  const [finger, setFinger] = useState<Point | null>(null);
  const originRef = useRef<Point>({ x: 0, y: 0 });
  const containerRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const dragStartedRef = useRef(false);

  const center = { x: diameter / 2, y: diameter / 2 };
  const progressRatio = totalCount > 0 ? Math.max(0, Math.min(1, foundCount / totalCount)) : 0;
  const orbit = Math.max(tileSize * 1.6, diameter / 2 - tileSize / 2 - 6);

  /** جای هر کاشی روی دایره؛ از بالا شروع و ساعتگرد ادامه پیدا می‌کند */
  const positions = useMemo(() => {
    const count = Math.max(tiles.length, 1);
    return tiles.map((tile, index) => {
      const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / count;
      return {
        id: tile.id,
        char: tile.char,
        x: center.x + orbit * Math.cos(angle),
        y: center.y + orbit * Math.sin(angle),
      };
    });
  }, [center.x, center.y, orbit, tiles]);

  const positionById = useMemo(() => {
    const map = new Map<string, Point>();
    for (const position of positions) {
      map.set(position.id, { x: position.x, y: position.y });
    }
    return map;
  }, [positions]);

  /** وضعیت لحظه‌ای برای هندلرهای PanResponder (که نباید در هر رندر بازساخته شوند) */
  const stateRef = useRef({ disabled, positions, selectedIds, onTilePress, onTileRemove, onAutoSubmit, tileSize, onDragStateChange });
  useEffect(() => {
    stateRef.current = { disabled, positions, selectedIds, onTilePress, onTileRemove, onAutoSubmit, tileSize, onDragStateChange };
  }, [disabled, onAutoSubmit, onDragStateChange, onTilePress, onTileRemove, positions, selectedIds, tileSize]);

  /** نزدیک‌ترین کاشی به انگشت، اگر داخل محدوده لمس باشد */
  const tileAt = useCallback((point: Point): string | null => {
    const { positions: current, tileSize: size } = stateRef.current;
    const reach = size * HIT_FACTOR;
    let bestId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const position of current) {
      const distance = Math.hypot(position.x - point.x, position.y - point.y);
      if (distance < reach && distance < bestDistance) {
        bestDistance = distance;
        bestId = position.id;
      }
    }
    return bestId;
  }, []);

  const applyFinger = useCallback(
    (pageX: number, pageY: number) => {
      const point = { x: pageX - originRef.current.x, y: pageY - originRef.current.y };
      setFinger(point);

      const tileId = tileAt(point);
      if (!tileId) {
        return;
      }
      const { selectedIds: selection, onTilePress: select, onTileRemove: remove } = stateRef.current;
      const index = selection.indexOf(tileId);
      if (index === -1) {
        select(tileId);
        return;
      }
      // اگر انگشت روی حرف یکی‌مانده‌قبل برگشت، آخرین حرف برداشته می‌شود.
      if (index === selection.length - 2) {
        remove(selection[selection.length - 1] as string);
      }
    },
    [tileAt],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        !stateRef.current.disabled && Math.hypot(gesture.dx, gesture.dy) > 10,
      onPanResponderGrant: () => {
        dragStartedRef.current = true;
        stateRef.current.onDragStateChange?.(true);
      },
      onPanResponderMove: (_event, gesture) => {
        applyFinger(gesture.moveX, gesture.moveY);
      },
      onPanResponderRelease: () => {
        const wasDragging = dragStartedRef.current;
        dragStartedRef.current = false;
        setFinger(null);
        const { selectedIds: selection, onAutoSubmit: submit, onDragStateChange: notify } = stateRef.current;
        notify?.(false);
        if (wasDragging && selection.length >= 2) {
          submit();
        }
      },
      onPanResponderTerminate: () => {
        dragStartedRef.current = false;
        setFinger(null);
        stateRef.current.onDragStateChange?.(false);
      },
    }),
  ).current;

  const measure = useCallback(() => {
    const node = containerRef.current as unknown as Measurable | null;
    node?.measure?.((_x, _y, _width, _height, pageX, pageY) => {
      originRef.current = { x: pageX, y: pageY };
    });
  }, []);

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
      onLayout={measure}
      style={[styles.container, { width: diameter, height: diameter }]}
      accessibilityLabel={accessibilityLabel}
      {...panResponder.panHandlers}
    >
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* صفحه‌ی زیر حروف: دایره روشن با حلقه طلایی، شبیه سینیِ بازی */}
        <Circle cx={center.x} cy={center.y} r={orbit + tileSize * 0.5} fill={colors.surface} opacity={0.72} />
        <Circle
          cx={center.x}
          cy={center.y}
          r={orbit + tileSize * 0.5}
          stroke={colors.accent}
          strokeWidth={3}
          fill="none"
          opacity={0.5}
        />
        <Circle
          cx={center.x}
          cy={center.y}
          r={orbit - tileSize * 0.42}
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
        {chain.length === 1 ? <Circle cx={chain[0]!.x} cy={chain[0]!.y} r={7} fill={colors.brandTeal} /> : null}

        {/* حلقه پیشرفت کلمه‌های مرحله دور نشان وسط */}
        <Circle cx={center.x} cy={center.y} r={50} stroke={colors.border} strokeWidth={6} fill="none" opacity={0.8} />
        <Circle
          cx={center.x}
          cy={center.y}
          r={50}
          stroke={colors.success}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 50}`}
          strokeDashoffset={2 * Math.PI * 50 * (1 - progressRatio)}
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

      {/* کاشی‌های حروف */}
      {positions.map(position => (
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
          <LetterTile
            tileId={position.id}
            char={position.char}
            size={tileSize}
            selected={selectedIds.includes(position.id)}
            disabled={disabled}
            onPress={onTilePress}
            accessibilityLabel={format(strings.accessibility.letterTile, { letter: position.char })}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
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
});
