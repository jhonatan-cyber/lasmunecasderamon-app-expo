const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const forcedTslibPath = path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js');

// En Windows la caché temporal compartida puede quedar bloqueada por otras
// sesiones de Metro. Conservamos el formato de Expo en una caché del proyecto.
if (process.platform === 'win32') {
  config.cacheStores = config.cacheStores.map(
    store => new store.constructor({ root: path.join(__dirname, '.expo', 'metro-cache') }),
  );
}

config.resolver.unstable_enablePackageExports = false;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  tslib: forcedTslibPath,
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib' || moduleName === 'tslib/modules/index.js') {
    return { type: 'sourceFile', filePath: forcedTslibPath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
