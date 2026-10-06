/** @type {import('jest').Config} */
module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(wav|mp3|ogg|m4a|aac)$': '@react-native/jest-preset/jest/assetFileTransformer.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|@react-native-async-storage)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/data/**',
    '!src/assets/**',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 60,
      functions: 55,
      lines: 60,
    },
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/tools/'],
};
