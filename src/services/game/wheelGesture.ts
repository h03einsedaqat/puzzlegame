/**
 * Typed native entry point for the JS module shared with preview-v2.
 * The actual functions stay dependency-free and worklet-safe so native and web
 * use exactly the same wheel geometry and swept-segment hit test.
 */
export {
  MIN_WHEEL_TILE_SIZE,
  MAX_WHEEL_TILE_SIZE,
  WHEEL_HYSTERESIS_MARGIN,
  EMPTY_WHEEL_GEOMETRY,
  preferredTileSizeFor,
  computeWheelGeometry,
  distanceBetween,
  positionOf,
  getTileAtPoint,
  getSegmentTileHits,
  getTilesCrossedBySegment,
  buildSelectionPathPoints,
  nearestTileId,
  resolveWheelTouch,
  applyWheelTouch,
} from './wheelGeometry.shared';

export type {
  WheelPoint,
  WheelTilePosition,
  WheelGeometryInput,
  WheelGeometry,
  WheelSegmentHit,
  WheelTouchAction,
} from './wheelGeometry.shared';
