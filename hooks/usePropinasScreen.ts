import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { parseDateSafe } from "@/utils/timeUtils";
import { tipsService } from '@/services';
import logger from '@/utils/logger';
import { apiClientSafe } from '@/api/client';

export interface Propina {
    id_detalle_propina: string;
    propina_id: string;
    usuario_id: string;
    monto: number;
    fecha_crea: string;
    estado: number; 
    propina_fecha_crea: string | null;
    codigo_venta: string | null;
    venta_id?: string;
    total_tip_monto?: number;
    total_participants?: number;
}

export interface SaleDetail {
    codigo: string;
    fecha_crea: string;
    cliente_nombre: string | null;
    metodo_pago: string;
    total: number;
    propina: number;
    detalles: any[];
    garzon_nombre?: string | null;
    cajero_nombre?: string | null;
    habitacion_nombre?: string | null;
    tiempo?: number;
    usuarios?: any[];
}

export function usePropinasScreen() {
    const [propinas, setPropinas] = useState<Propina[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const dataRef = useRef<string>('');

    
    const [selectedPropina, setSelectedPropina] = useState<Propina | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);
    const [parentPropina, setParentPropina] = useState<any>(null);

    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const data = await tipsService.userDetail();
            if ((data as any).success) {
                const serialized = JSON.stringify((data as any).data);
                const hasChanges = dataRef.current !== serialized;
                dataRef.current = serialized;
                setPropinas((data as any).data || []);

                if (isManual) {
                    Toast.show({
                        type: hasChanges ? 'success' : 'info',
                        text1: hasChanges ? 'Éxito' : 'Información',
                        text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                        visibilityTime: 3000
                    });
                }
            } else {
                setError((data as any).message || 'Error al cargar propinas');
                if (isManual) {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: (data as any).message || 'Error al cargar propinas',
                        visibilityTime: 3000
                    });
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    const handlePropinaPress = async (item: Propina) => {
        setSelectedPropina(item);
        setModalVisible(true);
        setLoadingDetail(true);
        setSaleDetail(null);
        setParentPropina(null);

        try {
            
            const tipRes = await apiClientSafe(`/tips/${item.propina_id}`);
            if ((tipRes as any).success) {
                setParentPropina((tipRes as any).data as any);

                
                if ((tipRes as any).data?.venta_id) {
                    const saleRes = await apiClientSafe(`/ventas/${(tipRes as any).data.venta_id}`);
                    if (saleRes && (saleRes as any).success) {
                        setSaleDetail((saleRes as any).data);
                    }
                }
            }
        } catch (err: any) {
            logger.captureException(err, { context: 'Propinas:fetchTips' });
        } finally {
            setLoadingDetail(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = parseDateSafe(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            const day = date.getUTCDate();
            const month = date.toLocaleDateString('es-ES', { month: 'short' });
            const year = date.getUTCFullYear();
            return `${day} ${month} ${year}`;
        } catch { return 'Error'; }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = parseDateSafe(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const filteredData = propinas.filter((a) => {
        if (filter === 'pendiente') return a.estado === 1;
        if (filter === 'pagado') return a.estado === 0;
        return true;
    });

    const pendientes = propinas.filter((a) => a.estado === 1);
    const totalPendiente = pendientes.reduce((sum, a) => sum + (a.monto || 0), 0);
    const totalGeneral = propinas.reduce((sum, a) => sum + (a.monto || 0), 0);

    return {
        
        propinas,
        loading,
        refreshing,
        error,
        filter,
        setFilter,

        
        selectedPropina,
        setSelectedPropina,
        modalVisible,
        setModalVisible,
        loadingDetail,
        saleDetail,
        parentPropina,

        
        filteredData,
        pendientes,
        totalPendiente,
        totalGeneral,

        
        onRefresh,
        handlePropinaPress,
        formatDate,
        formatTime,
        fetchData,
    };
}
