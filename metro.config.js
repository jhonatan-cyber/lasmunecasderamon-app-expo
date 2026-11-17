const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });
const forcedTslibPath = path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js');
const expoSqlitePolyfill = path.resolve(__dirname, 'polyfills/expo-sqlite.js');
const assetRegistryShim = path.resolve(__dirname, 'polyfills/react-native-web-asset-registry.js');

// Expo Go y web no traen el módulo nativo de expo-sqlite: ahí se sirve el
// polyfill en memoria. Dev client y builds nativos resuelven el módulo real,
// del que depende el espejo offline. `EXPO_GO=1` lo pone
// scripts/start-dev-clean-env.js al arrancar con `--go`.
const isExpoGo = process.env.EXPO_GO === '1';

if (process.platform === 'win32') {
  config.cacheStores = config.cacheStores.map(
    store => new store.constructor({ root: path.join(__dirname, '.expo', 'metro-cache') }),
  );
}

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  tslib: forcedTslibPath,
};

// Cada modo arma su propio grafo de módulos; evita reutilizar resoluciones
// cacheadas del otro bundle para expo-sqlite.
config.cacheVersion = `${config.cacheVersion ?? 'expo'}-${isExpoGo ? 'expo-go' : 'native'}`;

// En Windows, cuando el proyecto está en una unidad que no es C:, Metro
// puede no detectar cambios de archivos correctamente. Forzar watchFolders
// para que observe el directorio del proyecto explícitamente.
if (process.platform === 'win32') {
  config.watchFolders = [__dirname];
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib' || moduleName === 'tslib/modules/index.js') {
    return { type: 'sourceFile', filePath: forcedTslibPath };
  }
  if (moduleName === 'expo-sqlite' && (isExpoGo || platform === 'web')) {
    return { type: 'sourceFile', filePath: expoSqlitePolyfill };
  }
  // RNW 0.21 eliminó dist/exports/AssetRegistry y RN 0.88 ya no trae
  // @react-native/assets-registry; expo-image y react-native-svg todavía los
  // importan en su build web (ver polyfills/react-native-web-asset-registry.js).
  if (
    platform === 'web' &&
    (moduleName === 'react-native-web/dist/exports/AssetRegistry' ||
      moduleName === '@react-native/assets-registry/registry')
  ) {
    return { type: 'sourceFile', filePath: assetRegistryShim };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
