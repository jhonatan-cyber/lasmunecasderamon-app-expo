// Polyfill para expo-sqlite en Expo Go.
// Expo Go no incluye módulos nativos personalizados como expo-sqlite.
// Este archivo proporciona una implementación vacía para que el bundler no falle.
// En un build con dev client o producción, se usa el módulo nativo real.

function noop() {}

module.exports = {
  openDatabaseSync: noop,
  noop,
};
