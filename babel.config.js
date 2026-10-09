module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
      },
    ],
    // Worklets must stay last: the plugin extracts UI-thread callbacks after
    // all other Babel transforms have finished.
    'react-native-worklets/plugin',
  ],
};
