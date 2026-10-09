import type { SQLInputValue } from 'node:sqlite';

import type { MirrorDriver, MirrorParam } from '@/services/mirror/driver';

/**
 * Driver del espejo respaldado por `node:sqlite` (Node 22+): los tests ejecutan
 * el SQL real del repositorio sin el módulo nativo de Expo. El import de
 * `MirrorDriver` es de tipo, así que `expo-sqlite` no se carga nunca aquí.
 */
export function createNodeSqliteMirrorDriver(): MirrorDriver & { close: () => void } {
    const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');
    const db = new DatabaseSync(':memory:');

    const bind = (params: MirrorParam[] = []): SQLInputValue[] =>
        params.map(param =>
            param instanceof ArrayBuffer ? new Uint8Array(param) : param
        ) as SQLInputValue[];

    return {
        exec: source => {
            db.exec(source);
        },
        run: (source, params) => {
            db.prepare(source).run(...bind(params));
        },
        getFirst: <T>(source: string, params: MirrorParam[] = []) =>
            (db.prepare(source).get(...bind(params)) ?? null) as unknown as T | null,
        getAll: <T>(source: string, params: MirrorParam[] = []) =>
            db.prepare(source).all(...bind(params)) as unknown as T[],
        transaction: task => {
            db.exec('BEGIN');
            try {
                task();
                db.exec('COMMIT');
            } catch (error) {
                db.exec('ROLLBACK');
                throw error;
            }
        },
        close: () => db.close(),
    };
}
