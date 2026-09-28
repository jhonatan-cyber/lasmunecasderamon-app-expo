import type { MirrorDriver } from './driver';

/**
 * Migraciones del espejo local. Igual que en el dashboard, una migración ya
 * aplicada **no se edita**: se agrega una nueva al final.
 */
export interface MirrorMigration {
    version: number;
    name: string;
    statements: string[];
}

export const MIRROR_SCHEMA_VERSION = 2;

export const MIRROR_MIGRATIONS: readonly MirrorMigration[] = [
    {
        version: 1,
        name: 'cache_y_meta',
        statements: [
            `CREATE TABLE IF NOT EXISTS mirror_cache (
                key TEXT PRIMARY KEY NOT NULL,
                payload TEXT NOT NULL,
                synced_at INTEGER NOT NULL,
                source TEXT
            )`,
            `CREATE INDEX IF NOT EXISTS idx_mirror_cache_synced_at ON mirror_cache (synced_at)`,
            `CREATE TABLE IF NOT EXISTS mirror_meta (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )`,
        ],
    },
    {
        version: 2,
        name: 'outbox_de_intenciones',
        statements: [
            // Cola de intenciones (Fase 1): cada fila es trabajo que el usuario
            // ya hizo en el dispositivo y todavía no confirmó el servidor. No
            // guarda requests HTTP sino la intención de negocio, con su id como
            // clave de idempotencia al enviarla.
            `CREATE TABLE IF NOT EXISTS outbox (
                id TEXT PRIMARY KEY NOT NULL,
                type TEXT NOT NULL,
                payload TEXT NOT NULL,
                label TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pendiente',
                attempts INTEGER NOT NULL DEFAULT 0,
                last_error TEXT,
                applied_at INTEGER,
                response TEXT
            )`,
            `CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox (status, created_at ASC)`,
        ],
    },
];

const LEDGER_STATEMENT = `CREATE TABLE IF NOT EXISTS mirror_schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
)`;

/**
 * Migraciones que faltan aplicar, en orden ascendente. Es puro (no toca el
 * driver) para poder testear huecos y reaplicaciones.
 */
export function planMigrations(
    applied: readonly number[],
    migrations: readonly MirrorMigration[] = MIRROR_MIGRATIONS
): MirrorMigration[] {
    const done = new Set(applied);
    return migrations.filter(migration => !done.has(migration.version)).sort((a, b) => a.version - b.version);
}

export function readAppliedVersions(driver: MirrorDriver): number[] {
    const rows = driver.getAll<{ version: number }>(
        'SELECT version FROM mirror_schema_migrations ORDER BY version ASC'
    );
    return rows.map(row => Number(row.version));
}

/**
 * Crea el ledger si hace falta y aplica las migraciones pendientes, cada una en
 * su propia transacción. Devuelve la versión del esquema resultante.
 */
export function ensureMirrorSchema(
    driver: MirrorDriver,
    now: () => number = () => Date.now()
): number {
    driver.exec(LEDGER_STATEMENT);

    const applied = readAppliedVersions(driver);
    const pending = planMigrations(applied, MIRROR_MIGRATIONS);

    for (const migration of pending) {
        driver.transaction(() => {
            migration.statements.forEach(statement => driver.exec(statement));
            driver.run(
                'INSERT OR REPLACE INTO mirror_schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
                [migration.version, migration.name, now()]
            );
        });
    }

    if (pending.length > 0) {
        return pending[pending.length - 1].version;
    }
    return applied[applied.length - 1] ?? 0;
}
