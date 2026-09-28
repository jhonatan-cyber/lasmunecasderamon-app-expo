import * as SQLite from 'expo-sqlite';

import { MIRROR_DATABASE_NAME, type MirrorDriver, type MirrorParam } from './driver.types';

export { MIRROR_DATABASE_NAME };
export type { MirrorDriver, MirrorParam };

/**
 * Driver nativo (iOS/Android): archivo SQLite en el directorio de documentos de
 * la app. No vive en AsyncStorage porque el espejo necesita consultas por clave,
 * filtros y metadatos, y comparte base con la cola de intenciones.
 */
export function createExpoMirrorDriver(databaseName: string = MIRROR_DATABASE_NAME): MirrorDriver {
    const db = SQLite.openDatabaseSync(databaseName);

    return {
        exec: source => db.execSync(source),
        run: (source, params = []) => {
            db.runSync(source, params);
        },
        getFirst: <T>(source: string, params: MirrorParam[] = []) =>
            db.getFirstSync<T>(source, params),
        getAll: <T>(source: string, params: MirrorParam[] = []) => db.getAllSync<T>(source, params),
        transaction: task => db.withTransactionSync(task),
    };
}
