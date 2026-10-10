import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Polyline } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
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

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

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

/** Layered orbital letter surface. Static chrome is isolated from the pointer path. */
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
  const { gesture, pathPoints, pathOpacity } = useWheelGestures({
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
        <WheelSelectionPath geometry={geometry} pathPoints={pathPoints} pathOpacity={pathOpacity} />
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

interface WheelSelectionProps {
  geometry: WheelGeometry;
  selectedIds: readonly string[];
}

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
        <Circle key={center.id} cx={center.x} cy={center.y} r={3.5} fill={colors.brandTeal} />
      ))}
    </Svg>
  );
});

interface WheelSelectionPathProps {
  geometry: WheelGeometry;
  pathPoints: SharedValue<string>;
  pathOpacity: SharedValue<number>;
}

function WheelSelectionPath({ geometry, pathPoints, pathOpacity }: WheelSelectionPathProps) {
  const animatedProps = useAnimatedProps(() => ({
    points: pathPoints.value,
    opacity: pathOpacity.value,
  }));
  const glowAnimatedProps = useAnimatedProps(() => ({
    points: pathPoints.value,
    opacity: pathOpacity.value * 0.16,
  }));

  return (
    <Svg
      width={geometry.diameter}
      height={geometry.diameter}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <AnimatedPolyline
        animatedProps={glowAnimatedProps}
        fill="none"
        stroke={colors.brandTeal}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <AnimatedPolyline
        animatedProps={animatedProps}
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
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  centerBadge: {
    position: 'absolute',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
