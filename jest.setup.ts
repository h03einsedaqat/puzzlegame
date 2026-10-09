/* eslint-env jest */

export {};

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

declare global {
  var __mockAsyncStorage: Record<string, jest.Mock>;
  var __resetAsyncStorage: () => void;
}

type TestGlobals = {
  __mockAsyncStorage: Record<string, jest.Mock>;
  __resetAsyncStorage: () => void;
};

/**
 * ذخیره‌سازی در حافظه برای تست‌ها. تست‌های یکپارچه با همان Mock می‌توانند
 * «بستن و باز کردن دوباره برنامه» را شبیه‌سازی کنند.
 */
const mockMemoryStore = new Map();

const mockAsyncStorage = {
  getItem: jest.fn(key => Promise.resolve(mockMemoryStore.has(key) ? mockMemoryStore.get(key) : null)),
  setItem: jest.fn((key, value) => {
    mockMemoryStore.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn(key => {
    mockMemoryStore.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockMemoryStore.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve([...mockMemoryStore.keys()])),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map(key => [key, mockMemoryStore.has(key) ? mockMemoryStore.get(key) : null])),
  ),
  multiSet: jest.fn((pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => mockMemoryStore.set(key, value));
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach(key => mockMemoryStore.delete(key));
    return Promise.resolve();
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}));

/** دسترسی تست‌ها به حافظه‌ی Mock برای شبیه‌سازی راه‌اندازی مجدد برنامه. */
(globalThis as TestGlobals).__mockAsyncStorage = mockAsyncStorage;
(globalThis as TestGlobals).__resetAsyncStorage = () => mockMemoryStore.clear();

/**
 * SafeAreaProvider در محیط بومی مقدار حاشیه‌ها را از رویداد بومی می‌گیرد و
 * تا رسیدن آن چیزی رندر نمی‌کند؛ نسخه آزمایشی کتابخانه مقادیر ثابت می‌دهد.
 */
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

/** react-native-svg در محیط تست به View ساده تبدیل می‌شود. */
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const host = (name: string, base: unknown = View) => {
    const Component = (props: Record<string, unknown>) => React.createElement(base as never, props);
    Component.displayName = `Svg${name}`;
    return Component;
  };

  // متنِ داخل SVG باید مثل متن واقعی رندر شود، وگرنه رندرکننده تست شکایت می‌کند
  // که «رشته متن داخل View آمده است».
  const hostText = (name: string) => host(name, Text);

  const module: Record<string, unknown> = { __esModule: true };
  for (const name of ['Text', 'TSpan', 'Title', 'Desc']) {
    module[name] = hostText(name);
  }
  for (const name of [
    'Svg',
    'Circle',
    'Ellipse',
    'G',
    'Line',
    'Path',
    'Polygon',
    'Polyline',
    'Rect',
    'Defs',
    'LinearGradient',
    'RadialGradient',
    'Stop',
    'ClipPath',
    'Mask',
    'Use',
    'Symbol',
    'Pattern',
    'Image',
    'ForeignObject',
  ]) {
    module[name] = host(name);
  }
  module.default = module.Svg;

  return module;
});

/** Reanimated 4 / Worklets test double: the native runtime is not loaded in Jest. */
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { Animated } = require('react-native');
  const AnimatedShim = {
    ...Animated,
    createAnimatedComponent: (component: unknown) => component,
  };
  const identityAnimation = (toValue: unknown) => toValue;

  return {
    __esModule: true,
    default: AnimatedShim,
    cancelAnimation: () => undefined,
    runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
    runOnUI: (callback: (...args: unknown[]) => unknown) => callback,
    setGestureState: () => undefined,
    useEvent: (callback: (...args: unknown[]) => unknown) => callback,
    useAnimatedProps: (updater: () => unknown) => updater(),
    useAnimatedStyle: (updater: () => unknown) => updater(),
    useSharedValue: (initialValue: unknown) => {
      const value = React.useRef({ value: initialValue });
      return value.current;
    },
    withRepeat: (animation: unknown) => animation,
    withSequence: (...animations: unknown[]) => animations[animations.length - 1],
    withSpring: identityAnimation,
    withTiming: identityAnimation,
  };
});

/**
 * انیمیشن‌های واقعی با تایمرهای محیط آزمون جلو می‌روند و به‌روزرسانی‌هایشان
 * بیرون از act رخ می‌دهد؛ این هشدار در آزمون‌های یکپارچه نویز است و خطای
 * واقعی محصول نیست.
 */
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('not wrapped in act')) {
    return;
  }
  originalConsoleError(...args);
};
