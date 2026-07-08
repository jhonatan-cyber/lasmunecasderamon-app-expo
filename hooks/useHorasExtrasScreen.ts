import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAccentColor } from '@/hooks/useAccentColor';
import { overtimeService } from '@/services';

export interface OvertimeRecord {
    id_hora_extra: number;
    usuario_id: number;
    usuario: string;
    usuario_foto?: string | null;
    fecha_crea: string;
    fecha_mod: string | null;
    hora: number;
    monto: number;
    total: number;
    estado: number;
}

export function useHorasExtrasScreen() {
    const theme = useAccentColor();
    const { bg, cardBg, textPrimary, textSecondary, borderColor } = theme;
    const [data, setData] = useState<OvertimeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const dataRef = useRef<string>('');

    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const res = await overtimeService.list();
            if (res.success) {
                const serialized = JSON.stringify(res.data);
                dataRef.current = serialized;
                setData(res.data || []);
            } else {
                setError(res.message || 'Error al cargar horas extras');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
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

    const employees = useMemo(() => {
        const map = new Map<number, { id: number; name: string }>();
        data.forEach(h => {
            if (!map.has(h.usuario_id)) {
                map.set(h.usuario_id, { id: h.usuario_id, name: h.usuario });
            }
        });
        return Array.from(map.values());
    }, [data]);

    const filteredData = useMemo(() => {
        let result = data;
        if (statusFilter !== 'all') {
            const estado = statusFilter === 'pendiente' ? 1 : 0;
            result = result.filter(h => h.estado === estado);
        }
        if (userFilter !== 'all') {
            result = result.filter(h => h.usuario_id === Number(userFilter));
        }
        return result;
    }, [data, statusFilter, userFilter]);

    const perEmployeeStats = useMemo(() => {
        const map = new Map<number, { usuario_id: number; usuario: string; totalHoras: number; totalMonto: number; totalACobrar: number; count: number }>();
        data.forEach(h => {
            const existing = map.get(h.usuario_id);
            if (existing) {
                existing.totalHoras += h.hora || 0;
                existing.totalMonto += h.monto || 0;
                if (h.estado === 1) existing.totalACobrar += (h.total || h.monto || 0);
                existing.count++;
            } else {
                map.set(h.usuario_id, {
                    usuario_id: h.usuario_id,
                    usuario: h.usuario,
                    totalHoras: h.hora || 0,
                    totalMonto: h.monto || 0,
                    totalACobrar: h.estado === 1 ? (h.total || h.monto || 0) : 0,
                    count: 1,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => b.totalMonto - a.totalMonto);
    }, [data]);

    const stats = useMemo(() => {
        const totalRegistros = data.length;
        const totalMonto = data.reduce((sum, h) => sum + (h.monto || 0), 0);
        const totalHoras = data.reduce((sum, h) => sum + (h.hora || 0), 0);
        const totalAPagar = data.filter(h => h.estado === 1).reduce((sum, h) => sum + (h.total || h.monto || 0), 0);
        return { totalRegistros, totalMonto, totalHoras, totalAPagar };
    }, [data]);

    return {
        ...theme,
        data,
        loading,
        refreshing,
        error,
        statusFilter,
        setStatusFilter,
        userFilter,
        setUserFilter,
        selectedRecord,
        setSelectedRecord,
        modalVisible,
        setModalVisible,
        fetchData,
        onRefresh,
        employees,
        filteredData,
        perEmployeeStats,
        stats
    };
}
