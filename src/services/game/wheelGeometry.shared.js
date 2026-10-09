/**
 * Geometry and hit-testing shared by React Native and preview-v2.
 *
 * Keep this module dependency-free and worklet-safe. The browser preview imports
 * this exact file so interaction behavior cannot silently drift from native.
 */

export const MIN_WHEEL_TILE_SIZE = 34;
export const MAX_WHEEL_TILE_SIZE = 64;
const MIN_NEIGHBOUR_GAP_RATIO = 0.25;
const WHEEL_EDGE_PADDING = 4;
const HIT_RADIUS_RATIO = 0.75;
const BISECTOR_MARGIN = 2;
export const WHEEL_HYSTERESIS_MARGIN = 2;
const EPSILON = 0.000001;

export const EMPTY_WHEEL_GEOMETRY = {
  diameter: 0,
  center: { x: 0, y: 0 },
  orbit: 0,
  tileSize: MIN_WHEEL_TILE_SIZE,
  visualRadius: MIN_WHEEL_TILE_SIZE / 2,
  interactionRadius: 0,
  /** Backwards-compatible name retained for existing callers. */
  touchRadius: 0,
  deadZone: 0,
  neighbourDistance: 0,
  positions: [],
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function preferredTileSizeFor(diameter, count) {
  'worklet';
  const ratio = count <= 5 ? 0.24 : count <= 7 ? 0.21 : 0.185;
  return clamp(Math.round(diameter * ratio), MIN_WHEEL_TILE_SIZE, MAX_WHEEL_TILE_SIZE);
}

/**
 * Places the centers on a clockwise orbit. Interaction circles never overlap;
 * the remaining strip between two neighboring circles is an intentional dead
 * zone, not a nearest-tile fallback.
 */
export function computeWheelGeometry(input) {
  const { tiles, diameter } = input;
  const count = tiles.length;
  if (count === 0 || diameter <= 0) {
    return { ...EMPTY_WHEEL_GEOMETRY, diameter: Math.max(0, diameter) };
  }

  const minTile = input.minTileSize ?? MIN_WHEEL_TILE_SIZE;
  const maxTile = input.maxTileSize ?? MAX_WHEEL_TILE_SIZE;
  const requested = input.preferredTileSize ?? preferredTileSizeFor(diameter, count);
  const preferred = clamp(Math.round(requested), minTile, maxTile);
  const step = (2 * Math.PI) / count;
  const chordFor = orbit => (count === 1 ? Number.POSITIVE_INFINITY : 2 * orbit * Math.sin(step / 2));
  const orbitFor = tile => Math.max(tile * 0.6, diameter / 2 - tile / 2 - WHEEL_EDGE_PADDING);

  const orbitAtPreferred = orbitFor(preferred);
  const maxByChord = Math.floor(chordFor(orbitAtPreferred) / (1 + MIN_NEIGHBOUR_GAP_RATIO));
  const tileSize = clamp(
    Math.min(preferred, maxByChord),
    Math.min(minTile, preferred),
    maxTile,
  );

  const orbit = orbitFor(tileSize);
  const neighbourDistance = chordFor(orbit);
  const halfNeighbour = Number.isFinite(neighbourDistance)
    ? neighbourDistance / 2 - BISECTOR_MARGIN
    : Number.POSITIVE_INFINITY;
  const interactionRadius = Math.max(
    tileSize / 2,
    Math.min(tileSize * HIT_RADIUS_RATIO, halfNeighbour),
  );
  const visualRadius = tileSize / 2;
  const deadZone = Number.isFinite(neighbourDistance)
    ? Math.max(0, neighbourDistance - interactionRadius * 2)
    : Number.POSITIVE_INFINITY;

  const positions = tiles.map((tile, index) => {
    const angle = -Math.PI / 2 + index * step;
    return {
      id: tile.id,
      char: tile.char,
      x: diameter / 2 + orbit * Math.cos(angle),
      y: diameter / 2 + orbit * Math.sin(angle),
    };
  });

  return {
    diameter,
    center: { x: diameter / 2, y: diameter / 2 },
    orbit,
    tileSize,
    visualRadius,
    interactionRadius,
    touchRadius: interactionRadius,
    deadZone,
    neighbourDistance: Number.isFinite(neighbourDistance) ? neighbourDistance : orbit * 2,
    positions,
  };
}

export function distanceBetween(a, b) {
  'worklet';
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function positionOf(geometry, tileId) {
  'worklet';
  for (let index = 0; index < geometry.positions.length; index += 1) {
    const position = geometry.positions[index];
    if (position && position.id === tileId) {
      return position;
    }
  }
  return undefined;
}

function distanceSquared(a, b) {
  'worklet';
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Returns the closest tile whose interaction circle contains the point.
 * A point in a dead zone deliberately returns null.
 */
export function getTileAtPoint(geometry, point) {
  'worklet';
  const radius = geometry.interactionRadius ?? geometry.touchRadius ?? 0;
  if (radius <= 0) {
    return null;
  }
  const radiusSquared = radius * radius;
  let bestId = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < geometry.positions.length; index += 1) {
    const position = geometry.positions[index];
    if (!position) {
      continue;
    }
    const candidateDistance = distanceSquared(position, point);
    if (candidateDistance <= radiusSquared && candidateDistance < bestDistance) {
      bestId = position.id;
      bestDistance = candidateDistance;
    }
  }
  return bestId;
}

/**
 * Project a point onto a finite segment. `t` is clamped to [0, 1], which is
 * critical: tiles near the infinite extension of the segment are not hits.
 */
function closestPointOnSegment(previousPoint, currentPoint, point) {
  'worklet';
  const dx = currentPoint.x - previousPoint.x;
  const dy = currentPoint.y - previousPoint.y;
  const lengthSquared = dx * dx + dy * dy;
  let t = 0;
  if (lengthSquared > EPSILON) {
    t = ((point.x - previousPoint.x) * dx + (point.y - previousPoint.y) * dy) / lengthSquared;
    t = Math.min(1, Math.max(0, t));
  }
  return {
    t,
    point: { x: previousPoint.x + dx * t, y: previousPoint.y + dy * t },
  };
}

function comesBefore(a, b) {
  'worklet';
  if (a.t < b.t - EPSILON) {
    return true;
  }
  if (a.t > b.t + EPSILON) {
    return false;
  }
  if (a.distanceSquared < b.distanceSquared - EPSILON) {
    return true;
  }
  if (a.distanceSquared > b.distanceSquared + EPSILON) {
    return false;
  }
  return a.index < b.index;
}

/**
 * Every tile whose interaction disk intersects the finite swept segment,
 * ordered by projection t. This is the shared continuous-path hit test.
 */
export function getSegmentTileHits(previousPoint, currentPoint, geometry, radiusOverride) {
  'worklet';
  const radius = radiusOverride ?? geometry.interactionRadius ?? geometry.touchRadius ?? 0;
  if (radius <= 0) {
    return [];
  }
  const radiusSquared = radius * radius;
  const hits = [];

  for (let index = 0; index < geometry.positions.length; index += 1) {
    const position = geometry.positions[index];
    if (!position) {
      continue;
    }
    const projection = closestPointOnSegment(previousPoint, currentPoint, position);
    const distance = distanceSquared(position, projection.point);
    if (distance > radiusSquared) {
      continue;
    }

    const hit = {
      tileId: position.id,
      t: projection.t,
      closestPoint: projection.point,
      distanceSquared: distance,
      index,
    };
    let insertionIndex = hits.length;
    while (insertionIndex > 0 && comesBefore(hit, hits[insertionIndex - 1])) {
      insertionIndex -= 1;
    }
    hits.splice(insertionIndex, 0, hit);
  }

  return hits;
}

/** Public API requested by the touch-engine contract. */
export function getTilesCrossedBySegment(previousPoint, currentPoint, geometry) {
  'worklet';
  const hits = getSegmentTileHits(previousPoint, currentPoint, geometry);
  const crossed = [];
  for (let index = 0; index < hits.length; index += 1) {
    const id = hits[index]?.tileId;
    if (id !== undefined) {
      crossed.push(id);
    }
  }
  return crossed;
}

/** Build the SVG polyline from selected tile centers to the live pointer. */
export function buildSelectionPathPoints(geometry, selectedIds, pointer) {
  'worklet';
  const points = [];
  for (let index = 0; index < selectedIds.length; index += 1) {
    const position = positionOf(geometry, selectedIds[index]);
    if (position) {
      points.push({ x: position.x, y: position.y });
    }
  }

  if (pointer && points.length > 0) {
    const last = points[points.length - 1];
    const visualRadius = geometry.visualRadius ?? geometry.tileSize / 2;
    if (distanceSquared(last, pointer) > visualRadius * visualRadius) {
      points.push(pointer);
    }
  }

  let serialized = '';
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point) {
      continue;
    }
    if (serialized.length > 0) {
      serialized += ' ';
    }
    serialized += `${point.x},${point.y}`;
  }
  return serialized;
}

/** A single center-to-point hit test for compatibility with older callers. */
export function nearestTileId(geometry, point) {
  'worklet';
  return getTileAtPoint(geometry, point);
}

export function resolveWheelTouch(selection, tileId) {
  'worklet';
  if (tileId === null) {
    return { type: 'none' };
  }
  const index = selection.indexOf(tileId);
  if (index === -1) {
    return { type: 'add', tileId };
  }
  const lastIndex = selection.length - 1;
  if (index === lastIndex - 1) {
    return { type: 'remove', tileId: selection[lastIndex] };
  }
  return { type: 'none' };
}

export function applyWheelTouch(selection, action) {
  'worklet';
  if (action.type === 'add') {
    return selection.includes(action.tileId) ? selection : [...selection, action.tileId];
  }
  if (action.type === 'remove') {
    const index = selection.indexOf(action.tileId);
    return index === -1 ? selection : selection.filter((_, position) => position !== index);
  }
  return selection;
}
