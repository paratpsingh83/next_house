module.exports = {
  extends: ['expo'],
  rules: {
    // Every default export in app/ is consumed automatically by Expo Router's
    // file-based routing system. ESLint can't see that, so suppress the warning.
    'import/no-unused-modules': 'off',
  },
};