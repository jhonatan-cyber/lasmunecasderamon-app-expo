import logger from '@/utils/logger';

import { createExpoMirrorDriver, MIRROR_DATABASE_NAME, type MirrorDriver } from './driver';
import { createMirrorRepository, type MirrorRepository } from './repository';
import { ensureMirrorSchema, MIRROR_SCHEMA_VERSION } from './schema';

export { OfflineCacheMissError, decideMirrorFallback } from './repository';
export type {
    MirrorReadOptions,
    MirrorReadResult,
    MirrorRecord,
    MirrorRepository,
    MirrorWriteOptions,
} from './repository';
export type { MirrorDriver, MirrorParam } from './driver';
export { MIRROR_DATABASE_NAME, MIRROR_SCHEMA_VERSION };

/**
 * Claves del espejo. Están centralizadas para que las pantallas de las Fases
 * 1-4 no inventen strings sueltos y para poder enumerar qué se guarda.
 */
export const MIRROR_KEYS = {
    categories: 'catalog.categories',
    productsByCategory: (categoryId: string) => `catalog.products.${categoryId}`,
    anfitrionas: 'catalog.anfitrionas',
    rooms: 'catalog.rooms',
    roomsAvailable: 'catalog.rooms.disponibles',
    clients: 'catalog.clients',
    config: (group: string, key: string) => `config.${group}.${key}`,
    cashregisterStatus: 'caja.estado',
    cashregisterSummary: 'caja.resumen',
    openAccounts: 'cuentas.abiertas',
    accountsSummary: 'cuentas.resumen',
    /** Detalle de una cuenta: lo que el cajero necesita para cargarle consumos. */
    accountDetail: (id: string | number) => `cuentas.detalle.${id}`,
    salesList: 'ventas.listado',
    salesSummary: 'ventas.resumen',
    /** Detalle de una venta: lo que el cajero abre al tocar una tarjeta. */
    saleDetail: (id: string | number) => `ventas.detalle.${id}`,
    salesReport: 'ventas.reporte',
    barStock: 'bar.stock',
    barMovements: 'bar.movimientos',
    serviceRequests: 'solicitudes.listado',
    adminDashboard: 'admin.dashboard',
    adminFinancialEvents: 'admin.eventos-financieros',
} as const;

/** Última migración aplicada con éxito; `null` si el espejo no está listo. */
export const MIRROR_META_SCHEMA_VERSION = 'schema_version';

/**
 * Cuánta antigüedad tolera el espejo sin red, por tipo de dato. Un catálogo de
 * un turno atrás sigue sirviendo; una lista de cuentas abiertas, menos.
 */
export const MIRROR_MAX_AGE_MS = {
    /** Catálogo del garzón: productos, categorías, clientes, salas. */
    catalogo: 12 * 60 * 60 * 1000,
    /** Estado de caja y listados operativos. */
    operativo: 6 * 60 * 60 * 1000,
    /**
     * Datos con dinero de por medio (cuentas abiertas, ventas del turno, caja).
     * Vencen antes a propósito: cobrar sobre un saldo de hace medio día es
     * peor que no poder cobrar.
     */
    dinero: 2 * 60 * 60 * 1000,
} as const;

let driver: MirrorDriver | null = null;
let repository: MirrorRepository | null = null;
let schemaVersion: number | null = null;

/**
 * El driver se crea de forma perezosa: abrir SQLite en el arranque del bundle
 * (y sobre todo en la build web del smoke e2e) no debe poder romper la app.
 */
export function getMirrorDriver(): MirrorDriver {
    if (!driver) driver = createExpoMirrorDriver();
    return driver;
}

/** Repositorio del espejo (singleton perezoso). */
export function getMirror(): MirrorRepository {
    if (!repository) repository = createMirrorRepository(getMirrorDriver());
    return repository;
}

/**
 * Aplica las migraciones del espejo una sola vez por proceso. Nunca lanza: si
 * SQLite no está disponible deja el espejo sin inicializar y lo reporta.
 */
export function initMirror(): number | null {
    if (schemaVersion !== null) return schemaVersion;

    try {
        const mirror = getMirror();
        schemaVersion = ensureMirrorSchema(getMirrorDriver());
        mirror.setMeta(MIRROR_META_SCHEMA_VERSION, String(schemaVersion));
        return schemaVersion;
    } catch (error) {
        logger.captureException(error, { context: 'mirror:init' });
        return null;
    }
}

export function isMirrorReady(): boolean {
    return schemaVersion !== null;
}

/** Solo tests: inyecta un repositorio en lugar del que abre SQLite. */
export function setMirrorForTests(injected: MirrorRepository | null): void {
    repository = injected;
    schemaVersion = injected ? (schemaVersion ?? MIRROR_SCHEMA_VERSION) : null;
}
