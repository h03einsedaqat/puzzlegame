export interface WheelPoint {
  x: number;
  y: number;
}

export interface WheelTilePosition {
  id: string;
  char: string;
  x: number;
  y: number;
}

export interface WheelGeometryInput {
  tiles: readonly { id: string; char: string }[];
  diameter: number;
  preferredTileSize?: number;
  minTileSize?: number;
  maxTileSize?: number;
}

export interface WheelGeometry {
  diameter: number;
  center: WheelPoint;
  orbit: number;
  tileSize: number;
  visualRadius: number;
  interactionRadius: number;
  /** Backwards-compatible alias for interactionRadius. */
  touchRadius: number;
  deadZone: number;
  neighbourDistance: number;
  positions: readonly WheelTilePosition[];
}

export interface WheelSegmentHit {
  tileId: string;
  /** Projection parameter on the finite segment, clamped to [0, 1]. */
  t: number;
  closestPoint: WheelPoint;
  distanceSquared: number;
  index: number;
}

export declare const MIN_WHEEL_TILE_SIZE: number;
export declare const MAX_WHEEL_TILE_SIZE: number;
export declare const WHEEL_HYSTERESIS_MARGIN: number;
export declare const EMPTY_WHEEL_GEOMETRY: WheelGeometry;
export declare function preferredTileSizeFor(diameter: number, count: number): number;
export declare function computeWheelGeometry(input: WheelGeometryInput): WheelGeometry;
export declare function distanceBetween(a: WheelPoint, b: WheelPoint): number;
export declare function positionOf(geometry: WheelGeometry, tileId: string): WheelTilePosition | undefined;
export declare function getTileAtPoint(geometry: WheelGeometry, point: WheelPoint): string | null;
export declare function getSegmentTileHits(
  previousPoint: WheelPoint,
  currentPoint: WheelPoint,
  geometry: WheelGeometry,
  radiusOverride?: number,
): readonly WheelSegmentHit[];
export declare function getTilesCrossedBySegment(
  previousPoint: WheelPoint,
  currentPoint: WheelPoint,
  geometry: WheelGeometry,
): readonly string[];
export interface WheelSelectionSegment {
  from: string;
  to: string;
  midX: number;
  midY: number;
  length: number;
  /** Rotation in radians, ready for a `rotate: '<n>rad'` transform. */
  angle: number;
}

export interface WheelTailSpec {
  visible: boolean;
  length: number;
  angle: number;
  scaleX: number;
  translateX: number;
  translateY: number;
}

export declare function buildSelectionSegments(
  geometry: WheelGeometry,
  selectedIds: readonly string[],
): readonly WheelSelectionSegment[];
export declare function buildTailSpec(
  visualRadius: number,
  barSpan: number,
  anchor: WheelPoint,
  pointer: WheelPoint,
): WheelTailSpec;
export declare function buildSelectionPathPoints(
  geometry: WheelGeometry,
  selectedIds: readonly string[],
  pointer: WheelPoint | null,
): string;
export declare function nearestTileId(geometry: WheelGeometry, point: WheelPoint): string | null;
export type WheelTouchAction =
  | { type: 'add'; tileId: string }
  | { type: 'remove'; tileId: string }
  | { type: 'none' };
export declare function resolveWheelTouch(
  selection: readonly string[],
  tileId: string | null,
): WheelTouchAction;
export declare function applyWheelTouch(
  selection: readonly string[],
  action: WheelTouchAction,
): readonly string[];
