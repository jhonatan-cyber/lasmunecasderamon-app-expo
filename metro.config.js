const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const forcedTslibPath = path.resolve(__dirname, 'node_modules/tslib/tslib.es6.js');

// Avoid resolving tslib through package "exports" (`modules/index.js`)
// which crashes with Metro web in this dependency graph.
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
