import { MIRROR_DATABASE_NAME, type MirrorDriver, type MirrorParam } from './driver.types';

export { MIRROR_DATABASE_NAME };
export type { MirrorDriver, MirrorParam };

/**
 * Driver web: no hay SQLite.
 *
 * `expo-sqlite` en web importa un worker con `wa-sqlite.wasm`, que Metro no
 * resuelve (rompía `expo export --platform web` y, con eso, el smoke e2e). Como
 * el garzón trabaja en teléfono, en web el almacén offline simplemente no
 * existe: este driver no lee ni escribe nada y la app funciona como antes,
 * siempre contra la red.
 *
 * Es un no-op silencioso a propósito, pero el resto del sistema no lo asume:
 * `createOutboxService` detecta que una intención no quedó guardada y la envía
 * directo (o falla con un mensaje claro si no hay red), así que nunca se pierde
 * trabajo en silencio.
 */
export function createExpoMirrorDriver(_databaseName: string = MIRROR_DATABASE_NAME): MirrorDriver {
    return {
        exec: () => {},
        run: () => {},
        getFirst: () => null,
        getAll: () => [],
        transaction: task => task(),
    };
}
