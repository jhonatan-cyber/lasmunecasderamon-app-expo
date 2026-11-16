const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });
const forcedTslibPath = path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js');
const expoSqlitePolyfill = path.resolve(__dirname, 'polyfills/expo-sqlite.js');

if (process.platform === 'win32') {
  config.cacheStores = config.cacheStores.map(
    store => new store.constructor({ root: path.join(__dirname, '.expo', 'metro-cache') }),
  );
}

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  tslib: forcedTslibPath,
  'expo-sqlite': expoSqlitePolyfill,
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib' || moduleName === 'tslib/modules/index.js') {
    return { type: 'sourceFile', filePath: forcedTslibPath };
  }
  if (moduleName === 'expo-sqlite') {
    return { type: 'sourceFile', filePath: expoSqlitePolyfill };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
