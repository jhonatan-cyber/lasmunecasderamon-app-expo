import { connectivity } from '@/services/connectivity';
import logger from '@/utils/logger';

import type { MirrorDriver, MirrorParam } from './driver';

export interface MirrorRecord<T> {
    data: T;
    syncedAt: number;
    source: string | null;
}

export interface MirrorWriteOptions {
    /** De dónde vino el dato (endpoint o pantalla), para diagnóstico. */
    source?: string;
    syncedAt?: number;
}

export interface MirrorReadOptions {
    /**
     * Antigüedad máxima aceptable del espejo cuando NO hay red. Sin valor, el
     * dato guardado se usa sin importar cuánto tiempo pasó.
     */
    maxAgeMs?: number;
    /**
     * Inyectable en tests; por defecto la conectividad unificada.
     *
     * Pregunta **solo si está confirmado que no hay red**, no si hay: en
     * `unknown` (arranque, antes de que `expo-network` conteste) hay que
     * intentar la red igual. Al revés, la app que arranca sin saber su red
     * fallaría con «sin conexión y sin datos guardados» en vez de pedir el dato.
     */
    isOffline?: () => boolean;
    /** Se invoca cuando el espejo salvó la lectura tras fallar la red. */
    onFallback?: (error: Error) => void;
}

export interface MirrorReadResult<T> {
    data: T;
    /** `true` si el dato viene del espejo local y no del servidor. */
    fromCache: boolean;
    syncedAt: number;
    /** Error de red que provocó el fallback; `null` si la lectura fue limpia. */
    error: Error | null;
}

export type MirrorFallbackDecision =
    | { action: 'fetch' }
    | { action: 'cached' }
    | { action: 'fail' };

/** Sin red y sin nada guardado para esa clave. */
export class OfflineCacheMissError extends Error {
    readonly code = 'OFFLINE_CACHE_MISS';
    readonly key: string;

    constructor(key: string) {
        super('Sin conexión y sin datos guardados para esta sección.');
        this.name = 'OfflineCacheMissError';
        this.key = key;
    }
}

/**
 * Decide qué hacer ante una lectura. Puro y explícito:
 *
 * - con red → siempre se consulta al servidor (el espejo es respaldo, no caché
 *   de escritura diferida);
 * - sin red → sirve el espejo si existe y respeta `maxAgeMs`;
 * - sin red y sin espejo útil → falla, para que la pantalla muestre que no hay
 *   datos en vez de una lista vacía silenciosa.
 */
export function decideMirrorFallback(input: {
    online: boolean;
    hasCache: boolean;
    cacheAgeMs: number | null;
    maxAgeMs?: number;
}): MirrorFallbackDecision {
    if (input.online) return { action: 'fetch' };

    const freshEnough =
        input.maxAgeMs === undefined ||
        (input.cacheAgeMs !== null && input.cacheAgeMs <= input.maxAgeMs);

    if (input.hasCache && freshEnough) return { action: 'cached' };
    return { action: 'fail' };
}

export interface MirrorRepository {
    put<T>(key: string, data: T, options?: MirrorWriteOptions): void;
    get<T>(key: string): MirrorRecord<T> | null;
    remove(key: string): void;
    clear(): void;
    keys(): string[];
    getMeta(key: string): string | null;
    setMeta(key: string, value: string): void;
    readThrough<T>(key: string, fetcher: () => Promise<T>, options?: MirrorReadOptions): Promise<T>;
    readThroughDetailed<T>(
        key: string,
        fetcher: () => Promise<T>,
        options?: MirrorReadOptions
    ): Promise<MirrorReadResult<T>>;
}

interface CacheRow {
    payload: string;
    synced_at: number;
    source: string | null;
}

interface MetaRow {
    value: string;
}

