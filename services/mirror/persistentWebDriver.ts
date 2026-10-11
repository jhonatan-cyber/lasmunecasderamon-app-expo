import type { Database, SqlJsStatic, BindParams } from 'sql.js';
import type { MirrorDriver, MirrorParam } from './driver.types';

export interface OfflineStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

/** SQLite en JavaScript puro: no requiere WASM, workers ni SharedArrayBuffer. */
export function createPersistentWebDriver(SQL: SqlJsStatic, storage: OfflineStorage, key: string): MirrorDriver {
    const encode = (data: Uint8Array) => {
        let raw = '';
        for (let offset = 0; offset < data.length; offset += 8192) {
            raw += String.fromCharCode(...data.subarray(offset, offset + 8192));
        }
        return btoa(raw);
    };
    const decode = (data: string) => Uint8Array.from(atob(data), char => char.charCodeAt(0));
    let persisted = storage.getItem(key);
    let db: Database = persisted ? new SQL.Database(decode(persisted)) : new SQL.Database();
    let inTransaction = false;
    const reload = () => {
        if (inTransaction) return;
        const latest = storage.getItem(key);
        if (latest !== persisted) {
            const next = latest ? new SQL.Database(decode(latest)) : new SQL.Database();
            db.close(); db = next; persisted = latest;
        }
    };
    const persist = () => {
        const serialized = encode(db.export());
        storage.setItem(key, serialized);
        persisted = serialized;
    };
    const mutate = (task: () => void) => {
        if (inTransaction) { task(); return; }
        reload();
        const backup = db.export();
        try { task(); persist(); }
        catch (error) {
            db.close(); db = new SQL.Database(backup);
            throw error;
        }
    };
    const bind = (params: MirrorParam[]) => params.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) :
        typeof value === 'boolean' ? Number(value) : value) as BindParams;
    const getAll = <T>(source: string, params: MirrorParam[] = []): T[] => {
        reload();
        const statement = db.prepare(source);
        try {
            statement.bind(bind(params));
            const rows: T[] = [];
            while (statement.step()) rows.push(statement.getAsObject() as T);
            return rows;
        } finally { statement.free(); }
    };
    return {
        exec: source => mutate(() => { db.exec(source); }),
        run: (source, params = []) => mutate(() => { db.run(source, bind(params)); }),
        getAll,
        getFirst: <T>(source: string, params: MirrorParam[] = []) => getAll<T>(source, params)[0] ?? null,
        transaction: task => {
            if (inTransaction) { task(); return; }
            mutate(() => {
                db.run('BEGIN'); inTransaction = true;
                try { task(); db.run('COMMIT'); }
                catch (error) { db.run('ROLLBACK'); throw error; }
                finally { inTransaction = false; }
            });
        },
    };
}
