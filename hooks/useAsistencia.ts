import { DeviceEventEmitter, Platform } from "react-native";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { apiClient } from "@/api/client";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

import logger from '@/utils/logger';
interface Gratificacion {
  id: string;
  usuario_id: number;
  monto: number;
  descripcion: string;
  fecha_hora: string;
  estado: number;
}

interface Asistencia {
  id_asistencia: number;
  usuario_id: number;
  fecha: string;
  hora: string;
  sueldo: number;
  aporte: number;
  estado: number;
  total?: number;
  fecha_pago?: string | null;
}

export function useAsistencia() {
  const [activeTab, setActiveTab] = useState<'asistencias' | 'gratificaciones'>('asistencias');
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [gratificaciones, setGratificaciones] = useState<Gratificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const dataRef = useRef<string>('');

  const navigateMonth = useCallback((direction: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const fetchAsistencias = useCallback(async (isManual = false) => {
    try {
      setError('');
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, currentDate.getMonth() + 1, 0).getDate();
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const data = await apiClient(`/attendance/user?tipo=detalle&startDate=${startDate}&endDate=${endDate}`);
      if (data.success) {
        const serialized = JSON.stringify(data.data);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;
        setAsistencias(data.data || []);

        if (isManual) {
          Toast.show({
            type: hasChanges ? 'success' : 'info',
            text1: hasChanges ? 'Éxito' : 'Información',
            text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
          });
        }
      } else {
        setError(data.message || 'Error al cargar asistencias');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDate]);

  const fetchGratificaciones = useCallback(async (isManual = false) => {
    try {
      const data = await apiClient('/gratificaciones/me');
      if (Array.isArray(data)) {
        setGratificaciones(data);
      }
    } catch (err) {
      logger.captureException(err, { context: 'useAsistencia:fetchGratificaciones' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAsistencias();
      fetchGratificaciones();
    }, [fetchAsistencias, fetchGratificaciones])
  );

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchAsistencias(true);
    fetchGratificaciones(true);
  }, [fetchAsistencias, fetchGratificaciones]);

  return {
    activeTab,
    setActiveTab,
    asistencias,
    gratificaciones,
    loading,
    refreshing,
    error,
    filter,
    setFilter,
    onRefresh,
    currentDate,
    navigateMonth,
    goToCurrentMonth
  };
}
