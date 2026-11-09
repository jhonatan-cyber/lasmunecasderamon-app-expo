
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', '.expo/**', '.expo-smoke/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    // Estos archivos usan setState en callbacks de UI (onRefresh, cargar) que no son
    // useEffect directos. La regla produce falsos positivos para esos patrones.
    files: [
      'components/screens/LimpiezaScreen.tsx',
      'components/screens/LimpiezaScreenAnfitriona.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
