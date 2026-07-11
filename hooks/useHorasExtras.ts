import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { apiClientSafe } from "@/api/client";
import { showToast } from '@/utils/toast-lazy';
import * as Haptics from "expo-haptics";

export interface HoraExtra {
  id_hora_extra: number;
  fecha_crea: string;
  fecha_mod: string | null;
  hora: string;
  monto: number;
  total: number;
  estado: number; 
}

export function useHorasExtras() {
  const [data, setData] = useState<HoraExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (isManual = false, signal?: AbortSignal) => {
    try {
      setError('');
      const res = await apiClientSafe('/overtime/user', { signal });
      if ((res as any).success) {
        setData((res as any).data || []);
        if (isManual) {
          showToast({
            type: 'success',
            text1: 'Éxito',
            text2: 'Datos actualizados',
          });
        }
      } else {
        setError((res as any).message || 'Error al cargar horas extras');
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
      const ac = new AbortController();
      fetchData(false, ac.signal);
      return () => ac.abort();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    refreshing,
    error,
    onRefresh,
    fetchData
  };
}
