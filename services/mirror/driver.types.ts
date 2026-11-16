/**
 * Contrato del driver SQLite del almacén offline (espejo + cola de
 * intenciones).
 */
export const MIRROR_DATABASE_NAME = 'lasmunecas-offline-mirror.db';

export type MirrorParam = string | number | null | boolean | Uint8Array | ArrayBuffer;

/**
 * Superficie mínima que se necesita de SQLite. Existe para poder sustituir el
 * driver en tests (ver `tests/helpers/nodeSqliteMirrorDriver.ts`) y para tener
 * una implementación por plataforma.
 */
export interface MirrorDriver {
    exec(source: string): void;
    run(source: string, params?: MirrorParam[]): void;
    getFirst<T>(source: string, params?: MirrorParam[]): T | null;
    getAll<T>(source: string, params?: MirrorParam[]): T[];
    transaction(task: () => void): void;
}

