import {
  distanceBetween,
  getSegmentTileHits,
  getTileAtPoint,
  positionOf,
  WHEEL_HYSTERESIS_MARGIN,
} from './wheelGeometry.shared.js';

/**
 * Worklet-safe wheel interaction state machine shared with preview-v2.
 * Selection state changes only when a tile is actually crossed; pointer samples
 * that stay inside one tile merely advance previousPoint.
 */

export function createWheelInteractionState() {
  'worklet';
  return {
    phase: 'idle',
    downTileId: null,
    downPoint: null,
    previousPoint: null,
    snapshot: [],
    selection: [],
    activeTileId: null,
    ownsSelection: false,
  };
}

function result(state, changes) {
  'worklet';
  return {
    state,
    selection: null,
    dragStarted: false,
    dragEnded: false,
    released: null,
    aborted: false,
    ...changes,
  };
}

/** A pointer beginning outside every tile may hover, but cannot own the drag. */
export function wheelGestureDown(geometry, selection, point) {
  'worklet';
  const tileId = getTileAtPoint(geometry, point);
  const savedPoint = { x: point.x, y: point.y };
  return result(
    {
      phase: 'holding',
      downTileId: tileId,
      downPoint: savedPoint,
      previousPoint: savedPoint,
      snapshot: selection,
      selection,
      activeTileId: tileId,
      ownsSelection: false,
    },
    {},
  );
}

function activeTileRetainsPoint(geometry, activeTileId, point) {
  'worklet';
  if (activeTileId === null) {
    return false;
  }
  const activePosition = positionOf(geometry, activeTileId);
  if (!activePosition) {
    return false;
  }
  const radius = (geometry.interactionRadius ?? geometry.touchRadius ?? 0) + WHEEL_HYSTERESIS_MARGIN;
  return distanceBetween(activePosition, point) <= radius;
}

/**
 * Process every tile touched by the finite segment from previousPoint to point,
 * in geometric order. One returned selection represents the whole native event,
 * even when a fast swipe crossed several tiles.
 */
export function wheelGestureMove(state, geometry, point) {
  'worklet';
  let base = state;
  if (base.phase === 'idle') {
    base = wheelGestureDown(geometry, base.selection ?? base.snapshot ?? [], point).state;
  }

  // Space between tiles or outside the wheel never becomes a drag origin.
  if (base.downTileId === null) {
    return result(
      {
        ...base,
        previousPoint: { x: point.x, y: point.y },
      },
      {},
    );
  }

  let selection = base.selection;
  let activeTileId = base.activeTileId;
  let ownsSelection = base.ownsSelection;
  let changed = false;

  if (!ownsSelection) {
    ownsSelection = true;
    if (!selection.includes(base.downTileId)) {
      selection = [base.downTileId];
      activeTileId = base.downTileId;
      changed = true;
    }
  }

  const previousPoint = base.previousPoint ?? base.downPoint ?? point;
  const hits = getSegmentTileHits(previousPoint, point, geometry);

  for (let hitIndex = 0; hitIndex < hits.length; hitIndex += 1) {
    const hit = hits[hitIndex];
    if (!hit) {
      continue;
    }
    const tileId = hit.tileId;
    if (tileId === activeTileId) {
      continue;
    }

    // Do not switch on tiny tremors at the edge of the active tile. The
    // intentional dead strip between hit circles makes the entry/exit thresholds
    // distinct and keeps the transition deterministic.
    if (activeTileRetainsPoint(geometry, activeTileId, hit.closestPoint)) {
      continue;
    }

    const tileIndex = selection.indexOf(tileId);
    const lastIndex = selection.length - 1;

    if (tileIndex === -1) {
      selection = [...selection, tileId];
      activeTileId = tileId;
      changed = true;
      continue;
    }

    if (tileIndex === lastIndex) {
      activeTileId = tileId;
      continue;
    }

    if (tileIndex === lastIndex - 1) {
      selection = selection.slice(0, -1);
      activeTileId = tileId;
      changed = true;
    }
    // Older tiles than the immediate predecessor are ignored. They do not
    // steal activeTileId, so a later forward move cannot accidentally pop a
    // different letter.
  }

  if (activeTileId !== null && !activeTileRetainsPoint(geometry, activeTileId, point)) {
    const endpointTile = getTileAtPoint(geometry, point);
    if (endpointTile === null) {
      activeTileId = null;
    } else if (selection[selection.length - 1] === endpointTile) {
      activeTileId = endpointTile;
    }
  }

  const nextState = {
    ...base,
    phase: 'dragging',
    selection,
    activeTileId,
    previousPoint: { x: point.x, y: point.y },
    ownsSelection,
  };
  return result(nextState, {
    selection: changed ? selection : null,
    dragStarted: !base.ownsSelection && ownsSelection,
  });
}

/** End processes the final unsampled segment and returns one release payload. */
export function wheelGestureEnd(state, geometry, point) {
  'worklet';
  if (state.phase === 'idle') {
    return result(state, {});
  }

  const moved = state.ownsSelection ? wheelGestureMove(state, geometry, point) : null;
  const current = moved ? moved.state : state;
  const dragging = current.ownsSelection;
  const settledSelection = current.selection;

  return result(
    {
      ...createWheelInteractionState(),
      snapshot: settledSelection,
      selection: settledSelection,
    },
    {
      selection: moved?.selection ?? null,
      dragStarted: moved?.dragStarted ?? false,
      dragEnded: dragging,
      released: dragging ? settledSelection : null,
    },
  );
}

/** Cancel, multi-touch, lifecycle loss and navigation restore the pre-drag state. */
export function wheelGestureCancel(state) {
  'worklet';
  if (state.phase === 'idle') {
    return result(state, {});
  }
  const restore = state.ownsSelection ? state.snapshot : null;
  const settled = restore ?? state.selection;
  return result(
    {
      ...createWheelInteractionState(),
      snapshot: state.ownsSelection ? state.snapshot : settled,
      selection: settled,
    },
    {
      selection: restore,
      dragEnded: state.ownsSelection,
      aborted: true,
    },
  );
}

function sameSelection(a, b) {
  'worklet';
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

/** Adopt game-state edits (clear, slot removal, hint) only while idle. */
export function adoptSelection(state, selection) {
  'worklet';
  if (state.phase !== 'idle') {
    return state;
  }
  if (sameSelection(state.selection, selection) && sameSelection(state.snapshot, selection)) {
    return state;
  }
  return {
    ...state,
    snapshot: selection,
    selection,
  };
}
