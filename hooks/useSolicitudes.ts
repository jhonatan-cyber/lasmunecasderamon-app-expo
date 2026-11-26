import { useState, useCallback, useEffect, useRef } from 'react';
import { eventBus } from '@/utils/eventBus';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '@/utils/toast-lazy';
import { apiClientSafe } from '@/api/client';
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS, OfflineCacheMissError } from '@/services/mirror';
import { connectivity } from '@/services/connectivity';
import { parseDateSafe } from '@/utils/timeUtils';
import { useTimer } from '@/context/TimerContext';
import { useDebouncedEventListener } from '@/hooks/useDebouncedEventListener';
import { useCajaAbiertaStore } from '@/store/cajaAbiertaStore';
import { useAuthStore } from '@/store/authStore';
import { REALTIME_EVENT_NAMES } from '@/utils/realtime';
import type { Anfitriona } from '@lasmunecasderamon/types';
import type { SSEPayload } from '@/types/realtime';
import type { SolicitudItem } from '@/hooks/types/solicitudesTypes';
import logger from '@/utils/logger';
const CACHE_KEY_PREFIX = 'solicitudes_cache_v1';

const getSolicitudesCacheKey = (userId: string | null, cajaId: string | number | null) =>
    userId && cajaId !== null
        ? `${CACHE_KEY_PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(String(cajaId))}`
        : null;

const getSolicitudesCacheContext = () => {
    const auth = useAuthStore.getState();
    const cajaInfo = useCajaAbiertaStore.getState().cajaInfo;
    const userId = auth.user?.id && !auth.sessionExpired ? auth.user.id : null;
    const cajaId = cajaInfo?.id_caja ?? cajaInfo?.fecha_apertura ?? null;

    return {
        cacheKey: getSolicitudesCacheKey(userId, cajaId),
        mirrorKey: cajaId !== null
            ? `${MIRROR_KEYS.serviceRequests}.${encodeURIComponent(String(cajaId))}`
            : null,
    };
};

