const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @tanstack/query-core and @tanstack/react-query declare "react-native": "src/index.ts"
// Metro picks that entry and gets raw TypeScript with #private class fields, which
// Hermes (the Expo Go JS engine) cannot parse. Adding @tanstack to the transform
// whitelist makes Metro run these files through babel-preset-expo, which handles
// TypeScript and private class properties.
config.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-modal|@tanstack)/)',
];

module.exports = config;
