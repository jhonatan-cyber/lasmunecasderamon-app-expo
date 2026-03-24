import { useState, useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { parseDateSafe } from '@/utils/timeUtils';
import { useTimer } from '@/context/TimerContext';

const CACHE_KEY = 'solicitudes_cache_v1';

export const useSolicitudes = () => {
    const { serverOffset } = useTimer();
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cajaAbierta, setCajaAbierta] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const [allHostesses, setAllHostesses] = useState<any[]>([]);
    const dataRef = useRef<string>('');
    const [pendingAutoOpen, setPendingAutoOpen] = useState<{ id: string, type: string } | null>(null);

    // Cargar caché al inicio
    useEffect(() => {
        const loadCache = async () => {
            try {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setSolicitudes(parsed);
                }
            } catch (err) {
                console.error('[useSolicitudes] Error cargando caché:', err);
            }
        };
        loadCache();
    }, []);

    const fetchSolicitudes = useCallback(async (isManual = false) => {
        try {
            const [resSolicitudes, resOrders, resAnticipos, resStats, resAnfitrionas] = await Promise.all([
                apiClient('/solicitudes-servicios?estado=pendiente').catch(() => ({ success: false, data: [] })),
                apiClient('/orders').catch(() => ({ success: false, data: [] })),
                apiClient('/anticipos').catch(() => ({ success: false, data: [] })),
                apiClient('/caja/stats').catch(() => null),
                apiClient('/users?anfitrionas=1').catch(() => ({ success: false, data: [] }))
            ]);

            if (resAnfitrionas.success) {
                setAllHostesses(resAnfitrionas.data || []);
            }

            const newData = { solicitudes: resSolicitudes.data, orders: resOrders.data, stats: resStats };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (resStats && typeof resStats.cajas_abiertas !== 'undefined') {
                setCajaAbierta(resStats.cajas_abiertas > 0);
            }

            let combined: any[] = [];

            if (resSolicitudes.success) {
                const arr = (resSolicitudes.data || []).map((s: any) => ({
                    ...s,
                    tipoItem: 'solicitud',
                    id_unificado: `solicitud_${s.id_solicitud}`,
                    fecha_orden: parseDateSafe(s.fecha_solicitud).getTime()
                }));
                combined = [...combined, ...arr];
            }

            if (resOrders.success) {
                const arr = (resOrders.data || []).map((o: any) => ({
                    ...o,
                    tipoItem: 'pedido',
                    id_unificado: `pedido_${o.id_pedido}`,
                    fecha_orden: parseDateSafe(o.fecha_crea).getTime()
                }));
                combined = [...combined, ...arr];
            }

            if (resAnticipos.success) {
                const arr = (resAnticipos.data || [])
                    .filter((a: any) => a.estado === 1 || a.estado === 2)
                    .map((a: any) => ({
                        ...a,
                        tipoItem: 'anticipo',
                        id_unificado: `anticipo_${a.id_anticipo}`,
                        fecha_orden: parseDateSafe(a.fecha_crea).getTime()
                    }));
                combined = [...combined, ...arr];
            }

            combined.sort((a, b) => b.fecha_orden - a.fecha_orden);
            setSolicitudes(combined);
            setIsOffline(false);

            // Guardar en caché exitosamente
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(combined)).catch(() => null);

            if (isManual) {
                Toast.show({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching solicitudes:', error);
            setIsOffline(true);
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Modo Offline',
                    text2: 'No se pudo conectar al servidor. Mostrando datos guardados.',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSolicitudes();
    }, [fetchSolicitudes]);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('refresh_requests', (payload?: any) => {
            fetchSolicitudes();
            if (payload && payload.data && (payload.type === 'new_order' || payload.type === 'new_service_request')) {
                console.log('[useSolicitudes] 🤖 Auto-opening signal received:', payload.type, payload.data.id);
                setPendingAutoOpen({
                    id: payload.data.id,
                    type: payload.type === 'new_order' ? 'pedido' : 'solicitud'
                });
            }
        });
        return () => subscription.remove();
    }, [fetchSolicitudes]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSolicitudes(true);
    }, [fetchSolicitudes]);

    const removeSolicitudLocally = useCallback((id: string, tipo: 'pedido' | 'solicitud' | 'anticipo') => {
        setSolicitudes(prev => {
            const up = prev.filter(s => {
                if (tipo === 'pedido') return s.id_pedido !== id;
                if (tipo === 'solicitud') return s.id_solicitud !== id;
                if (tipo === 'anticipo') return s.id_anticipo !== id;
                return true;
            });
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(up)).catch(() => null);
            return up;
        });
    }, []);

    return {
        solicitudes,
        loading,
        refreshing,
        cajaAbierta,
        isOffline,
        allHostesses,
        fetchSolicitudes,
        onRefresh,
        pendingAutoOpen,
        setPendingAutoOpen,
        serverOffset,
        removeSolicitudLocally
    };
};

