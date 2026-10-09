/**
 * Typed native entry point for the worklet-safe machine shared with preview-v2.
 * Behavior tests target these exports, and the browser preview imports the JS
 * implementation directly to keep both platforms on one interaction contract.
 */
export {
  createWheelInteractionState,
  wheelGestureDown,
  wheelGestureMove,
  wheelGestureEnd,
  wheelGestureCancel,
  adoptSelection,
} from './wheelInteraction.shared';

export type {
  WheelInteractionPhase,
  WheelInteractionState,
  WheelInteractionResult,
} from './wheelInteraction.shared';
