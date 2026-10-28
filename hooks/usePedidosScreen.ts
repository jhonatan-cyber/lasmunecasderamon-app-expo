import { useCallback, useEffect, useRef, useState } from 'react';
import { showToast } from '@/utils/toast-lazy';
import { categoriesService } from '@/services';
import {
    getMirror,
    MIRROR_KEYS,
    MIRROR_MAX_AGE_MS,
    OfflineCacheMissError,
} from '@/services/mirror';
import { useDebouncedEventListeners } from '@/hooks/useDebouncedEventListener';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import logger from '@/utils/logger';

export interface Category {
    id: string;
    name: string;
    description: string;
    status: number;
    total_products: number;
    display_order: number;
}

export function usePedidosScreen() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [fromCache, setFromCache] = useState(false);
    const [syncedAt, setSyncedAt] = useState<number | null>(null);
    const dataRef = useRef<string>('');

    const fetchCategories = useCallback(async (isManual = false) => {
        try {
            setError('');

            const result = await getMirror().readThroughDetailed(
                MIRROR_KEYS.saleCategories,
                () => categoriesService.listForSale(),
                { maxAgeMs: MIRROR_MAX_AGE_MS.catalogo }
            );
            const data = result.data;
            setFromCache(result.fromCache);
            setSyncedAt(result.syncedAt);

            const serialized = JSON.stringify((data as any).data || []);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if ((data as any).success) {

                const active = ((data as any).data || [])
                    .filter(
                        (c: Category) => c.status === 1 && Number(c.total_products) > 0
                    )
                    .sort((a: Category, b: Category) => a.display_order - b.display_order);
                setCategories(active);
            } else {
                setError((data as any).message || 'Error al cargar categorías');
            }

            if (isManual) {
                showToast({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000,
                });
            }
        } catch (err: any) {
            if (err instanceof OfflineCacheMissError) {
                setError('Sin conexión y sin catálogo guardado en este dispositivo.');
            } else {
                setError(err.message || 'Error de conexión');
            }

            logger.fetchError(err, { context: 'PedidosScreen:fetchCategories' });

            if (isManual) {
                showToast({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar el catálogo',
                    visibilityTime: 3000,
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { void fetchCategories(); }, 0);
        return () => clearTimeout(timer);
    }, [fetchCategories]);

    useDebouncedEventListeners(
        [
            REALTIME_EVENT_NAMES.refreshCategories,
            REALTIME_EVENT_NAMES.refreshProducts,
            REALTIME_EVENT_NAMES.refreshBar,
        ],
        useCallback(() => {
            void fetchCategories();
        }, [fetchCategories]),
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCategories(true);
    }, [fetchCategories]);

    return { categories, loading, refreshing, error, fromCache, syncedAt, fetchCategories, onRefresh };
}
