import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { eventBus } from '@/utils/eventBus';
import { useRouter } from 'expo-router';
import { showToast as showToastLazy } from '@/utils/toast-lazy';
import { useAccentColor } from '@/hooks/useAccentColor';
import { cajaService, entradasService } from '@/services';
import type { EntradaCliente } from '@/services/entradas';
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from '@/services/mirror';
import { useConnectivity } from '@/hooks/useConnectivity';
import { blockOffline } from '@/utils/offlineGuard';
import { httpDetailsOf } from '@/api/errors';
import { useAuthStore } from '@/store/authStore';
import { useCajaAbiertaStore } from '@/store/cajaAbiertaStore';
import type { CajaInfo, CajaStats, CajaStatusData } from '@/types/caja';
import {
    formatearInputMonto,
    formatearMonto,
    parseMonto
} from '@/utils/cajaFormat';
import { resumenEntradasDelTurno } from '@/utils/cajaEntradas';

export type CajaState = {
    loading: boolean;
    refreshing: boolean;
    /** `true` si lo que se está viendo viene del espejo local. */
    fromCache: boolean;
    cajaAbierta: boolean;
    cajaInfo: CajaInfo | null;
    stats: CajaStats | null;
    /** Entradas del turno, calculadas desde `/tickets` filtrando por caja abierta. */
    totalEntradas: number;
    cantidadEntradas: number;
    modalVisible: boolean;
    modalType: 'abrir' | 'cerrar' | 'retiro';
    monto: string;
    motivoRetiro: string;
    submitting: boolean;
};

export type CajaAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_FROM_CACHE'; payload: boolean }
    | { type: 'SET_CAJA_STATUS'; payload: { abierta: boolean; info: CajaInfo | null } }
    | { type: 'SET_STATS'; payload: CajaStats | null }
    | { type: 'SET_ENTRADAS'; payload: { total: number; cantidad: number } }
    | { type: 'OPEN_MODAL'; payload: 'abrir' | 'cerrar' | 'retiro' }
    | { type: 'CLOSE_MODAL' }
    | { type: 'SET_MONTO'; payload: string }
    | { type: 'SET_MOTIVO'; payload: string }
    | { type: 'SET_SUBMITTING'; payload: boolean };

const initialCajaState: CajaState = {
    loading: true,
    refreshing: false,
    fromCache: false,
    cajaAbierta: false,
    cajaInfo: null,
    stats: null,
    totalEntradas: 0,
    cantidadEntradas: 0,
    modalVisible: false,
    modalType: 'abrir',
    monto: '',
    motivoRetiro: '',
    submitting: false,
};

function cajaReducer(state: CajaState, action: CajaAction): CajaState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_FROM_CACHE': return { ...state, fromCache: action.payload };
        case 'SET_CAJA_STATUS': return { ...state, cajaAbierta: action.payload.abierta, cajaInfo: action.payload.info };
        case 'SET_STATS': return { ...state, stats: action.payload };
        case 'SET_ENTRADAS': return {
            ...state,
            totalEntradas: action.payload.total,
            cantidadEntradas: action.payload.cantidad,
        };
        case 'OPEN_MODAL': return { ...state, modalVisible: true, modalType: action.payload, monto: '', motivoRetiro: '' };
        case 'CLOSE_MODAL': return { ...state, modalVisible: false };
        case 'SET_MONTO': return { ...state, monto: action.payload };
        case 'SET_MOTIVO': return { ...state, motivoRetiro: action.payload };
        case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
        default: return state;
    }
}

const showToast = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    showToastLazy({ type, text1: title, text2: message, visibilityTime: 4000 });
};

