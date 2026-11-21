import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { apiClientSafe } from "@/api/client";
import { serviciosService } from "@/services/servicios";
import type { Servicio } from "@lasmunecasderamon/types";
import { showToast } from '@/utils/toast-lazy';
import * as Haptics from 'expo-haptics';

export type { Servicio };

export function useServicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (isManual = false) => {
    try {
      setError('');
      const res = await serviciosService.getUserServices();

      if (res.success) {
        setServicios(res.items);
        if (isManual) {
          showToast({ type: 'success', text1: 'Sincronizado', text2: 'Datos actualizados desde el servidor' });
        }
      } else {
        setError(res.message || 'Error al cargar servicios');
      }
    } catch (err: any) {
      const msg = err.name === 'AbortError' ? 'Tiempo de espera agotado' : (err.message || 'Error de conexión');
      setError(msg);
      if (isManual) showToast({ type: 'error', text1: 'Fallo de conexión', text2: msg });
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const handleAssistance = async (servicioId: number, roomName: string, type: string) => {
    try {
      const res = await apiClientSafe('/notifications/assistance', {
        method: 'POST',
        body: JSON.stringify({ servicioId, roomName, type })
      });
      if ((res as any).success) {
        showToast({ type: 'success', text1: 'Solicitud enviada', text2: `Se ha solicitado ${type} para la habitación ${roomName}` });
        return true;
      }
    } catch {
      showToast({ type: 'error', text1: 'Error', text2: 'No se pudo enviar la solicitud' });
    }
    return false;
  };

  return {
    servicios,
    loading,
    refreshing,
    error,
    onRefresh,
    handleAssistance,
    fetchData
  };
}

