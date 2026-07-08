import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { categoriesService } from '@/services';

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
    const dataRef = useRef<string>('');

    const fetchCategories = useCallback(async (isManual = false) => {
        try {
            setError('');
            const data = await categoriesService.list();

            const serialized = JSON.stringify((data as any).data || []);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if ((data as any).success) {
                const active = ((data as any).data || [])
                    .filter((c: Category) => c.status === 1)
                    .sort((a: Category, b: Category) => a.display_order - b.display_order);
                setCategories(active);
            } else {
                setError((data as any).message || 'Error al cargar categorías');
            }

            if (isManual) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000,
                });
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
            if (isManual) {
                Toast.show({
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
        void fetchCategories();
    }, [fetchCategories]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCategories(true);
    }, [fetchCategories]);

    return { categories, loading, refreshing, error, fetchCategories, onRefresh };
}