export function createMirrorRepository(
    driver: MirrorDriver,
    options: { isOffline?: () => boolean; now?: () => number } = {}
): MirrorRepository {
    const isOffline = options.isOffline ?? (() => connectivity.isOffline());
    const now = options.now ?? (() => Date.now());

    const remove = (key: string) => {
        try {
            driver.run('DELETE FROM mirror_cache WHERE key = ?', [key]);
        } catch (error) {
            logger.captureException(error, { context: 'mirror:remove', key });
        }
    };

    /**
     * Lectura tolerante: si el almacén local no está disponible (build web sin
     * SQLite, base corrupta) el espejo se comporta como si no tuviera nada y la
     * pantalla sigue funcionando contra la red.
     */
    const readFirst = <T>(source: string, params: MirrorParam[] = []): T | null => {
        try {
            return driver.getFirst<T>(source, params);
        } catch (error) {
            logger.warn('Espejo local: no se pudo leer; se ignora el dato guardado', { error });
            return null;
        }
    };

    const get = <T>(key: string): MirrorRecord<T> | null => {
        const row = readFirst<CacheRow>(
            'SELECT payload, synced_at, source FROM mirror_cache WHERE key = ?',
            [key]
        );
        if (!row) return null;

        try {
            return {
                data: JSON.parse(row.payload) as T,
                syncedAt: Number(row.synced_at),
                source: row.source ?? null,
            };
        } catch (error) {
            // Un payload corrupto no puede tumbar la pantalla: se descarta.
            logger.warn('Espejo local: payload ilegible, se descarta', { key, error });
            remove(key);
            return null;
        }
    };

    const put = <T>(key: string, data: T, write: MirrorWriteOptions = {}) => {
        try {
            driver.run(
                'INSERT OR REPLACE INTO mirror_cache (key, payload, synced_at, source) VALUES (?, ?, ?, ?)',
                [key, JSON.stringify(data), write.syncedAt ?? now(), write.source ?? null]
            );
        } catch (error) {
            logger.captureException(error, { context: 'mirror:put', key });
        }
    };

    const readThroughDetailed = async <T>(
        key: string,
        fetcher: () => Promise<T>,
        read: MirrorReadOptions = {}
    ): Promise<MirrorReadResult<T>> => {
        // `unknown` cuenta como "quizá hay red": solo el offline confirmado
        // habilita servir el espejo sin preguntarle al servidor.
        const offline = (read.isOffline ?? isOffline)();
        const cached = get<T>(key);
        const cacheAgeMs = cached ? now() - cached.syncedAt : null;

        const decision = decideMirrorFallback({
            online: !offline,
            hasCache: Boolean(cached),
            cacheAgeMs,
            maxAgeMs: read.maxAgeMs,
        });

        if (decision.action === 'cached' && cached) {
            return { data: cached.data, fromCache: true, syncedAt: cached.syncedAt, error: null };
        }

        if (decision.action === 'fail') {
            throw new OfflineCacheMissError(key);
        }

        try {
            const data = await fetcher();
            // Una sola lectura del reloj: si se sellara al guardar y se informara
            // otra, la pantalla mostraría una antigüedad que no es la que quedó
            // escrita en el espejo.
            const syncedAt = now();
            put(key, data, { syncedAt });
            return { data, fromCache: false, syncedAt, error: null };
        } catch (error) {
            const failure = error instanceof Error ? error : new Error(String(error));
            if (cached) {
                // Con red pero servidor caído: mejor dato viejo que pantalla roja,
                // y el error queda expuesto para que la UI avise.
                read.onFallback?.(failure);
                logger.warn('Espejo local: servidor inaccesible, se usa el dato guardado', {
                    key,
                    error: failure,
                });
                return {
                    data: cached.data,
                    fromCache: true,
                    syncedAt: cached.syncedAt,
                    error: failure,
                };
            }
            throw failure;
        }
    };

    return {
        put,
        get,
        remove,
        clear: () => {
            try {
                driver.run('DELETE FROM mirror_cache');
            } catch (error) {
                logger.captureException(error, { context: 'mirror:clear' });
            }
        },
        keys: () => {
            try {
                return driver
                    .getAll<{ key: string }>('SELECT key FROM mirror_cache ORDER BY key ASC')
                    .map(row => row.key);
            } catch (error) {
                logger.captureException(error, { context: 'mirror:keys' });
                return [];
            }
        },
        getMeta: (key: string) => {
            const row = readFirst<MetaRow>('SELECT value FROM mirror_meta WHERE key = ?', [key]);
            return row?.value ?? null;
        },
        setMeta: (key: string, value: string) => {
            try {
                driver.run(
                    'INSERT OR REPLACE INTO mirror_meta (key, value, updated_at) VALUES (?, ?, ?)',
                    [key, value, now()]
                );
            } catch (error) {
                logger.captureException(error, { context: 'mirror:setMeta', key });
            }
        },
        readThrough: async <T>(
            key: string,
            fetcher: () => Promise<T>,
            read: MirrorReadOptions = {}
        ): Promise<T> => {
            const result = await readThroughDetailed<T>(key, fetcher, read);
            return result.data;
        },
        readThroughDetailed,
    };
}