export function useCaja() {
    const theme = useAccentColor();
    const router = useRouter();
    const user = useAuthStore(state => state.user);

    const [state, dispatch] = useReducer(cajaReducer, initialCajaState);
    const { loading, refreshing, fromCache, cajaAbierta, cajaInfo, stats, totalEntradas, cantidadEntradas, modalVisible, modalType, monto, motivoRetiro, submitting } = state;
    const dataRef = useRef<string>('');
    const { isOffline } = useConnectivity();
    // Reenvío del aviso del cierre pendiente: estado propio para girar solo ese botón y
    // no bloquear el resto de la pantalla.
    const [reenviandoAviso, setReenviandoAviso] = useState(false);
    // Segundo pedido del cierre (el administrador no respondió): estado propio, igual que el
    // reenvío, para no bloquear el resto de la pantalla mientras está en vuelo.
    const [reabriendoCierre, setReabriendoCierre] = useState(false);

    /**
     * Lectura con espejo: el estado de caja y su resumen se guardan tras cada
     * GET exitoso. Sin red el cajero sigue viendo cuánto hay en caja, pero
     * abrir, cerrar o retirar queda bloqueado (ver `handleSubmit`).
     */
    const fetchData = useCallback(async (isManual = false, signal?: AbortSignal) => {
        if (!isManual) dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const [statusResult, statsResult, entradas] = await Promise.all([
                getMirror()
                    .readThroughDetailed(
                        MIRROR_KEYS.cashregisterStatus,
                        () => cajaService.status(signal),
                        { maxAgeMs: MIRROR_MAX_AGE_MS.dinero }
                    )
                    .catch(() => ({ data: { success: false, data: null }, fromCache: false })),
                getMirror()
                    .readThroughDetailed(
                        MIRROR_KEYS.cashregisterSummary,
                        () => cajaService.resumen(signal),
                        { maxAgeMs: MIRROR_MAX_AGE_MS.dinero }
                    )
                    .catch(() => ({ data: { success: false, data: null }, fromCache: false })),
                // Las entradas viven en `/tickets`, no en el resumen de caja. Se
                // filtran por la caja abierta para que todo hable del mismo turno.
                entradasService
                    .listar()
                    .then((res) =>
                        res.success && Array.isArray(res.data) ? (res.data as EntradaCliente[]) : []
                    )
                    .catch(() => [] as EntradaCliente[])
            ]);

            if (signal?.aborted) return;

            dispatch({
                type: 'SET_FROM_CACHE',
                payload: statusResult.fromCache || statsResult.fromCache
            });

            const statusData = statusResult.data as unknown as {
                success?: boolean;
                data?: CajaStatusData | null;
            };
            const statsData = statsResult.data as unknown as {
                success?: boolean;
                data?: CajaStats | null;
            };

            const abierta = Boolean(statusData.success && statusData.data?.hasOpenCaja);
            const info = abierta ? statusData.data?.cajaInfo ?? null : null;
            const resumenEntradas = resumenEntradasDelTurno(entradas, info?.id_caja);

            const newData = {
                status: statusData.data,
                stats: statsData.data,
                entradas: resumenEntradas,
            };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            dispatch({ type: 'SET_CAJA_STATUS', payload: { abierta, info } });
            // El gate de rutas lee el store global: publicar aquí el mismo
            // resultado evita esperar a otro viaje al servidor vía eventBus.
            useCajaAbiertaStore.getState().setEstado(abierta, info);

            if (statsData.success && statsData.data) {
                dispatch({ type: 'SET_STATS', payload: statsData.data });
            }

            dispatch({ type: 'SET_ENTRADAS', payload: resumenEntradas });

            if (isManual) {
                showToastLazy({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Actualizado' : 'Sin cambios',
                    text2: hasChanges ? 'Datos de caja actualizados' : 'Los datos no han cambiado',
                    visibilityTime: 2500
                });
            }
        } catch {
            if (signal?.aborted) return;
            if (isManual) showToast('Error', 'No se pudo actualizar la información');
            else showToast('Error', 'No se pudo cargar la información de la caja');
        } finally {
            if (!signal?.aborted) {
                dispatch({ type: 'SET_LOADING', payload: false });
                dispatch({ type: 'SET_REFRESHING', payload: false });
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchData(false, controller.signal);
        return () => controller.abort();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchData(true);
    }, [fetchData]);

    const handleMontoChange = (texto: string) => {
        dispatch({ type: 'SET_MONTO', payload: formatearInputMonto(texto) });
    };

    const handleSubmit = async () => {
        // Abrir, cerrar la caja y los retiros mueven el efectivo del turno y
        // dependen del estado real del servidor: no se encolan nunca.
        if (!blockOffline('caja', () => !isOffline)) return;

        const usuarioId = user?.id;
        let numericMonto = 0;
        if (modalType === 'cerrar') {
            // Lo que importa es el monto con que se va a cerrar: descuenta los
            // saldos prepago que los clientes todavía tienen cargados.
            numericMonto = stats?.monto_cierre_previsto ?? stats?.balance_total ?? 0;
        } else {
            numericMonto = parseMonto(monto);
            if (!monto.trim() || !Number.isFinite(numericMonto)) {
                showToast('Error', 'Ingresa un monto válido');
                return;
            }
        }

        if (numericMonto < 0) {
            showToast('Error', 'El monto no puede ser negativo');
            return;
        }
        if (modalType === 'retiro' && numericMonto === 0) {
            showToast('Error', 'Ingresa un monto mayor a cero');
            return;
        }
        if (modalType === 'retiro') {
            const disponible = Number(stats?.efectivo_en_caja ?? stats?.total_efectivo ?? 0);
            if (numericMonto > disponible) {
                showToast(
                    'Monto excedido',
                    `Solo hay ${formatearMonto(disponible)} disponibles en caja`,
                    'warning'
                );
                return;
            }
        }
        if ((modalType === 'abrir' || modalType === 'retiro') && usuarioId == null) {
            showToast('Error', 'No se pudo identificar al usuario de la sesión');
            return;
        }
        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
            if (modalType === 'abrir') {
                const res = await cajaService.open({
                        monto_apertura: numericMonto,
                        usuario_id_apertura: String(usuarioId)
                    });
                if (res.success) {
                    showToast('Turno Iniciado', 'Caja abierta correctamente', 'success');
                    dispatch({ type: 'CLOSE_MODAL' });
                    fetchData();
                    eventBus.emit('refresh_requests');
                } else {
                    showToast('Error', res.message || 'Error al abrir caja');
                }
            } else if (modalType === 'retiro') {
                if (!motivoRetiro.trim()) {
                    showToast('Error', 'Ingresa el motivo del retiro');
                    dispatch({ type: 'SET_SUBMITTING', payload: false });
                    return;
                }
                if (!cajaInfo?.id_caja) {
                    showToast('Error', 'No se encontró la caja');
                    dispatch({ type: 'SET_SUBMITTING', payload: false });
                    return;
                }
                const res = await cajaService.retiros({
                        id_caja: cajaInfo.id_caja,
                        monto: numericMonto,
                        motivo: motivoRetiro,
                        usuario_id: String(usuarioId)
                    });
                if (res.success) {
                    showToast('Retiro Exitoso', `${formatearMonto(numericMonto)} retirado correctamente`, 'success');
                    dispatch({ type: 'CLOSE_MODAL' });
                    fetchData();
                    eventBus.emit('refresh_requests');
                } else {
                    showToast('Error', res.message || 'Error al retirar efectivo');
                }
            } else {
                if (!cajaInfo?.id_caja) {
                    showToast('Error', 'No se encontró la caja a cerrar');
                    dispatch({ type: 'SET_SUBMITTING', payload: false });
                    return;
                }
                const res = await cajaService.solicitarCierre({
                        id_caja: cajaInfo.id_caja,
                        motivo: 'Cierre de turno'
                    });
                const cierre = res.data;
                if (!cierre) {
                    showToast('Error', res.message || 'Error al cerrar caja');
                } else if (cierre.estado === 'pendiente') {
                    // La caja sigue abierta: el administrador tiene que autorizar.
                    const saldos = Number(cierre.saldo_clientes_descontado || 0);
                    showToast(
                        'Cierre enviado',
                        saldos > 0
                            ? `Se pidió autorización al administrador. Se descontarán ${formatearMonto(saldos)} de saldos de clientes.`
                            : 'Se pidió autorización al administrador por WhatsApp. La caja sigue abierta.',
                        'success'
                    );
                    dispatch({ type: 'CLOSE_MODAL' });
                    fetchData();
                    eventBus.emit('refresh_requests');
                } else if (cierre.estado === 'cerrada') {
                    showToast('Turno Cerrado', 'Caja cerrada correctamente', 'success');
                    dispatch({ type: 'CLOSE_MODAL' });
                    fetchData();
                    eventBus.emit('refresh_requests');
                } else {
                    showToast('Error', res.message || 'Error al cerrar caja');
                }
            }
        } catch (e: any) {
            showToast('Error', e.message || `Error al ${modalType} caja`);
        } finally {
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    };

    /**
     * Reenvía al administrador el aviso del cierre que quedó pendiente.
     *
     * El cierre se puede quedar en silencio (el WhatsApp no llegó, el admin no lo vio) y el
     * servidor solo admite una solicitud por turno: sin esto la única salida sería que un
     * administrador cerrara desde el dashboard. Manda el mismo link, no una solicitud nueva.
     */
    const handleReenviarAviso = async () => {
        if (!blockOffline('caja', () => !isOffline)) return;
        if (!cajaInfo?.id_caja) {
            showToast('Error', 'No se encontró la caja con cierre pendiente');
            return;
        }

        setReenviandoAviso(true);
        try {
            const res = await cajaService.reenviarAvisoCierre({ id_caja: cajaInfo.id_caja });

            if (res.success) {
                showToast(
                    'Aviso reenviado',
                    'Se volvió a avisar al administrador por WhatsApp. La caja sigue abierta.',
                    'success'
                );
                fetchData();
                return;
            }

            showToast('Error', res.message || 'No se pudo reenviar el aviso');
        } catch (e: any) {
            const detalles = httpDetailsOf(e);
            const mensaje =
                (detalles?.body as { message?: string } | undefined)?.message ||
                e?.message ||
                'No se pudo reenviar el aviso';

            // 429: el enfriamiento del servidor. No es un fallo, es "todavía no"; se dice con
            // los segundos que faltan en vez de tratar al cajero de error.
            if (detalles?.status === 429) {
                showToast('Espera un momento', mensaje, 'warning');
            } else {
                showToast('Error', mensaje);
            }
        } finally {
            setReenviandoAviso(false);
        }
    };

    /**
     * Pide el cierre de nuevo cuando el administrador no respondió.
     *
     * A diferencia del reenvío, esto **sí crea una solicitud nueva**: el servidor expira la
     * vieja (nadie contestó dentro de la ventana de recordatorios) y emite otro token, así el
     * aviso al administrador vuelve a salir desde cero. Si todavía no pasó la ventana, el
     * servidor contesta 409 y se dice con "Todavía no", no como error del cajero.
     */
    const handleReabrirCierre = async () => {
        if (!blockOffline('caja', () => !isOffline)) return;
        if (!cajaInfo?.id_caja) {
            showToast('Error', 'No se encontró la caja con cierre pendiente');
            return;
        }

        setReabriendoCierre(true);
        try {
            const res = await cajaService.solicitarCierre({
                id_caja: cajaInfo.id_caja,
                motivo: 'Segundo pedido de cierre'
            });

            if (res.data) {
                showToast(
                    'Cierre pedido de nuevo',
                    'Se volvió a avisar al administrador. La caja sigue abierta hasta que responda.',
                    'success'
                );
                fetchData();
                return;
            }

            showToast('Error', res.message || 'No se pudo pedir el cierre de nuevo');
        } catch (e: any) {
            const detalles = httpDetailsOf(e);
            const mensaje =
                (detalles?.body as { message?: string } | undefined)?.message ||
                e?.message ||
                'No se pudo pedir el cierre de nuevo';

            // 409: el administrador todavía está dentro del plazo para responder. No es un
            // fallo, es "todavía no"; se avisa como advertencia en vez de como error.
            if (detalles?.status === 409) {
                showToast('Todavía no', mensaje, 'warning');
            } else {
                showToast('Error', mensaje);
            }
        } finally {
            setReabriendoCierre(false);
        }
    };

    const modalConfig = {
        abrir: { title: 'Apertura de Turno', subtitle: 'Ingresa el monto base para iniciar el turno', icon: 'wallet-outline' as const, color: theme.accentColor, btnText: 'Abrir Caja' },
        retiro: { title: 'Retirar Efectivo', subtitle: 'Ingresa el monto a retirar de la caja', icon: 'cash-outline' as const, color: theme.accentColor, btnText: 'Realizar Retiro' },
        cerrar: { title: 'Cierre de Turno', subtitle: 'Se pide autorización al administrador; la caja sigue abierta hasta que responda', icon: 'lock-closed-outline' as const, color: theme.accentColor, btnText: 'Pedir Cierre' },
    }[modalType];

    return {
        ...theme,
        router,
        user,
        loading,
        refreshing,
        fromCache,
        isOffline,
        cajaAbierta,
        cajaInfo,
        stats,
        totalEntradas,
        cantidadEntradas,
        modalVisible,
        modalType,
        monto,
        motivoRetiro,
        submitting,
        reenviandoAviso,
        reabriendoCierre,
        dispatch,
        fetchData,
        handleReenviarAviso,
        handleReabrirCierre,
        onRefresh,
        handleMontoChange,
        handleSubmit,
        modalConfig
    };
}
