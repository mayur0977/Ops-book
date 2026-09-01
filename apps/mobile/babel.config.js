module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Must be last. Reanimated's plugin rewrites worklets, and anything that
      // runs after it will not see them.
      'react-native-worklets/plugin',
    ],
  };
};
