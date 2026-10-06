/* eslint-env jest */

export {};

declare global {
  // eslint-disable-next-line no-var
  var __asyncStorageMock: Record<string, jest.Mock>;
  // eslint-disable-next-line no-var
  var __resetAsyncStorage: () => void;
}

type TestGlobals = {
  __asyncStorageMock: Record<string, jest.Mock>;
  __resetAsyncStorage: () => void;
};

/**
 * ذخیره‌سازی در حافظه برای تست‌ها. تست‌های یکپارچه با همان Mock می‌توانند
 * «بستن و باز کردن دوباره برنامه» را شبیه‌سازی کنند.
 */
const memoryStore = new Map();

const asyncStorageMock = {
  getItem: jest.fn(key => Promise.resolve(memoryStore.has(key) ? memoryStore.get(key) : null)),
  setItem: jest.fn((key, value) => {
    memoryStore.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn(key => {
    memoryStore.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    memoryStore.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve([...memoryStore.keys()])),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map(key => [key, memoryStore.has(key) ? memoryStore.get(key) : null])),
  ),
  multiSet: jest.fn((pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => memoryStore.set(key, value));
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach(key => memoryStore.delete(key));
    return Promise.resolve();
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: asyncStorageMock,
  ...asyncStorageMock,
}));

/** دسترسی تست‌ها به حافظه‌ی Mock برای شبیه‌سازی راه‌اندازی مجدد برنامه. */
(globalThis as TestGlobals).__asyncStorageMock = asyncStorageMock;
(globalThis as TestGlobals).__resetAsyncStorage = () => memoryStore.clear();

/** react-native-svg در محیط تست به View ساده تبدیل می‌شود. */
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const host = (name: string) => {
    const Component = (props: Record<string, unknown>) =>
      React.createElement(View, { ...props, testID: props.testID ?? `svg-${name}` });
    Component.displayName = `Svg${name}`;
    return Component;
  };
  return new Proxy(
    {},
    {
      get: (_target, name) => (name === '__esModule' ? false : host(String(name))),
    },
  );
});
