import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { State, type PanGesture } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { WHEEL_PAN_TEST_ID } from '../../src/hooks/useWheelGestures';
import { computeWheelGeometry } from '../../src/services/game/wheelGesture';
import { strings } from '../../src/constants';
import { format } from '../../src/utils/format';
import {
  LEVEL_ONE,
  completeOnboarding,
  launchApp,
  primeReducedMotion,
  resetDeviceStorage,
} from './helpers';

jest.setTimeout(30000);

beforeEach(() => resetDeviceStorage());

it('شروع بازی → کشیدن واژهٔ واقعی → ثبت خودکار در رهاکردن → ادامهٔ کشیدن', async () => {
  await primeReducedMotion();
  const app = await launchApp();
  await completeOnboarding();
  await fireEvent.press(screen.getByText(strings.home.playNewButton));
  await waitFor(() => expect(screen.getByTestId('letter-wheel-surface')).toBeTruthy());

  const diameter = StyleSheet.flatten(screen.getByTestId('letter-wheel-surface').props.style).width;
  const tiles = LEVEL_ONE.letters.map(char => {
    const tile = screen.getAllByLabelText(
      format(strings.accessibility.letterTile, { letter: char }),
    )[0]!;
    return { id: (tile.props.testID as string).replace('wheel-tile-', ''), char };
  });
  const geometry = computeWheelGeometry({ tiles, diameter });
  const pointFor = (char: string) => {
    const index = tiles.findIndex(tile => tile.char === char);
    const point = geometry.positions[index];
    if (!point) throw new Error(`Missing tile for ${char}`);
    return { x: point.x, y: point.y };
  };

  const swipe = (word: string) => {
    const points = [...word].map(pointFor);
    const pan = getByGestureTestId(WHEEL_PAN_TEST_ID) as unknown as PanGesture;
    fireGestureHandler<PanGesture>(pan, [
      { ...points[0]!, state: State.BEGAN },
      { ...points[0]!, state: State.ACTIVE },
      ...points.slice(1, -1).map(point => ({ ...point, state: State.ACTIVE })),
      { ...points[points.length - 1]!, state: State.END },
    ]);
  };

  swipe('ابر');
  await waitFor(() =>
    expect(
      screen.getAllByLabelText(
        format(strings.game.targetProgress, {
          found: 1,
          total: LEVEL_ONE.targetWords.length,
        }),
      ).length,
    ).toBeGreaterThan(0),
  );
  expect(
    screen.getByLabelText(strings.accessibility.submitButton).props.accessibilityState?.disabled,
  ).toBe(true);

  swipe('اره');
  await waitFor(() =>
    expect(
      screen.getAllByLabelText(
        format(strings.game.targetProgress, {
          found: 2,
          total: LEVEL_ONE.targetWords.length,
        }),
      ).length,
    ).toBeGreaterThan(0),
  );
  app.unmount();
});
