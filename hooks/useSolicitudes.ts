import { useState, useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { parseDateSafe } from '@/utils/timeUtils';
import { useTimer } from '@/context/TimerContext';

import logger from '@/utils/logger';
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
                logger.captureException(err, { context: 'useSolicitudes:loadCache' });
            }
        };
        loadCache();
    }, []);

    const fetchSolicitudes = useCallback(async (isManual = false) => {
        try {
            const [resSolicitudes, resOrders, resAnticipos, resStats, resAnfitrionas] = await Promise.all([
                apiClient('/solicitudes-servicios?estado=0').catch(() => ({ success: false, data: [] })),
                apiClient('/orders').catch(() => ({ success: false, data: [] })),
                apiClient('/anticipos').catch(() => ({ success: false, data: [] })),
                apiClient('/caja/stats').catch(() => null),
                apiClient('/anfitrionas').catch(() => ({ success: false, data: [] }))
            ]);

            if (Array.isArray(resAnfitrionas)) {
                setAllHostesses(resAnfitrionas);
            } else if (resAnfitrionas.success) {
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
                    // El backend devuelve 'id' pero necesitamos 'id_pedido' para el frontend
                    id_pedido: o.id_pedido || o.id,
                    tipoItem: 'pedido',
                    id_unificado: `pedido_${o.id_pedido || o.id}`,
                    fecha_orden: parseDateSafe(o.fecha_crea).getTime()
                }));
                combined = [...combined, ...arr];
            }

            if (resAnticipos.success) {
                const arr = (resAnticipos.data || [])
                    .filter((a: any) => a.estado === 1 || a.estado === 2)
                    .map((a: any) => ({
                        ...a,
                        codigo: a.codigo || `ANT-${String(a.id_anticipo).slice(0, 6).toUpperCase()}`,
                        usuario: a.usuario || a.nick || `${a.nombre || a.name || ''} ${a.apellido || a.lastName || ''}`.trim(),
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
            logger.captureException(error, { context: 'useSolicitudes:fetchSolicitudes' });
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
            logger.info('[useSolicitudes] 📡 SSE event received:', payload);
            fetchSolicitudes();
            // Solo configurar auto-open si hay un ID válido
            if (payload && payload.data && payload.data.id && (payload.type === 'new_order' || payload.type === 'new_service_request')) {
                logger.info('[useSolicitudes] 🤖 Auto-opening signal received:', { arg0: payload.type, arg1: payload.data.id });
                setPendingAutoOpen({
                    id: payload.data.id,
                    type: payload.type === 'new_order' ? 'pedido' : 'solicitud'
                });
            } else {
                logger.info('[useSolicitudes] ⚠️ Auto-open skipped - no valid id:', payload?.data?.id);
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