export const useSolicitudes = () => {
    const { serverOffset } = useTimer();
    const refrescarCaja = useCajaAbiertaStore((state) => state.refresh);
    const cajaAbiertaStore = useCajaAbiertaStore((state) => state.cajaAbierta);
    const userId = useAuthStore((state) => state.user?.id && !state.sessionExpired ? state.user.id : null);
    const cajaId = useCajaAbiertaStore((state) => state.cajaInfo?.id_caja ?? state.cajaInfo?.fecha_apertura ?? null);
    const cacheKey = getSolicitudesCacheKey(userId, cajaId);
    const cajaAbiertaPrevia = useRef(cajaAbiertaStore);
    const cacheKeyPrevio = useRef(cacheKey);
    const [solicitudesData, setSolicitudesData] = useState<{ cacheKey: string | null; items: SolicitudItem[] }>(() => ({
        cacheKey,
        items: [],
    }));
    const solicitudes = solicitudesData.cacheKey === cacheKey ? solicitudesData.items : [];
    const setSolicitudes = useCallback((next: SolicitudItem[] | ((previous: SolicitudItem[]) => SolicitudItem[])) => {
        setSolicitudesData((previous) => ({
            cacheKey,
            items: typeof next === 'function'
                ? next(previous.cacheKey === cacheKey ? previous.items : [])
                : next,
        }));
    }, [cacheKey]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cajaAbierta, setCajaAbierta] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const [allHostesses, setAllHostesses] = useState<Anfitriona[]>([]);
    const dataRef = useRef<string>('');
    const [pendingAutoOpen, setPendingAutoOpen] = useState<{ id: string, type: string } | null>(null);

    
    useEffect(() => {
        let activo = true;
        dataRef.current = '';

        if (!cacheKey) return () => { activo = false; };

        const loadCache = async () => {
            try {
                const cached = await AsyncStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (activo) setSolicitudes(parsed);
                }
            } catch (err) {
                logger.fetchError(err, { context: 'useSolicitudes:loadCache' });
            }
        };
        loadCache();
        return () => { activo = false; };
    }, [cacheKey, setSolicitudes]);

    const fetchSolicitudes = useCallback(async (isManual = false, signal?: AbortSignal) => {
        try {
            // La caja puede haber cambiado de turno mientras la pantalla estaba
            // en segundo plano: refrescamos antes de decidir qué solicitudes
            // pertenecen a la apertura actual.
            await refrescarCaja();
            const cajaInfo = useCajaAbiertaStore.getState().cajaInfo;
            const cacheContext = getSolicitudesCacheContext();
            const fechaAperturaMs = cajaInfo?.fecha_apertura
                ? parseDateSafe(String(cajaInfo.fecha_apertura)).getTime()
                : null;

            const cargarSolicitudes = async () => {
                const [resSolicitudes, resOrders, resAnticipos, resStats] = await Promise.all([
                    apiClientSafe<SolicitudItem[]>('/service-requests?estado=0', { signal }).catch(() => ({ success: false, data: [] })),
                    apiClientSafe<SolicitudItem[]>('/orders', { signal }).catch(() => ({ success: false, data: [] })),
                    apiClientSafe<SolicitudItem[]>('/advances', { signal }).catch(() => ({ success: false, data: [] })),
                    apiClientSafe<{ cajas_abiertas: number }>('/cash-register/stats', { signal }).catch(() => null),
                ]);

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
                        // El servidor deja el anticipo en estado 1 tras entregarlo
                        // y solo agrega fecha_entrega; sin este filtro vuelve a
                        // aparecer como pendiente y el reintento de entrega falla.
                        .filter((a: Record<string, unknown>) =>
                            (a.estado === 1 || a.estado === 2) && !a.fecha_entrega)
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

                // Solo solicitudes de la caja actual. Si no hay caja
                // abierta, no se muestra ninguna (no se arrastran las
                // pendientes del turno anterior).
                const cajaAbiertaActual = resStats?.data && typeof resStats.data.cajas_abiertas !== 'undefined'
                    ? resStats.data.cajas_abiertas > 0
                    : Boolean(cajaInfo);
                const itemsDeCaja = !cajaAbiertaActual
                    ? []
                    : fechaAperturaMs !== null && !isNaN(fechaAperturaMs)
                        ? combined.filter((s) => s.fecha_orden >= fechaAperturaMs)
                        : combined;

                return {
                    items: itemsDeCaja,
                    cajaAbierta:
                        resStats?.data && typeof resStats.data.cajas_abiertas !== 'undefined'
                            ? resStats.data.cajas_abiertas > 0
                            : null,
                };
            };

            const lecturaSolicitudes = cacheContext.mirrorKey
                ? getMirror().readThroughDetailed(
                    cacheContext.mirrorKey,
                    cargarSolicitudes,
                    { maxAgeMs: MIRROR_MAX_AGE_MS.operativo },
                )
                : connectivity.isOffline()
                    ? Promise.reject(new OfflineCacheMissError(MIRROR_KEYS.serviceRequests))
                    : cargarSolicitudes().then((data) => ({
                        data,
                        fromCache: false,
                        syncedAt: Date.now(),
                        error: null,
                    }));

            const [lectura, resAnfitrionas] = await Promise.all([
                lecturaSolicitudes,
                apiClientSafe<Anfitriona[]>('/hostesses', { signal }).catch(() => null),
            ]);

            const contextoActual = getSolicitudesCacheContext();
            if (contextoActual.cacheKey !== cacheContext.cacheKey || contextoActual.mirrorKey !== cacheContext.mirrorKey) return;

            const anfitrionasData = resAnfitrionas as unknown as { success: boolean; data: Anfitriona[] };
            if (Array.isArray(resAnfitrionas)) {
                setAllHostesses(resAnfitrionas);
            } else if (anfitrionasData?.success) {
                setAllHostesses(anfitrionasData.data || []);
            }

            const newData = { solicitudes: lectura.data.items };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (lectura.data.cajaAbierta !== null) {
                setCajaAbierta(lectura.data.cajaAbierta);
            }

            setSolicitudes(lectura.data.items);
            // `fromCache` es la verdad de la pantalla: si el dato vino del
            // espejo, el usuario está viendo datos guardados.
            setIsOffline(lectura.fromCache);

            if (cacheContext.cacheKey) {
                AsyncStorage.setItem(cacheContext.cacheKey, JSON.stringify(lectura.data.items)).catch(() => null);
            }

            if (isManual) {
                showToast({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Éxito' : 'Información',
                    text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                    visibilityTime: 3000
                });
            }
        } catch (error) {
            logger.fetchError(error, { context: 'useSolicitudes:fetchSolicitudes' });
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
    }, [refrescarCaja, setSolicitudes]);

    useEffect(() => {
        const ac = new AbortController();
        void (async () => {
            await fetchSolicitudes(false, ac.signal);
        })();
        return () => ac.abort();
    }, [fetchSolicitudes]);

    useEffect(() => {
        const anterior = cajaAbiertaPrevia.current;
        const cacheKeyAnterior = cacheKeyPrevio.current;
        cajaAbiertaPrevia.current = cajaAbiertaStore;
        cacheKeyPrevio.current = cacheKey;
        if (anterior === true && cajaAbiertaStore === false) {
            setSolicitudes([]);
            dataRef.current = '';
            if (cacheKeyAnterior) AsyncStorage.removeItem(cacheKeyAnterior).catch(() => null);
        }
    }, [cajaAbiertaStore, cacheKey, fetchSolicitudes, setSolicitudes]);

    useEffect(() => {
        const subscription = eventBus.addListener('refresh_requests', (payload: SSEPayload) => {
            logger.debug('[useSolicitudes] SSE event received:', payload as any);
            fetchSolicitudes();
            
            if (payload.data && payload.data.id && (payload.type === 'new_order' || payload.type === 'new_service_request')) {
                logger.debug('[useSolicitudes] Auto-opening signal received:', { arg0: payload.type, arg1: payload.data.id });
                setPendingAutoOpen({
                    id: payload.data.id as string,
                    type: payload.type === 'new_order' ? 'pedido' : 'solicitud'
                });
            } else {
                logger.debug('[useSolicitudes] Auto-open skipped - no valid id:', payload?.data?.id as any);
            }
        });
        return () => subscription.remove();
    }, [fetchSolicitudes]);

    useDebouncedEventListener(
        REALTIME_EVENT_NAMES.refreshPersonal,
        useCallback(() => {
            void (async () => {
                try {
                    const resAnfitrionas = await apiClientSafe<Anfitriona[]>('/hostesses');
                    const anfitrionasData = resAnfitrionas as unknown as { success: boolean; data: Anfitriona[] };
                    if (Array.isArray(resAnfitrionas)) {
                        setAllHostesses(resAnfitrionas);
                    } else if (anfitrionasData?.success) {
                        setAllHostesses(anfitrionasData.data || []);
                    }
                } catch {}
            })();
        }, []),
    );

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
            if (cacheKey) AsyncStorage.setItem(cacheKey, JSON.stringify(up)).catch(() => null);
            return up;
        });
    }, [cacheKey, setSolicitudes]);

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

