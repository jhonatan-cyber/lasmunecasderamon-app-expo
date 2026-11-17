// Polyfill de expo-sqlite para Expo Go y web, donde el módulo nativo no está
// disponible. Se entrega una base en memoria con el contrato que usa
// services/mirror: acepta escrituras sin persistirlas y las lecturas vienen
// vacías. Antes exportaba `openDatabaseSync: noop`, que devolvía `undefined` y
// hacía fallar cada escritura del espejo ("Cannot read property 'runSync' of
// undefined"). En dev client y builds nativos se usa el módulo real
// (ver metro.config.js).

const POLYFILL_TAG = 'expo-sqlite-polyfill:expo-go';

function createNoopDatabase() {
  return {
    tag: POLYFILL_TAG,
    execSync() {},
    runSync() {},
    getFirstSync() {
      return null;
    },
    getAllSync() {
      return [];
    },
    withTransactionSync(task) {
      if (typeof task === 'function') task();
    },
  };
}

module.exports = {
  POLYFILL_TAG,
  openDatabaseSync: () => createNoopDatabase(),
};
