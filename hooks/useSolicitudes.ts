import { useState, useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '@/utils/toast-lazy';
import { apiClientSafe } from '@/api/client';
import { parseDateSafe } from '@/utils/timeUtils';
import { useTimer } from '@/context/TimerContext';
import type { Anfitriona } from '@lasmunecasderamon/types';
import type { SSEPayload } from '@/types/realtime';
import type { SolicitudItem } from '@/hooks/types/solicitudesTypes';


import logger from '@/utils/logger';
const CACHE_KEY = 'solicitudes_cache_v1';

export const useSolicitudes = () => {
    const { serverOffset } = useTimer();
    const [solicitudes, setSolicitudes] = useState<SolicitudItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cajaAbierta, setCajaAbierta] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const [allHostesses, setAllHostesses] = useState<Anfitriona[]>([]);
    const dataRef = useRef<string>('');
    const [pendingAutoOpen, setPendingAutoOpen] = useState<{ id: string, type: string } | null>(null);

    
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

    const fetchSolicitudes = useCallback(async (isManual = false, signal?: AbortSignal) => {
        try {
            const [resSolicitudes, resOrders, resAnticipos, resStats, resAnfitrionas] = await Promise.all([
                apiClientSafe<SolicitudItem[]>('/solicitudes-servicios?estado=0', { signal }).catch(() => ({ success: false, data: [] })),
                apiClientSafe<SolicitudItem[]>('/orders', { signal }).catch(() => ({ success: false, data: [] })),
                apiClientSafe<SolicitudItem[]>('/anticipos', { signal }).catch(() => ({ success: false, data: [] })),
                apiClientSafe<{ cajas_abiertas: number }>('/caja/stats', { signal }).catch(() => null),
                apiClientSafe<Anfitriona[]>('/anfitrionas', { signal }).catch(() => ({ success: false, data: [] }))
            ]);

            const anfitrionasData = resAnfitrionas as unknown as { success: boolean; data: Anfitriona[] };
            if (Array.isArray(resAnfitrionas)) {
                setAllHostesses(resAnfitrionas);
            } else if (anfitrionasData.success) {
                setAllHostesses(anfitrionasData.data || []);
            }

            const newData = { solicitudes: resSolicitudes.data, orders: resOrders.data, stats: resStats };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (resStats?.data && typeof resStats.data.cajas_abiertas !== 'undefined') {
                setCajaAbierta(resStats.data.cajas_abiertas > 0);
            }

            let combined: SolicitudItem[] = [];

            if (resSolicitudes.success) {
                const arr: SolicitudItem[] = (resSolicitudes.data as any[] || []).map((s: Record<string, unknown>) => ({
                    ...s,
                    tipoItem: 'solicitud' as const,
                    id_unificado: `solicitud_${s.id_solicitud}`,
                    fecha_orden: parseDateSafe(s.fecha_solicitud as string).getTime()
                } as SolicitudItem));
                combined = [...combined, ...arr];
            }

            if (resOrders.success) {
                const arr: SolicitudItem[] = (resOrders.data as any[] || []).map((o: Record<string, unknown>) => ({
                    ...o,
                    id_pedido: o.id_pedido || o.id,
                    tipoItem: 'pedido' as const,
                    id_unificado: `pedido_${o.id_pedido || o.id}`,
                    fecha_orden: parseDateSafe(o.fecha_crea as string).getTime()
                } as SolicitudItem));
                combined = [...combined, ...arr];
            }

            if (resAnticipos.success) {
                const arr: SolicitudItem[] = (resAnticipos.data as any[] || [])
                    .filter((a: Record<string, unknown>) => a.estado === 1 || a.estado === 2)
                    .map((a: Record<string, unknown>) => ({
                        ...a,
                        codigo: (a.codigo as string) || `ANT-${String(a.id_anticipo).slice(0, 6).toUpperCase()}`,
                        usuario: (a.usuario as string) || (a.nick as string) || `${a.nombre || a.name || ''} ${a.apellido || a.lastName || ''}`.trim(),
                        tipoItem: 'anticipo' as const,
                        id_unificado: `anticipo_${a.id_anticipo}`,
                        fecha_orden: parseDateSafe(a.fecha_crea as string).getTime()
                    } as SolicitudItem));
                combined = [...combined, ...arr];
            }

            combined.sort((a, b) => b.fecha_orden - a.fecha_orden);
            setSolicitudes(combined);
            setIsOffline(false);

            
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(combined)).catch(() => null);

            if (isManual) {
                showToast({
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
                showToast({
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
        const ac = new AbortController();
        fetchSolicitudes(false, ac.signal);
        return () => ac.abort();
    }, [fetchSolicitudes]);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('refresh_requests', (payload: SSEPayload) => {
            logger.debug('[useSolicitudes] 📡 SSE event received:', payload as any);
            fetchSolicitudes();
            
            if (payload.data && payload.data.id && (payload.type === 'new_order' || payload.type === 'new_service_request')) {
                logger.debug('[useSolicitudes] 🤖 Auto-opening signal received:', { arg0: payload.type, arg1: payload.data.id });
                setPendingAutoOpen({
                    id: payload.data.id as string,
                    type: payload.type === 'new_order' ? 'pedido' : 'solicitud'
                });
            } else {
                logger.debug('[useSolicitudes] ⚠️ Auto-open skipped - no valid id:', payload?.data?.id as any);
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

