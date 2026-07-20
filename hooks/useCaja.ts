import { useCallback, useEffect, useReducer, useRef } from 'react';
import { eventBus } from '@/utils/eventBus';
import { useRouter } from 'expo-router';
import { showToast as showToastLazy } from '@/utils/toast-lazy';
import { useAccentColor } from '@/hooks/useAccentColor';
import { cajaService } from '@/services';
import { useAuthStore } from '@/store/authStore';

export type CajaState = {
    loading: boolean;
    refreshing: boolean;
    cajaAbierta: boolean;
    cajaInfo: any;
    stats: any;
    modalVisible: boolean;
    modalType: 'abrir' | 'cerrar' | 'retiro';
    monto: string;
    motivoRetiro: string;
    submitting: boolean;
};

export type CajaAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_CAJA_STATUS'; payload: { abierta: boolean; info: any } }
    | { type: 'SET_STATS'; payload: any }
    | { type: 'OPEN_MODAL'; payload: 'abrir' | 'cerrar' | 'retiro' }
    | { type: 'CLOSE_MODAL' }
    | { type: 'SET_MONTO'; payload: string }
    | { type: 'SET_MOTIVO'; payload: string }
    | { type: 'SET_SUBMITTING'; payload: boolean };

const initialCajaState: CajaState = {
    loading: true,
    refreshing: false,
    cajaAbierta: false,
    cajaInfo: null,
    stats: null,
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
        case 'SET_CAJA_STATUS': return { ...state, cajaAbierta: action.payload.abierta, cajaInfo: action.payload.info };
        case 'SET_STATS': return { ...state, stats: action.payload };
        case 'OPEN_MODAL': return { ...state, modalVisible: true, modalType: action.payload, monto: '', motivoRetiro: '' };
        case 'CLOSE_MODAL': return { ...state, modalVisible: false };
        case 'SET_MONTO': return { ...state, monto: action.payload };
        case 'SET_MOTIVO': return { ...state, motivoRetiro: action.payload };
        case 'SET_SUBMITTING': return { ...state, submitting: action.payload };
        default: return state;
    }
}

const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    showToastLazy({ type, text1: title, text2: message, visibilityTime: 4000 });
};

export function useCaja() {
    const theme = useAccentColor();
    const { borderColor } = theme;
    const router = useRouter();
    const user = useAuthStore(state => state.user);

    const [state, dispatch] = useReducer(cajaReducer, initialCajaState);
    const { loading, refreshing, cajaAbierta, cajaInfo, stats, modalVisible, modalType, monto, motivoRetiro, submitting } = state;
    const dataRef = useRef<string>('');

    const fetchData = useCallback(async (isManual = false) => {
        if (!isManual) dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const [statusRes, statsRes] = await Promise.all([
                cajaService.status().catch(() => ({ success: false, data: null })),
                cajaService.resumen().catch(() => ({ success: false, data: null }))
            ]);

            const statusData = statusRes as unknown as { success: boolean; data?: { hasOpenCaja: boolean; cajaInfo: any } };
            const statsData = statsRes as unknown as { success: boolean; data?: any };

            const newData = { status: statusData.data, stats: statsData.data };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            if (statusData.success && statusData.data) {
                dispatch({ type: 'SET_CAJA_STATUS', payload: { abierta: statusData.data.hasOpenCaja, info: statusData.data.cajaInfo } });
            } else {
                dispatch({ type: 'SET_CAJA_STATUS', payload: { abierta: false, info: null } });
            }

            if (statsData.success && statsData.data) {
                dispatch({ type: 'SET_STATS', payload: statsData.data });
            }

            if (isManual) {
                showToastLazy({
                    type: hasChanges ? 'success' : 'info',
                    text1: hasChanges ? 'Actualizado' : 'Sin cambios',
                    text2: hasChanges ? 'Datos de caja actualizados' : 'Los datos no han cambiado',
                    visibilityTime: 2500
                });
            }
        } catch {
            if (isManual) showToast('Error', 'No se pudo actualizar la información');
            else showToast('Error', 'No se pudo cargar la información de la caja');
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchData(true);
    }, [fetchData]);

    const handleMontoChange = (text: string) => {
        const clean = text.replace(/\D/g, '');
        const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        dispatch({ type: 'SET_MONTO', payload: formatted });
    };

    const handleSubmit = async () => {
        let numericMonto = 0;
        if (modalType === 'cerrar') {
            numericMonto = stats?.balance_total || 0;
        } else {
            const cleanMonto = monto.replace(/\./g, '');
            if (!cleanMonto || isNaN(Number(cleanMonto))) {
                showToast('Error', 'Ingresa un monto válido');
                return;
            }
            numericMonto = Number(cleanMonto);
        }

        if (numericMonto < 0) {
            showToast('Error', 'El monto no puede ser negativo');
            return;
        }
        dispatch({ type: 'SET_SUBMITTING', payload: true });
        try {
            if (modalType === 'abrir') {
                const res = await cajaService.open({
                        monto_apertura: numericMonto,
                        usuario_id_apertura: user?.id || 1
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
                        usuario_id: user?.id || 1
                    });
                if (res.success) {
                    showToast('Retiro Exitoso', `$${numericMonto.toLocaleString()} retirado correctamente`, 'success');
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
                const res = await cajaService.close({
                        id_caja: cajaInfo.id_caja,
                        monto_cierre: numericMonto,
                        usuario_id_cierre: user?.id || 1
                    });
                if (res.success) {
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

    const modalConfig = {
        abrir: { title: 'Apertura de Turno', subtitle: 'Ingresa el monto base para iniciar el turno', icon: 'wallet-outline' as const, color: '#10B981', btnText: 'Abrir Caja' },
        retiro: { title: 'Retirar Efectivo', subtitle: 'Ingresa el monto a retirar de la caja', icon: 'cash-outline' as const, color: '#F59E0B', btnText: 'Realizar Retiro' },
        cerrar: { title: 'Cierre de Turno', subtitle: 'Confirma el cierre con el monto total calculado', icon: 'lock-closed-outline' as const, color: '#EF4444', btnText: 'Cerrar Caja' },
    }[modalType];

    return {
        ...theme,
        router,
        user,
        loading,
        refreshing,
        cajaAbierta,
        cajaInfo,
        stats,
        modalVisible,
        modalType,
        monto,
        motivoRetiro,
        submitting,
        dispatch,
        fetchData,
        onRefresh,
        handleMontoChange,
        handleSubmit,
        modalConfig
    };
}
