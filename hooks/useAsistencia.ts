import { normalizeEmployeeRecords } from '@/utils/employeeRecords';
import { apiClientSafe } from '@/api/client';
import { showToast } from '@/utils/toast-lazy';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@/store/authStore';

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
  const isHostess = useAuthStore(
    (state) => state.user?.role?.toLowerCase() === 'anfitriona',
  );
  const [allHistory, setAllHistory] = useState(true);
  const [housingDiscountTotal, setHousingDiscountTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<'asistencias' | 'gratificaciones'>(
    'asistencias',
  );
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [gratificaciones, setGratificaciones] = useState<Gratificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [gratificationsError, setGratificationsError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const dataRef = useRef<string>('');

  const navigateMonth = useCallback((direction: number) => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1),
    );
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const fetchAsistencias = useCallback(
    async (isManual = false, signal?: AbortSignal) => {
      try {
        setError('');
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, currentDate.getMonth() + 1, 0).getDate();
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        const endpoint =
          isHostess || allHistory
            ? '/attendance/user?tipo=detalle'
            : `/attendance/user?tipo=detalle&startDate=${startDate}&endDate=${endDate}`;
        const data = await apiClientSafe(endpoint, { signal });
        if (signal?.aborted) return;
        if (isHostess) {
          const summary = await apiClientSafe<any[]>('/attendance/user', {
            signal,
          });
          if (signal?.aborted) return;
          if (!summary.success)
            throw new Error('No se pudo cargar el descuento de alojamiento');
          setHousingDiscountTotal(
            Number(summary.data?.[0]?.descuento_total || 0),
          );
        }
        if (data.success) {
          const serialized = JSON.stringify(data.data);
          const hasChanges = dataRef.current !== serialized;
          dataRef.current = serialized;
          setAsistencias(
            normalizeEmployeeRecords<Asistencia>(data.data, [
              'sueldo',
              'aporte',
              'total',
              'estado',
            ]),
          );

          if (isManual) {
            showToast({
              type: hasChanges ? 'success' : 'info',
              text1: hasChanges ? 'Éxito' : 'Información',
              text2: hasChanges
                ? 'Datos actualizados'
                : 'Sin cambios en los datos',
            });
          }
        } else {
          setError(data.message || 'Error al cargar asistencias');
        }
      } catch (err: any) {
        if ((err as any)?.name === 'AbortError') return;
        setError(err.message || 'Error de conexión');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentDate, isHostess, allHistory],
  );

  const fetchGratificaciones = useCallback(
    async (isManual = false, signal?: AbortSignal) => {
      try {
        setGratificationsError('');
        const data = await apiClientSafe('/gratifications/me', { signal });
        if (signal?.aborted) return;
        if (!data.success)
          throw new Error(
            data.message || 'No se pudieron cargar las gratificaciones',
          );
        const items = Array.isArray(data) ? data : (data as any)?.data;
        if (!Array.isArray(items))
          throw new Error('La respuesta de gratificaciones no es válida');
        if (Array.isArray(items)) {
          setGratificaciones(
            normalizeEmployeeRecords<Gratificacion>(items, ['monto', 'estado']),
          );
        }
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return;
        setGratificationsError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar las gratificaciones',
        );
        logger.fetchError(err, {
          context: 'useAsistencia:fetchGratificaciones',
        });
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const ac = new AbortController();
      fetchAsistencias(false, ac.signal);
      fetchGratificaciones(false, ac.signal);
      return () => ac.abort();
    }, [fetchAsistencias, fetchGratificaciones]),
  );

  const onRefresh = useCallback(() => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchAsistencias(true);
    fetchGratificaciones(true);
  }, [fetchAsistencias, fetchGratificaciones]);

  return {
    isHostess,
    allHistory,
    setAllHistory,
    housingDiscountTotal,
    activeTab,
    setActiveTab,
    asistencias,
    gratificaciones,
    loading,
    refreshing,
    error: activeTab === 'gratificaciones' ? gratificationsError : error,
    filter,
    setFilter,
    onRefresh,
    currentDate,
    navigateMonth,
    goToCurrentMonth,
  };
}
