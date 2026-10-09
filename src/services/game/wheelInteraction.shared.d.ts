import type { WheelGeometry, WheelPoint } from './wheelGeometry.shared';

export type WheelInteractionPhase = 'idle' | 'holding' | 'dragging';

export interface WheelInteractionState {
  phase: WheelInteractionPhase;
  downTileId: string | null;
  downPoint: WheelPoint | null;
  previousPoint: WheelPoint | null;
  snapshot: readonly string[];
  selection: readonly string[];
  activeTileId: string | null;
  ownsSelection: boolean;
}

export interface WheelInteractionResult {
  state: WheelInteractionState;
  selection: readonly string[] | null;
  dragStarted: boolean;
  dragEnded: boolean;
  released: readonly string[] | null;
  aborted: boolean;
}

export declare function createWheelInteractionState(): WheelInteractionState;
export declare function wheelGestureDown(
  geometry: WheelGeometry,
  selection: readonly string[],
  point: WheelPoint,
): WheelInteractionResult;
export declare function wheelGestureMove(
  state: WheelInteractionState,
  geometry: WheelGeometry,
  point: WheelPoint,
): WheelInteractionResult;
export declare function wheelGestureEnd(
  state: WheelInteractionState,
  geometry: WheelGeometry,
  point: WheelPoint,
): WheelInteractionResult;
export declare function wheelGestureCancel(state: WheelInteractionState): WheelInteractionResult;
export declare function adoptSelection(
  state: WheelInteractionState,
  selection: readonly string[],
): WheelInteractionState;
