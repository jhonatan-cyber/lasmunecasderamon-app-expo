import { MIRROR_DATABASE_NAME, type MirrorDriver, type MirrorParam } from './driver.types';
import { createPersistentWebDriver } from './persistentWebDriver';
export { MIRROR_DATABASE_NAME };
export type { MirrorDriver, MirrorParam };

let driver: MirrorDriver | null = null;
let initializing: Promise<void> | null = null;

export function prepareMirrorStorage(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (!initializing) initializing = import('sql.js/dist/sql-asm.js').then(async ({ default: init }) => {
        const SQL = await init();
        driver = createPersistentWebDriver(SQL, window.localStorage, MIRROR_DATABASE_NAME);
    }).catch(error => { initializing = null; throw error; });
    return initializing;
}

export function createExpoMirrorDriver(_databaseName: string = MIRROR_DATABASE_NAME): MirrorDriver {
    // Sin permiso/cuota de almacenamiento, se conserva el camino online;
    // outbox detecta que nada se persistió y nunca promete un envío posterior.
    return driver ?? {
        exec: () => {}, run: () => {},
        getFirst: () => null, getAll: () => [], transaction: task => task(),
    };
}
