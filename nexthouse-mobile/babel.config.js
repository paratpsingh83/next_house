module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Use 'default' transform profile so Babel transpiles private class
      // fields (#x, #y …) even when targeting Hermes. Expo Go ships an older
      // Hermes that doesn't support them natively; 'hermes-stable' (the
      // default) skips that transform and causes a runtime crash.
      ['babel-preset-expo', { unstable_transformProfile: 'default' }],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: { '@': './src' },
        },
      ],
      // reanimated plugin must always be last
      'react-native-reanimated/plugin',
    ],
  };
};
