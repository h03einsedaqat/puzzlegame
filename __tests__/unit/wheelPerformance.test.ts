import { computeWheelGeometry } from '../../src/services/game/wheelGesture';
import {
  wheelGestureDown,
  wheelGestureMove,
  wheelGestureEnd,
  type WheelInteractionState,
} from '../../src/services/game/wheelInteraction';

/**
 * Lightweight algorithmic performance guard (not a device FPS claim): 1,000
 * pointer samples inside one tile must cause one real selection update, while
 * the interaction machine still observes every sample for interpolation.
 */
describe('wheel movement update budget', () => {
  const geometry = computeWheelGeometry({
    tiles: [
      { id: 'a', char: 'ا' },
      { id: 'b', char: 'ب' },
      { id: 'c', char: 'پ' },
      { id: 'd', char: 'ت' },
      { id: 'e', char: 'ث' },
      { id: 'f', char: 'ج' },
    ],
    diameter: 300,
    preferredTileSize: 50,
  });

  it('1000 pointer movements do not produce 1000 selection updates', () => {
    const origin = geometry.positions[0]!;
    let state: WheelInteractionState = wheelGestureDown(geometry, [], origin).state;
    let pointerSamples = 0;
    let selectionUpdates = 0;
    const start = Date.now();

    for (let index = 0; index < 1000; index += 1) {
      const phase = (index / 1000) * Math.PI * 2;
      const point = {
        x: origin.x + Math.cos(phase) * 1.2,
        y: origin.y + Math.sin(phase) * 1.2,
      };
      const next = wheelGestureMove(state, geometry, point);
      state = next.state;
      pointerSamples += 1;
      if (next.selection !== null) {
        selectionUpdates += 1;
      }
    }

    const elapsed = Date.now() - start;
    expect(pointerSamples).toBe(1000);
    expect(selectionUpdates).toBe(1);
    expect(selectionUpdates).toBeLessThan(pointerSamples);
    expect(Number.isFinite(elapsed)).toBe(true);
    expect(wheelGestureEnd(state, geometry, origin).released).toEqual([origin.id]);
  });
});
