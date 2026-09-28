import {
    MIRROR_DATABASE_NAME,
    MIRROR_META_SCHEMA_VERSION,
    MIRROR_SCHEMA_VERSION,
    getMirror,
    getMirrorDriver,
    type MirrorDriver,
    type MirrorRepository,
} from '@/services/mirror';
import { getOutbox, getOutboxRepository, type OutboxRepository } from '@/services/outbox';

/**
 * Lectura directa del SQLite del dispositivo para la pantalla de diagnóstico
 * (solo en desarrollo).
 *
 * Es **sólo lectura**: no escribe, no drena la cola y no toca el espejo. Su
 * utilidad es justamente mostrar las filas tal como quedaron guardadas, para
 * responder en el teléfono —sin depurador— preguntas como «¿esta venta está
 * realmente en el dispositivo?» o «¿por qué el espejo dice que tiene 6 horas?».
 *
 * Todo va envuelto: si SQLite no está disponible (build web sin almacén, base
 * corrupta) el reporte lo dice en `db.available`/`db.error` en vez de lanzar y
 * tumbar la pantalla que intenta diagnosticar.
 */

/** Longitud máxima del fragmento de JSON que se muestra por fila. */
export const PREVIEW_MAX_CHARS = 400;

export interface DiagnosticsMirrorRow {
    key: string;
    /** Hora en que el dato quedó guardado (ms desde el epoch). */
    syncedAt: number;
    /** Cuánto tiene ese dato respecto de ahora. */
    ageMs: number;
    source: string | null;
    /** Tamaño del payload serializado, en bytes. */
    bytes: number;
    preview: string;
}

export interface DiagnosticsOutboxRow {
    id: string;
    type: string;
    label: string;
    status: string;
    attempts: number;
    createdAt: number;
    updatedAt: number;
    lastError: string | null;
    /** Sello del momento de la operación, si la intención lo lleva. */
    deviceDate: string | null;
    payloadPreview: string;
}

export interface OfflineDiagnostics {
    collectedAt: number;
    db: {
        name: string;
        available: boolean;
        /** Error concreto cuando no se pudo leer (si lo hubo). */
        error: string | null;
        /** Migración aplicada en el teléfono (leída de `mirror_meta`). */
        appliedSchemaVersion: number | null;
        /** Migración que espera este build de la app. */
        expectedSchemaVersion: number;
        tables: string[];
    };
    mirror: {
        count: number;
        rows: DiagnosticsMirrorRow[];
    };
    outbox: {
        /** Todas las filas, incluidas las ya aplicadas. */
        total: number;
        /** Pendientes, en vuelo y fallidas: lo que muestra la pantalla de pendientes. */
        unresolved: number;
        rows: DiagnosticsOutboxRow[];
    };
}

export interface DiagnosticsDependencies {
    driver?: MirrorDriver;
    mirror?: MirrorRepository;
    outboxRepository?: OutboxRepository | null;
    now?: number;
}

/** Fragmento legible de un JSON potencialmente enorme. */
export function previewOf(value: unknown, maxChars = PREVIEW_MAX_CHARS): string {
    let text: string;

    try {
        text = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
    } catch {
        return '[payload ilegible]';
    }

    return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

export function collectOfflineDiagnostics(
    deps: DiagnosticsDependencies = {}
): OfflineDiagnostics {
    const now = deps.now ?? Date.now();

    const report: OfflineDiagnostics = {
        collectedAt: now,
        db: {
            name: MIRROR_DATABASE_NAME,
            available: false,
            error: null,
            appliedSchemaVersion: null,
            expectedSchemaVersion: MIRROR_SCHEMA_VERSION,
            tables: [],
        },
        mirror: { count: 0, rows: [] },
        outbox: { total: 0, unresolved: 0, rows: [] },
    };

    let driver: MirrorDriver;
    try {
        driver = deps.driver ?? getMirrorDriver();
    } catch (error) {
        report.db.error = error instanceof Error ? error.message : String(error);
        return report;
    }

    // El driver puede existir y aun así no tener la base abierta: cada lectura se
    // protege por separado para que un fallo no vacíe el resto del reporte.
    try {
        const tablas = driver.getAll<{ name: string }>(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name ASC"
        );
        report.db.tables = tablas.map(fila => String(fila.name));
        report.db.available = report.db.tables.includes('mirror_cache');
    } catch (error) {
        report.db.error = error instanceof Error ? error.message : String(error);
        return report;
    }

    try {
        const mirror = deps.mirror ?? getMirror();
        const aplicada = mirror.getMeta(MIRROR_META_SCHEMA_VERSION);
        report.db.appliedSchemaVersion = aplicada === null ? null : Number(aplicada);

        report.mirror.rows = mirror.keys().flatMap(key => {
            const registro = mirror.get(key);
            if (!registro) return [];

            return [
                {
                    key,
                    syncedAt: registro.syncedAt,
                    ageMs: now - registro.syncedAt,
                    source: registro.source,
                    bytes: JSON.stringify(registro.data)?.length ?? 0,
                    preview: previewOf(registro.data),
                },
            ];
        });
        report.mirror.count = report.mirror.rows.length;
    } catch (error) {
        report.db.error ??= error instanceof Error ? error.message : String(error);
    }

    try {
        // `getOutbox()` asegura el esquema de la cola y crea su repositorio;
        // acá sólo se lee.
        let outbox = deps.outboxRepository ?? null;
        if (!outbox) {
            getOutbox();
            outbox = getOutboxRepository();
        }

        if (outbox) {
            const filas = outbox.list();
            report.outbox.total = filas.length;
            report.outbox.unresolved = outbox.countUnresolved();
            report.outbox.rows = filas.map(fila => ({
                id: String(fila.id),
                type: String(fila.type),
                label: String(fila.label ?? ''),
                status: String(fila.status),
                attempts: Number(fila.attempts ?? 0),
                createdAt: Number(fila.createdAt ?? 0),
                updatedAt: Number(fila.updatedAt ?? 0),
                lastError: fila.lastError ?? null,
                deviceDate: deviceDateOf(fila.payload),
                payloadPreview: previewOf(fila.payload),
            }));
        }
    } catch (error) {
        report.db.error ??= error instanceof Error ? error.message : String(error);
    }

    return report;
}

/** `device_date` del payload, si la intención lo lleva (el sello de la operación). */
function deviceDateOf(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

    const value = (payload as { device_date?: unknown }).device_date;
    return typeof value === 'string' ? value : null;
}
