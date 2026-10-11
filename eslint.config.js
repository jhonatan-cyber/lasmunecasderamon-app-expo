
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', '.expo/**', '.expo-smoke/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
  },
]);
